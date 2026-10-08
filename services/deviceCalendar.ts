import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";
import { startOfDay, toDateSafe } from "./schedule";

// ─────────────────────────────────────────────────────────────
// Randevuları telefonun takvimine (iOS Takvim / Google Takvim) yazma.
//
// - Ayar açılınca telefonda "AthleTrack" adlı ayrı bir takvim açılır;
//   randevular oraya yazılır (hocanın kendi takvimleri kirlenmez,
//   istemezse o takvimi tek hamlede gizleyebilir).
// - Randevu → etkinlik eşlemesi cihazda tutulur (etkinlik kimlikleri
//   cihaza özeldir; Firestore'a yazmanın anlamı yok).
// - Tekrarlı randevular takvimde de tekrarlı etkinlik olarak açılır.
// - Süre bilgisi olmadığı için etkinlik 60 dk, 30 dk önce hatırlatmalı.
// ─────────────────────────────────────────────────────────────

const K = {
    enabled: "deviceCalendar:enabled",
    calendarId: "deviceCalendar:calendarId",
    map: "deviceCalendar:eventMap", // { [appointmentId]: eventId }
};

const CALENDAR_TITLE = "AthleTrack";
const CALENDAR_COLOR = "#0284c7";
const DURATION_MIN = 60;
const ALARM_MIN = 30;

export type CalendarAppointment = {
    id: string;
    studentName?: string;
    date: any;
    note?: string | null;
    repeatDays?: number | null;
};

export async function isDeviceCalendarEnabled(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(K.enabled)) === "1";
    } catch {
        return false;
    }
}

async function readMap(): Promise<Record<string, string>> {
    try {
        return JSON.parse((await AsyncStorage.getItem(K.map)) ?? "{}") ?? {};
    } catch {
        return {};
    }
}

async function writeMap(map: Record<string, string>) {
    await AsyncStorage.setItem(K.map, JSON.stringify(map)).catch(() => { });
}

/** İzin ister. Verilmezse false. */
export async function requestCalendarAccess(): Promise<boolean> {
    const current = await Calendar.getCalendarPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const res = await Calendar.requestCalendarPermissionsAsync();
    return res.granted;
}

/** "AthleTrack" takvimini bulur, yoksa oluşturur. */
async function ensureCalendar(): Promise<string> {
    const saved = await AsyncStorage.getItem(K.calendarId);
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (saved && calendars.some((c) => c.id === saved)) return saved;

    const existing = calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications);
    if (existing) {
        await AsyncStorage.setItem(K.calendarId, existing.id);
        return existing.id;
    }

    let source: Calendar.Source;
    if (Platform.OS === "ios") {
        const def = await Calendar.getDefaultCalendarAsync();
        source = def.source;
    } else {
        source = { isLocalAccount: true, name: CALENDAR_TITLE, type: Calendar.SourceType?.LOCAL ?? "LOCAL" } as any;
    }

    const id = await Calendar.createCalendarAsync({
        title: CALENDAR_TITLE,
        name: CALENDAR_TITLE,
        color: CALENDAR_COLOR,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: source?.id,
        source,
        ownerAccount: "personal",
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    await AsyncStorage.setItem(K.calendarId, id);
    return id;
}

function eventDetails(apt: CalendarAppointment, title: (name: string) => string) {
    const start = toDateSafe(apt.date) ?? new Date();
    const end = new Date(start.getTime() + DURATION_MIN * 60_000);
    const repeat = apt.repeatDays && apt.repeatDays > 0 ? apt.repeatDays : null;
    return {
        title: title(apt.studentName ?? ""),
        startDate: start,
        endDate: end,
        notes: apt.note ?? undefined,
        alarms: [{ relativeOffset: -ALARM_MIN }],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(repeat
            ? {
                recurrenceRule:
                    repeat % 7 === 0
                        ? { frequency: Calendar.Frequency.WEEKLY, interval: repeat / 7 }
                        : { frequency: Calendar.Frequency.DAILY, interval: repeat },
            }
            : {}),
    };
}

/** Takvime ekler (zaten eklenmişse dokunmaz). Ayar kapalıysa hiçbir şey yapmaz. */
export async function addAppointmentToDeviceCalendar(apt: CalendarAppointment, title: (name: string) => string) {
    if (!(await isDeviceCalendarEnabled())) return;
    const map = await readMap();
    if (map[apt.id]) return;
    const calendarId = await ensureCalendar();
    const eventId = await Calendar.createEventAsync(calendarId, eventDetails(apt, title));
    map[apt.id] = eventId;
    await writeMap(map);
}

export async function removeAppointmentFromDeviceCalendar(appointmentId: string) {
    const map = await readMap();
    const eventId = map[appointmentId];
    if (!eventId) return;
    try {
        await Calendar.deleteEventAsync(eventId, { futureEvents: true });
    } catch {
        // Kullanıcı etkinliği takvimden elle silmiş olabilir.
    }
    delete map[appointmentId];
    await writeMap(map);
}

/**
 * Ayarı açar ve mevcut (bugünden sonraki ya da tekrarlı) randevuları takvime
 * yazar. İzin verilmezse false döner. Eklenen etkinlik sayısını döner.
 */
export async function enableDeviceCalendar(
    appointments: CalendarAppointment[],
    title: (name: string) => string,
): Promise<number | false> {
    if (!(await requestCalendarAccess())) return false;
    await AsyncStorage.setItem(K.enabled, "1");

    const today = startOfDay(new Date()).getTime();
    const relevant = appointments.filter((a) => {
        const d = toDateSafe(a.date);
        return !!d && (d.getTime() >= today || (a.repeatDays ?? 0) > 0);
    });

    let added = 0;
    for (const apt of relevant) {
        const before = (await readMap())[apt.id];
        await addAppointmentToDeviceCalendar(apt, title);
        if (!before) added++;
    }
    return added;
}

/** Ayarı kapatır ve AthleTrack'in eklediği etkinlikleri siler. */
export async function disableDeviceCalendar() {
    await AsyncStorage.setItem(K.enabled, "0");
    const map = await readMap();
    for (const id of Object.keys(map)) {
        await removeAppointmentFromDeviceCalendar(id);
    }
}

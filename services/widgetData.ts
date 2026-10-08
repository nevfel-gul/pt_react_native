import AsyncStorage from "@react-native-async-storage/async-storage";
import { appLocale } from "@/constants/languages";
import { getDocs } from "firebase/firestore";
import i18n from "i18next";
import { Platform } from "react-native";
import { appointmentsColRef, recordsColRef, studentsColRef } from "./firestorePaths";
import {
    addDays,
    followUpStatus,
    isAppointmentOnDay,
    lastRecordByStudent,
    startOfDay,
    toDateSafe,
    ymd,
} from "./schedule";

// ─────────────────────────────────────────────────────────────
// Ana ekran widget'ının verisi.
//
// Uygulama Firestore'dan küçük bir "özet" (snapshot) hesaplar ve bunu
// widget'ın okuyabileceği yere yazar:
//   iOS     → App Group UserDefaults (ExtensionStorage), anahtar "snapshot"
//   Android → AsyncStorage, anahtar "widget:snapshot" (widget görevi okur)
//
// Widget kendi başına ağa çıkmaz; veriyi uygulama açıldıkça / kayıt,
// randevu eklendikçe tazeleriz. Gün değişimini widget kendisi halleder:
// snapshot önümüzdeki 7 günün randevularını tarih damgasıyla taşır.
// ─────────────────────────────────────────────────────────────

export const APP_GROUP = "group.com.athletrack.athletrack";
export const WIDGET_SNAPSHOT_KEY = "snapshot";
export const ANDROID_SNAPSHOT_KEY = "widget:snapshot";
export const ANDROID_WIDGET_NAME = "TodayWidget";
export const IOS_WIDGET_KIND = "TodayWidget";

export type WidgetAppointment = {
    /** Başlangıç zamanı (ms) */
    ts: number;
    /** Öğrencinin kısaltılmış adı ("Ayşe K.") */
    name: string;
};

export type WidgetSnapshot = {
    v: 1;
    signedIn: boolean;
    updatedAt: number;
    /** Önümüzdeki 7 günün randevuları, zamana göre sıralı (en fazla 40). */
    appointments: WidgetAppointment[];
    overdue: number;
    dueSoon: number;
    activeStudents: number;
    /** Widget'ın kullandığı metinler (native tarafta i18n yok). */
    labels: {
        title: string;
        today: string;
        noSessions: string;
        overdue: string;
        dueSoon: string;
        activeStudents: string;
        signedOut: string;
        more: string;
    };
    locale: string;
};

function shortName(full?: string): string {
    const parts = String(full ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function labels(): WidgetSnapshot["labels"] {
    const t = i18n.t.bind(i18n);
    return {
        title: t("widget.title"),
        today: t("widget.today"),
        noSessions: t("widget.noSessions"),
        overdue: t("widget.overdue"),
        dueSoon: t("widget.dueSoon"),
        activeStudents: t("widget.activeStudents"),
        signedOut: t("widget.signedOut"),
        more: t("widget.more"),
    };
}

export async function buildWidgetSnapshot(uid: string): Promise<WidgetSnapshot> {
    const [studentsSnap, recordsSnap, aptSnap] = await Promise.all([
        getDocs(studentsColRef(uid)),
        getDocs(recordsColRef(uid)),
        getDocs(appointmentsColRef(uid)),
    ]);

    const students = studentsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const records = recordsSnap.docs.map((d) => d.data() as any);
    const appointments = aptSnap.docs.map((d) => d.data() as any);

    // Takip durumu — takvim ekranıyla aynı kural.
    const lastByStudent = lastRecordByStudent(records);
    const today = startOfDay(new Date());
    let overdue = 0;
    let dueSoon = 0;
    let activeStudents = 0;
    for (const s of students) {
        if ((s.aktif ?? "Aktif") === "Aktif") activeStudents++;
        const { status } = followUpStatus(lastByStudent.get(s.id) ?? null, s.followUpDays, today);
        if (status === "overdue") overdue++;
        else if (status === "dueSoon") dueSoon++;
    }

    // Önümüzdeki 7 günün randevuları (tekrarlar açılarak).
    const upcoming: WidgetAppointment[] = [];
    for (let i = 0; i < 7; i++) {
        const day = addDays(today, i);
        const key = ymd(day);
        for (const apt of appointments) {
            if (!isAppointmentOnDay(apt, key)) continue;
            const base = toDateSafe(apt.date);
            if (!base) continue;
            const at = new Date(day);
            at.setHours(base.getHours(), base.getMinutes(), 0, 0);
            upcoming.push({ ts: at.getTime(), name: shortName(apt.studentName) });
        }
    }
    upcoming.sort((a, b) => a.ts - b.ts);

    return {
        v: 1,
        signedIn: true,
        updatedAt: Date.now(),
        appointments: upcoming.slice(0, 40),
        overdue,
        dueSoon,
        activeStudents,
        labels: labels(),
        locale: appLocale(),
    };
}

export function signedOutSnapshot(): WidgetSnapshot {
    return {
        v: 1,
        signedIn: false,
        updatedAt: Date.now(),
        appointments: [],
        overdue: 0,
        dueSoon: 0,
        activeStudents: 0,
        labels: labels(),
        locale: appLocale(),
    };
}

export async function publishWidgetSnapshot(snapshot: WidgetSnapshot) {
    const json = JSON.stringify(snapshot);

    if (Platform.OS === "ios") {
        // Native modül yalnızca iOS build'inde var; require ile tembel yükle.
        const { ExtensionStorage } = require("@bacons/apple-targets") as typeof import("@bacons/apple-targets");
        new ExtensionStorage(APP_GROUP).set(WIDGET_SNAPSHOT_KEY, json);
        ExtensionStorage.reloadWidget(IOS_WIDGET_KIND);
        return;
    }

    if (Platform.OS === "android") {
        await AsyncStorage.setItem(ANDROID_SNAPSHOT_KEY, json);
        const { refreshAndroidWidgets } = require("@/widgets/android/refresh") as typeof import("@/widgets/android/refresh");
        await refreshAndroidWidgets(snapshot);
    }
}

export async function readAndroidSnapshot(): Promise<WidgetSnapshot | null> {
    try {
        const raw = await AsyncStorage.getItem(ANDROID_SNAPSHOT_KEY);
        return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
    } catch {
        return null;
    }
}

// ── Tazeleme isteği ─────────────────────────────────────────
// Kayıt / randevu / öğrenci kaydedilince ekranlar requestWidgetRefresh()
// çağırır; WidgetSync bunu dinleyip snapshot'ı yeniden hesaplar.

type Listener = () => void;
const listeners = new Set<Listener>();

export function onWidgetRefreshRequested(fn: Listener) {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

export function requestWidgetRefresh() {
    listeners.forEach((fn) => {
        try { fn(); } catch { }
    });
}

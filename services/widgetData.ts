import AsyncStorage from "@react-native-async-storage/async-storage";
import { calendarFirstDay } from "@/constants/calendarLocale";
import { appLocale, currentLanguage } from "@/constants/languages";
import type { ActivePackageSummary } from "./packages";
import { formatMoney } from "./packages";
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
    /** Öğrenci kimliği: widget'tan dokununca öğrencinin sayfası açılır. */
    sid?: string;
    /** "3 ders kaldı" — yalnızca premium ve aktif paket varsa. */
    left?: string;
};

/** Büyük widget listeleri için öğrenci satırı. */
export type WidgetStudentRow = { sid: string; name: string; detail?: string };

export type WidgetSnapshot = {
    v: 1;
    signedIn: boolean;
    updatedAt: number;
    /** Önümüzdeki 7 günün randevuları, zamana göre sıralı (en fazla 40). */
    appointments: WidgetAppointment[];
    /** Ölçümü gecikmiş / yaklaşan aktif öğrenciler. */
    overdue: number;
    dueSoon: number;
    activeStudents: number;
    /** Paket ve ödeme bilgisi premium özelliği: ücretsiz kullanıcıda false. */
    premium: boolean;
    /** Paketi bitmek üzere olan (≤2 ders ya da 7 gün içinde süresi dolan) öğrenci sayısı. */
    packagesEnding: number;
    /** Ödenmemiş paket tutarlarının toplamı, biçimlenmiş ("₺4.500"); yoksa null. */
    unpaidText: string | null;
    /** "12 seans · 4 ölçüm" — bu haftanın özeti. */
    weekText: string;
    /** Büyük widget: ölçümü en çok geciken öğrenciler (en fazla 6). */
    overdueList: WidgetStudentRow[];
    /** Büyük widget: paketi bitmek üzere olanlar (en fazla 4, premium). */
    endingList: WidgetStudentRow[];
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
        next: string;
        packagesEnding: string;
        unpaid: string;
        thisWeek: string;
        overdueTitle: string;
        endingTitle: string;
        allClear: string;
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
        next: t("widget.next"),
        packagesEnding: t("widget.packagesEnding"),
        unpaid: t("widget.unpaid"),
        thisWeek: t("widget.thisWeek"),
        overdueTitle: t("widget.overdueTitle"),
        endingTitle: t("widget.endingTitle"),
        allClear: t("widget.allClear"),
    };
}

const PACKAGE_LOW_SESSIONS = 2;
const PACKAGE_EXPIRY_DAYS = 7;

/** Paket yenileme konuşması gereken mi? (≤2 ders kaldı ya da süresi 7 gün içinde doluyor/doldu) */
function packageEnding(p: ActivePackageSummary | undefined, today: Date): boolean {
    if (!p) return false;
    if (p.remaining <= PACKAGE_LOW_SESSIONS) return true;
    if (!p.endDate) return false;
    const end = toDateSafe(p.endDate);
    return !!end && end.getTime() <= addDays(today, PACKAGE_EXPIRY_DAYS).getTime();
}

function startOfWeek(today: Date): Date {
    const first = calendarFirstDay(currentLanguage());
    const diff = (today.getDay() - first + 7) % 7;
    return addDays(today, -diff);
}

export async function buildWidgetSnapshot(uid: string, opts: { premium: boolean }): Promise<WidgetSnapshot> {
    const { premium } = opts;
    const t = i18n.t.bind(i18n);
    const locale = appLocale();
    const [studentsSnap, recordsSnap, aptSnap] = await Promise.all([
        getDocs(studentsColRef(uid)),
        getDocs(recordsColRef(uid)),
        getDocs(appointmentsColRef(uid)),
    ]);

    const students = studentsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const records = recordsSnap.docs.map((d) => d.data() as any);
    const appointments = aptSnap.docs.map((d) => d.data() as any);
    const isActive = (s: any) => (s.aktif ?? "Aktif") === "Aktif";
    const byId = new Map(students.map((s) => [s.id, s]));

    // Takip durumu — takvim ekranıyla aynı kural. Pasif öğrenciler sayılmaz.
    const lastByStudent = lastRecordByStudent(records);
    const today = startOfDay(new Date());
    let overdue = 0;
    let dueSoon = 0;
    let activeStudents = 0;
    const overdueRows: { row: WidgetStudentRow; days: number }[] = [];
    const endingRows: WidgetStudentRow[] = [];
    const unpaidByCurrency = new Map<string, number>();
    for (const s of students) {
        if (!isActive(s)) continue;
        activeStudents++;
        const { status, daysToDue } = followUpStatus(lastByStudent.get(s.id) ?? null, s.followUpDays, today);
        if (status === "overdue" || status === "never") {
            if (status === "overdue") overdue++;
            overdueRows.push({
                row: {
                    sid: s.id,
                    name: shortName(s.name ?? s.fullName),
                    detail: status === "never" ? t("calendar.diff.never") : t("calendar.diff.overdueDays", { days: daysToDue }),
                },
                days: status === "never" ? Number.MAX_SAFE_INTEGER : daysToDue,
            });
        } else if (status === "dueSoon") dueSoon++;

        const pkg = s.activePackage as ActivePackageSummary | undefined;
        if (premium && pkg) {
            if (packageEnding(pkg, today)) {
                endingRows.push({ sid: s.id, name: shortName(s.name ?? s.fullName), detail: t("widget.sessionsLeft", { count: pkg.remaining }) });
            }
            if (pkg.unpaid > 0) {
                const cur = pkg.currency ?? "TRY";
                unpaidByCurrency.set(cur, (unpaidByCurrency.get(cur) ?? 0) + pkg.unpaid);
            }
        }
    }
    // "never" (hiç ölçülmemiş) listede görünür ama sayaçta değil — takvimle aynı.
    overdueRows.sort((a, b) => b.days - a.days);

    // Önümüzdeki 7 günün randevuları (tekrarlar açılarak) + bu haftanın seans sayısı.
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 7);
    const upcoming: WidgetAppointment[] = [];
    let weekSessions = 0;
    for (let i = -7; i < 7; i++) {
        const day = addDays(today, i);
        const inWeek = day >= weekStart && day < weekEnd;
        if (i < 0 && !inWeek) continue;
        const key = ymd(day);
        for (const apt of appointments) {
            if (!isAppointmentOnDay(apt, key)) continue;
            const base = toDateSafe(apt.date);
            if (!base) continue;
            if (inWeek) weekSessions++;
            if (i < 0) continue;
            const at = new Date(day);
            at.setHours(base.getHours(), base.getMinutes(), 0, 0);
            const pkg = premium ? (byId.get(apt.studentId)?.activePackage as ActivePackageSummary | undefined) : undefined;
            upcoming.push({
                ts: at.getTime(),
                name: shortName(apt.studentName),
                sid: apt.studentId || undefined,
                left: pkg ? t("widget.sessionsLeft", { count: pkg.remaining }) : undefined,
            });
        }
    }
    upcoming.sort((a, b) => a.ts - b.ts);

    const weekRecords = records.filter((r) => {
        const d = toDateSafe(r.createdAt) ?? toDateSafe(r.date);
        return !!d && d >= weekStart && d < weekEnd;
    }).length;

    const unpaidText = unpaidByCurrency.size
        ? [...unpaidByCurrency.entries()].map(([cur, amt]) => formatMoney(amt, cur, locale)).join(" + ")
        : null;

    return {
        v: 1,
        signedIn: true,
        updatedAt: Date.now(),
        appointments: upcoming.slice(0, 40),
        overdue,
        dueSoon,
        activeStudents,
        premium,
        packagesEnding: endingRows.length,
        unpaidText,
        weekText: t("widget.weekSummary", { sessions: weekSessions, records: weekRecords }),
        overdueList: overdueRows.slice(0, 6).map((x) => x.row),
        endingList: endingRows.slice(0, 4),
        labels: labels(),
        locale,
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
        premium: false,
        packagesEnding: 0,
        unpaidText: null,
        weekText: "",
        overdueList: [],
        endingList: [],
        labels: labels(),
        locale: appLocale(),
    };
}

export async function publishWidgetSnapshot(snapshot: WidgetSnapshot) {
    const json = JSON.stringify(snapshot);

    if (Platform.OS === "ios") {
        // Native modül yalnızca iOS build'inde var; require ile tembel yükle.
        const { ExtensionStorage } = require("@bacons/apple-targets") as typeof import("@bacons/apple-targets");
        // Native modül build'e girmediyse ExtensionStorage sessizce hiçbir şey yapmaz.
        if (!(globalThis as any).expo?.modules?.ExtensionStorage) {
            console.warn("[Widget] ExtensionStorage native modülü yok — widget verisi yazılamıyor (prebuild --clean gerekli).");
            return;
        }
        const storage = new ExtensionStorage(APP_GROUP);
        storage.set(WIDGET_SNAPSHOT_KEY, json);
        if (__DEV__) {
            // Geri okuyabiliyorsak uygulama tarafı tamam; widget yine boşsa App Group widget'ta yok demektir.
            const back = storage.get(WIDGET_SNAPSHOT_KEY);
            console.log(`[Widget] App Group'a yazıldı (${APP_GROUP}), geri okuma: ${back ? `${back.length} karakter` : "BOŞ"}`);
        }
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

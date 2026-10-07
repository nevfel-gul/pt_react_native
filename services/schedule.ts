// ─────────────────────────────────────────────────────────────
// Takvim, ana ekran ve widget'ın ortak tarih / takip hesapları.
// ─────────────────────────────────────────────────────────────

export function toDateSafe(v: any): Date | null {
    if (!v) return null;
    if (typeof v === "object" && typeof v.toDate === "function") {
        try { return v.toDate(); } catch { }
    }
    if (typeof v === "number") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
    if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    return null;
}

export function ymd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function addDays(d: Date, days: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

export function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysDiff(a: Date, b: Date): number {
    return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / (1000 * 60 * 60 * 24));
}

/** Bir randevunun belirli bir güne denk gelip gelmediği (tekrar dahil). */
export function isAppointmentOnDay(
    apt: { date?: any; repeatDays?: number | null },
    dayStr: string,
): boolean {
    const aptDate = toDateSafe(apt.date);
    if (!aptDate) return false;

    const aptDayStr = ymd(aptDate);
    if (aptDayStr === dayStr) return true;

    const repeat = apt.repeatDays;
    if (!repeat || repeat <= 0) return false;

    const aptTime = startOfDay(aptDate).getTime();
    const dayTime = startOfDay(new Date(dayStr + "T00:00:00")).getTime();
    if (dayTime < aptTime) return false;

    const diffDays = Math.round((dayTime - aptTime) / 86400000);
    return diffDays % repeat === 0;
}

export type FollowUpStatus = "overdue" | "dueSoon" | "ok" | "never";

/** Kayıt bazlı takip durumu — takvimdeki "yaklaştı / gecikti" ile aynı kural. */
export function followUpStatus(
    lastRecordAt: Date | null,
    followUpDays: number | undefined,
    today = startOfDay(new Date()),
): { status: FollowUpStatus; dueDate: Date; daysToDue: number } {
    if (!lastRecordAt) return { status: "never", dueDate: today, daysToDue: 0 };

    const period = typeof followUpDays === "number" ? followUpDays : 30;
    const dueDate = addDays(startOfDay(lastRecordAt), period);
    const diff = daysDiff(today, dueDate);
    const status: FollowUpStatus = diff > 0 ? "overdue" : -diff <= 7 ? "dueSoon" : "ok";
    return { status, dueDate, daysToDue: diff };
}

/** Kayıt listesinden öğrenci başına son kayıt tarihi. */
export function lastRecordByStudent(
    records: { studentId?: string; createdAt?: any; date?: any; createdAtMs?: number }[],
): Map<string, Date> {
    const map = new Map<string, Date>();
    for (const r of records) {
        const sid = r.studentId;
        if (!sid) continue;
        const d = toDateSafe(r.createdAt) ?? toDateSafe(r.date) ?? (typeof r.createdAtMs === "number" ? toDateSafe(r.createdAtMs) : null);
        if (!d) continue;
        const prev = map.get(sid);
        if (!prev || d.getTime() > prev.getTime()) map.set(sid, d);
    }
    return map;
}

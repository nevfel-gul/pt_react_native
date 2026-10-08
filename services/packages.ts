import {
    collection,
    deleteField,
    doc,
    getDocs,
    query,
    runTransaction,
    serverTimestamp,
    Timestamp,
    where,
    writeBatch,
} from "firebase/firestore";
import * as Localization from "expo-localization";
import { db } from "./firebase";
import { studentDocRef } from "./firestorePaths";

// ─────────────────────────────────────────────────────────────
// Seans / paket takibi.
//
//   users/{uid}/students/{sid}/packages/{pid}   — satılan ders paketi
//   users/{uid}/students/{sid}/sessions/{id}    — düşülen her ders
//
// Öğrenci dokümanında `activePackage` özeti tutulur; liste ekranları ve
// widget paket dokümanlarını okumadan "kaç ders kaldı" bilgisini görür.
// Sayaç değişiklikleri transaction içinde yapılır ki iki cihazdan aynı
// anda ders düşülünce sayı kaymasın.
// ─────────────────────────────────────────────────────────────

export type SessionPackage = {
    id: string;
    totalSessions: number;
    usedSessions: number;
    /** Paketin toplam ücreti. Girilmediyse null. */
    price: number | null;
    paidAmount: number;
    currency: string;
    /** YYYY-MM-DD */
    startDate: string;
    /** YYYY-MM-DD — geçerlilik sonu; yoksa süresiz. */
    endDate: string | null;
    note: string | null;
    createdAt?: Timestamp;
    closedAt?: Timestamp | null;
};

export type SessionLog = {
    id: string;
    packageId: string;
    date: Timestamp;
    source: "manual" | "appointment";
    appointmentId?: string | null;
    /** Derste ne yapıldı — isteğe bağlı kısa not ("Bacak + kardiyo"). */
    note?: string | null;
};

/** Öğrenci dokümanındaki özet. */
export type ActivePackageSummary = {
    id: string;
    total: number;
    used: number;
    remaining: number;
    endDate: string | null;
    /** Ödenmemiş tutar (fiyat girilmediyse 0). */
    unpaid: number;
    currency?: string;
};

export const packagesColRef = (uid: string, sid: string) =>
    collection(studentDocRef(uid, sid), "packages");
export const sessionsColRef = (uid: string, sid: string) =>
    collection(studentDocRef(uid, sid), "sessions");

export function remainingOf(p: Pick<SessionPackage, "totalSessions" | "usedSessions">) {
    return Math.max(0, p.totalSessions - p.usedSessions);
}

export function unpaidOf(p: Pick<SessionPackage, "price" | "paidAmount">) {
    return p.price != null ? Math.max(0, p.price - (p.paidAmount || 0)) : 0;
}

export function isExpired(p: Pick<SessionPackage, "endDate">, today = new Date()) {
    if (!p.endDate) return false;
    const [y, m, d] = p.endDate.split("-").map(Number);
    if (!y || !m || !d) return false;
    const end = new Date(y, m - 1, d, 23, 59, 59);
    return end.getTime() < today.getTime();
}

function summaryOf(id: string, p: Omit<SessionPackage, "id">): ActivePackageSummary {
    return {
        id,
        total: p.totalSessions,
        used: p.usedSessions,
        remaining: remainingOf(p),
        endDate: p.endDate ?? null,
        unpaid: unpaidOf(p),
        currency: p.currency,
    };
}

export type NewPackageInput = {
    totalSessions: number;
    price: number | null;
    paidAmount: number;
    startDate: string;
    endDate: string | null;
    note: string | null;
    currency?: string;
};

/**
 * Yeni paketi aktif yapar. Önceki aktif paket varsa kapatılır (geçmişte kalır).
 */
export async function createPackage(uid: string, sid: string, input: NewPackageInput, previousActiveId?: string | null) {
    const ref = doc(packagesColRef(uid, sid));
    const data: Omit<SessionPackage, "id"> = {
        totalSessions: input.totalSessions,
        usedSessions: 0,
        price: input.price,
        paidAmount: Math.max(0, input.paidAmount || 0),
        currency: input.currency ?? defaultCurrency(),
        startDate: input.startDate,
        endDate: input.endDate,
        note: input.note,
        closedAt: null,
    };

    const batch = writeBatch(db);
    batch.set(ref, { ...data, createdAt: serverTimestamp() });
    if (previousActiveId) {
        batch.update(doc(packagesColRef(uid, sid), previousActiveId), { closedAt: serverTimestamp() });
    }
    batch.update(studentDocRef(uid, sid), { activePackage: summaryOf(ref.id, data) });
    await batch.commit();
    return ref.id;
}

export class PackageFullError extends Error {
    constructor() {
        super("package_full");
    }
}
export class AlreadyLoggedError extends Error {
    constructor() {
        super("already_logged");
    }
}

/**
 * Aktif paketten bir ders düşer.
 * Randevudan düşülüyorsa aynı randevu aynı gün ikinci kez düşülemez.
 */
export async function logSession(
    uid: string,
    sid: string,
    packageId: string,
    opts: { date?: Date; appointmentId?: string; dayKey?: string; note?: string | null } = {},
) {
    const pkgRef = doc(packagesColRef(uid, sid), packageId);
    const sessionRef = opts.appointmentId && opts.dayKey
        ? doc(sessionsColRef(uid, sid), `${opts.appointmentId}_${opts.dayKey}`)
        : doc(sessionsColRef(uid, sid));

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(pkgRef);
        if (!snap.exists()) throw new Error("package_missing");
        if (opts.appointmentId) {
            const existing = await tx.get(sessionRef);
            if (existing.exists()) throw new AlreadyLoggedError();
        }
        const p = snap.data() as Omit<SessionPackage, "id">;
        if (p.usedSessions >= p.totalSessions) throw new PackageFullError();

        const next = { ...p, usedSessions: p.usedSessions + 1 };
        tx.update(pkgRef, { usedSessions: next.usedSessions, updatedAt: serverTimestamp() });
        tx.set(sessionRef, {
            packageId,
            date: Timestamp.fromDate(opts.date ?? new Date()),
            source: opts.appointmentId ? "appointment" : "manual",
            appointmentId: opts.appointmentId ?? null,
            note: opts.note?.trim() ? opts.note.trim().slice(0, 300) : null,
            createdAt: serverTimestamp(),
        });
        tx.update(studentDocRef(uid, sid), { activePackage: summaryOf(packageId, next) });
    });
}

/** Bu paketten düşülen son dersi geri alır. Geri alınacak ders yoksa false. */
export async function undoLastSession(uid: string, sid: string, packageId: string): Promise<boolean> {
    // Tek alanlı sorgu + uygulama içinde sıralama: packageId + createdAt
    // birleşik index'i gerektirmesin (bir paketteki ders sayısı küçük).
    const snap = await getDocs(query(sessionsColRef(uid, sid), where("packageId", "==", packageId)));
    const last = snap.docs
        .slice()
        .sort((a, b) => sessionTime(b.data()) - sessionTime(a.data()))[0];
    if (!last) return false;

    const pkgRef = doc(packagesColRef(uid, sid), packageId);
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(pkgRef);
        if (!snap.exists()) throw new Error("package_missing");
        const p = snap.data() as Omit<SessionPackage, "id">;
        const next = { ...p, usedSessions: Math.max(0, p.usedSessions - 1) };
        tx.update(pkgRef, { usedSessions: next.usedSessions, updatedAt: serverTimestamp() });
        tx.delete(last.ref);
        if (!p.closedAt) tx.update(studentDocRef(uid, sid), { activePackage: summaryOf(packageId, next) });
    });
    return true;
}

/** Sıralama için: sunucu zamanı henüz yazılmadıysa dersin tarihi. */
export function sessionTime(d: any): number {
    return d?.createdAt?.toMillis?.() ?? d?.date?.toMillis?.() ?? Date.now();
}

export async function recordPayment(uid: string, sid: string, packageId: string, amount: number) {
    const pkgRef = doc(packagesColRef(uid, sid), packageId);
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(pkgRef);
        if (!snap.exists()) throw new Error("package_missing");
        const p = snap.data() as Omit<SessionPackage, "id">;
        const next = { ...p, paidAmount: Math.max(0, (p.paidAmount || 0) + amount) };
        tx.update(pkgRef, { paidAmount: next.paidAmount, updatedAt: serverTimestamp() });
        if (!p.closedAt) tx.update(studentDocRef(uid, sid), { activePackage: summaryOf(packageId, next) });
    });
}

/** Yanlış girilmiş paketi ve ona düşülen dersleri siler. */
export async function deletePackage(uid: string, sid: string, packageId: string, wasActive: boolean) {
    const sessions = await getDocs(query(sessionsColRef(uid, sid), where("packageId", "==", packageId)));
    const batch = writeBatch(db);
    sessions.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(packagesColRef(uid, sid), packageId));
    if (wasActive) batch.update(studentDocRef(uid, sid), { activePackage: deleteField() });
    await batch.commit();
}

/** Yeni paketlerin para birimi: cihaz bölgesinin parası (TR → TRY, DE → EUR, BR → BRL…). */
export function defaultCurrency(): string {
    try {
        return Localization.getLocales()?.[0]?.currencyCode || "TRY";
    } catch {
        return "TRY";
    }
}

/** "EUR" → "€", "TRY" → "₺" (dile göre). */
export function currencySymbol(currency: string, locale: string): string {
    try {
        return new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
    } catch {
        return currency === "TRY" ? "₺" : currency;
    }
}

export function formatMoney(amount: number, currency: string, locale: string) {
    try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${Math.round(amount)} ${currency === "TRY" ? "₺" : currency}`;
    }
}

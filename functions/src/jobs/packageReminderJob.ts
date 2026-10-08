import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { pushText } from "../i18n/pushMessages";
import { getPushRecipients, PushTarget, sendPushBatch } from "../push";

// ─────────────────────────────────────────────────────────────
// Seans / paket hatırlatması (premium).
//
// Uygulama her öğrencinin dokümanına `activePackage` özeti yazar
// (services/packages.ts). Bu job günde bir kez o özete bakar ve hocaya:
//   - pakette 1 ders kaldığında,
//   - paket bittiğinde,
//   - paketin geçerlilik süresinin dolmasına 3 gün kala (ders varken)
// bildirim gönderir. Her uyarı aynı paket için bir kez gider; yeni paket
// açılınca bayraklar sıfırlanır.
//
// Akşam çalışır: günün dersleri düşüldükten sonra, sabah 09:00'daki
// diğer hatırlatmalarla üst üste binmeden.
// ─────────────────────────────────────────────────────────────

const db = admin.firestore();
const TZ = "Europe/Istanbul";

type SendType = "lowSessions" | "packageFinished" | "packageExpiring";

/** Kilit ekranında tam ad görünmesin: "Ayşe K." */
function shortName(full?: string): string {
    const parts = String(full ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** Bir Date'i Europe/Istanbul takviminde gün numarasına çevirir. */
function dayNumberInTz(date: Date): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000);
}

/** "YYYY-MM-DD" → gün numarası (takvim günü, saat dilimi bağımsız). */
function isoDayNumber(iso: string): number | null {
    const [y, m, d] = String(iso).split("-").map(Number);
    if (!y || !m || !d) return null;
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Aktif aboneliği olan kullanıcılar (paket takibi premium özellik). */
async function premiumUserIds(userIds: string[]): Promise<Set<string>> {
    const out = new Set<string>();
    const ids = [...new Set(userIds)];
    for (let i = 0; i < ids.length; i += 300) {
        const refs = ids.slice(i, i + 300).map((id) => db.collection("users").doc(id));
        const snaps = await db.getAll(...refs);
        snaps.forEach((s) => {
            if (s.exists && s.data()?.subscription?.isActive === true) out.add(s.id);
        });
    }
    return out;
}

export const packageReminderJob = onSchedule(
    {
        schedule: "0 19 * * *", // ⏰ Her akşam 19:00
        timeZone: TZ,
    },
    async () => {
        const today = dayNumberInTz(new Date());
        const studentsSnap = await db.collectionGroup("students").get();

        type Pending = {
            studentRef: FirebaseFirestore.DocumentReference;
            studentId: string;
            userId: string;
            name: string;
            packageId: string;
            sendType: SendType;
            flags: Record<string, unknown>;
        };
        const pending: Pending[] = [];

        for (const doc of studentsSnap.docs) {
            const data = doc.data();
            const pkg = data.activePackage;
            if (!pkg?.id || typeof pkg.remaining !== "number") continue;
            if ((data.aktif ?? "Aktif") !== "Aktif") continue;

            const userId = doc.ref.parent.parent?.id;
            if (!userId) continue;

            // Bayraklar pakete bağlı: yeni paket açılınca sıfırlanır.
            const raw = data.packageFlags || {};
            const flags: Record<string, unknown> = raw.packageId === pkg.id ? raw : {};

            let sendType: SendType | null = null;
            if (pkg.remaining === 0) sendType = "packageFinished";
            else if (pkg.remaining === 1) sendType = "lowSessions";
            else if (pkg.endDate) {
                const end = isoDayNumber(pkg.endDate);
                if (end != null && end - today === 3) sendType = "packageExpiring";
            }

            if (!sendType || flags[sendType]) continue;

            pending.push({
                studentRef: doc.ref,
                studentId: doc.id,
                userId,
                name: shortName(data.name),
                packageId: pkg.id,
                sendType,
                flags,
            });
        }

        if (pending.length === 0) return;

        const userIds = pending.map((p) => p.userId);
        const [premium, recipients] = await Promise.all([
            premiumUserIds(userIds),
            getPushRecipients(userIds),
        ]);

        const targets: PushTarget[] = [];
        const writes: Promise<unknown>[] = [];

        for (const item of pending) {
            if (!premium.has(item.userId)) continue;

            // Bildirim gidemese de bayrak yazılır: kullanıcı bildirimleri
            // sonradan açarsa eski uyarılar üst üste gelmesin.
            writes.push(
                item.studentRef
                    .update({
                        packageFlags: { ...item.flags, packageId: item.packageId, [item.sendType]: true },
                    })
                    .catch((err) =>
                        logger.warn("package flag update failed", {
                            studentId: item.studentId,
                            message: err?.message,
                        })
                    )
            );

            const recipient = recipients.get(item.userId);
            if (!recipient) continue;

            const msg = pushText(item.sendType, recipient.lang, { name: item.name });
            targets.push({
                userId: item.userId,
                token: recipient.token,
                title: msg.title,
                body: msg.body,
                data: { type: item.sendType, studentId: item.studentId },
            });
        }

        const sent = await sendPushBatch(targets);
        await Promise.all(writes);

        logger.info("packageReminderJob done", { candidates: pending.length, sent });
    }
);

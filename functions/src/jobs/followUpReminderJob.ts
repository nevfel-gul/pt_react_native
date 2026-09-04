import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getPushRecipients, PushTarget, sendPushBatch } from "../push";

const db = admin.firestore();
const TZ = "Europe/Istanbul";

type SendType = "reminder" | "record" | "overdue1" | "overdue3" | "overdue7";

const MESSAGES: Record<SendType, { title: string; body: string }> = {
    record: {
        title: "Kayıt Günü Geldi 📅",
        body: "Öğrencinin değerlendirme günü bugün.",
    },
    reminder: {
        title: "Kayıt Zamanı Yaklaşıyor ⏳",
        body: "Yaklaşan bir değerlendirme kaydı var.",
    },
    overdue1: {
        title: "Kayıt Gecikti ⚠️",
        body: "Dün yapılması gereken kayıt girilmedi.",
    },
    overdue3: {
        title: "Kayıt Hâlâ Girilmedi 🚨",
        body: "3 gündür değerlendirme kaydı eksik.",
    },
    overdue7: {
        title: "Kayıt 1 Haftadır Eksik ❗",
        body: "7 gündür kayıt girilmedi.",
    },
};

/** Bir Date'i Europe/Istanbul takviminde saat bilgisiz gün numarasına çevirir. */
function dayNumberInTz(date: Date): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const get = (type: string) =>
        Number(parts.find((p) => p.type === type)?.value ?? 0);

    return Math.floor(
        Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000
    );
}

export const followUpReminderJob = onSchedule(
    {
        schedule: "0 9 * * *", // ⏰ Her sabah 09:00
        timeZone: TZ,
    },
    async () => {
        const todayDay = dayNumberInTz(new Date());

        const studentsSnap = await db.collectionGroup("students").get();

        type Pending = {
            studentRef: FirebaseFirestore.DocumentReference;
            studentId: string;
            userId: string;
            sendType: SendType;
            cycle: number;
            flags: Record<string, boolean>;
        };

        const pending: Pending[] = [];

        for (const doc of studentsSnap.docs) {
            const data = doc.data();

            if (!data.lastRecordedAt || !data.followUpDays) continue;

            const userId = doc.ref.parent.parent?.id;
            if (!userId) continue;

            const last: Date = data.lastRecordedAt.toDate();
            const followUpDays: number = Number(data.followUpDays);
            if (!Number.isFinite(followUpDays) || followUpDays <= 0) continue;

            // 🔁 Her yeni kayıt yeni bir döngü başlatır. Flag'ler döngüye bağlanmazsa
            // bir kez "overdue1" gönderildikten sonra bir daha asla gönderilmiyordu.
            const cycle = last.getTime();
            const rawFlags = data.followUpFlags || {};
            const flags: Record<string, boolean> =
                rawFlags.cycle === cycle ? rawFlags : {};

            const dueDay = dayNumberInTz(last) + followUpDays;

            // 20/30 gün sabitlenmişti; 7 gün seçen kullanıcılar hiç ön hatırlatma
            // almıyordu. Artık periyoda göre türetiliyor.
            const leadDays = followUpDays >= 14 ? 3 : 1;
            const reminderDay = dueDay - leadDays;

            const diffDays = todayDay - dueDay;

            let sendType: SendType | null = null;
            if (todayDay === reminderDay) sendType = "reminder";
            else if (diffDays === 0) sendType = "record";
            else if (diffDays === 1) sendType = "overdue1";
            else if (diffDays === 3) sendType = "overdue3";
            else if (diffDays === 7) sendType = "overdue7";

            if (!sendType || flags[sendType]) continue;

            pending.push({
                studentRef: doc.ref,
                studentId: doc.id,
                userId,
                sendType,
                cycle,
                flags,
            });
        }

        if (pending.length === 0) return;

        // 🚀 Kullanıcı dokümanları tek turda okunur (öğrenci başına ayrı okuma yerine)
        const recipients = await getPushRecipients(pending.map((p) => p.userId));

        const targets: PushTarget[] = [];
        const writes: Promise<unknown>[] = [];

        for (const item of pending) {
            const token = recipients.get(item.userId);

            // Bildirim gönderilmese bile flag yazılır: kullanıcı bildirimleri
            // kapattıysa açtığı anda geçmiş hatırlatmalar üst üste gelmesin.
            writes.push(
                item.studentRef
                    .update({
                        followUpFlags: {
                            ...item.flags,
                            cycle: item.cycle,
                            [item.sendType]: true,
                        },
                    })
                    .catch((err) =>
                        logger.warn("followUp flag update failed", {
                            studentId: item.studentId,
                            message: err?.message,
                        })
                    )
            );

            if (!token) continue;

            targets.push({
                userId: item.userId,
                token,
                title: MESSAGES[item.sendType].title,
                body: MESSAGES[item.sendType].body,
                data: { type: item.sendType, studentId: item.studentId },
            });
        }

        const sent = await sendPushBatch(targets);
        await Promise.all(writes);

        logger.info("followUpReminderJob done", {
            candidates: pending.length,
            sent,
        });
    }
);

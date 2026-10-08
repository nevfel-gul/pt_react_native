import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { durationLabel, pushText } from "../i18n/pushMessages";
import { getPushRecipients, PushTarget, sendPushBatch } from "../push";

const db = admin.firestore();
const TZ = "Europe/Istanbul";

// Sessiz saatler: gece bildirim göndermemek için (Apple da agresif
// bildirimleri "spam" olarak değerlendiriyor).
const QUIET_HOURS_START = 22; // 22:00'dan sonra gönderme
const QUIET_HOURS_END = 9;    // 09:00'dan önce gönderme

const TRIGGERS = [
    { key: "hour1", ms: 1 * 60 * 60 * 1000, unit: "hour", n: 1 },
    { key: "day1", ms: 24 * 60 * 60 * 1000, unit: "day", n: 1 },
    { key: "day3", ms: 3 * 24 * 60 * 60 * 1000, unit: "day", n: 3 },
    { key: "day7", ms: 7 * 24 * 60 * 60 * 1000, unit: "day", n: 7 },
] as const;

function hourInTz(date: Date): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        hour: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export const noRecordReminderJob = onSchedule(
    {
        // Saatlik çalışır (1 saatlik tetikleyici için gerekli), ama sessiz
        // saatlerde gönderim yapılmaz.
        schedule: "0 * * * *",
        timeZone: TZ,
    },
    async () => {
        const now = new Date();
        const hour = hourInTz(now);

        if (hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END) {
            logger.info("noRecordReminderJob skipped (quiet hours)", { hour });
            return;
        }

        const studentsSnap = await db.collectionGroup("students").get();

        type Pending = {
            studentRef: FirebaseFirestore.DocumentReference;
            studentId: string;
            userId: string;
            triggerKey: string;
            unit: "hour" | "day";
            n: number;
            newFlags: Record<string, boolean>;
        };

        const pending: Pending[] = [];

        for (const doc of studentsSnap.docs) {
            const data = doc.data();

            // 📌 kayıt varsa skip
            if (data.lastRecordedAt) continue;
            if (!data.createdAt) continue;

            const created = data.createdAt.toDate();
            const diffMs = now.getTime() - created.getTime();
            const flags: Record<string, boolean> = data.reminderFlags || {};

            // ⚠️ Eski sürüm eşiği geçen TÜM tetikleyicileri aynı anda gönderiyordu:
            // 8 gün önce eklenmiş bir öğrenci için tek seferde 4 bildirim.
            // Artık sadece en güncel eşik gönderilir, geçilenler işaretlenir.
            const due = TRIGGERS.filter((t) => diffMs >= t.ms && !flags[t.key]);
            if (due.length === 0) continue;

            const latest = due[due.length - 1];
            const newFlags = { ...flags };
            due.forEach((t) => {
                newFlags[t.key] = true;
            });

            const userId = doc.ref.parent.parent?.id;
            if (!userId) continue;

            pending.push({
                studentRef: doc.ref,
                studentId: doc.id,
                userId,
                triggerKey: latest.key,
                unit: latest.unit,
                n: latest.n,
                newFlags,
            });
        }

        if (pending.length === 0) return;

        const recipients = await getPushRecipients(pending.map((p) => p.userId));

        const targets: PushTarget[] = [];
        const writes: Promise<unknown>[] = [];

        for (const item of pending) {
            writes.push(
                item.studentRef
                    .update({ reminderFlags: item.newFlags })
                    .catch((err) =>
                        logger.warn("reminderFlags update failed", {
                            studentId: item.studentId,
                            message: err?.message,
                        })
                    )
            );

            const recipient = recipients.get(item.userId);
            if (!recipient) continue;

            const msg = pushText("noRecord", recipient.lang, {
                label: durationLabel(recipient.lang, item.unit, item.n),
            });
            targets.push({
                userId: item.userId,
                token: recipient.token,
                title: msg.title,
                body: msg.body,
                data: { type: "noRecord", studentId: item.studentId },
            });
        }

        const sent = await sendPushBatch(targets);
        await Promise.all(writes);

        logger.info("noRecordReminderJob done", {
            candidates: pending.length,
            sent,
        });
    }
);

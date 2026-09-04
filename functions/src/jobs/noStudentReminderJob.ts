import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { PushTarget, sendPushBatch } from "../push";

const db = admin.firestore();
const TZ = "Europe/Istanbul";

// Kayıt tarihinden itibaren sadece bu günlerde hatırlat, sonra sus.
// (Eski sürüm hiç öğrenci eklemeyen kullanıcıya HER GÜN sonsuza kadar
// bildirim gönderiyordu.)
const REMINDER_DAYS = [1, 3, 7, 14] as const;
const MAX_DAY = REMINDER_DAYS[REMINDER_DAYS.length - 1];

export const noStudentReminderJob = onSchedule(
    {
        schedule: "0 10 * * *", // ⏰ her sabah 10:00
        timeZone: TZ,
    },
    async () => {
        const now = Date.now();

        const usersSnap = await db
            .collection("users")
            .where("pushEnabled", "==", true)
            .get();

        const targets: PushTarget[] = [];
        const writes: Promise<unknown>[] = [];

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();

            const token = userData?.pushToken;
            if (typeof token !== "string" || !token) continue;

            const createdAt = userData?.createdAt?.toDate?.();
            if (!createdAt) continue;

            const daysSinceSignup = Math.floor(
                (now - createdAt.getTime()) / 86400000
            );
            if (daysSinceSignup > MAX_DAY) continue;

            const day = REMINDER_DAYS.find((d) => d === daysSinceSignup);
            if (!day) continue;

            const flags = userData?.noStudentFlags || {};
            if (flags[`day${day}`]) continue;

            // 👇 students var mı bak
            const studentsSnap = await userDoc.ref
                .collection("students")
                .limit(1)
                .get();

            if (!studentsSnap.empty) continue;

            targets.push({
                userId: userDoc.id,
                token,
                title: "Öğrenci Eklemeyi Unuttun 👀",
                body: "Henüz hiç öğrenci eklemedin. Hemen ekleyip takibe başla.",
                data: { type: "noStudent", screen: "home" },
            });

            writes.push(
                userDoc.ref
                    .update({ [`noStudentFlags.day${day}`]: true })
                    .catch((err) =>
                        logger.warn("noStudentFlags update failed", {
                            userId: userDoc.id,
                            message: err?.message,
                        })
                    )
            );
        }

        const sent = await sendPushBatch(targets);
        await Promise.all(writes);

        logger.info("noStudentReminderJob done", {
            candidates: targets.length,
            sent,
        });
    }
);

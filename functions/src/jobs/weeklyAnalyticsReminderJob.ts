import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { langOf, pushText } from "../i18n/pushMessages";
import { PushTarget, sendPushBatch } from "../push";

const db = admin.firestore();
const TZ = "Europe/Istanbul";

export const weeklyAnalyticsReminderJob = onSchedule(
    {
        schedule: "0 10 * * 1", // ⏰ Her Pazartesi 10:00
        timeZone: TZ,
    },
    async () => {
        // pushEnabled kontrolü query'ye taşındı: bildirimleri kapatan
        // kullanıcılara da gönderiliyordu.
        const usersSnap = await db
            .collection("users")
            .where("pushEnabled", "==", true)
            .get();

        const targets: PushTarget[] = [];

        for (const userDoc of usersSnap.docs) {
            const token = userDoc.data()?.pushToken;
            if (typeof token !== "string" || !token) continue;

            // Hiç öğrencisi olmayan kullanıcıya "analizlerine bak" demek anlamsız.
            const studentsSnap = await userDoc.ref
                .collection("students")
                .limit(1)
                .get();
            if (studentsSnap.empty) continue;

            const msg = pushText("weeklyAnalytics", langOf(userDoc.data()));
            targets.push({
                userId: userDoc.id,
                token,
                title: msg.title,
                body: msg.body,
                data: { type: "weeklyAnalytics", screen: "analytics" },
            });
        }

        const sent = await sendPushBatch(targets);

        logger.info("weeklyAnalyticsReminderJob done", {
            candidates: targets.length,
            sent,
        });
    }
);

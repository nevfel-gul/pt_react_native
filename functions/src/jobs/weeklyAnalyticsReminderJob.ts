import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { sendPush } from "../push";

const db = admin.firestore();

export const weeklyAnalyticsReminderJob = onSchedule(
    {
        schedule: "0 8 * * 1", // ⏰ Her Pazartesi 08:00
        timeZone: "Europe/Istanbul",
    },
    async () => {

        const usersSnap = await db.collection("users").get();

        for (const userDoc of usersSnap.docs) {

            const data = userDoc.data();
            const token = data?.pushToken;

            if (!token) continue;

            await sendPush(
                token,
                "Haftalık Analiz Zamanı 📊",
                "Öğrencilerinin gelişim analizlerine baktın mı? Kontrol etmeyi unutma."
            );
        }
    }
);

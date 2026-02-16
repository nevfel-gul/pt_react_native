import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { sendPush } from "../push";

const db = admin.firestore();

export const noRecordReminderJob = onSchedule(
    {
        schedule: "every 1 hours", // test için
        timeZone: "Europe/Istanbul",
    },
    async () => {


        const now = new Date(
            new Date().toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
            })
        );

        const studentsSnap = await db
            .collectionGroup("students")
            .get();


        for (const doc of studentsSnap.docs) {

            const data = doc.data();

            // 📌 kayıt varsa skip
            if (data.lastRecordedAt) continue;
            if (!data.createdAt) continue;

            const created = data.createdAt.toDate();
            const diffMs = now.getTime() - created.getTime();

            const flags = data.reminderFlags || {};

            const triggers = [
                { key: "hour1", ms: 1 * 60 * 60 * 1000, label: "1 saat" },
                { key: "day1", ms: 24 * 60 * 60 * 1000, label: "1 gün" },
                { key: "day3", ms: 3 * 24 * 60 * 60 * 1000, label: "3 gün" },
                { key: "day7", ms: 7 * 24 * 60 * 60 * 1000, label: "7 gün" },
            ];

            for (const t of triggers) {

                if (diffMs >= t.ms && !flags[t.key]) {

                    // 🔑 user path
                    const userId = doc.ref.parent.parent?.id;
                    if (!userId) continue;

                    const userSnap = await db
                        .collection("users")
                        .doc(userId)
                        .get();

                    const token = userSnap.data()?.pushToken;
                    if (!token) continue;

                    await sendPush(
                        token,
                        "Kayıt Oluşturulmadı ⚠️",
                        `Öğrenci eklendi ancak ${t.label} içinde değerlendirme girilmedi.`
                    );

                    // ✅ spam önleme
                    await doc.ref.update({
                        [`reminderFlags.${t.key}`]: true
                    });
                }
            }
        }
    }
);

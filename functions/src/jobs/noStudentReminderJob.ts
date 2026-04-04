import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { sendPush } from "../push";

const db = admin.firestore();

export const noStudentReminderJob = onSchedule(
    {
        schedule: "0 8 * * *", // ⏰ her sabah 08:00
        timeZone: "Europe/Istanbul",
    },
    async () => {
        const usersSnap = await db.collection("users").get();

        for (const userDoc of usersSnap.docs) {

            const userId = userDoc.id;
            const userData = userDoc.data();

            const token = userData?.pushToken;
            if (!token) continue;

            // 👇 students var mı bak
            const studentsSnap = await db
                .collection("users")
                .doc(userId)
                .collection("students")
                .limit(1)
                .get();

            if (!studentsSnap.empty) continue;

            // 📩 push
            await sendPush(
                token,
                "Öğrenci Eklemeyi Unuttun 👀",
                "Henüz hiç öğrenci eklemedin. Hemen ekleyip takibe başla."
            );
        }
    }
);

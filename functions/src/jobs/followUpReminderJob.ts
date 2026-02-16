import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { sendPush } from "../push";

const db = admin.firestore();

export const followUpReminderJob = onSchedule(
    {
        schedule: "0 8 * * *",   // ⏰ Her sabah 08:00
        timeZone: "Europe/Istanbul",
    },
    async () => {
        const today = new Date(
            new Date().toLocaleString("en-US", {
                timeZone: "Europe/Istanbul",
            })
        );

        const studentsSnap = await db
            .collectionGroup("students")
            .get();

        for (const doc of studentsSnap.docs) {

            const data = doc.data();

            if (!data.lastRecordedAt || !data.followUpDays) continue;

            const last = data.lastRecordedAt.toDate();
            const followUpDays = data.followUpDays;
            const flags = data.followUpFlags || {};

            // 📅 kayıt günü
            const nextDate = new Date(last);
            nextDate.setDate(nextDate.getDate() + followUpDays);

            // 📅 3 gün önce hatırlatma
            let reminderDate: Date | null = null;

            if (followUpDays === 20 || followUpDays === 30) {
                reminderDate = new Date(nextDate);
                reminderDate.setDate(reminderDate.getDate() - 3);
            }

            const isSameDay = (d1: Date, d2: Date) =>
                d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate();

            const diffDays = Math.floor(
                (today.getTime() - nextDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            let sendType:
                | "record"
                | "reminder"
                | "overdue1"
                | "overdue3"
                | "overdue7"
                | null = null;

            if (isSameDay(today, nextDate)) sendType = "record";
            if (reminderDate && isSameDay(today, reminderDate)) sendType = "reminder";
            if (diffDays === 1 && !flags.overdue1) sendType = "overdue1";
            if (diffDays === 3 && !flags.overdue3) sendType = "overdue3";
            if (diffDays === 7 && !flags.overdue7) sendType = "overdue7";

            if (!sendType) continue;

            const userId = doc.ref.parent.parent?.id;
            if (!userId) continue;

            const userSnap = await db
                .collection("users")
                .doc(userId)
                .get();

            const token = userSnap.data()?.pushToken;
            if (!token) continue;

            const messages = {
                record: {
                    title: "Kayıt Günü Geldi 📅",
                    body: "Öğrencinin değerlendirme günü bugün.",
                },
                reminder: {
                    title: "Kayıt Zamanı Yaklaşıyor ⏳",
                    body: "3 gün sonra değerlendirme kaydı var.",
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

            await sendPush(
                token,
                messages[sendType].title,
                messages[sendType].body
            );

            await doc.ref.update({
                [`followUpFlags.${sendType}`]: true,
            });

        }
    }
);

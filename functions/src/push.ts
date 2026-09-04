import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_BATCH = 100; // Expo tek istekte en fazla 100 mesaj kabul eder

export type PushTarget = {
    userId: string;
    token: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
};

type ExpoTicket = {
    status: "ok" | "error";
    id?: string;
    message?: string;
    details?: { error?: string };
};

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

/**
 * Expo'ya toplu push gönderir.
 *
 * Eski sürüm fetch sonucunu hiç okumuyordu: geçersiz token, kota hatası veya
 * Expo'nun 200 içinde döndürdüğü `status: "error"` ticket'ları sessizce
 * kayboluyordu. Artık ticket'lar işleniyor ve cihazdan silinmiş token'lar
 * (DeviceNotRegistered) Firestore'dan temizleniyor.
 */
export async function sendPushBatch(targets: PushTarget[]): Promise<number> {
    const valid = targets.filter((t) => t.token);
    if (valid.length === 0) return 0;

    const db = admin.firestore();
    const deadTokenUserIds = new Set<string>();
    let sent = 0;

    for (const group of chunk(valid, MAX_BATCH)) {
        try {
            const res = await fetch(EXPO_PUSH_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                },
                body: JSON.stringify(
                    group.map((t) => ({
                        to: t.token,
                        title: t.title,
                        body: t.body,
                        sound: "default",
                        channelId: "default", // Android'de kanal zorunlu
                        data: t.data ?? {},
                    }))
                ),
            });

            if (!res.ok) {
                logger.error("Expo push HTTP error", {
                    status: res.status,
                    body: await res.text().catch(() => ""),
                });
                continue;
            }

            const json = (await res.json()) as { data?: ExpoTicket[] };
            const tickets = json?.data ?? [];

            tickets.forEach((ticket, i) => {
                if (ticket?.status === "ok") {
                    sent += 1;
                    return;
                }

                const target = group[i];
                logger.warn("Expo push ticket error", {
                    userId: target?.userId,
                    message: ticket?.message,
                    error: ticket?.details?.error,
                });

                if (ticket?.details?.error === "DeviceNotRegistered" && target) {
                    deadTokenUserIds.add(target.userId);
                }
            });
        } catch (err: any) {
            logger.error("Expo push request failed", { message: err?.message });
        }
    }

    // 🧹 Cihazdan silinmiş token'ları temizle (yoksa her çalışmada boşa istek atılır)
    await Promise.all(
        [...deadTokenUserIds].filter(Boolean).map((userId) =>
            db
                .collection("users")
                .doc(userId)
                .update({ pushToken: admin.firestore.FieldValue.delete() })
                .catch(() => undefined)
        )
    );

    return sent;
}

/**
 * Bildirim gönderilebilecek kullanıcıları döner.
 * `pushEnabled === false` olanlar HER ZAMAN elenir — job'lar bu kontrolü
 * kendileri yapmadığı için bildirimleri kapatan kullanıcılara push gidiyordu.
 */
export async function getPushRecipients(
    userIds: Iterable<string>
): Promise<Map<string, string>> {
    const db = admin.firestore();
    const ids = [...new Set(userIds)];
    const out = new Map<string, string>();

    if (ids.length === 0) return out;

    // getAll 1..N doküman için tek turda çalışır → job'lardaki N+1 okumayı bitirir.
    for (const group of chunk(ids, 300)) {
        const refs = group.map((id) => db.collection("users").doc(id));
        const snaps = await db.getAll(...refs);

        snaps.forEach((snap) => {
            if (!snap.exists) return;
            const data = snap.data();
            if (data?.pushEnabled === false) return;
            const token = data?.pushToken;
            if (typeof token === "string" && token.length > 0) {
                out.set(snap.id, token);
            }
        });
    }

    return out;
}

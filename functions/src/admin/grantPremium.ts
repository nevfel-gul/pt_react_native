import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";

// ⚠️ constants/PremiumContext.tsx içindeki TIER_STUDENT_LIMITS ile aynı olmalı.
// Uygulama limiti kendi tarafında tier'dan türetiyor; buradaki değer sadece
// dokümanda bilgi amaçlı saklanıyor.
const TIER_STUDENT_LIMITS: Record<string, number | null> = {
    core: 10,
    pro: 30,
    studio: null,
};

const VALID_TIERS = ["core", "pro", "studio"] as const;
type GiftTier = (typeof VALID_TIERS)[number];

/** Uzunluk sızdırmayan sabit zamanlı karşılaştırma. */
function secretMatches(provided: unknown, expected: string): boolean {
    if (typeof provided !== "string" || !expected) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

type Body = {
    secret?: string;
    email?: string;
    tier?: string;
    months?: number;
    revoke?: boolean;
};

/** İlk header değerini string olarak döner. */
function headerValue(v: string | string[] | undefined): string | undefined {
    if (Array.isArray(v)) return v[0];
    return v;
}

/**
 * Kullanıcıya elle premium verir veya geri alır.
 *
 * Kullanım:
 *   curl -X POST https://europe-west1-pt-app-native.cloudfunctions.net/grantPremium \
 *     -H "X-Admin-Key: $ADMIN_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"biri@ornek.com","tier":"pro","months":12}'
 *
 * Geri alma:
 *     -d '{"email":"biri@ornek.com","revoke":true}'
 *
 * Anahtar header'da taşınır: gövdeye gömülünce içindeki bir tırnak/satır sonu
 * JSON'ı bozup isteği daha koda ulaşmadan 400'e düşürüyordu.'
 */
export const grantPremium = onRequest(
    { cors: false, secrets: ["ADMIN_API_KEY"] },
    async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "POST required" });
            return;
        }

        const expected = process.env.ADMIN_API_KEY ?? "";

        // Gövde ayrıştırılamamışsa Express boş obje bırakır; HTML hata sayfası
        // yerine anlaşılır bir JSON dönmek için burada yakalıyoruz.
        const body: Body =
            req.body && typeof req.body === "object" ? (req.body as Body) : {};

        // Anahtar önce header'dan, yoksa gövdeden (geriye dönük uyumluluk).
        const provided =
            headerValue(req.headers["x-admin-key"]) ?? body.secret;

        if (!secretMatches(provided, expected)) {
            // İstemciye sebep verme; loga yaz.
            logger.warn("grantPremium: unauthorized", { ip: req.ip });
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (!email) {
            res.status(400).json({ error: "email required" });
            return;
        }

        let user: admin.auth.UserRecord;
        try {
            user = await admin.auth().getUserByEmail(email);
        } catch {
            res.status(404).json({ error: `No user with email ${email}` });
            return;
        }

        const userRef = admin.firestore().collection("users").doc(user.uid);

        // ── Geri alma ────────────────────────────────────────────────
        if (body.revoke) {
            await userRef.set(
                {
                    subscription: {
                        isActive: false,
                        revokedAt: new Date().toISOString(),
                    },
                },
                { merge: true }
            );

            logger.info("grantPremium: revoked", { uid: user.uid, email });
            res.json({ ok: true, action: "revoked", uid: user.uid, email });
            return;
        }

        // ── Verme ────────────────────────────────────────────────────
        const tier = String(body.tier ?? "").toLowerCase() as GiftTier;
        if (!VALID_TIERS.includes(tier)) {
            res.status(400).json({ error: `tier must be one of ${VALID_TIERS.join(", ")}` });
            return;
        }

        const months = Number(body.months ?? 0);
        if (!Number.isFinite(months) || months < 0 || months > 120) {
            res.status(400).json({ error: "months must be between 0 and 120 (0 = süresiz)" });
            return;
        }

        let expiresAt: string | null = null;
        if (months > 0) {
            const d = new Date();
            d.setMonth(d.getMonth() + months);
            expiresAt = d.toISOString();
        }

        const subscription = {
            productId: `gift_${tier}`,
            tier,
            billing: "monthly",
            isActive: true,
            studentLimit: TIER_STUDENT_LIMITS[tier],
            isUnlimited: tier === "studio",
            purchasedAt: new Date().toISOString(),

            // 🎁 Apple'da makbuzu yok. Sunucu tarafı abonelik doğrulaması
            // eklendiğinde bu alan sayesinde hediyeler silinmeyecek.
            source: "gift",
            expiresAt,
            grantedAt: new Date().toISOString(),
        };

        await userRef.set({ subscription }, { merge: true });

        logger.info("grantPremium: granted", {
            uid: user.uid,
            email,
            tier,
            months,
            expiresAt,
        });

        res.json({
            ok: true,
            action: "granted",
            uid: user.uid,
            email,
            tier,
            expiresAt: expiresAt ?? "süresiz",
        });
    }
);

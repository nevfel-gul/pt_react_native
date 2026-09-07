import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";

import { CAMPAIGNS, COUPONS, type CampaignDoc } from "../promo/promo";

/** Uzunluk sızdırmayan sabit zamanlı karşılaştırma. */
function secretMatches(provided: unknown, expected: string): boolean {
    if (typeof provided !== "string" || !expected) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

function headerValue(v: string | string[] | undefined): string | undefined {
    return Array.isArray(v) ? v[0] : v;
}

type Body = {
    secret?: string;
    action?: string;
    campaignId?: string;
    productId?: string;
    codes?: unknown;
    email?: string;
    campaign?: Partial<CampaignDoc>;
};

const DEFAULTS: CampaignDoc = {
    active: false,
    title: "",
    discountPercent: 25,
    offerIdentifier: "promo25",
    productIds: [],
    triggerAfterMinutes: 180,
    couponValidMinutes: 180,
    couponPrefix: "ATH",
    maxCodeGrants: 3,
    startsAt: null,
    endsAt: null,
};

/**
 * Promosyon kampanyalarını ve Apple teklif kodu havuzunu yönetir.
 * grantPremium ile aynı desen: ADMIN_API_KEY header'da taşınır.
 *
 *   BASE=https://europe-west1-pt-app-native.cloudfunctions.net/promoAdmin
 *
 *   # Kampanya oluştur/güncelle
 *   curl -X POST $BASE -H "X-Admin-Key: $ADMIN_KEY" -H "Content-Type: application/json" -d '{
 *     "action":"upsertCampaign","campaignId":"launch25",
 *     "campaign":{"active":true,"title":"%25 Hoş Geldin","discountPercent":25,
 *       "offerIdentifier":"promo25","triggerAfterMinutes":180,"couponValidMinutes":180,
 *       "productIds":["athletrack_core_monthly","athletrack_pro_monthly"]}}'
 *
 *   # ASC'den indirilen tek kullanımlık kodları yükle (ürün başına)
 *   curl -X POST $BASE -H "X-Admin-Key: $ADMIN_KEY" -H "Content-Type: application/json" -d '{
 *     "action":"uploadCodes","campaignId":"launch25",
 *     "productId":"athletrack_pro_monthly","codes":["ABC123","DEF456"]}'
 *
 *   # Durum
 *   curl -X POST $BASE -H "X-Admin-Key: $ADMIN_KEY" -H "Content-Type: application/json" \
 *     -d '{"action":"stats","campaignId":"launch25"}'
 */
export const promoAdmin = onRequest(
    { cors: false, secrets: ["ADMIN_API_KEY"], timeoutSeconds: 540 },
    async (req, res) => {
        if (req.method !== "POST") {
            res.status(405).json({ error: "POST required" });
            return;
        }

        const expected = process.env.ADMIN_API_KEY ?? "";
        const body: Body = req.body && typeof req.body === "object" ? (req.body as Body) : {};
        const provided = headerValue(req.headers["x-admin-key"]) ?? body.secret;

        if (!secretMatches(provided, expected)) {
            logger.warn("promoAdmin: unauthorized", { ip: req.ip });
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        const db = admin.firestore();
        const action = String(body.action ?? "").trim();

        try {
            switch (action) {
                // ── Kampanya oluştur / güncelle ──────────────────────
                case "upsertCampaign": {
                    const campaignId = String(body.campaignId ?? "").trim();
                    if (!campaignId) {
                        res.status(400).json({ error: "campaignId required" });
                        return;
                    }
                    const ref = db.collection(CAMPAIGNS).doc(campaignId);
                    const existing = (await ref.get()).data() as CampaignDoc | undefined;
                    const merged: Record<string, unknown> = {
                        ...(existing ?? DEFAULTS),
                        ...(body.campaign ?? {}),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    };
                    if (!existing) merged.createdAt = admin.firestore.FieldValue.serverTimestamp();

                    // Tarihler ISO string olarak gelir → Timestamp'e çevir.
                    for (const key of ["startsAt", "endsAt"] as const) {
                        const raw = (body.campaign as Record<string, unknown> | undefined)?.[key];
                        if (typeof raw === "string" && raw) {
                            merged[key] = admin.firestore.Timestamp.fromDate(new Date(raw));
                        } else if (raw === null) {
                            merged[key] = null;
                        }
                    }

                    await ref.set(merged, { merge: true });
                    res.json({ ok: true, campaignId, campaign: (await ref.get()).data() });
                    return;
                }

                case "listCampaigns": {
                    const snap = await db.collection(CAMPAIGNS).get();
                    res.json({
                        ok: true,
                        campaigns: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
                    });
                    return;
                }

                // ── ASC teklif kodlarını havuza yükle ────────────────
                case "uploadCodes": {
                    const campaignId = String(body.campaignId ?? "").trim();
                    const productId = String(body.productId ?? "").trim();
                    const raw = body.codes;
                    if (!campaignId || !productId) {
                        res.status(400).json({ error: "campaignId and productId required" });
                        return;
                    }

                    // CSV yapıştırmak da mümkün olsun: string gelirse satır/virgülden böl.
                    const list = (
                        Array.isArray(raw)
                            ? raw.map((c) => String(c))
                            : String(raw ?? "").split(/[\s,;]+/)
                    )
                        .map((c) => c.trim().toUpperCase())
                        .filter((c) => c.length > 0);

                    if (list.length === 0) {
                        res.status(400).json({ error: "codes required" });
                        return;
                    }

                    const poolRoot = db
                        .collection(CAMPAIGNS)
                        .doc(campaignId)
                        .collection("appleCodes")
                        .doc(productId);
                    await poolRoot.set(
                        { productId, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
                        { merge: true }
                    );

                    // Kod doküman kimliği olarak kullanılıyor → aynı kod iki kez
                    // yüklenirse yeni kayıt açılmaz, havuz şişmez.
                    const pool = poolRoot.collection("codes");
                    let written = 0;
                    for (let i = 0; i < list.length; i += 400) {
                        const batch = db.batch();
                        for (const code of list.slice(i, i + 400)) {
                            batch.set(
                                pool.doc(code),
                                {
                                    code,
                                    productId,
                                    status: "available",
                                    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
                                },
                                { merge: true }
                            );
                            written++;
                        }
                        await batch.commit();
                    }

                    logger.info("promoAdmin: kod yüklendi", { campaignId, productId, written });
                    res.json({ ok: true, campaignId, productId, written });
                    return;
                }

                // ── Kampanya durumu ─────────────────────────────────
                case "stats": {
                    const campaignId = String(body.campaignId ?? "").trim();
                    if (!campaignId) {
                        res.status(400).json({ error: "campaignId required" });
                        return;
                    }
                    const campaignRef = db.collection(CAMPAIGNS).doc(campaignId);
                    const campaign = (await campaignRef.get()).data() as CampaignDoc | undefined;
                    if (!campaign) {
                        res.status(404).json({ error: "campaign not found" });
                        return;
                    }

                    const pools: Record<string, { available: number; issued: number }> = {};
                    for (const productId of campaign.productIds ?? []) {
                        const codes = campaignRef
                            .collection("appleCodes")
                            .doc(productId)
                            .collection("codes");
                        const [available, issued] = await Promise.all([
                            codes.where("status", "==", "available").count().get(),
                            codes.where("status", "==", "issued").count().get(),
                        ]);
                        pools[productId] = {
                            available: available.data().count,
                            issued: issued.data().count,
                        };
                    }

                    const issuedCount = await campaignRef.collection("issued").count().get();
                    const usedCount = await db
                        .collection(COUPONS)
                        .where("campaignId", "==", campaignId)
                        .where("redeemed", "==", true)
                        .count()
                        .get();

                    res.json({
                        ok: true,
                        campaignId,
                        campaign,
                        couponsIssued: issuedCount.data().count,
                        couponsUsed: usedCount.data().count,
                        pools,
                    });
                    return;
                }

                // ── Belirli bir kullanıcıya elle kupon ver ───────────
                case "issueTo": {
                    const campaignId = String(body.campaignId ?? "").trim();
                    const email = String(body.email ?? "").trim().toLowerCase();
                    if (!campaignId || !email) {
                        res.status(400).json({ error: "campaignId and email required" });
                        return;
                    }

                    let user: admin.auth.UserRecord;
                    try {
                        user = await admin.auth().getUserByEmail(email);
                    } catch {
                        res.status(404).json({ error: `No user with email ${email}` });
                        return;
                    }

                    const campaignRef = db.collection(CAMPAIGNS).doc(campaignId);
                    const campaign = (await campaignRef.get()).data() as CampaignDoc | undefined;
                    if (!campaign) {
                        res.status(404).json({ error: "campaign not found" });
                        return;
                    }

                    const now = new Date();
                    const expiresAt = new Date(
                        now.getTime() + (campaign.couponValidMinutes ?? 180) * 60000
                    );
                    const code = `${campaign.couponPrefix || "ATH"}-${crypto
                        .randomBytes(4)
                        .toString("hex")
                        .toUpperCase()}`;

                    await db.collection(COUPONS).doc(code).set({
                        code,
                        campaignId,
                        uid: user.uid,
                        status: "active",
                        discountPercent: campaign.discountPercent,
                        offerIdentifier: campaign.offerIdentifier,
                        productIds: campaign.productIds,
                        grants: {},
                        createdAt: admin.firestore.Timestamp.fromDate(now),
                        expiresAt: expiresAt.toISOString(),
                        manual: true,
                    });
                    await campaignRef.collection("issued").doc(user.uid).set({
                        code,
                        uid: user.uid,
                        issuedAt: admin.firestore.Timestamp.fromDate(now),
                    });
                    await db.collection("users").doc(user.uid).set(
                        {
                            promo: {
                                code,
                                campaignId,
                                discountPercent: campaign.discountPercent,
                                expiresAt: expiresAt.toISOString(),
                                issuedAt: now.toISOString(),
                                status: "active",
                            },
                        },
                        { merge: true }
                    );

                    res.json({ ok: true, code, uid: user.uid, expiresAt: expiresAt.toISOString() });
                    return;
                }

                default:
                    res.status(400).json({
                        error:
                            "action must be one of: upsertCampaign, listCampaigns, uploadCodes, stats, issueTo",
                    });
                    return;
            }
        } catch (err: unknown) {
            logger.error("promoAdmin: hata", { action, err: String(err) });
            res.status(500).json({ error: String(err) });
            return;
        }
    }
);

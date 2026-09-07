import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// ─────────────────────────────────────────────────────────────
// PROMOSYON KUPONU ALTYAPISI
//
// Apple'da kendi kodumuzla fiyat düşüremiyoruz: indirimli fiyat her zaman
// App Store Connect'te tanımlı bir "promotional offer"dan gelir. Bu yüzden
// akış iki katmanlı:
//
//   1) Bizim kuponumuz (promoCoupons/{CODE}) — kime, ne zaman verildi,
//      ne zaman geçersiz olacak; tamamen bizim kontrolümüzde.
//   2) Apple'ın tek kullanımlık teklif kodu (appleCodes havuzu) — kullanıcı
//      planı seçip kuponu kullandığı anda havuzdan çekilir ve Apple'ın
//      kod kullanma ekranına yönlendirilir.
//
// Kullanıcı sadece 1. katmanı görür; 2. katman perde arkasında harcanır.
// ─────────────────────────────────────────────────────────────

export const APPLE_ASC_APP_ID = "6757748679";

/** Apple'ın kodu önceden doldurulmuş kod kullanma ekranı. */
export function buildRedeemUrl(code: string): string {
    return `https://apps.apple.com/redeem?ctx=offercodes&id=${APPLE_ASC_APP_ID}&code=${encodeURIComponent(code)}`;
}

export type CampaignDoc = {
    active: boolean;
    title: string;
    /** Sadece gösterim için; gerçek indirim App Store Connect'teki teklife bağlı. */
    discountPercent: number;
    /** ASC'deki promotional offer'ın "Reference Name / Product Code" değeri. */
    offerIdentifier: string;
    /** Teklifin tanımlı olduğu SKU'lar. */
    productIds: string[];
    /** Kayıttan kaç dakika sonra kupon verilecek. */
    triggerAfterMinutes: number;
    /** Kupon verildikten kaç dakika sonra geçersiz olacak. */
    couponValidMinutes: number;
    /** Üretilen kodun başına eklenir (ör. "ATH"). */
    couponPrefix: string;
    /** Bir kupon en fazla kaç farklı ürün için Apple kodu harcayabilir. */
    maxCodeGrants: number;
    startsAt?: FirebaseFirestore.Timestamp | null;
    endsAt?: FirebaseFirestore.Timestamp | null;
    createdAt?: FirebaseFirestore.Timestamp;
    updatedAt?: FirebaseFirestore.Timestamp;
};

export const CAMPAIGNS = "promoCampaigns";
export const COUPONS = "promoCoupons";

const db = () => admin.firestore();

/** Karışması kolay harfler (O/0, I/1) elendi. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(prefix: string, length = 6): string {
    let out = "";
    for (let i = 0; i < length; i++) {
        out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return prefix ? `${prefix}-${out}` : out;
}

export function normalizeCode(raw: unknown): string {
    return String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

/** Kampanya tarih aralığında ve açık mı. */
function campaignRunning(c: CampaignDoc, now: Date): boolean {
    if (!c.active) return false;
    if (c.startsAt && c.startsAt.toDate() > now) return false;
    if (c.endsAt && c.endsAt.toDate() < now) return false;
    return true;
}

/** Kullanıcının aktif (süresi dolmamış) aboneliği var mı. */
function hasActiveSubscription(userData: FirebaseFirestore.DocumentData | undefined): boolean {
    const sub = userData?.subscription;
    if (!sub?.isActive) return false;
    if (typeof sub.expiresAt === "string" && sub.expiresAt) {
        const ts = Date.parse(sub.expiresAt);
        if (Number.isFinite(ts) && ts <= Date.now()) return false;
    }
    return true;
}

/** users/{uid}.createdAt alanını Date'e çevirir (Timestamp veya ISO string olabilir). */
function readCreatedAt(userData: FirebaseFirestore.DocumentData | undefined): Date | null {
    const raw = userData?.createdAt;
    if (!raw) return null;
    if (typeof raw?.toDate === "function") return raw.toDate();
    if (typeof raw === "string") {
        const ts = Date.parse(raw);
        return Number.isFinite(ts) ? new Date(ts) : null;
    }
    return null;
}

type CouponPayload = {
    code: string;
    campaignId: string;
    discountPercent: number;
    offerIdentifier: string;
    productIds: string[];
    expiresAt: string;
    status: "active";
};

/**
 * Kampanyanın ürünlerinden şu an havuzunda kod OLANLARI döner.
 *
 * Kupon paketten bağımsız: kullanıcı hangi paketi seçerse o paketin
 * havuzundan kod çekiliyor. Ama havuzu boş bir pakette bu ancak son adımda,
 * App Store'a giderken patlıyordu ve kullanıcı "birazdan tekrar dene" gibi
 * yanıltıcı bir mesaj görüyordu — beklemek bir şeyi düzeltmiyor. Artık
 * kuponun kapsamı stoğa göre veriliyor; stoksuz pakette ödeme ekranı baştan
 * "bu kupon bu pakette geçerli değil" diyor.
 *
 * Liste her sorguda yeniden hesaplanır → havuz doldurulduğunda mevcut
 * kuponlar da kendiliğinden o paketi kapsamaya başlar.
 */
async function stockedProductIds(
    campaignRef: FirebaseFirestore.DocumentReference,
    productIds: string[]
): Promise<string[]> {
    const checks = await Promise.all(
        (productIds ?? []).map(async (productId) => {
            const snap = await campaignRef
                .collection("appleCodes")
                .doc(productId)
                .collection("codes")
                .where("status", "==", "available")
                .limit(1)
                .get();
            return snap.empty ? null : productId;
        })
    );
    return checks.filter((p): p is string => p !== null);
}

function couponPayload(
    code: string,
    campaignId: string,
    c: CampaignDoc,
    expiresAt: Date,
    productIds: string[]
): CouponPayload {
    return {
        code,
        campaignId,
        discountPercent: c.discountPercent,
        offerIdentifier: c.offerIdentifier,
        productIds,
        expiresAt: expiresAt.toISOString(),
        status: "active",
    };
}

// ─────────────────────────────────────────────────────────────
// issuePromoCoupon
//
// İstemci, kullanıcı uygulamayı her açtığında bunu çağırır. Sunucu
// uygunluğu kendisi kontrol eder; istemcinin "ben hak ettim" demesi
// hiçbir şey değiştirmez.
// ─────────────────────────────────────────────────────────────
export const issuePromoCoupon = onCall(async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Giriş gerekli.");

    const now = new Date();
    const userRef = db().collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    if (hasActiveSubscription(userData)) {
        return { eligible: false, reason: "already_subscribed", coupon: null };
    }

    // createdAt yalnızca YENİ kupon üretirken gerekli. Elle verilmiş
    // (issueTo) kuponlar hesabın yaşından bağımsız çalışmalı, yoksa
    // createdAt alanı olmayan eski hesaplarda test bile edilemiyordu.
    const createdAt = readCreatedAt(userData);

    const campaignsSnap = await db()
        .collection(CAMPAIGNS)
        .where("active", "==", true)
        .limit(10)
        .get();

    for (const doc of campaignsSnap.docs) {
        const c = doc.data() as CampaignDoc;
        if (!campaignRunning(c, now)) continue;

        // Zaten kupon aldıysa: aktif ve süresi dolmamışsa aynısını döndür.
        const issuedRef = doc.ref.collection("issued").doc(uid);
        const issuedSnap = await issuedRef.get();
        if (issuedSnap.exists) {
            const existingCode = String(issuedSnap.data()?.code ?? "");
            const couponSnap = existingCode
                ? await db().collection(COUPONS).doc(existingCode).get()
                : null;
            const coupon = couponSnap?.data();
            const expiresAt = coupon?.expiresAt ? Date.parse(coupon.expiresAt) : 0;
            if (coupon?.status === "active" && expiresAt > now.getTime()) {
                const stocked = await stockedProductIds(doc.ref, c.productIds);
                return {
                    eligible: true,
                    reason: "existing",
                    coupon: couponPayload(existingCode, doc.id, c, new Date(expiresAt), stocked),
                };
            }
            // Süresi geçmiş veya kullanılmış → bu kampanyada tekrar kupon yok.
            continue;
        }

        if (!createdAt) {
            // Kayıt tarihi bilinmiyorsa yaşını hesaplayamayız → kendiliğinden
            // kupon verilmez. Elle verilen kupon yukarıda zaten dönmüş olurdu.
            return { eligible: false, reason: "no_created_at", coupon: null };
        }

        const ageMinutes = (now.getTime() - createdAt.getTime()) / 60000;
        if (ageMinutes < c.triggerAfterMinutes) {
            return {
                eligible: false,
                reason: "too_early",
                availableInMinutes: Math.ceil(c.triggerAfterMinutes - ageMinutes),
                coupon: null,
            };
        }

        // Hiçbir pakette kod kalmamışsa kuponu şimdi harcama: kullanıcıya
        // kampanya başına tek kupon hakkı var, boş bir kuponla yanmasın.
        const stocked = await stockedProductIds(doc.ref, c.productIds);
        if (stocked.length === 0) {
            logger.error("issuePromoCoupon: tüm havuzlar boş", { campaignId: doc.id });
            return { eligible: false, reason: "no_stock", coupon: null };
        }

        // ── Kupon üret ──────────────────────────────────────────
        const expiresAt = new Date(now.getTime() + c.couponValidMinutes * 60000);
        let code = "";
        for (let attempt = 0; attempt < 5; attempt++) {
            const candidate = randomCode(c.couponPrefix || "ATH");
            const ref = db().collection(COUPONS).doc(candidate);
            // create() zaten varsa hata verir → çakışmada yeni kod dener.
            try {
                await ref.create({
                    code: candidate,
                    campaignId: doc.id,
                    uid,
                    status: "active",
                    discountPercent: c.discountPercent,
                    offerIdentifier: c.offerIdentifier,
                    productIds: c.productIds,
                    grants: {},
                    createdAt: admin.firestore.Timestamp.fromDate(now),
                    expiresAt: expiresAt.toISOString(),
                });
                code = candidate;
                break;
            } catch {
                continue;
            }
        }

        if (!code) {
            logger.error("issuePromoCoupon: kod üretilemedi", { uid, campaignId: doc.id });
            throw new HttpsError("internal", "Kupon üretilemedi.");
        }

        await issuedRef.set({
            code,
            uid,
            issuedAt: admin.firestore.Timestamp.fromDate(now),
        });

        // İstemci geri sayımı user doc'undan okuyabilsin diye ayna kayıt.
        // Doğrulama her zaman promoCoupons üzerinden yapılır.
        await userRef.set(
            {
                promo: {
                    code,
                    campaignId: doc.id,
                    discountPercent: c.discountPercent,
                    expiresAt: expiresAt.toISOString(),
                    issuedAt: now.toISOString(),
                    status: "active",
                },
            },
            { merge: true }
        );

        logger.info("issuePromoCoupon: verildi", { uid, campaignId: doc.id, code });
        return {
            eligible: true,
            reason: "issued",
            coupon: couponPayload(code, doc.id, c, expiresAt, stocked),
        };
    }

    return { eligible: false, reason: "no_campaign", coupon: null };
});

// ─────────────────────────────────────────────────────────────
// redeemPromoCoupon
//
// Kullanıcı planı seçip kuponu uyguladığında çağrılır. Havuzdan bir Apple
// teklif kodu ayırıp geri döner; uygulama kullanıcıyı Apple'ın kod ekranına
// yönlendirir. Aynı ürün için tekrar çağrılırsa aynı kod döner (kullanıcı
// ekranı kapatıp geri gelirse havuz boşuna tükenmesin).
// ─────────────────────────────────────────────────────────────
export const redeemPromoCoupon = onCall(async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Giriş gerekli.");

    const code = normalizeCode(req.data?.code);
    const productId = String(req.data?.productId ?? "").trim();
    if (!code) throw new HttpsError("invalid-argument", "Kod gerekli.");
    if (!productId) throw new HttpsError("invalid-argument", "productId gerekli.");

    const couponRef = db().collection(COUPONS).doc(code);
    const couponSnap = await couponRef.get();
    if (!couponSnap.exists) throw new HttpsError("not-found", "invalid_code");

    const coupon = couponSnap.data() as {
        uid: string;
        campaignId: string;
        status: string;
        expiresAt: string;
        grants?: Record<string, string>;
    };

    if (coupon.uid !== uid) throw new HttpsError("permission-denied", "not_your_code");

    const expiresAtMs = Date.parse(coupon.expiresAt);
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
        await couponRef.set({ status: "expired" }, { merge: true });
        throw new HttpsError("failed-precondition", "expired");
    }
    if (coupon.status !== "active") {
        throw new HttpsError("failed-precondition", coupon.status === "used" ? "used" : "invalid_code");
    }
    const campaignRef = db().collection(CAMPAIGNS).doc(coupon.campaignId);
    const campaignSnap = await campaignRef.get();
    const campaign = campaignSnap.data() as CampaignDoc | undefined;
    if (!campaign) throw new HttpsError("not-found", "campaign_missing");

    // Kapsam kontrolü kampanya üzerinden yapılır, kuponun üzerindeki listeden
    // değil: kampanyaya sonradan ürün eklenirse eldeki kuponlar da kapsasın.
    if (!campaign.productIds?.includes(productId)) {
        throw new HttpsError("failed-precondition", "product_not_covered");
    }

    // Aynı ürün için daha önce kod verilmişse onu döndür.
    const grants = coupon.grants ?? {};
    if (grants[productId]) {
        return { appleCode: grants[productId], redeemUrl: buildRedeemUrl(grants[productId]) };
    }

    const maxGrants = Number(campaign.maxCodeGrants ?? 3);
    if (Object.keys(grants).length >= maxGrants) {
        throw new HttpsError("resource-exhausted", "grant_limit");
    }

    // Havuzdan boşta bir kod ayır. Kodlar ürün başına ayrı alt koleksiyonda
    // tutuluyor → bileşik indeks gerekmiyor, çekişme de düşük.
    const poolRef = campaignRef.collection("appleCodes").doc(productId).collection("codes");
    const candidates = await poolRef.where("status", "==", "available").limit(10).get();
    if (candidates.empty) {
        logger.error("redeemPromoCoupon: havuz boş", { campaignId: coupon.campaignId, productId });
        throw new HttpsError("resource-exhausted", "pool_empty");
    }

    let appleCode = "";
    for (const candidate of candidates.docs) {
        try {
            await db().runTransaction(async (tx) => {
                const fresh = await tx.get(candidate.ref);
                if (fresh.data()?.status !== "available") throw new Error("taken");
                tx.update(candidate.ref, {
                    status: "issued",
                    issuedTo: uid,
                    couponCode: code,
                    issuedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
            appleCode = String(candidate.data()?.code ?? "");
            break;
        } catch {
            continue;
        }
    }

    if (!appleCode) throw new HttpsError("resource-exhausted", "pool_empty");

    await couponRef.set(
        {
            grants: { ...grants, [productId]: appleCode },
            // status "active" kalıyor: kullanıcı App Store ekranını kapatıp
            // geri gelirse aynı kodu tekrar alabilmeli. İstatistik için ayrı
            // bir bayrak tutuluyor.
            redeemed: true,
            lastRedeemedProductId: productId,
            lastRedeemedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    logger.info("redeemPromoCoupon: kod verildi", { uid, code, productId });
    return { appleCode, redeemUrl: buildRedeemUrl(appleCode) };
});

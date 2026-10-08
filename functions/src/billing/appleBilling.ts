import {
    Environment,
    SignedDataVerifier,
    type JWSTransactionDecodedPayload,
} from "@apple/app-store-server-library";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────
// Apple abonelik doğrulaması.
//
// Abonelik bilgisi (users/{uid}.subscription) artık burada, Apple'ın
// imzaladığı veriye bakılarak yazılır:
//
//  1. verifyApplePurchase (callable): Uygulama satın alma / geri yükleme
//     sonrası StoreKit 2 işleminin JWS'ini (purchase.purchaseToken) gönderir.
//     İmza Apple kök sertifikalarıyla doğrulanır, işlem bu kullanıcıya
//     bağlanır ve abonelik yazılır.
//
//  2. appleNotifications (HTTP): App Store Server Notifications V2 adresi.
//     Yenileme, süre dolması, iade, iptal gibi olaylarda Apple buraya
//     haber verir; abonelik uygulama açılmasa da güncel kalır.
//     App Store Connect → App Information → App Store Server Notifications
//     → Production ve Sandbox URL'si olarak bu fonksiyonun adresi girilir.
//
// İmza doğrulaması için App Store Server API anahtarı (.p8) GEREKMEZ;
// yalnızca Apple'ın açık kök sertifikaları (functions/certs) kullanılır.
// ─────────────────────────────────────────────────────────────

const BUNDLE_ID = "com.athletrack.athletrack";
const APP_APPLE_ID = 6757748679;

type Tier = "core" | "pro" | "studio";

// constants/PremiumContext.tsx → TIER_STUDENT_LIMITS ile aynı olmalı.
const TIER_STUDENT_LIMITS: Record<Tier, number | null> = {
    core: 10,
    pro: 30,
    studio: null,
};

const db = () => admin.firestore();

let rootCerts: Buffer[] | null = null;
function appleRootCerts(): Buffer[] {
    if (!rootCerts) {
        const dir = join(__dirname, "..", "..", "certs");
        rootCerts = readdirSync(dir)
            .filter((f) => f.endsWith(".cer"))
            .map((f) => readFileSync(join(dir, f)));
    }
    return rootCerts;
}

const verifiers: Partial<Record<Environment, SignedDataVerifier>> = {};
function verifier(env: Environment): SignedDataVerifier {
    if (!verifiers[env]) {
        verifiers[env] = new SignedDataVerifier(
            appleRootCerts(),
            true, // sertifika iptal (OCSP) kontrolü
            env,
            BUNDLE_ID,
            env === Environment.PRODUCTION ? APP_APPLE_ID : undefined,
        );
    }
    return verifiers[env]!;
}

/**
 * İmzayı önce Production, olmazsa Sandbox (TestFlight / geliştirme) ortamına
 * göre doğrular. İmza geçersizse hata fırlatır.
 */
async function decodeTransaction(jws: string): Promise<JWSTransactionDecodedPayload> {
    try {
        return await verifier(Environment.PRODUCTION).verifyAndDecodeTransaction(jws);
    } catch (prodErr) {
        try {
            return await verifier(Environment.SANDBOX).verifyAndDecodeTransaction(jws);
        } catch {
            throw prodErr;
        }
    }
}

function tierOf(productId: string): Tier {
    if (productId.includes("studio")) return "studio";
    if (productId.includes("core")) return "core";
    return "pro";
}

/** Doğrulanmış işlemden Firestore'a yazılacak abonelik. */
function subscriptionFrom(tx: JWSTransactionDecodedPayload) {
    const productId = tx.productId ?? "";
    const tier = tierOf(productId);
    const expiresAt = typeof tx.expiresDate === "number" ? tx.expiresDate : null;
    const revoked = typeof tx.revocationDate === "number";
    const isActive = !revoked && (expiresAt == null || expiresAt > Date.now());

    return {
        productId,
        tier,
        billing: productId.includes("annually") ? "annual" : "monthly",
        isActive,
        studentLimit: TIER_STUDENT_LIMITS[tier],
        isUnlimited: tier === "studio",
        purchasedAt: tx.purchaseDate ? new Date(tx.purchaseDate).toISOString() : new Date().toISOString(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        source: "apple" as const,
        verified: true,
        environment: String(tx.environment ?? ""),
        originalTransactionId: tx.originalTransactionId ?? null,
        verifiedAt: new Date().toISOString(),
    };
}

/**
 * Hediye (gift) abonelik süresi devam ederken Apple verisi onu ezmesin;
 * sadece Apple aboneliği gerçekten aktifse üzerine yazılır.
 */
async function writeSubscription(uid: string, sub: ReturnType<typeof subscriptionFrom>) {
    const ref = db().collection("users").doc(uid);
    await db().runTransaction(async (t) => {
        const snap = await t.get(ref);
        const current = snap.data()?.subscription;
        const giftActive =
            current?.source === "gift" &&
            current?.isActive === true &&
            (!current?.expiresAt || Date.parse(current.expiresAt) > Date.now());
        if (giftActive && !sub.isActive) return;
        t.set(ref, { subscription: sub }, { merge: true });
    });
}

// ── 1. Uygulamadan gelen satın alma ─────────────────────────

export const verifyApplePurchase = onCall<{ jws?: string }>(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Giriş gerekli.");

    const jws = request.data?.jws;
    if (typeof jws !== "string" || jws.split(".").length !== 3) {
        throw new HttpsError("invalid-argument", "Geçersiz işlem verisi.");
    }

    let tx: JWSTransactionDecodedPayload;
    try {
        tx = await decodeTransaction(jws);
    } catch (e: any) {
        logger.warn("Apple JWS doğrulanamadı", { uid, message: e?.message, status: e?.status });
        throw new HttpsError("permission-denied", "Satın alma doğrulanamadı.");
    }

    const originalId = tx.originalTransactionId;
    if (!originalId) throw new HttpsError("invalid-argument", "İşlem kimliği yok.");

    // Bir Apple aboneliği tek AthleTrack hesabına bağlanır: aynı makbuzla
    // başka hesapları premium yapmak engellenir.
    const linkRef = db().collection("appleTransactions").doc(originalId);
    const linkedUid = await db().runTransaction(async (t) => {
        const link = await t.get(linkRef);
        const owner = link.data()?.uid as string | undefined;
        if (owner && owner !== uid) return owner;
        t.set(
            linkRef,
            {
                uid,
                productId: tx.productId ?? null,
                environment: String(tx.environment ?? ""),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                ...(owner ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
            },
            { merge: true },
        );
        return uid;
    });

    if (linkedUid !== uid) {
        logger.warn("Apple aboneliği başka hesaba bağlı", { uid, originalId });
        throw new HttpsError("already-exists", "Bu abonelik başka bir hesaba bağlı.");
    }

    const sub = subscriptionFrom(tx);
    await writeSubscription(uid, sub);
    logger.info("Apple satın alma doğrulandı", {
        uid,
        productId: sub.productId,
        isActive: sub.isActive,
        environment: sub.environment,
    });

    return {
        isActive: sub.isActive,
        tier: sub.tier,
        productId: sub.productId,
        expiresAt: sub.expiresAt,
        environment: sub.environment,
    };
});

// ── 2. App Store Server Notifications V2 ─────────────────────

export const appleNotifications = onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    const signedPayload = req.body?.signedPayload;
    if (typeof signedPayload !== "string") {
        res.status(400).send("signedPayload missing");
        return;
    }

    let notification;
    try {
        try {
            notification = await verifier(Environment.PRODUCTION).verifyAndDecodeNotification(signedPayload);
        } catch {
            notification = await verifier(Environment.SANDBOX).verifyAndDecodeNotification(signedPayload);
        }
    } catch (e: any) {
        // İmzası tutmayan istek Apple'dan değildir; tekrar denenmesin.
        logger.warn("Apple bildirimi doğrulanamadı", { message: e?.message });
        res.status(401).send("invalid signature");
        return;
    }

    const type = String(notification.notificationType ?? "");
    const subtype = String(notification.subtype ?? "");
    const signedTx = notification.data?.signedTransactionInfo;

    // TEST bildirimi ve işlem içermeyenler: sadece kaydet.
    if (!signedTx) {
        logger.info("Apple bildirimi (işlemsiz)", { type, subtype });
        res.status(200).send("ok");
        return;
    }

    try {
        const tx = await decodeTransaction(signedTx);
        const originalId = tx.originalTransactionId;
        const link = originalId ? await db().collection("appleTransactions").doc(originalId).get() : null;
        const uid = link?.data()?.uid as string | undefined;

        if (!uid) {
            // Kullanıcı henüz 1.3+ ile uygulamayı açıp doğrulama yapmadıysa
            // eşleşme yok; uygulama açıldığında verifyApplePurchase bağlar.
            logger.info("Apple bildirimi: eşleşen kullanıcı yok", { type, subtype, originalId });
            res.status(200).send("ok");
            return;
        }

        const sub = subscriptionFrom(tx);

        // Ödeme sorunu (DID_FAIL_TO_RENEW): App Store Connect'te 28 günlük
        // "Billing Grace Period" açık; bu süre boyunca erişim devam eder.
        const signedRenewal = notification.data?.signedRenewalInfo;
        if (!sub.isActive && signedRenewal && typeof tx.revocationDate !== "number") {
            try {
                const env = String(tx.environment) === Environment.SANDBOX ? Environment.SANDBOX : Environment.PRODUCTION;
                const renewal = await verifier(env).verifyAndDecodeRenewalInfo(signedRenewal);
                if (typeof renewal.gracePeriodExpiresDate === "number" && renewal.gracePeriodExpiresDate > Date.now()) {
                    sub.isActive = true;
                    sub.expiresAt = new Date(renewal.gracePeriodExpiresDate).toISOString();
                }
            } catch (e: any) {
                logger.warn("Apple yenileme bilgisi doğrulanamadı", { message: e?.message });
            }
        }

        // İade / iptal / süre dolması: işlem verisi ne derse desin kapat.
        if (["EXPIRED", "REFUND", "REVOKE", "GRACE_PERIOD_EXPIRED"].includes(type)) {
            sub.isActive = false;
        }
        await writeSubscription(uid, { ...sub, lastNotification: `${type}${subtype ? `:${subtype}` : ""}` } as any);
        logger.info("Apple bildirimi işlendi", { uid, type, subtype, isActive: sub.isActive });
        res.status(200).send("ok");
    } catch (e: any) {
        // 5xx dönersek Apple bildirimi daha sonra tekrar dener.
        logger.error("Apple bildirimi işlenemedi", { type, message: e?.message });
        res.status(500).send("error");
    }
});

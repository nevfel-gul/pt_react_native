import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// ─────────────────────────────────────────────────────────────
// Apple abonelik doğrulaması (functions/src/billing/appleBilling.ts).
//
// Satın alma / geri yükleme sonrası StoreKit 2 işleminin imzalı hali (JWS,
// react-native-iap'te `purchase.purchaseToken`) sunucuya gönderilir; sunucu
// Apple imzasını doğrulayıp aboneliği kendisi yazar.
// ─────────────────────────────────────────────────────────────

export type VerifiedSubscription = {
    isActive: boolean;
    tier: "core" | "pro" | "studio";
    productId: string;
    expiresAt: string | null;
    environment: string;
};

const verifyFn = httpsCallable<{ jws: string }, VerifiedSubscription>(functions, "verifyApplePurchase");

export async function verifyApplePurchase(jws: string): Promise<VerifiedSubscription> {
    const res = await verifyFn({ jws });
    return res.data;
}

/** Sunucu "bu abonelik başka hesaba bağlı" dediyse istemci yedeğine düşülmemeli. */
export function isOwnershipConflict(e: any) {
    return e?.code === "functions/already-exists";
}

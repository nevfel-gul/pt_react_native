import { functions } from "@/services/firebase";
import { httpsCallable } from "firebase/functions";

// ─────────────────────────────────────────────────────────────
// Kupon istemcisi.
//
// Apple'da kendi kodumuzla fiyat düşüremiyoruz; indirimli fiyat App Store
// Connect'teki "promotional offer"dan gelir. Bizim kodumuz sadece kimin
// indirime hak kazandığını belirler, karşılığında Apple'ın tek kullanımlık
// teklif kodu verilir ve kullanıcı Apple'ın kod ekranına yönlendirilir.
// ─────────────────────────────────────────────────────────────

export type PromoCoupon = {
    code: string;
    campaignId: string;
    discountPercent: number;
    /** ASC'deki promotional offer kimliği — üründeki teklifi eşleştirmek için. */
    offerIdentifier: string;
    /**
     * Kuponun geçerli olduğu ürünler. Kampanyanın tüm ürünleri değil, şu an
     * kod havuzunda stok OLANLAR — sunucu her sorguda yeniden hesaplar.
     * Havuz doldurulunca liste kendiliğinden genişler.
     */
    productIds: string[];
    /** ISO tarih. */
    expiresAt: string;
    status: "active";
};

export type IssueResult = {
    eligible: boolean;
    reason:
    | "issued"
    | "existing"
    | "too_early"
    | "already_subscribed"
    | "no_campaign"
    | "no_created_at"
    | "no_stock";
    availableInMinutes?: number;
    coupon: PromoCoupon | null;
};

export type RedeemResult = {
    appleCode: string;
    redeemUrl: string;
};

export async function issuePromoCoupon(): Promise<IssueResult> {
    const fn = httpsCallable<void, IssueResult>(functions, "issuePromoCoupon");
    const res = await fn();
    return res.data;
}

export async function redeemPromoCoupon(
    code: string,
    productId: string,
): Promise<RedeemResult> {
    const fn = httpsCallable<{ code: string; productId: string }, RedeemResult>(
        functions,
        "redeemPromoCoupon",
    );
    const res = await fn({ code, productId });
    return res.data;
}

/** Sunucudan gelen HttpsError mesajını kullanıcıya gösterilecek i18n anahtarına çevirir. */
export function promoErrorKey(err: any): string {
    const raw = String(err?.message ?? "").replace(/^.*?:\s*/, "").trim();
    switch (raw) {
        case "invalid_code":
            return "promo.error.invalid";
        case "expired":
            return "promo.error.expired";
        case "used":
            return "promo.error.used";
        case "not_your_code":
            return "promo.error.not_yours";
        case "product_not_covered":
            return "promo.error.product";
        case "pool_empty":
        case "grant_limit":
            return "promo.error.unavailable";
        default:
            return "promo.error.generic";
    }
}

/** Kalan süreyi "2s 14dk" biçiminde yazar. */
export function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

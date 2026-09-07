// constants/paywall.ts
import { TIER_STUDENT_LIMITS, type PremiumTier } from "./PremiumContext";

export type BillingCycle = "monthly" | "annual";

/** App Store Connect'te tanımlı bir promotional offer. */
export type PlanOffer = {
    /** ASC'deki teklif kimliği (Product Code / Reference Name). */
    identifier: string;
    /** Apple'ın localized indirimli fiyatı, ör. "₺2.999,99". */
    displayPrice: string;
    priceAmount: number;
    /** payAsYouGo | payUpFront | freeTrial */
    paymentMode?: string;
    numberOfPeriods?: number;
};

export type PlanDoc = {
    id: string;

    active: boolean;
    sortOrder: number;

    tier?: string;
    title: string;
    subtitle: string;

    studentLimit?: number | null;
    isUnlimited?: boolean;
    topPick?: boolean;

    currency?: string;
    monthlyPrice: number;
    annualDiscountPercent?: number;

    // App Store Connect'ten gelen fiyatı OLDUĞU GİBI göster.
    // displayPrice: Apple'ın localized fiyat string'i (ör. "$89.99", "₺1.499,99")
    // priceAmount: aynı fiyatın sayısal karşılığı (bu ürünün dönemine ait: aylık ürün → aylık, yıllık ürün → yıllık)
    displayPrice?: string;
    priceAmount?: number;

    // Apple'ın üründe tanımlı promotional offer'ları (App Store Connect).
    // Fiyat yine Apple'dan olduğu gibi alınır — indirimli tutarı biz hesaplamayız.
    offers?: PlanOffer[];

    perClientNoteMode?: "auto" | "custom";
    footnote?: string | null;

    features?: string[];
};

// ─────────────────────────────────────────────
// ÖĞRENCİ LİMİTİ — TEK DOĞRULUK KAYNAĞI
//
// Limit üç ayrı yerde tutuluyordu (TIER_STUDENT_LIMITS, i18n metinleri ve
// App Store Connect ürün açıklaması) ve üçü birbirini tutmuyordu: kart
// "50 müşteri" derken uygulama 30'da kilitliyordu. Ekranda gösterilen her
// sayı artık TIER_STUDENT_LIMITS'ten türetiliyor.
// ─────────────────────────────────────────────
export function planTierOf(plan: Pick<PlanDoc, "tier" | "id">): PremiumTier {
    const raw = (plan.tier ?? plan.id ?? "").toLowerCase();
    if (raw.includes("studio")) return "studio";
    if (raw.includes("core")) return "core";
    // ITEM_SKUS dışında bir id gelirse premium.tsx'teki getTier ile aynı davran.
    return "pro";
}

export function planStudentLimit(plan: Pick<PlanDoc, "tier" | "id">): number | null {
    return TIER_STUDENT_LIMITS[planTierOf(plan)];
}

// App Store Connect / Apple'ın verdiği fiyatı OLDUĞU GİBI döndürür.
// Uygulama tarafında HİÇBİR fiyat hesabı yapılmaz — Apple ne diyorsa o gösterilir
// (Apple reddi bu yüzdendi: ekrandaki fiyat App Store Connect fiyatından farklıydı).
export function calcDisplayedPrice(plan: PlanDoc, billing: BillingCycle) {
    const amount = Number(plan.priceAmount ?? plan.monthlyPrice ?? 0);
    // Apple localized string yoksa sayısal fiyattan güvenli bir fallback üret.
    const display = plan.displayPrice && plan.displayPrice.length > 0
        ? plan.displayPrice
        : `${amount.toFixed(2)}`;

    return {
        // price: doğrudan gösterilecek Apple string'i (para birimi sembolü dahil)
        price: display,
        amount,
        // suffix i18n olarak component'te belirleniyor; burada dönem bilgisi taşınır
        period: billing === "annual" ? "year" : "month",
        annualSavingsText: plan.annualDiscountPercent
            ? `Save %${plan.annualDiscountPercent}`
            : null,
    };
}

/** Tutarı ürünün para birimi + kullanıcının diliyle biçimlendirir. */
export function formatCurrency(
    amount: number,
    currency: string | undefined,
    locale: string
): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency || "USD",
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        // Intl/para birimi desteklenmiyorsa sembolsüz de olsa doğru sayıyı göster.
        return amount.toFixed(2);
    }
}

/**
 * Öğrenci başına AYLIK maliyet.
 * Yıllık üründe priceAmount yıllık tutardır → aylığa bölerek karşılaştırılabilir tutulur.
 * Fiyat sembolsüz düz sayı olarak basılıyordu ("150.00"), üstündeki fiyat ise
 * Apple'ın localized string'i ("₺1.499,99") — artık ikisi de aynı biçimde.
 */
export function calcPerClientAmount(
    plan: PlanDoc,
    billing: BillingCycle
): number | null {
    if (plan.isUnlimited) return null;

    const limit = Number(planStudentLimit(plan) ?? 0);
    if (!limit) return null;

    const amount = Number(plan.priceAmount ?? plan.monthlyPrice ?? 0);
    if (!amount) return null;

    const perMonth = billing === "annual" ? amount / 12 : amount;
    return perMonth / limit;
}

/**
 * Kupon kampanyasının teklifini ürün üzerinde bulur.
 * Bulunamazsa null döner — o üründe teklif tanımlanmamış demektir ve
 * kullanıcıya indirimli fiyat gösterilmez (Apple ne diyorsa o).
 */
export function findPlanOffer(
    plan: Pick<PlanDoc, "offers">,
    offerIdentifier: string | null | undefined
): PlanOffer | null {
    if (!offerIdentifier) return null;
    return plan.offers?.find((o) => o.identifier === offerIdentifier) ?? null;
}

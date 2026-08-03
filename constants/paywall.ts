// services/paywall.ts
import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "../services/firebase";

export type BillingCycle = "monthly" | "annual";

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

    perClientNoteMode?: "auto" | "custom";
    footnote?: string | null;

    features?: string[];
};

export async function fetchActivePlans(): Promise<PlanDoc[]> {
    // ✅ DEBUG: koleksiyonda hiç plan var mı?
    const col = collection(db, "plans");
    const allSnap = await getDocs(col);

    // ✅ Asıl query: sadece active olanlar
    const qy = query(col, where("active", "==", true), orderBy("sortOrder", "asc"));
    const snap = await getDocs(qy);


    return snap.docs.map((d) => {
        const data = d.data() as any;

        return {
            id: d.id,
            active: !!data.active,
            sortOrder: Number(data.sortOrder ?? 0),

            tier: data.tier ?? "",
            title: data.title ?? "",
            subtitle: data.subtitle ?? "",

            studentLimit: data.studentLimit ?? null,
            isUnlimited: !!data.isUnlimited,
            topPick: !!data.topPick,

            currency: data.currency ?? "USD",
            monthlyPrice: Number(data.monthlyPrice ?? 0),
            annualDiscountPercent: Number(data.annualDiscountPercent ?? 0),

            perClientNoteMode: data.perClientNoteMode,
            footnote: data.footnote ?? null,

            features: Array.isArray(data.features) ? data.features : [],
        } as PlanDoc;
    });
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

export function calcPerClientText(plan: PlanDoc, billing: BillingCycle) {
    if (plan.isUnlimited) {
        return plan.footnote ? plan.footnote : "* decreases as you add";
    }

    const limit = Number(plan.studentLimit || 0);
    if (!limit) return null;

    // Gerçek Apple fiyatı üzerinden aylık eşdeğer öğrenci başı maliyet.
    // Yıllık üründe priceAmount yıllık tutardır → aylığa bölerek karşılaştırılabilir tutulur.
    const amount = Number(plan.priceAmount ?? plan.monthlyPrice ?? 0);
    const perMonth = billing === "annual" ? amount / 12 : amount;
    const perClient = perMonth / limit;
    return `${perClient.toFixed(2)} / client`;
}

export async function createPendingSubscription(params: {
    planId: string;
    billing: BillingCycle;
}) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    const ref = collection(db, "users", user.uid, "subscription_intents");

    const docRef = await addDoc(ref, {
        planId: params.planId,
        billing: params.billing,
        status: "pending",
        platform: Platform.OS,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
}

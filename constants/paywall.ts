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

export function calcDisplayedPrice(plan: PlanDoc, billing: BillingCycle) {
    const monthly = Number(plan.monthlyPrice || 0);

    if (billing === "monthly") {
        return {
            price: monthly,
            suffix: "/ month",
            annualSavingsText: plan.annualDiscountPercent
                ? `Save %${plan.annualDiscountPercent}`
                : null,
        };
    }

    const discount = Math.max(0, Math.min(100, Number(plan.annualDiscountPercent || 0)));
    const annualTotal = monthly * 12 * (1 - discount / 100);
    const effectiveMonthly = annualTotal / 12;

    return {
        price: effectiveMonthly,
        suffix: "/ month",
        annualSavingsText: discount ? `Save %${discount}` : null,
        annualTotal,
    };
}

export function calcPerClientText(plan: PlanDoc) {
    if (plan.isUnlimited) {
        return plan.footnote ? plan.footnote : "* decreases as you add";
    }

    const limit = Number(plan.studentLimit || 0);
    if (!limit) return null;

    const perClient = Number(plan.monthlyPrice || 0) / limit;
    return `$ ${perClient.toFixed(2)} Each Client`;
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

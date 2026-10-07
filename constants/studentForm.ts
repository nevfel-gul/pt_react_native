import en from "@/constants/locales/en.json";
import tr from "@/constants/locales/tr.json";
import type { TFunction } from "i18next";

// ─────────────────────────────────────────────────────────────
// Öğrenci formunun sabitleri.
//
// Seçenekler Firestore'a çevrilmiş metin olarak değil, sabit kimlik olarak
// yazılır ("fat_loss"). Böylece dil değişince veri bozulmaz, analiz ekranı
// metin aramak zorunda kalmaz.
// ─────────────────────────────────────────────────────────────

export const TRAINING_GOALS = [
    { id: "fat_loss", labelKey: "newstudent.goal.option1" },
    { id: "muscle_gain", labelKey: "newstudent.goal.option2" },
    { id: "general_health", labelKey: "newstudent.goal.option3" },
    { id: "posture_flexibility", labelKey: "newstudent.goal.option4" },
    { id: "endurance", labelKey: "newstudent.goal.option5" },
    { id: "body_shaping", labelKey: "newstudent.goal.option6" },
] as const;

export type TrainingGoalId = (typeof TRAINING_GOALS)[number]["id"];

const GOAL_IDS = new Set<string>(TRAINING_GOALS.map((g) => g.id));

// Eski kayıtlarda hedefler o anki dildeki metin olarak duruyor:
// her iki dildeki metni kimliğe çeviren tablo.
const LEGACY_GOAL_TEXT: Record<string, TrainingGoalId> = (() => {
    const map: Record<string, TrainingGoalId> = {};
    for (const g of TRAINING_GOALS) {
        for (const dict of [tr, en] as Record<string, string>[]) {
            const text = dict[g.labelKey];
            if (text) map[text.trim().toLowerCase()] = g.id;
        }
    }
    return map;
})();

/** Eski (metin) ya da yeni (kimlik) hedef listesini kimliklere çevirir. Tanınmayan metin aynen kalır. */
export function normalizeGoals(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const item of raw) {
        const s = String(item ?? "").trim();
        if (!s) continue;
        const id = GOAL_IDS.has(s) ? s : LEGACY_GOAL_TEXT[s.toLowerCase()] ?? s;
        if (!out.includes(id)) out.push(id);
    }
    return out;
}

export function goalLabel(t: TFunction, goal: string): string {
    const g = TRAINING_GOALS.find((x) => x.id === goal);
    return g ? t(g.labelKey) : goal;
}

// ── PAR-Q ──────────────────────────────────────────────────

export const PARQ_KEYS = [
    "doctorSaidHeartOrHypertension",
    "chestPainDuringActivityOrDaily",
    "dizzinessOrLostConsciousnessLast12Months",
    "diagnosedOtherChronicDisease",
    "usesMedicationForChronicDisease",
    "boneJointSoftTissueProblemWorseWithActivity",
    "doctorSaidOnlyUnderMedicalSupervision",
] as const;

/** PAR-Q'da kaç "Evet" var. Bir tane bile varsa antrenman öncesi doktor onayı önerilir. */
export function parqYesCount(s: Record<string, any> | null | undefined): number {
    if (!s) return 0;
    return PARQ_KEYS.filter((k) => s[k] === true).length;
}

// ── Yeni sorular ───────────────────────────────────────────

/** Haftalık orta-yüksek şiddetli aktivite (DSÖ önerisi: 150 dk). */
export const ACTIVITY_LEVELS = ["none", "lt75", "75to150", "gt150"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const SLEEP_LEVELS = ["lt6", "6to8", "gt8"] as const;
export type SleepLevel = (typeof SLEEP_LEVELS)[number];

export const PREGNANCY_STATUSES = ["none", "pregnant", "postpartum"] as const;
export type PregnancyStatus = (typeof PREGNANCY_STATUSES)[number];

export const STRESS_LEVELS = [1, 2, 3, 4, 5] as const;

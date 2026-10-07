// ─────────────────────────────────────────────────────────────
// Ölçüm formu için referans aralıkları.
// Sonuçlar dil bağımsız kimlik olarak kaydedilir; ekranda çevrilir.
// ─────────────────────────────────────────────────────────────

export type BloodPressureCategory = "normal" | "elevated" | "stage1" | "stage2" | "crisis";

/** AHA / ACC 2017 sınıflaması (mmHg). */
export function bloodPressureCategory(systolic: number, diastolic: number): BloodPressureCategory | null {
    if (!systolic || !diastolic) return null;
    if (systolic >= 180 || diastolic >= 120) return "crisis";
    if (systolic >= 140 || diastolic >= 90) return "stage2";
    if (systolic >= 130 || diastolic >= 80) return "stage1";
    if (systolic >= 120) return "elevated";
    return "normal";
}

/** Egzersize başlamadan önce durulması / doktora yönlendirilmesi gereken seviye (ACSM: ≥ 160/100 dinlenik). */
export function bloodPressureNeedsReferral(systolic: number, diastolic: number): boolean {
    return (!!systolic && systolic >= 160) || (!!diastolic && diastolic >= 100);
}

export type VisceralFatStatus = "healthy" | "high";

/** Tanita iç yağ derecesi: 1–12 sağlıklı, 13–59 yüksek. */
export function visceralFatStatus(level: number): VisceralFatStatus | null {
    if (!level) return null;
    return level <= 12 ? "healthy" : "high";
}

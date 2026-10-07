import type { TFunction } from "i18next";

// ─────────────────────────────────────────────────────────────
// Ölçüm sonuçlarının (analysis.*Status) ekranda gösterimi.
//
// Ölçüm formundaki hesaplamalar sonucu her zaman Türkçe metin olarak
// kaydediyor ("Mükemmel", "Ortalama Altı"...). Veri bu haliyle tutarlı,
// eski kayıtlar da böyle; o yüzden kaydı değiştirmiyoruz, sadece
// gösterirken kullanıcının diline çeviriyoruz.
// ─────────────────────────────────────────────────────────────

export type StatusKind = "bmi" | "bodyFat" | "default";

const COMMON: Record<string, string> = {
    "Mükemmel": "excellent",
    "İyi": "good",
    "Ortanın Üstü": "above_average",
    "Ortalama Üstü": "above_average",
    "Orta": "average",
    "Ortalama": "average",
    "Ortanın Altı": "below_average",
    "Ortalama Altı": "below_average",
    "Kötü": "poor",
    "Zayıf": "poor",
    "Çok Kötü": "very_poor",
    "Çok Düşük": "very_low",
    "Düşük": "low",
    "Normal": "normal",
    "Yüksek": "high",
    "Çok Yüksek": "very_high",
    "Sağlıklı": "healthy",
    "Hafif Şişman": "overweight",
    "Şişman": "obese",
    "Geçersiz veri": "invalid",
    "Düşük - Daha fazla sıvı/kas oranı": "impedance_low",
    "Yüksek - Daha fazla yağ/düşük kas oranı": "impedance_high",
    "Metabolik yaş kronolojik yaştan genç": "metabolic_younger",
    "Metabolik yaş kronolojik yaşla uyumlu": "metabolic_same",
    "Metabolik yaş kronolojik yaştan büyük": "metabolic_older",
};

// Aynı kelime farklı ölçümde farklı anlama geliyor.
const BY_KIND: Record<StatusKind, Record<string, string>> = {
    bmi: { "Zayıf": "underweight" },
    bodyFat: { "Orta": "moderate" },
    default: {},
};

// Bel/kalça oranı: "Orta Risk 0.87" gibi, sonunda oran var.
const RISK_PREFIXES: [string, string][] = [
    ["Çok Yüksek Risk", "risk_very_high"],
    ["Yüksek Risk", "risk_high"],
    ["Orta Risk", "risk_moderate"],
    ["Düşük Risk", "risk_low"],
];

/** Kaydedilmiş Türkçe sonuç metnini sabit bir kimliğe çevirir (tanınmazsa null). */
export function statusId(raw: string | null | undefined, kind: StatusKind = "default"): string | null {
    const s = String(raw ?? "").trim();
    if (!s || s === "-") return null;
    return BY_KIND[kind][s] ?? COMMON[s] ?? riskId(s)?.id ?? null;
}

function riskId(s: string): { id: string; ratio: string } | null {
    for (const [prefix, id] of RISK_PREFIXES) {
        if (s.startsWith(prefix)) return { id, ratio: s.slice(prefix.length).trim() };
    }
    return null;
}

/** Sonucu kullanıcının dilinde göster. Tanınmayan metin olduğu gibi döner. */
export function statusLabel(t: TFunction, raw: string | null | undefined, kind: StatusKind = "default"): string {
    const s = String(raw ?? "").trim();
    if (!s) return "-";

    const risk = riskId(s);
    if (risk) {
        const label = t(`status.${risk.id}`);
        return risk.ratio ? `${label} (${risk.ratio})` : label;
    }

    const id = statusId(s, kind);
    return id ? t(`status.${id}`) : s;
}

/** Gösterge çubukları için kaba bir 0–100 puanı (kalite sıralaması olan sonuçlar). */
export const STATUS_SCORE: Record<string, number> = {
    very_poor: 10,
    poor: 25,
    below_average: 35,
    average: 50,
    above_average: 65,
    good: 75,
    excellent: 90,
};

// ── Evet / Hayır cevapları ─────────────────────────────────
// Ölçüm formu eskiden o anki dildeki metni ("Evet"/"Yes") kaydediyordu;
// artık "yes"/"no" yazıyor. Okurken hepsini tanı.

const YES = new Set(["yes", "evet"]);
const NO = new Set(["no", "hayır", "hayir"]);

export function yesNo(value: unknown): "yes" | "no" | null {
    if (value === true) return "yes";
    if (value === false) return "no";
    const v = String(value ?? "").trim().toLowerCase();
    if (YES.has(v)) return "yes";
    if (NO.has(v)) return "no";
    return null;
}

export function yesNoLabel(t: TFunction, value: unknown): string {
    const v = yesNo(value);
    return v === "yes" ? t("recordNew.option.yes") : v === "no" ? t("recordNew.option.no") : "-";
}

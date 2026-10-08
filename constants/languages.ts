import i18n from "i18next";

// ─────────────────────────────────────────────────────────────
// Uygulamanın desteklediği diller — TEK KAYNAK.
//
// Yeni dil eklerken:
//   1. constants/locales/<kod>.json (scripts/check-locales.mjs ile doğrula)
//   2. Buraya bir satır
//   3. services/i18n.ts → resources
//   4. constants/calendarLocale.ts → ay/gün adları
//   5. constants/locales/native/<kod>.json + app.json → locales
//   6. Sunucu: functions/src/i18n/pushMessages.ts, passwordReset.ts
// Tarih/sayı biçimi için hiçbir yerde "tr-TR" / "en-US" sabit yazmayın;
// appLocale() kullanın.
// ─────────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = ["tr", "en", "de", "es", "pt", "fr", "it"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_META: Record<AppLanguage, { label: string; flag: string; locale: string }> = {
    tr: { label: "Türkçe", flag: "🇹🇷", locale: "tr-TR" },
    en: { label: "English", flag: "🇺🇸", locale: "en-US" },
    de: { label: "Deutsch", flag: "🇩🇪", locale: "de-DE" },
    es: { label: "Español", flag: "🇪🇸", locale: "es-ES" },
    pt: { label: "Português (Brasil)", flag: "🇧🇷", locale: "pt-BR" },
    fr: { label: "Français", flag: "🇫🇷", locale: "fr-FR" },
    it: { label: "Italiano", flag: "🇮🇹", locale: "it-IT" },
};

/** "de-AT", "pt_BR", "EN" → desteklenen dil; tanınmazsa İngilizce. */
export function normalizeLanguage(code?: string | null): AppLanguage {
    const short = String(code ?? "").slice(0, 2).toLowerCase();
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(short) ? (short as AppLanguage) : "en";
}

/** Uygulamanın şu anki dili. */
export function currentLanguage(): AppLanguage {
    return normalizeLanguage(i18n.language);
}

/** Tarih / sayı / para biçimi için BCP-47 kodu ("de-DE"). */
export function appLocale(lang: AppLanguage = currentLanguage()): string {
    return LANGUAGE_META[lang].locale;
}

/**
 * Web sitesindeki sayfalar (gizlilik, şartlar, şifre sıfırlama) şimdilik
 * yalnızca /tr ve /en altında var.
 */
export function sitePathLanguage(lang: AppLanguage = currentLanguage()): "tr" | "en" {
    return lang === "tr" ? "tr" : "en";
}

/** Yüzde işareti: Türkçede başta (%28), İngilizcede bitişik (28%), diğerlerinde boşluklu (28 %). */
export function formatPercent(value: string, lang: AppLanguage = currentLanguage()): string {
    if (lang === "tr") return `%${value}`;
    if (lang === "en") return `${value}%`;
    return `${value} %`;
}

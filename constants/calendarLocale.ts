// constants/calendarLocale.ts
// react-native-calendars ve tarih seçicilerin dilini uygulama diline bağlar.
import i18n from "@/services/i18n";
import { LocaleConfig } from "react-native-calendars";

export type CalendarLang = "tr" | "en";

type CalendarLocale = {
    monthNames: string[];
    monthNamesShort: string[];
    dayNames: string[];
    dayNamesShort: string[];
    today: string;
    amDesignator: string;
    pmDesignator: string;
};

export const CALENDAR_LOCALES: Record<CalendarLang, CalendarLocale> = {
    tr: {
        monthNames: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
        monthNamesShort: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
        dayNames: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
        dayNamesShort: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
        today: "Bugün",
        amDesignator: "ÖÖ",
        pmDesignator: "ÖS",
    },
    en: {
        monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        today: "Today",
        amDesignator: "AM",
        pmDesignator: "PM",
    },
};

/** i18n dil kodunu ("tr-TR", "en-US" ...) desteklenen takvim diline indirger. */
export function calendarLangOf(lang?: string | null): CalendarLang {
    return (lang ?? i18n.language ?? "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
}

/** Türkçe'de hafta pazartesi, İngilizce'de pazar başlar. */
export function calendarFirstDay(lang: CalendarLang): number {
    return lang === "tr" ? 1 : 0;
}

/** DateTimePicker (iOS) için BCP-47 kodu. */
export function pickerLocaleOf(lang: CalendarLang): string {
    return lang === "tr" ? "tr-TR" : "en-US";
}

LocaleConfig.locales.tr = CALENDAR_LOCALES.tr;
LocaleConfig.locales.en = CALENDAR_LOCALES.en;

export function applyCalendarLocale(lang?: string | null): CalendarLang {
    const resolved = calendarLangOf(lang);
    LocaleConfig.defaultLocale = resolved;
    return resolved;
}

applyCalendarLocale();
i18n.on("languageChanged", (lng) => applyCalendarLocale(lng));

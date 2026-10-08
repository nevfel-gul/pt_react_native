// constants/calendarLocale.ts
// react-native-calendars ve tarih seçicilerin dilini uygulama diline bağlar.
import i18n from "@/services/i18n";
import { LANGUAGE_META, normalizeLanguage, type AppLanguage } from "@/constants/languages";
import { LocaleConfig } from "react-native-calendars";

export type CalendarLang = AppLanguage;

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
    de: {
        monthNames: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
        monthNamesShort: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
        dayNames: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
        dayNamesShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
        today: "Heute",
        amDesignator: "AM",
        pmDesignator: "PM",
    },
    es: {
        monthNames: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
        monthNamesShort: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"],
        dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
        dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
        today: "Hoy",
        amDesignator: "a. m.",
        pmDesignator: "p. m.",
    },
    pt: {
        monthNames: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
        monthNamesShort: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
        dayNames: ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"],
        dayNamesShort: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
        today: "Hoje",
        amDesignator: "AM",
        pmDesignator: "PM",
    },
    fr: {
        monthNames: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
        monthNamesShort: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
        dayNames: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
        dayNamesShort: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
        today: "Aujourd'hui",
        amDesignator: "AM",
        pmDesignator: "PM",
    },
    it: {
        monthNames: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
        monthNamesShort: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
        dayNames: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"],
        dayNamesShort: ["dom", "lun", "mar", "mer", "gio", "ven", "sab"],
        today: "Oggi",
        amDesignator: "AM",
        pmDesignator: "PM",
    },
};

/** i18n dil kodunu ("tr-TR", "en-US" ...) desteklenen takvim diline indirger. */
export function calendarLangOf(lang?: string | null): CalendarLang {
    return normalizeLanguage(lang ?? i18n.language);
}

/** Hafta pazartesi başlar; yalnızca ABD İngilizcesinde pazar. */
export function calendarFirstDay(lang: CalendarLang): number {
    return lang === "en" ? 0 : 1;
}

/** DateTimePicker (iOS) için BCP-47 kodu. */
export function pickerLocaleOf(lang: CalendarLang): string {
    return LANGUAGE_META[lang].locale;
}

for (const [code, loc] of Object.entries(CALENDAR_LOCALES)) {
    LocaleConfig.locales[code] = loc;
}

export function applyCalendarLocale(lang?: string | null): CalendarLang {
    const resolved = calendarLangOf(lang);
    LocaleConfig.defaultLocale = resolved;
    return resolved;
}

applyCalendarLocale();
i18n.on("languageChanged", (lng) => applyCalendarLocale(lng));

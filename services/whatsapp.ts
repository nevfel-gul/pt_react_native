import { Linking } from "react-native";

// ─────────────────────────────────────────────────────────────
// WhatsApp hazır mesajları.
//
// Sunucu ya da API yok: wa.me linki WhatsApp'ı mesaj yazılmış halde açar,
// hoca sadece gönder'e basar. WhatsApp kurulu değilse link tarayıcıda
// WhatsApp Web'i açar.
// ─────────────────────────────────────────────────────────────

/**
 * Formdaki numarayı wa.me'nin istediği uluslararası biçime çevirir
 * (sadece rakam, ülke koduyla). "0532…" → "90532…", "+49…" → "49…".
 */
export function toWhatsAppNumber(raw?: string | null): string | null {
    const s = String(raw ?? "").replace(/[^\d+]/g, "");
    if (!s) return null;
    if (s.startsWith("+")) {
        const digits = s.slice(1);
        return digits.length >= 8 ? digits : null;
    }
    if (/^05\d{9}$/.test(s)) return "9" + s; // 0532… → 90532…
    if (/^5\d{9}$/.test(s)) return "90" + s; // 532… → 90532…
    if (/^90\d{10}$/.test(s)) return s;
    return null;
}

export function whatsAppLink(number: string, text: string) {
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export async function openWhatsApp(number: string, text: string) {
    await Linking.openURL(whatsAppLink(number, text));
}

export type WhatsAppTemplateId =
    | "appointmentReminder"
    | "packageLow"
    | "packageRenew"
    | "paymentReminder"
    | "measurementDay"
    | "missedYou";

/** Şablonda kullanılabilecek değişkenler (i18n: whatsapp.template.<id>). */
export type WhatsAppVars = {
    name: string;
    coach?: string;
    time?: string;
    date?: string;
    remaining?: number;
    amount?: string;
};

/** Mesajdaki hitap: tam ad yerine ilk isim. */
export function firstName(full?: string | null) {
    return String(full ?? "").trim().split(/\s+/)[0] || "";
}

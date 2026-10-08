import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { doc, setDoc } from "firebase/firestore";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { normalizeLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from "@/constants/languages";
import de from "@/constants/locales/de.json";
import en from "@/constants/locales/en.json";
import es from "@/constants/locales/es.json";
import fr from "@/constants/locales/fr.json";
import it from "@/constants/locales/it.json";
import pt from "@/constants/locales/pt.json";
import tr from "@/constants/locales/tr.json";
import { auth, db } from "./firebase";

const STORAGE_KEY = "app_language";

const resources: Record<AppLanguage, { translation: Record<string, string> }> = {
    tr: { translation: tr },
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    pt: { translation: pt },
    fr: { translation: fr },
    it: { translation: it },
};

/** Cihaz dillerinden ilk desteklenen; hiçbiri yoksa İngilizce. */
function deviceLanguage(): AppLanguage {
    for (const l of Localization.getLocales() ?? []) {
        const code = String(l.languageCode ?? "").toLowerCase();
        if ((SUPPORTED_LANGUAGES as readonly string[]).includes(code)) return code as AppLanguage;
    }
    return "en";
}

export async function initI18n() {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    const lang = saved ? normalizeLanguage(saved) : deviceLanguage();

    if (!i18n.isInitialized) {
        await i18n.use(initReactI18next).init({
            resources,
            lng: lang,
            supportedLngs: [...SUPPORTED_LANGUAGES],
            // Çevirisi eksik bir metin Türkçe değil İngilizce görünsün.
            fallbackLng: { tr: ["en"], default: ["en"] },
            interpolation: { escapeValue: false },
        });
    } else {
        await i18n.changeLanguage(lang);
    }
}

/**
 * Kullanıcının dilini hesabına yazar: sunucudaki bildirimler, e-postalar ve
 * AI yorumu bu dile göre gönderilir (functions/src/i18n/pushMessages.ts).
 */
export async function syncUserLanguage(lang: AppLanguage = normalizeLanguage(i18n.language)) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
        await setDoc(doc(db, "users", uid), { language: lang }, { merge: true });
    } catch (e) {
        console.warn("[i18n] dil hesaba yazılamadı:", e);
    }
}

export async function setAppLanguage(lang: AppLanguage) {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    await i18n.changeLanguage(lang);
    await syncUserLanguage(lang);
}

export default i18n;

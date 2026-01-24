import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/constants/locales/en.json";
import tr from "@/constants/locales/tr.json";

const STORAGE_KEY = "app_language";

const resources = {
    tr: { translation: tr },
    en: { translation: en },
};

export async function initI18n() {
    const savedLang = await AsyncStorage.getItem(STORAGE_KEY);

    const deviceLang =
        Localization.getLocales()?.[0]?.languageCode === "tr" ? "tr" : "en";

    const lang = savedLang || deviceLang;

    if (!i18n.isInitialized) {
        await i18n
            .use(initReactI18next)
            .init({
                resources,
                lng: lang,
                fallbackLng: "tr",
                interpolation: { escapeValue: false },
            });
    } else {
        await i18n.changeLanguage(lang);
    }
}

export async function setAppLanguage(lang: "tr" | "en") {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    await i18n.changeLanguage(lang);
}

export default i18n;

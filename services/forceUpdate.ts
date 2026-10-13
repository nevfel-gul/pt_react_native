import Constants from "expo-constants";
import { doc, getDoc } from "firebase/firestore";
import { Linking, Platform } from "react-native";
import { db } from "./firebase";
import { ANDROID_PACKAGE, IOS_APP_ID } from "./rating";

// ─────────────────────────────────────────────────────────────
// Zorunlu güncelleme.
//
// Firestore'daki `app_config/mobile` belgesi (herkese okunur, yazma yalnızca
// yönetici): { minVersion: "1.4" }  — alan yoksa ya da okunamazsa uygulama
// normal açılır (ağ hatası kimseyi dışarıda bırakmasın).
// Bu kontrol 1.4 ve sonrasında vardır; öncesindeki sürümler kapatılamaz.
// ─────────────────────────────────────────────────────────────

export function appVersion(): string {
    return Constants.expoConfig?.version ?? "0";
}

/** "1.10" > "1.4". Sayısal karşılaştırır; eksik parça 0 sayılır. */
export function isOlderThan(version: string, min: string): boolean {
    const a = version.split(".").map((n) => parseInt(n, 10) || 0);
    const b = min.split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] ?? 0;
        const y = b[i] ?? 0;
        if (x !== y) return x < y;
    }
    return false;
}

/** true: bu sürüm artık desteklenmiyor, güncelleme zorunlu. Hata olursa false. */
export async function isUpdateRequired(): Promise<boolean> {
    try {
        const snap = await getDoc(doc(db, "app_config", "mobile"));
        const min = snap.data()?.[Platform.OS === "ios" ? "minVersionIos" : "minVersionAndroid"] ?? snap.data()?.minVersion;
        return typeof min === "string" && min.length > 0 && isOlderThan(appVersion(), min);
    } catch {
        return false;
    }
}

export async function openStoreListing() {
    const url =
        Platform.OS === "ios"
            ? `itms-apps://apps.apple.com/app/id${IOS_APP_ID}`
            : `market://details?id=${ANDROID_PACKAGE}`;
    const fallback =
        Platform.OS === "ios"
            ? `https://apps.apple.com/app/id${IOS_APP_ID}`
            : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
    try {
        await Linking.openURL(url);
    } catch {
        Linking.openURL(fallback).catch(() => { });
    }
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

// ─────────────────────────────────────────────────────────────
// Uygulama kilidi (Face ID / Touch ID / cihaz şifresi).
//
// Tercih bu cihaza özeldir (AsyncStorage): hesaba yazılmaz, çünkü kilit
// cihazı koruyor, hesabı değil. Kilidin kendisini cihaz yapar; uygulama
// yalnızca "açık mı" bilgisini tutar ve sonucu bekler.
// ─────────────────────────────────────────────────────────────

const KEY = "applock:enabled";
type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

export async function getAppLockEnabled(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(KEY)) === "1";
    } catch {
        return false;
    }
}

export async function setAppLockEnabled(enabled: boolean) {
    try {
        await AsyncStorage.setItem(KEY, enabled ? "1" : "0");
    } catch { }
    listeners.forEach((l) => l(enabled));
}

export function subscribeAppLock(fn: Listener) {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

/** Cihazda biyometri ya da şifre kurulu mu? Değilse kilit anlamsız. */
export async function canUseAppLock(): Promise<boolean> {
    try {
        return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
    } catch {
        return false;
    }
}

export async function authenticate(promptMessage: string, cancelLabel: string): Promise<boolean> {
    try {
        const r = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel });
        return r.success;
    } catch {
        return false;
    }
}

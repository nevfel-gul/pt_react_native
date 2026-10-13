import { useTheme } from "@/constants/usetheme";
import { authenticate, canUseAppLock, getAppLockEnabled, setAppLockEnabled, subscribeAppLock } from "@/services/appLock";
import { track } from "@/services/analytics";
import { Lock } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Arka plandan bu süreden önce dönülürse kilit açık kalır (kısa bir bildirime bakıp dönmek için).
const RELOCK_AFTER_MS = 30_000;

/**
 * Kilit açıksa uygulamanın üstünü kapatır. Uygulama değiştiricideki önizleme
 * görüntüsünde de veri görünmesin diye arka plana geçerken de örtülür.
 */
export default function AppLockGate({ active }: { active: boolean }) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [enabled, setEnabled] = useState(false);
    const [ready, setReady] = useState(false);
    const [locked, setLocked] = useState(true);
    const [covered, setCovered] = useState(false);
    const busy = useRef(false);
    const backgroundedAt = useRef<number | null>(null);

    const unlock = useCallback(async () => {
        if (busy.current) return;
        busy.current = true;
        try {
            if (!(await canUseAppLock())) {
                // Cihazda şifre/biyometri kalmamış: kilit uygulanamaz, kullanıcıyı dışarıda bırakma.
                await setAppLockEnabled(false);
                setLocked(false);
                return;
            }
            const ok = await authenticate(t("appLock.prompt"), t("common.cancel"));
            if (ok) {
                setLocked(false);
                track("app_lock_unlocked");
            }
        } finally {
            busy.current = false;
        }
    }, [t]);

    useEffect(() => {
        let alive = true;
        getAppLockEnabled().then((e) => {
            if (!alive) return;
            setEnabled(e);
            setLocked(e);
            setReady(true);
        });
        const off = subscribeAppLock((e) => {
            setEnabled(e);
            setLocked(false); // ayar ekranından açıldı/kapandı: kullanıcı zaten doğrulandı
        });
        return () => {
            alive = false;
            off();
        };
    }, []);

    useEffect(() => {
        const sub = AppState.addEventListener("change", (s) => {
            if (!enabled) return;
            if (s === "background") backgroundedAt.current = Date.now();
            // "inactive" Face ID penceresi ve bildirim merkezinde de olur: sadece örtü, kilit değil.
            setCovered(s !== "active");
            if (s === "active") {
                const at = backgroundedAt.current;
                backgroundedAt.current = null;
                if (at && Date.now() - at > RELOCK_AFTER_MS) setLocked(true);
            }
        });
        return () => sub.remove();
    }, [enabled]);

    // Kilitliyken öne gelince kendiliğinden doğrulama penceresini aç.
    useEffect(() => {
        if (active && enabled && locked && !covered) unlock();
    }, [active, enabled, locked, covered, unlock]);

    if (!active) return null;
    if (ready && (!enabled || (!locked && !covered))) return null;

    return (
        <View style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: theme.colors.background }]} accessibilityViewIsModal>
            <Lock size={40} color={theme.colors.text.secondary} />
            {ready && locked ? (
                <>
                    <Text style={[styles.title, { color: theme.colors.text.primary }]}>{t("appLock.locked")}</Text>
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: theme.colors.accent }]}
                        activeOpacity={0.85}
                        onPress={unlock}
                    >
                        <Text style={[styles.btnText, { color: theme.colors.text.onAccent }]}>{t("appLock.unlock")}</Text>
                    </TouchableOpacity>
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { zIndex: 9000, elevation: 9000, alignItems: "center", justifyContent: "center", padding: 32 },
    title: { fontSize: 20, fontWeight: "800", marginTop: 16 },
    btn: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999 },
    btnText: { fontSize: 16, fontWeight: "800" },
});

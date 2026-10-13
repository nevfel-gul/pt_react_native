import { useTheme } from "@/constants/usetheme";
import { isUpdateRequired, openStoreListing } from "@/services/forceUpdate";
import { track } from "@/services/analytics";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** Sürüm eskiyse tüm uygulamanın üstünü kapatır; tek çıkış mağaza. */
export default function ForceUpdateGate() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [required, setRequired] = useState(false);

    useEffect(() => {
        let alive = true;
        const check = async () => {
            const r = await isUpdateRequired();
            if (!alive) return;
            setRequired((prev) => {
                if (r && !prev) track("force_update_shown");
                return r;
            });
        };
        check();
        // Arka plandan dönünce yeniden bak: kullanıcı mağazadan güncelleyip dönmüş olabilir.
        const sub = AppState.addEventListener("change", (s) => s === "active" && check());
        return () => {
            alive = false;
            sub.remove();
        };
    }, []);

    if (!required) return null;

    return (
        <View style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: theme.colors.background }]} accessibilityViewIsModal>
            <Image source={require("@/assets/images/splash-icon.png")} style={styles.logo} />
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>{t("forceUpdate.title")}</Text>
            <Text style={[styles.body, { color: theme.colors.text.secondary }]}>{t("forceUpdate.message")}</Text>
            <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.colors.accent }]}
                activeOpacity={0.85}
                onPress={() => {
                    track("force_update_tapped");
                    openStoreListing();
                }}
            >
                <Text style={[styles.btnText, { color: theme.colors.text.onAccent }]}>{t("forceUpdate.button")}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { zIndex: 9999, elevation: 9999, alignItems: "center", justifyContent: "center", padding: 32 },
    logo: { width: 96, height: 96, marginBottom: 24 },
    title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
    body: { fontSize: 15, textAlign: "center", marginTop: 10, lineHeight: 22 },
    btn: { marginTop: 28, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999 },
    btnText: { fontSize: 16, fontWeight: "800" },
});

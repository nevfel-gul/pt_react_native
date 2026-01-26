import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Activity,
    ArrowRight,
    BarChart3,
    ChevronDown,
    ShieldCheck,
    Sparkles,
    Users,
    Zap,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Dimensions,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ThemeMode, ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

const { width, height } = Dimensions.get("window");

export default function LandingScreen() {
    const router = useRouter();
    const { t } = useTranslation();

    const { theme, mode } = useTheme();

    const scrollY = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    const handleStart = () => router.push("/(tabs)");

    const heroOpacity = scrollY.interpolate({
        inputRange: [0, height * 0.4],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surfaceDark }]}>
            <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />

            <Animated.ScrollView
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                    useNativeDriver: true,
                })}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ height }}>
                    <Animated.Image
                        source={{
                            uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070",
                        }}
                        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
                    />

                    <LinearGradient
                        colors={
                            mode === "dark"
                                ? ["rgba(10,15,26,0.2)", "rgba(10,15,26,0.8)", theme.colors.surfaceDark]
                                : ["rgba(248,250,252,0.15)", "rgba(248,250,252,0.75)", theme.colors.background]
                        }
                        style={StyleSheet.absoluteFill}
                    />

                    <SafeAreaView style={styles.heroContent}>
                        <Animated.View
                            style={{
                                opacity: heroOpacity,
                                transform: [
                                    {
                                        translateY: scrollY.interpolate({
                                            inputRange: [0, 500],
                                            outputRange: [0, 100],
                                            extrapolate: "clamp",
                                        }),
                                    },
                                ],
                            }}
                        >
                            <Animated.View
                                style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                            >
                                <View
                                    style={[
                                        styles.logoBadge,
                                        {
                                            backgroundColor:
                                                mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
                                            borderColor:
                                                mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
                                        },
                                    ]}
                                >
                                    <Activity size={18} color={theme.colors.primary} />
                                    <Text style={[styles.logoBadgeText, { color: theme.colors.text.secondary }]}>
                                        {t("app.version_badge")}
                                    </Text>
                                </View>

                                <Text style={[styles.brandName, { color: theme.colors.text.primary }]}>
                                    ATHLE<Text style={{ color: theme.colors.primary }}>TRACK</Text>
                                </Text>
                            </Animated.View>

                            <View style={styles.middleSection}>
                                <Animated.Text style={[styles.mainTitle, { opacity: fadeAnim, color: theme.colors.text.primary }]}>
                                    {t("landing.hero.title.line1")}
                                    {"\n"}
                                    <Text style={[styles.highlightText, { color: theme.colors.primary }]}>
                                        {t("landing.hero.title.highlight")}
                                    </Text>
                                </Animated.Text>

                                <Animated.Text
                                    style={[
                                        styles.description,
                                        { opacity: fadeAnim, color: theme.colors.text.secondary },
                                    ]}
                                >
                                    {t("landing.hero.description")}
                                </Animated.Text>
                            </View>
                        </Animated.View>

                        <Animated.View style={[styles.scrollHint, { opacity: heroOpacity }]}>
                            <Text style={[styles.scrollHintText, { color: theme.colors.text.muted }]}>
                                {t("landing.scroll_hint")}
                            </Text>
                            <ChevronDown size={24} color={theme.colors.primary} />
                        </Animated.View>
                    </SafeAreaView>
                </View>

                <View style={[styles.infoSection, { backgroundColor: theme.colors.surfaceDark }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTag, { color: theme.colors.primary }]}>{t("landing.mission.tag")}</Text>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>{t("landing.mission.title")}</Text>
                        <View style={[styles.divider, { backgroundColor: theme.colors.primary }]} />
                    </View>

                    <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                        {t("landing.mission.description")}
                    </Text>

                    <View style={styles.featureGrid}>
                        <InfoCard
                            theme={theme}
                            mode={mode}
                            icon={<BarChart3 size={24} color={theme.colors.primary} />}
                            title={t("landing.feature.analysis.title")}
                            desc={t("landing.feature.analysis.desc")}
                        />
                        <InfoCard
                            theme={theme}
                            mode={mode}
                            icon={<ShieldCheck size={24} color={theme.colors.success} />}
                            title={t("landing.feature.posture.title")}
                            desc={t("landing.feature.posture.desc")}
                        />
                        <InfoCard
                            theme={theme}
                            mode={mode}
                            icon={<Zap size={24} color={theme.colors.warning} />}
                            title={t("landing.feature.performance.title")}
                            desc={t("landing.feature.performance.desc")}
                        />
                        <InfoCard
                            theme={theme}
                            mode={mode}
                            icon={<Users size={24} color={theme.colors.premium} />}
                            title={t("landing.feature.students.title")}
                            desc={t("landing.feature.students.desc")}
                        />
                    </View>
                </View>

                <View style={styles.finalSection}>
                    <LinearGradient colors={[theme.colors.surfaceSoft, theme.colors.surfaceDark]} style={styles.ctaCard}>
                        <Sparkles size={40} color={theme.colors.primary} style={{ marginBottom: 16 }} />

                        <Text style={[styles.ctaTitle, { color: theme.colors.text.primary }]}>{t("landing.cta.title")}</Text>

                        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={handleStart}>
                            <LinearGradient
                                colors={[theme.colors.primary, theme.colors.info]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                <Text style={[styles.buttonText, { color: theme.colors.surfaceDark }]}>{t("landing.cta.button")}</Text>
                                <ArrowRight size={20} color={theme.colors.surfaceDark} strokeWidth={3} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Animated.ScrollView>
        </View>
    );
}

function InfoCard({
    icon,
    title,
    desc,
    theme,
    mode,
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    theme: ThemeUI;
    mode: ThemeMode;
}) {
    return (
        <View
            style={[
                styles.infoCard,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.xl,
                    ...(theme.shadow?.soft ?? {}),
                },
            ]}
        >
            <View
                style={[
                    styles.iconCircle,
                    {
                        backgroundColor: mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.04)",
                        borderRadius: theme.radius.lg,
                    },
                ]}
            >
                {icon}
            </View>
            <Text style={[styles.infoCardTitle, { color: theme.colors.text.primary }]}>{title}</Text>
            <Text style={[styles.infoCardDesc, { color: theme.colors.text.muted }]}>{desc}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    heroContent: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: "space-between",
        paddingVertical: 40,
    },
    header: { alignItems: "flex-start" },

    logoBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    logoBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginLeft: 6 },

    brandName: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },

    middleSection: { marginTop: 20 },
    mainTitle: { fontSize: 52, fontWeight: "900", lineHeight: 58, letterSpacing: -2 },
    highlightText: {},

    description: { fontSize: 17, marginTop: 20, lineHeight: 26, maxWidth: "90%" },

    scrollHint: { alignItems: "center", marginBottom: 20 },
    scrollHintText: { fontSize: 12, fontWeight: "700", marginBottom: 8, letterSpacing: 1 },

    /* Bilgi Bölümü */
    infoSection: { padding: 24, paddingTop: 60 },
    sectionHeader: { marginBottom: 30 },
    sectionTag: { fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: 8 },
    sectionTitle: { fontSize: 32, fontWeight: "800" },
    divider: { width: 60, height: 4, marginTop: 15, borderRadius: 2 },
    infoText: { fontSize: 16, lineHeight: 26, marginBottom: 40 },

    featureGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    infoCard: { width: "48%", padding: 20, marginBottom: 16, borderWidth: 1 },
    iconCircle: {
        width: 48,
        height: 48,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    infoCardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
    infoCardDesc: { fontSize: 12, lineHeight: 18 },

    /* Final Bölümü */
    finalSection: { padding: 24, paddingBottom: 100 },
    ctaCard: { padding: 40, borderRadius: 40, alignItems: "center", overflow: "hidden" },
    ctaTitle: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 32, lineHeight: 36 },

    primaryButton: { height: 64, borderRadius: 20, overflow: "hidden", width: "100%" },
    buttonGradient: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: { fontSize: 18, fontWeight: "800", marginRight: 10 },
});

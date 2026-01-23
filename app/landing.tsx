import { themeui } from "@/constants/themeui";
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
    Zap
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
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function LandingScreen() {
    const router = useRouter();
    const { t } = useTranslation();
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
    }, []);

    const handleStart = () => router.push("/(tabs)");

    const heroOpacity = scrollY.interpolate({
        inputRange: [0, height * 0.4],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <Animated.ScrollView
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ height: height }}>
                    <Animated.Image
                        source={{
                            uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070",
                        }}
                        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
                    />
                    <LinearGradient
                        colors={["rgba(10,15,26,0.2)", "rgba(10,15,26,0.8)", "#0A0F1A"]}
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
                                style={[
                                    styles.header,
                                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                                ]}
                            >
                                <View style={styles.logoBadge}>
                                    <Activity size={18} color={themeui.colors.primary} />
                                    <Text style={styles.logoBadgeText}>{t("app.version_badge")}</Text>
                                </View>

                                {/* ✅ BUNU ESKİSİ GİBİ BIRAKTIM (keyword yok -> es geç) */}
                                <Text style={styles.brandName}>
                                    ATHLE<Text style={{ color: themeui.colors.primary }}>TRACK</Text>
                                </Text>
                            </Animated.View>

                            <View style={styles.middleSection}>
                                <Animated.Text style={[styles.mainTitle, { opacity: fadeAnim }]}>
                                    {t("landing.hero.title.line1")}
                                    {"\n"}
                                    <Text style={styles.highlightText}>
                                        {t("landing.hero.title.highlight")}
                                    </Text>
                                </Animated.Text>

                                <Animated.Text style={[styles.description, { opacity: fadeAnim }]}>
                                    {t("landing.hero.description")}
                                </Animated.Text>
                            </View>
                        </Animated.View>

                        <Animated.View style={[styles.scrollHint, { opacity: heroOpacity }]}>
                            <Text style={styles.scrollHintText}>{t("landing.scroll_hint")}</Text>
                            <ChevronDown size={24} color={themeui.colors.primary} />
                        </Animated.View>
                    </SafeAreaView>
                </View>

                <View style={styles.infoSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTag}>{t("landing.mission.tag")}</Text>
                        <Text style={styles.sectionTitle}>{t("landing.mission.title")}</Text>
                        <View style={styles.divider} />
                    </View>

                    <Text style={styles.infoText}>{t("landing.mission.description")}</Text>

                    <View style={styles.featureGrid}>
                        <InfoCard
                            icon={<BarChart3 size={24} color="#60a5fa" />}
                            title={t("landing.feature.analysis.title")}
                            desc={t("landing.feature.analysis.desc")}
                        />
                        <InfoCard
                            icon={<ShieldCheck size={24} color="#22c55e" />}
                            title={t("landing.feature.posture.title")}
                            desc={t("landing.feature.posture.desc")}
                        />
                        <InfoCard
                            icon={<Zap size={24} color="#f97316" />}
                            title={t("landing.feature.performance.title")}
                            desc={t("landing.feature.performance.desc")}
                        />
                        <InfoCard
                            icon={<Users size={24} color="#e879f9" />}
                            title={t("landing.feature.students.title")}
                            desc={t("landing.feature.students.desc")}
                        />
                    </View>
                </View>

                <View style={styles.finalSection}>
                    <LinearGradient colors={["#1e293b", "#0A0F1A"]} style={styles.ctaCard}>
                        <Sparkles
                            size={40}
                            color={themeui.colors.primary}
                            style={{ marginBottom: 16 }}
                        />
                        <Text style={styles.ctaTitle}>{t("landing.cta.title")}</Text>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            activeOpacity={0.8}
                            onPress={handleStart}
                        >
                            <LinearGradient
                                colors={[themeui.colors.primary, "#3b82f6"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                <Text style={styles.buttonText}>{t("landing.cta.button")}</Text>
                                <ArrowRight size={20} color="#0f172a" strokeWidth={3} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Animated.ScrollView>
        </View>
    );
}

function InfoCard({ icon, title, desc }: { icon: any; title: string; desc: string }) {
    return (
        <View style={styles.infoCard}>
            <View style={styles.iconCircle}>{icon}</View>
            <Text style={styles.infoCardTitle}>{title}</Text>
            <Text style={styles.infoCardDesc}>{desc}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0A0F1A" },
    heroContent: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between", paddingVertical: 40 },
    header: { alignItems: "flex-start" },
    logoBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 12 },
    logoBadgeText: { color: "#94a3b8", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginLeft: 6 },
    brandName: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: -1 },
    middleSection: { marginTop: 20 },
    mainTitle: { fontSize: 52, fontWeight: "900", color: "#fff", lineHeight: 58, letterSpacing: -2 },
    highlightText: { color: themeui.colors.primary },
    description: { fontSize: 17, color: "#94a3b8", marginTop: 20, lineHeight: 26, maxWidth: "90%" },

    scrollHint: { alignItems: "center", marginBottom: 20 },
    scrollHintText: { color: "#64748b", fontSize: 12, fontWeight: "700", marginBottom: 8, letterSpacing: 1 },

    /* Bilgi Bölümü */
    infoSection: { padding: 24, backgroundColor: "#0A0F1A", paddingTop: 60 },
    sectionHeader: { marginBottom: 30 },
    sectionTag: { color: themeui.colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: 8 },
    sectionTitle: { fontSize: 32, fontWeight: "800", color: "#fff" },
    divider: { width: 60, height: 4, backgroundColor: themeui.colors.primary, marginTop: 15, borderRadius: 2 },
    infoText: { fontSize: 16, color: "#94a3b8", lineHeight: 26, marginBottom: 40 },

    featureGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    infoCard: { width: "48%", backgroundColor: "#111827", padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: "#1f2937" },
    iconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
    infoCardTitle: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 8 },
    infoCardDesc: { fontSize: 12, color: "#64748b", lineHeight: 18 },

    /* Final Bölümü */
    finalSection: { padding: 24, paddingBottom: 100 },
    ctaCard: { padding: 40, borderRadius: 40, alignItems: "center", overflow: "hidden" },
    ctaTitle: { fontSize: 28, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 32, lineHeight: 36 },

    primaryButton: { height: 64, borderRadius: 20, overflow: "hidden", width: "100%" },
    buttonGradient: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    buttonText: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
});
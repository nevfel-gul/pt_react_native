import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
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

const PAGE_PAD = 18;
const MAX_W = Math.min(360, width - PAGE_PAD * 2);

// glow’lu PNG: kırpma yok, contain
const ART_W = Math.min(390, width);
const ART_H = Math.round(Math.min(330, height * 0.35));

type Slide = {
    key: string;
    type: "logo" | "content";
    topTagTitleKey?: string;
    topTagBodyKey?: string;
    titleKey?: string;
    titleAccentKey?: string;
    descKey?: string;
    image?: any;
    chipsKeys?: string[];
};

export default function OnboardingScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { theme, mode } = useTheme();

    const styles = useMemo(() => createStyles(theme, mode), [theme, mode]);

    // ✅ floating anim values (MINIMAL)
    const floatA = useRef(new Animated.Value(0)).current;
    const floatB = useRef(new Animated.Value(0)).current;
    const floatC = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const mk = (v: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(v, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(v, {
                        toValue: 0,
                        duration: 3000,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                ])
            );

        const a = mk(floatA, 0);
        const b = mk(floatB, 260);
        const c = mk(floatC, 520);

        a.start();
        b.start();
        c.start();

        return () => {
            a.stop();
            b.stop();
            c.stop();
        };
    }, [floatA, floatB, floatC]);

    const slides: Slide[] = useMemo(
        () => [
            { key: "logo", type: "logo" },
            {
                key: "intake",
                type: "content",
                topTagTitleKey: "onboarding.slides.intake.tag.title",
                topTagBodyKey: "onboarding.slides.intake.tag.body",
                titleKey: "onboarding.slides.intake.title",
                titleAccentKey: "onboarding.slides.intake.titleAccent",
                descKey: "onboarding.slides.intake.desc",
                image: require("../assets/images/Mask-group-2.png"),
            },
            {
                key: "data",
                type: "content",
                titleKey: "onboarding.slides.data.title",
                titleAccentKey: "onboarding.slides.data.titleAccent",
                descKey: "onboarding.slides.data.desc",
                image: require("../assets/images/Mask-group-3.png"),
                chipsKeys: [
                    "onboarding.slides.data.chips.strength",
                    "onboarding.slides.data.chips.flexibility",
                    "onboarding.slides.data.chips.body",
                ],
            },
            {
                key: "ai",
                type: "content",
                topTagTitleKey: "onboarding.slides.ai.tag.title",
                topTagBodyKey: "onboarding.slides.ai.tag.body",
                titleKey: "onboarding.slides.ai.title",
                titleAccentKey: "onboarding.slides.ai.titleAccent",
                descKey: "onboarding.slides.ai.desc",
                image: require("../assets/images/Mask-group-4.png"),
            },
        ],
        []
    );

    const listRef = useRef<FlatList<Slide>>(null);
    const [index, setIndex] = useState(0);

    const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = e.nativeEvent.contentOffset.x;
        setIndex(Math.round(x / width));
    };

    const handleSkip = () => router.replace("/login");
    const handleContinue = () => {
        if (index < slides.length - 1) {
            listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
            setIndex((v) => v + 1);
            return;
        }
        router.replace("/login");
    };

    // ✅ helpers: anim transforms (MINIMAL amp)
    const floatY = (v: Animated.Value, amp: number) =>
        v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] });

    const floatX = (v: Animated.Value, amp: number) =>
        v.interpolate({ inputRange: [0, 1], outputRange: [0, amp] });

    return (
        <View style={styles.root}>
            <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />

            <LinearGradient
                colors={
                    mode === "dark"
                        ? [theme.colors.surfaceDark, theme.colors.background, "#01030a"]
                        : [theme.colors.background, theme.colors.surfaceSoft, theme.colors.surfaceDark]
                }
                locations={[0, 0.62, 1]}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
                {/* header */}
                <View style={styles.header}>
                    <Text style={styles.logoText}>ATHLETRACK</Text>

                    {index > 0 ? (
                        <TouchableOpacity activeOpacity={0.8} onPress={handleSkip} style={styles.skipBtn}>
                            <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 44 }} />
                    )}
                </View>

                <FlatList
                    ref={listRef}
                    data={slides}
                    keyExtractor={(i) => i.key}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onScrollEnd}
                    renderItem={({ item }) => {
                        if (item.type === "logo") {
                            return (
                                <View style={[styles.page, styles.pageLogo]}>
                                    <View style={styles.logoWrap}>
                                        <Image source={require("../assets/images/AppIcon_tr 1.png")} style={styles.logoImg} resizeMode="contain" />
                                    </View>
                                </View>
                            );
                        }

                        const hasTag = !!item.topTagTitleKey && !!item.topTagBodyKey;

                        return (
                            <View style={styles.page}>
                                {/* top bubble (varsa) */}
                                {hasTag ? (
                                    <View style={styles.topTag}>
                                        <Text style={styles.topTagTitle}>{t(item.topTagTitleKey!)}</Text>
                                        <Text style={styles.topTagBody}>{t(item.topTagBodyKey!)}</Text>
                                    </View>
                                ) : (
                                    <View style={{ height: 18 }} />
                                )}

                                {/* ✅ TITLE + DESC (REFERANS GİBİ FOTO ÜSTÜNDE) */}
                                {!!item.titleKey && (
                                    <View style={styles.headText}>
                                        <Text style={styles.title}>
                                            {t(item.titleKey)}
                                            <Text style={styles.titleAccent}>{item.titleAccentKey ? t(item.titleAccentKey) : ""}</Text>
                                        </Text>
                                        {!!item.descKey && <Text style={styles.descTop}>{t(item.descKey)}</Text>}
                                    </View>
                                )}

                                {/* image */}
                                <View style={styles.artWrap}>
                                    <Image source={item.image} style={styles.artImg} resizeMode="contain" />

                                    {/* ✅ Floating feature pills (Sadece chips varsa) */}
                                    {!!item.chipsKeys?.length && (
                                        <>
                                            <Animated.View
                                                style={[
                                                    styles.floatingChip,
                                                    styles.chipOne,
                                                    { transform: [{ translateY: floatY(floatA, 4) }, { translateX: floatX(floatA, 2) }] },
                                                ]}
                                            >
                                                <BlurView intensity={18} tint={mode === "dark" ? "dark" : "light"} style={styles.blurPill}>
                                                    <Text style={styles.chipText}>{t(item.chipsKeys[0])}</Text>
                                                </BlurView>
                                            </Animated.View>

                                            <Animated.View
                                                style={[
                                                    styles.floatingChip,
                                                    styles.chipTwo,
                                                    { transform: [{ translateY: floatY(floatB, 4) }, { translateX: floatX(floatB, -2) }] },
                                                ]}
                                            >
                                                <BlurView intensity={18} tint={mode === "dark" ? "dark" : "light"} style={styles.blurPill}>
                                                    <Text style={styles.chipText}>{t(item.chipsKeys[1])}</Text>
                                                </BlurView>
                                            </Animated.View>

                                            <Animated.View
                                                style={[
                                                    styles.floatingChip,
                                                    styles.chipThree,
                                                    { transform: [{ translateY: floatY(floatC, 4) }, { translateX: floatX(floatC, 2) }] },
                                                ]}
                                            >
                                                <BlurView intensity={18} tint={mode === "dark" ? "dark" : "light"} style={styles.blurPill}>
                                                    <Text style={styles.chipText}>{t(item.chipsKeys[2])}</Text>
                                                </BlurView>
                                            </Animated.View>
                                        </>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                />

                {/* dots + CTA */}
                <View style={styles.bottom}>
                    <View style={styles.dots}>
                        {slides.map((_, i) => {
                            const active = i === index;
                            return <View key={i} style={[styles.dot, active && styles.dotActive]} />;
                        })}
                    </View>

                    <TouchableOpacity activeOpacity={0.9} onPress={handleContinue} style={styles.cta}>
                        <Text style={styles.ctaText}>{t("onboarding.continue")}</Text>
                        <ArrowRight size={18} color={styles.ctaText.color as any} strokeWidth={3} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

function createStyles(theme: ThemeUI, mode: ThemeMode) {
    const isDark = mode === "dark";

    const accent = theme.colors.primary;
    const accent2 = theme.colors.accent;
    const brand = theme.colors.logoText;

    const tagBg = theme.colors.surfaceElevated;
    const tagBorder = theme.colors.border;

    const titleBase = theme.colors.text.emphasis;
    const descColor = theme.colors.text.muted;
    const skipColor = theme.colors.text.secondary;

    const dotInactive = isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.22)";

    return StyleSheet.create({
        root: { flex: 1 },
        safe: { flex: 1 },

        header: {
            paddingHorizontal: PAGE_PAD,
            paddingTop: 6,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },

        logoText: {
            fontSize: theme.fontSize.lg,
            fontWeight: "800",
            color: brand,
            letterSpacing: 0.8,
        },

        skipBtn: { paddingHorizontal: 6, paddingVertical: 6 },
        skipText: { color: skipColor, fontSize: 13, fontWeight: "700" },

        page: { width, paddingHorizontal: PAGE_PAD, paddingTop: 4, alignItems: "center" },
        pageLogo: { justifyContent: "center", paddingTop: 0 },

        logoWrap: {
            width: width - PAGE_PAD * 2,
            alignItems: "center",
            justifyContent: "center",
            minHeight: Math.round(height * 0.62),
        },
        logoImg: { width: 132, height: 132 },

        topTag: {
            width: "100%",
            maxWidth: MAX_W,
            backgroundColor: tagBg,
            borderWidth: 1,
            borderColor: tagBorder,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            marginBottom: 10,
        },
        topTagTitle: { color: theme.colors.text.primary, fontSize: 12, fontWeight: "800", marginBottom: 4 },
        topTagBody: { color: theme.colors.text.secondary, fontSize: 11, lineHeight: 15, fontWeight: "600" },

        /* ✅ head text (referans gibi üstte) */
        headText: {
            width: "100%",
            maxWidth: 380,
            alignItems: "center",
            marginTop: 6,
            marginBottom: 14,
        },
        title: {
            color: titleBase,
            fontSize: 34,
            fontWeight: "900",
            letterSpacing: 0.2,
            textAlign: "center",
        },
        titleAccent: { color: accent2, fontWeight: "900" },
        descTop: {
            marginTop: 10,
            textAlign: "center",
            color: descColor,
            fontSize: 13,
            lineHeight: 19,
            fontWeight: "600",
            maxWidth: 360,
        },

        artWrap: {
            width: ART_W,
            height: ART_H,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            marginTop: 6,
        },
        artImg: { width: "100%", height: "100%" },

        /* ✅ Floating pills (referans gibi: küçük, soft, foto içinde) */
        floatingChip: {
            position: "absolute",
            borderRadius: 999,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)", // daha soft
            shadowColor: "#000",
            shadowOpacity: 0.14,
            shadowRadius: 16,
            elevation: 5,
        },
        blurPill: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(10,15,26,0.72)" : "rgba(255,255,255,0.65)",
        },
        chipText: {
            color: isDark ? "rgba(255,255,255,0.88)" : "rgba(15,23,42,0.82)",
            fontSize: 10,
            fontWeight: "800",
        },

        /* ✅ POZİSYONLAR ART_W/ART_H bazlı (ekran farkında bile bozulmaz) */
        chipOne: {
            top: ART_H * 1,
            left: ART_W * 0.08,
        },
        chipTwo: {
            top: ART_H * 0.46,
            right: ART_W * 0.06,
        },
        chipThree: {
            bottom: ART_H * 0.10,
            left: ART_W * 0.12,
        },

        bottom: {
            paddingHorizontal: PAGE_PAD,
            paddingBottom: Platform.OS === "ios" ? 6 : 14,
            paddingTop: 10,
            alignItems: "center",
            gap: 12,
        },
        dots: { flexDirection: "row", alignItems: "center", gap: 8, height: 18 },
        dot: { width: 5, height: 5, borderRadius: 999, backgroundColor: dotInactive },
        dotActive: { width: 16, backgroundColor: accent, opacity: 0.95 },

        cta: {
            width: "100%",
            maxWidth: 360,
            height: 48,
            borderRadius: 14,
            backgroundColor: accent,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
        },
        ctaText: { color: theme.colors.text.onAccent, fontSize: 14, fontWeight: "900" },
    });
}

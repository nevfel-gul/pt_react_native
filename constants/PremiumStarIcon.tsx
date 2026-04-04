import type { ThemeUI } from "@/constants/types";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

type Props = {
    focused: boolean;
    theme: ThemeUI;
    size?: number; // yıldız boyutu
    style?: ViewStyle;
};

type SparkPos = {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    w: number;
    h: number;
    delay: number;
};

export default function PremiumStarIcon({ focused, theme, size = 28, style }: Props) {
    // ✅ renkler theme'den
    const gold = theme.colors.gold || "#facc15";
    const goldSoft = theme.colors.goldSoft || "rgba(250,204,21,0.15)";
    const accent = (theme.colors as any)?.goldAccent || "#FFF8DC"; // yoksa fallback

    // Anim vals
    const scale = useRef(new Animated.Value(1)).current;
    const shimmer = useRef(new Animated.Value(0)).current; // 0..1
    const glow = useRef(new Animated.Value(focused ? 0.55 : 1)).current; // 0..1

    const loopRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        loopRef.current?.stop();
        loopRef.current = null;

        if (!focused) {
            scale.setValue(1);

            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(scale, {
                        toValue: 1.08,
                        duration: 520,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 0.98,
                        duration: 520,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: true,
                    }),
                ])
            );

            shimmer.setValue(0);
            const shimmerLoop = Animated.loop(
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );

            Animated.timing(glow, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();

            loopRef.current = Animated.parallel([pulse, shimmerLoop]);
            loopRef.current.start();
        } else {
            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1,
                    speed: 18,
                    bounciness: 6,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 160,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(glow, {
                    toValue: 0.55,
                    duration: 220,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }),
            ]).start();
        }

        return () => {
            loopRef.current?.stop();
            loopRef.current = null;
        };
    }, [focused, glow, scale, shimmer]);

    // Shimmer overlay: sağa doğru kayan küçük highlight
    const shimmerTranslate = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-10, 10],
    });

    // Glow opacity
    const glowOpacity = glow.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.22],
    });

    const glowStyle = useMemo(
        () =>
            ({
                shadowColor: gold,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: focused ? 0.25 : 0.7,
                shadowRadius: focused ? 4 : 12,
                elevation: focused ? 10 : 14,
            }) as const,
        [gold, focused]
    );

    // Sparkle yolu (HTML’dekiyle aynı)
    const sparklePath = "M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z";

    // Ana yıldız path’leri (HTML’deki gibi)
    const starOuter =
        "M32 4L39.5 24.5L61 26L44.5 40.5L49 62L32 51L15 62L19.5 40.5L3 26L24.5 24.5L32 4Z";
    const starInner =
        "M32 12L37 26L52 27.5L40.5 38L44 54L32 46L20 54L23.5 38L12 27.5L27 26L32 12Z";

    // ✅ Sparkle konumları (container yüzdesel) — TS union hatası yok artık
    const sparkleLayout: SparkPos[] = [
        { top: "5%", left: "50%", w: 12, h: 12, delay: 0 },
        { top: "25%", right: "5%", w: 10, h: 10, delay: 0.3 },
        { bottom: "25%", right: "5%", w: 8, h: 8, delay: 0.6 },
        { bottom: "5%", left: "50%", w: 12, h: 12, delay: 0.9 },
        { bottom: "25%", left: "5%", w: 10, h: 10, delay: 1.2 },
        { top: "25%", left: "5%", w: 8, h: 8, delay: 0.15 },
    ];

    const box = Math.round(size * 1); // star-container gibi düşün (120px ~ 64*1.9)
    const mainStarSize = Math.round(size * 1); // 64->size ilişkisi

    return (
        <Animated.View
            style={[
                {
                    width: box,
                    height: box,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    borderRadius: 14,
                    transform: [{ scale }],
                    backgroundColor: "transparent",
                    overflow: "visible",
                },
                glowStyle,
                style,
            ]}
        >
            <Animated.View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    width: box + 16,
                    height: box + 16,
                    left: -(8),
                    top: -(8),
                    opacity: focused ? 0.10 : 0.16,
                }}
            >
                <Svg width="100%" height="100%" viewBox="0 0 100 100">
                    <Defs>
                        <RadialGradient id="glowGrad" cx="50%" cy="45%" r="55%">
                            {/* merkez daha parlak */}
                            <Stop offset="0%" stopColor={gold} stopOpacity={0.55} />
                            {/* orta yumuşak */}
                            <Stop offset="45%" stopColor={gold} stopOpacity={0.18} />
                            {/* dışa doğru tamamen sön */}
                            <Stop offset="100%" stopColor={gold} stopOpacity={0} />
                        </RadialGradient>
                    </Defs>
                    <Path d="M0 0H100V100H0Z" fill="url(#glowGrad)" />
                </Svg>
            </Animated.View>
            {/* Sparkles */}
            {!focused &&
                sparkleLayout.map((p, idx) => (
                    <Sparkle
                        key={idx}
                        path={sparklePath}
                        color={gold}
                        size={p.w}
                        style={{
                            position: "absolute",
                            ...(p.top ? { top: p.top } : {}),
                            ...(p.bottom ? { bottom: p.bottom } : {}),
                            ...(p.left ? { left: p.left } : {}),
                            ...(p.right ? { right: p.right } : {}),
                            ...(p.left === "50%" ? { marginLeft: -p.w / 2 } : {}),
                        }}
                        driver={shimmer}
                        delay={p.delay}
                        focused={focused}
                    />
                ))}

            {/* Main Star SVG (arkaplansız) */}
            <Svg width={mainStarSize} height={mainStarSize} viewBox="0 0 64 64">
                <Defs>
                    <LinearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={gold} />
                        <Stop offset="50%" stopColor={accent} />
                        <Stop offset="100%" stopColor={gold} />
                    </LinearGradient>
                </Defs>

                <Path d={starOuter} fill="url(#starGradient)" stroke={gold} strokeWidth={1} />
                <Path d={starInner} fill={"rgba(255,255,255,0.3)"} />
            </Svg>
        </Animated.View>
    );
}

/** Sparkle component (basit scale/opacity anim) */
function Sparkle({
    path,
    color,
    size,
    style,
    driver,
    delay,
    focused,
}: {
    path: string;
    color: string;
    size: number;
    style: any;
    driver: Animated.Value;
    delay: number;
    focused: boolean;
}) {
    const opacity = driver.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1, 0],
    });

    const scale = driver.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 1, 0],
    });

    const shifted = Animated.subtract(driver, delay);

    const op2 = shifted.interpolate({
        inputRange: [-1, -0.2, 0.3, 0.8, 1.2],
        outputRange: [0, 0, 0.2, 1, 0],
        extrapolate: "clamp",
    });

    const sc2 = shifted.interpolate({
        inputRange: [-1, 0.2, 0.6, 1.2],
        outputRange: [0, 0.2, 1, 0],
        extrapolate: "clamp",
    });

    if (focused) return null;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                style,
                {
                    opacity: Animated.multiply(opacity, op2),
                    transform: [{ scale: Animated.multiply(scale, sc2) }],
                },
            ]}
        >
            <Svg width={size} height={size} viewBox="0 0 24 24">
                <Path d={path} fill={color} />
            </Svg>
        </Animated.View>
    );
}

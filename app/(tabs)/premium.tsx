import { LinearGradient } from "expo-linear-gradient";
import { Cpu } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

import type { BillingCycle, PlanDoc } from "@/constants/paywall";
import { useTranslation } from "react-i18next";
import { calcDisplayedPrice, calcPerClientText } from "../../constants/paywall";


type Props = {
  onContinue?: (args: { plan: PlanDoc; billing: BillingCycle; intentId: string }) => Promise<void> | void;
};

export default function PaywallMonthlyScreen({ onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme, mode, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanDoc[]>([]);
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dummyPlans = useMemo<PlanDoc[]>(
    () => [
      {
        id: "core_dummy",
        active: true,
        sortOrder: 1,
        tier: "core",
        title: t("paywall.plan.core.title"),
        subtitle: t("paywall.plan.core.subtitle"),
        studentLimit: 15,
        isUnlimited: false,
        topPick: false,
        currency: "USD",
        monthlyPrice: 29.9,
        annualDiscountPercent: 25,
        perClientNoteMode: "auto",
        footnote: null,
        features: [],
      },
      {
        id: "pro_dummy",
        active: true,
        sortOrder: 2,
        tier: "pro",
        title: t("paywall.plan.pro.title"),
        subtitle: t("paywall.plan.pro.subtitle"),
        studentLimit: 50,
        isUnlimited: false,
        topPick: true,
        currency: "USD",
        monthlyPrice: 79.9,
        annualDiscountPercent: 25,
        perClientNoteMode: "auto",
        footnote: null,
        features: [],
      },
      {
        id: "studio_dummy",
        active: true,
        sortOrder: 3,
        tier: "studio",
        title: t("paywall.plan.studio.title"),
        subtitle: t("paywall.plan.studio.subtitle"),
        studentLimit: null,
        isUnlimited: true,
        topPick: false,
        currency: "USD",
        monthlyPrice: 149.9,
        annualDiscountPercent: 25,
        perClientNoteMode: "auto",
        footnote: t("paywall.plan.unlimited_note"),
        features: [],
      },
    ],
    [t]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        if (!mounted) return;

        setPlans(dummyPlans);
        const top = dummyPlans.find((p) => p.topPick) || dummyPlans[0];
        setSelectedPlanId(top?.id ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setPlans([]);
        setSelectedPlanId(null);
        setError(e?.message ?? "Failed to load plans");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dummyPlans]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const saveText = useMemo(() => {
    const d = plans[0]?.annualDiscountPercent ?? 0;
    return d ? t("paywall.billing.save", { percent: d }) : null;
  }, [plans, t]);

  const accent = billing === "annual" ? theme.colors.premium : theme.colors.primary;

  // ✅ Smooth + light'ta da gradient + annual'da mor
  const ctaGrad = useMemo(() => {
    const isAnnual = billing === "annual";

    // MONTHLY (mavi)
    const blueDark = ["#2E78FF", "#6BB8FF", "#6BB8FF", "#1C63FF"];
    const blueLight = ["#2E78FF", "#6BB8FF", "#6BB8FF", "#2E78FF"];

    // ANNUAL (mor)
    const purpleDark = ["#621fff", "#906fe2", "#a084e6", "#621fff"];
    const purpleLight = ["#621fff", "#906fe2", "#a084e6", "#621fff"];

    if (isAnnual) return mode === "dark" ? purpleDark : purpleLight;
    return mode === "dark" ? blueDark : blueLight;
  }, [billing, mode]);

  const onToggleBilling = useCallback((v: boolean) => {
    setBilling(v ? "annual" : "monthly");
  }, []);

  const onSelectPlan = useCallback((id: string) => {
    setSelectedPlanId(id);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!selectedPlan || busy) return;
    setBusy(true);
    try {
      const intentId = "dummy_intent_id";
      await onContinue?.({ plan: selectedPlan, billing, intentId });
    } finally {
      setBusy(false);
    }
  }, [billing, busy, onContinue, selectedPlan]);

  const continueDisabled = !selectedPlan || busy;

  const styles = useMemo(() => makeStyles(theme, mode), [theme, mode]);

  const isAnnual = billing === "annual";

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {/* BG PHOTO */}
      <View pointerEvents="none" style={styles.bgPhotoWrap}>
        <Image
          source={require("@/assets/images/paywall/gym-couple.png")}
          style={styles.bgPhoto}
          resizeMode="cover"
        />

        <LinearGradient
          colors={[
            mode === "light" ? "rgba(248,250,252,0.92)" : theme.colors.overlay,
            mode === "light" ? "rgba(248,250,252,0.55)" : "rgba(2,6,23,0.70)",
            mode === "light" ? "rgba(248,250,252,0.86)" : "rgba(2,6,23,0.94)",
          ]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        <LinearGradient
          colors={[
            theme.colors.background,
            mode === "light" ? "rgba(248,250,252,0.88)" : "rgba(2,6,23,0.92)",
            "rgba(0,0,0,0)",
          ]}
          locations={[0, 0.55, 1]}
          style={styles.bgFadeLeft}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 16 + 72 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.h1, { color: accent }]}>
            {t("paywall.hero.title")}
          </Text>

          <Text style={styles.desc}>
            {t("paywall.hero.description")}
          </Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              {t("paywall.billing.annual")}
            </Text>
            <Switch
              value={billing === "annual"}
              onValueChange={onToggleBilling}
              thumbColor={theme.colors.surface}
              trackColor={{
                false: mode === "light" ? "rgba(15,23,42,0.15)" : "rgba(255,255,255,0.18)",
                true: accent,
              }}
              ios_backgroundColor={
                mode === "light" ? "rgba(15,23,42,0.15)" : "rgba(255,255,255,0.18)"
              }
            />

            {saveText ? <Text style={[styles.saveText, { color: accent }]}>{saveText}</Text> : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={theme.colors.text.muted} />
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>
              {error
                ? t("paywall.loading.error_prefix", { message: error })
                : t("paywall.loading.no_plans")}
            </Text>
          </View>
        ) : (
          <View style={styles.planList}>
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                billing={billing}
                selected={p.id === selectedPlanId}
                onPress={() => onSelectPlan(p.id)}
                accent={accent}
                theme={theme}
                mode={mode}
              />
            ))}
          </View>
        )}

        <View style={styles.featuresRow}>
          <FeatureMini title={t("paywall.features.ai_detection.title")} theme={theme} mode={mode} muted={false} />
          <FeatureMini title={t("paywall.features.ai_detection.title")} theme={theme} mode={mode} muted={false} />
          <FeatureMini title={t("paywall.features.ai_detection.title")} theme={theme} mode={mode} muted={false} />
        </View>

        <Text style={styles.cancelText}>
          {t("paywall.cancel_text")}
        </Text>
      </ScrollView>

      {/* FIXED CTA */}
      <View style={[styles.fixedBottom, { paddingBottom: theme.spacing.md + insets.bottom }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleContinue}
          disabled={continueDisabled}
          style={[styles.ctaInner, continueDisabled && styles.ctaDisabled]}
        >
          <Text style={[styles.ctaText, { color: "#ffffff" }]}>
            {busy ? t("paywall.cta.processing") : t("paywall.cta.continue")}
          </Text>
          <Text style={[styles.ctaArrow, { color: "#ffffff" }]}>→</Text>

        </TouchableOpacity>

      </View>
    </View>
  );
}

const PlanCard = memo(function PlanCard({
  plan,
  billing,
  selected,
  onPress,
  accent,
  theme,
  mode,
}: {
  plan: PlanDoc;
  billing: BillingCycle;
  selected: boolean;
  onPress: () => void;
  accent: string;
  theme: ThemeUI;
  mode: "dark" | "light";
}) {
  const priceInfo = useMemo(() => calcDisplayedPrice(plan, billing), [plan, billing]);

  const perClient = useMemo(() => {
    const m = plan.perClientNoteMode ?? "auto";
    if (plan.isUnlimited) return null;
    if (m === "custom") return plan.footnote ?? null;
    return calcPerClientText(plan, billing);
  }, [plan, billing]);

  const cardBg = mode === "light" ? theme.colors.surface : "rgba(255,255,255,0.03)";
  const border = mode === "light" ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.06)";
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[
        {
          backgroundColor: cardBg,
          borderRadius: theme.radius.xl,
          paddingVertical: 18,
          paddingHorizontal: 18,
          borderWidth: 1,
          borderColor: border,
        },
        plan.topPick && {
          borderColor: mode === "light" ? "rgba(15,23,42,0.16)" : "rgba(255,255,255,0.12)",
        },
        selected && {
          borderWidth: 2,
          borderColor: accent,
          shadowColor: accent,
          shadowOpacity: 0.2,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        },
      ]}
    >
      {plan.topPick ? (
        <View
          style={{
            position: "absolute",
            left: 12,
            top: -12,
            backgroundColor: theme.colors.gold,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: theme.radius.pill,
            zIndex: 10,
          }}
        >
          <Text style={{ color: theme.colors.surfaceDark, fontWeight: "900", fontSize: 13 }}>
            {t("paywall.plan.top_pick")}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "900",
              marginBottom: 6,
              letterSpacing: -0.45,
              color: accent,
            }}
          >
            {plan.title}
          </Text>
          <Text
            style={{
              color: theme.colors.text.secondary,
              fontSize: 14,
              fontWeight: "800",
              lineHeight: 18,
            }}
          >
            {plan.subtitle}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: "900", letterSpacing: -0.5 }}>
            ${Number(priceInfo.price).toFixed(1)}{" "}
            <Text style={{ color: theme.colors.text.muted, fontSize: 12, fontWeight: "900" }}>
              {priceInfo.suffix}
            </Text>
          </Text>

          {perClient ? (
            <Text style={{ marginTop: 6, color: theme.colors.text.muted, fontSize: 12, fontWeight: "900" }}>
              {perClient}
            </Text>
          ) : null}

          {plan.isUnlimited ? (
            <Text
              style={{
                marginTop: 6,
                color: theme.colors.text.muted,
                fontSize: 12,
                fontStyle: "italic",
                fontWeight: "700",
              }}
            >
              * decreases as you add
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

function FeatureMini({
  title,
  muted,
  theme,
  mode,
}: {
  title: string;
  muted?: boolean;
  theme: ThemeUI;
  mode: "dark" | "light";
}) {
  const chipBg = mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.04)";
  const chipBorder = mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.10)";
  const { t } = useTranslation();
  return (
    <View style={{ width: "31%", alignItems: "center", opacity: muted ? 0.28 : 1 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.pill,
          backgroundColor: chipBg,
          borderWidth: 1,
          borderColor: chipBorder,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Cpu size={20} color={theme.colors.text.muted} />
      </View>

      <Text
        style={{
          color: theme.colors.text.secondary,
          fontWeight: "900",
          fontSize: 12,
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        {title}
      </Text>

      <Text style={{ color: theme.colors.text.muted, fontSize: 10, lineHeight: 12, textAlign: "center" }}>
        {t("paywall.features.ai_detection.description")}
      </Text>
    </View>
  );
}

function makeStyles(theme: ThemeUI, mode: "dark" | "light") {
  const ctaShadow =
    mode === "dark"
      ? {
        shadowColor: "rgba(210,240,255,1)",
        shadowOpacity: 0.35,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 18 },
        elevation: 24,
      }
      : {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
      };

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    bgPhotoWrap: {
      position: "absolute",
      top: 30,
      right: 0,
      width: 260,
      height: 260,
      overflow: "hidden",
      opacity: 0.95,
    },
    bgPhoto: { width: "100%", height: "100%", transform: [{ scale: 1.12 }] },
    bgFadeLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: 175 },

    content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg + 8 },
    hero: { paddingBottom: theme.spacing.md },

    h1: {
      fontSize: 44,
      fontWeight: "900",
      letterSpacing: -1.0,
      lineHeight: 46,
      marginBottom: 10,
    },
    desc: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      lineHeight: 17,
      marginBottom: 12,
      fontWeight: "700",
    },

    toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    toggleLabel: { color: theme.colors.text.primary, fontWeight: "900", fontSize: 15 },
    saveText: { fontWeight: "900", fontSize: 15 },

    midTestWrap: { alignItems: "center", paddingVertical: 14 },
    midTestBtn: {
      width: "70%",
      borderWidth: 2,
      borderRadius: theme.radius.lg,
      paddingVertical: 12,
      backgroundColor: theme.colors.surfaceElevated,
    },
    midTestBtnText: { textAlign: "center", fontWeight: "900", fontSize: 14 },

    centerBox: { paddingVertical: 22, alignItems: "center", justifyContent: "center" },
    emptyText: { color: theme.colors.text.secondary, fontWeight: "800", fontSize: 16 },

    planList: { gap: 14, paddingTop: 10 },

    featuresRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 18,
      paddingTop: 6,
      opacity: mode === "dark" ? 0.33 : 0.7,
    },

    cancelText: {
      marginTop: 14,
      textAlign: "center",
      color: theme.colors.text.secondary,
      fontWeight: "900",
      fontSize: 13,
    },

    fixedBottom: {
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },

    ctaOuter: {
      borderRadius: theme.radius.lg,
      // ✅ arka shadow/holo yok
      shadowColor: "transparent",
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },



    ctaInner: {
      borderRadius: theme.radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      top: 20,
      overflow: "hidden",
      borderWidth: mode === "dark" ? 1 : 0,
      borderColor: mode === "dark" ? "rgba(255,255,255,0.10)" : "transparent",
    },

    ctaShine: {
      position: "absolute",
      left: -40,
      top: 0,
      bottom: 0,
      width: 220,
      transform: [{ skewX: "-18deg" }],
      opacity: 0.35,
    },

    ctaDisabled: { opacity: 0.55 },
    ctaText: { fontSize: 17, fontWeight: "900" },
    ctaArrow: { fontSize: 20, fontWeight: "900", marginLeft: 2 },
  });
}
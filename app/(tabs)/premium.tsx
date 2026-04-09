import { LinearGradient } from "expo-linear-gradient";
import { Cpu } from "lucide-react-native";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import type { BillingCycle, PlanDoc } from "@/constants/paywall";
import { useTranslation } from "react-i18next";
import { calcDisplayedPrice, calcPerClientText } from "../../constants/paywall";

const DUMMY_PLANS: PlanDoc[] = [
  {
    id: "athletrack_core_monthly",
    active: true,
    sortOrder: 1,
    tier: "core",
    title: "Core",
    subtitle: "Temel özellikler",
    currency: "USD",
    monthlyPrice: 9.99,
    topPick: false,
    features: [],
    annualDiscountPercent: 25,
    isUnlimited: false,
    perClientNoteMode: "auto",
    footnote: null,
  },
  {
    id: "athletrack_pro_monthly",
    active: true,
    sortOrder: 2,
    tier: "pro",
    title: "Pro",
    subtitle: "Profesyonel özellikler",
    currency: "USD",
    monthlyPrice: 19.99,
    topPick: true,
    features: [],
    annualDiscountPercent: 25,
    isUnlimited: false,
    perClientNoteMode: "auto",
    footnote: null,
  },
  {
    id: "athletrack_studio_monthly",
    active: true,
    sortOrder: 3,
    tier: "studio",
    title: "Studio",
    subtitle: "Sınırsız erişim",
    currency: "USD",
    monthlyPrice: 39.99,
    topPick: false,
    features: [],
    annualDiscountPercent: 25,
    isUnlimited: true,
    perClientNoteMode: "auto",
    footnote: null,
  },
];

type Props = {
  onPurchase?: (args: { plan: PlanDoc; billing: BillingCycle; productId: string }) => Promise<void> | void;
  onRestorePurchases?: () => Promise<void> | void;
};

export default function PaywallMonthlyScreen({ onPurchase, onRestorePurchases }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();

  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("athletrack_pro_monthly");
  const [busy, setBusy] = useState(false);

  const selectedPlan = useMemo(() => DUMMY_PLANS.find((p) => p.id === selectedPlanId) ?? null, [selectedPlanId]);
  const saveText = useMemo(() => { const d = DUMMY_PLANS[0]?.annualDiscountPercent ?? 0; return d ? t("paywall.billing.save", { percent: d }) : null; }, [t]);
  const accent = billing === "annual" ? theme.colors.premium : theme.colors.primary;

  const handlePurchase = useCallback(async () => {
    if (!selectedPlan || busy) return;
    setBusy(true);
    try {
      Alert.alert(t("premium.alert.purchaseDummy"));
      if (onPurchase) await onPurchase({ plan: selectedPlan, billing, productId: selectedPlan.id });
    } finally { setBusy(false); }
  }, [billing, busy, onPurchase, selectedPlan, t]);

  const handleRestore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (onRestorePurchases) await onRestorePurchases();
      else Alert.alert(t("paywall.alert.restore_title"), t("paywall.alert.restore_message"));
    } catch (e: any) {
      Alert.alert(t("login.error.prefix"), e?.message ?? t("paywall.alert.restore_error"));
    } finally { setBusy(false); }
  }, [busy, onRestorePurchases, t]);

  const styles = useMemo(() => makeStyles(theme, mode), [theme, mode]);
  const buyButtonGradient = useMemo<[string, string, string, string, string]>(() => billing === "annual"
    ? [theme.colors.premium, "#8f4fff", "#b082ff", "#8f4fff", theme.colors.premium]
    : [theme.colors.primary, "#38bdf8", "#8ec1fb", "#38bdf8", theme.colors.primary],
    [billing, theme.colors.premium, theme.colors.primary]);

  const commonFeatures = useMemo(() => [
    { title: t("paywall.features.ai_filter.title"), description: t("paywall.features.ai_filter.description") },
    { title: t("paywall.features.analytics.title"), description: t("paywall.features.analytics.description") },
    { title: t("paywall.features.records.title"), description: t("paywall.features.records.description") },
  ], [t]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View pointerEvents="none" style={styles.bgPhotoWrap}>
        <Image source={require("@/assets/images/paywall/odeme_ekrani_arka_plan.jpg")} style={styles.bgPhoto} resizeMode="cover" />
      </View>
      <View pointerEvents="none" style={[styles.bgOverlay, { backgroundColor: mode === "light" ? "rgba(255,255,255,0.42)" : "rgba(2,6,23,0.38)" }]} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: 56 + insets.bottom }]} showsVerticalScrollIndicator={false} bounces alwaysBounceVertical>
        <View style={styles.hero}>
          <Text style={[styles.h1, { color: accent }]}>{t("paywall.hero.title")}</Text>
          <Text style={styles.desc}>{t("paywall.hero.description")}</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t("paywall.billing.monthly")}</Text>
            <Switch value={billing === "annual"} onValueChange={(v) => setBilling(v ? "annual" : "monthly")} thumbColor={theme.colors.surface} trackColor={{ false: "rgba(255,255,255,0.18)", true: accent }} ios_backgroundColor="rgba(255,255,255,0.18)" />
            <Text style={styles.toggleLabel}>{t("paywall.billing.annual")}</Text>
            {saveText ? <Text style={[styles.saveText, { color: accent }]}>{saveText}</Text> : null}
          </View>
        </View>

        <View style={styles.planList}>
          {DUMMY_PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} billing={billing} selected={p.id === selectedPlanId} onPress={() => setSelectedPlanId(p.id)} accent={accent} theme={theme} mode={mode} />
          ))}
        </View>

        <View style={styles.featuresRow}>
          {commonFeatures.map((item) => <FeatureMini key={item.title} title={item.title} description={item.description} theme={theme} mode={mode} />)}
        </View>

        <Text style={styles.cancelText}>{t("paywall.cancel_text")}</Text>

        <View style={[styles.fixedBottom, { paddingBottom: 8 + insets.bottom }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={handlePurchase} disabled={!selectedPlan || busy} style={[styles.buyBtnWrap, (!selectedPlan || busy) && styles.ctaDisabled]}>
            <LinearGradient colors={buyButtonGradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} locations={[0, 0.25, 0.5, 0.75, 1]} style={styles.buyBtnGradient}>
              <Text style={styles.buyBtnText}>{busy ? t("paywall.cta.processing") : t("paywall.cta.buy")}</Text>
              <Text style={styles.buyBtnArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={handleRestore} disabled={busy} style={[styles.restoreBtn, busy && styles.ctaDisabled]}>
            <Text style={styles.restoreText}>{t("paywall.cta.restore")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const PlanCard = memo(function PlanCard({ plan, billing, selected, onPress, accent, theme, mode }: { plan: PlanDoc; billing: BillingCycle; selected: boolean; onPress: () => void; accent: string; theme: ThemeUI; mode: "dark" | "light" }) {
  const priceInfo = useMemo(() => calcDisplayedPrice(plan, billing), [plan, billing]);
  const perClient = useMemo(() => { if (plan.isUnlimited) return null; if (plan.perClientNoteMode === "custom") return plan.footnote ?? null; return calcPerClientText(plan, billing); }, [plan, billing]);
  const { t } = useTranslation();
  const cardBg = mode === "light" ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.1)";
  const border = mode === "light" ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.06)";
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[{ backgroundColor: cardBg, borderRadius: theme.radius.xl, paddingVertical: 18, paddingHorizontal: 18, borderWidth: 1, borderColor: border }, selected && { borderWidth: 2, borderColor: accent, shadowColor: accent, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 10 }]}>
      {plan.topPick ? <View style={{ position: "absolute", left: 12, top: -12, backgroundColor: theme.colors.gold, paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.pill, zIndex: 10 }}><Text style={{ color: theme.colors.surfaceDark, fontWeight: "900", fontSize: 13 }}>{t("paywall.plan.top_pick")}</Text></View> : null}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", marginBottom: 6, letterSpacing: -0.45, color: accent }}>{plan.title}</Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 14, fontWeight: "800", lineHeight: 18 }}>{plan.subtitle}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: "900", letterSpacing: -0.5 }}>${Number(priceInfo.price).toFixed(1)} <Text style={{ color: theme.colors.text.muted, fontSize: 12, fontWeight: "900" }}>{priceInfo.suffix}</Text></Text>
          {perClient ? <Text style={{ marginTop: 6, color: theme.colors.text.muted, fontSize: 12, fontWeight: "900" }}>{perClient}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

function FeatureMini({ title, description, theme, mode }: { title: string; description: string; theme: ThemeUI; mode: "dark" | "light" }) {
  const chipBg = mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.04)";
  const chipBorder = mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.10)";
  return (
    <View style={{ width: "31%", alignItems: "center" }}>
      <View style={{ width: 44, height: 44, borderRadius: theme.radius.pill, backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Cpu size={20} color={theme.colors.text.muted} />
      </View>
      <Text style={{ color: theme.colors.text.secondary, fontWeight: "900", fontSize: 12, textAlign: "center", marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: theme.colors.text.muted, fontSize: 10, lineHeight: 12, textAlign: "center" }}>{description}</Text>
    </View>
  );
}

function makeStyles(theme: ThemeUI, mode: "dark" | "light") {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    bgPhotoWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    bgOverlay: { ...StyleSheet.absoluteFillObject },
    bgPhoto: { width: "100%", height: "100%", opacity: mode === "light" ? 0.42 : 0.32 },
    content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg + 8 },
    hero: { paddingBottom: theme.spacing.md },
    h1: { fontSize: 44, fontWeight: "900", letterSpacing: -1.0, lineHeight: 46, marginBottom: 10 },
    desc: { color: theme.colors.text.secondary, fontSize: 13, lineHeight: 17, marginBottom: 12, fontWeight: "700" },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    toggleLabel: { color: theme.colors.text.primary, fontWeight: "900", fontSize: 15 },
    saveText: { fontWeight: "900", fontSize: 15 },
    planList: { gap: 14, paddingTop: 10 },
    featuresRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, paddingTop: 6 },
    cancelText: { marginTop: 14, textAlign: "center", color: theme.colors.text.secondary, fontWeight: "900", fontSize: 13 },
    fixedBottom: { paddingHorizontal: theme.spacing.lg, paddingTop: 18 },
    ctaDisabled: { opacity: 0.55 },
    buyBtnWrap: { borderRadius: theme.radius.lg, overflow: "hidden" },
    buyBtnGradient: { borderRadius: theme.radius.lg, paddingVertical: 13, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    buyBtnText: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
    buyBtnArrow: { color: "#ffffff", fontSize: 20, fontWeight: "900", marginLeft: 2 },
    restoreBtn: { marginTop: 10, borderRadius: theme.radius.lg, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
    restoreText: { color: theme.colors.text.primary, fontSize: 14, fontWeight: "900" },
  });
}

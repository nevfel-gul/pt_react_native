import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/constants/usetheme";
import { useTranslation } from "react-i18next";

const DUMMY_PLANS = [
  {
    id: "core",
    title: "Core",
    subtitle: "Bireysel antrenörler için",
    price: "₺499",
    period: "/ ay",
    features: ["20 öğrenciye kadar", "Tüm ölçüm modülleri", "Takvim & randevu"],
    topPick: false,
  },
  {
    id: "pro",
    title: "Pro",
    subtitle: "Büyüyen stüdyolar için",
    price: "₺899",
    period: "/ ay",
    features: ["Sınırsız öğrenci", "Gelişmiş analiz & raporlar", "Öncelikli destek", "AI öngörüler"],
    topPick: true,
  },
  {
    id: "studio",
    title: "Studio",
    subtitle: "Büyük ekipler & kurumlar",
    price: "₺1.799",
    period: "/ ay",
    features: ["Sınırsız her şey", "Çok kullanıcı erişimi", "Özel entegrasyonlar", "Özel destek hattı"],
    topPick: false,
  },
];

export default function PremiumScreen() {
  const { theme, mode } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState("pro");

  const accent = theme.colors.premium;

  const handleBuy = () => {
    const plan = DUMMY_PLANS.find((p) => p.id === selected);
    Alert.alert("Premium", `${plan?.title} planı seçildi. Ödeme sistemi yakında aktif olacak.`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ paddingVertical: 24 }}>
          <Text style={{ color: accent, fontSize: 40, fontWeight: "900", letterSpacing: -1, lineHeight: 44 }}>
            {t("premium.hero.title")}
          </Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 14, fontWeight: "700", marginTop: 8, lineHeight: 20 }}>
            {t("premium.hero.subtitle")}
          </Text>
        </View>

        {/* Plan kartları */}
        <View style={{ gap: 14 }}>
          {DUMMY_PLANS.map((plan) => {
            const isSelected = plan.id === selected;
            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.88}
                onPress={() => setSelected(plan.id)}
                style={[
                  {
                    borderRadius: theme.radius.xl,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? accent : theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    padding: 18,
                    ...theme.shadow.soft,
                  },
                  isSelected && {
                    shadowColor: accent,
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 8,
                  },
                ]}
              >
                {plan.topPick && (
                  <View
                    style={{
                      position: "absolute",
                      left: 14,
                      top: -12,
                      backgroundColor: theme.colors.gold,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: theme.radius.pill,
                      zIndex: 10,
                    }}
                  >
                    <Text style={{ color: theme.colors.surfaceDark, fontWeight: "900", fontSize: 11 }}>
                      EN POPÜLER
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: accent, fontSize: 22, fontWeight: "900", letterSpacing: -0.4 }}>
                      {plan.title}
                    </Text>
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: "700", marginTop: 2 }}>
                      {plan.subtitle}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: theme.colors.text.primary, fontSize: 26, fontWeight: "900" }}>
                      {plan.price}
                    </Text>
                    <Text style={{ color: theme.colors.text.muted, fontSize: 12, fontWeight: "800" }}>
                      {plan.period}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, gap: 6 }}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />
                      <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: "600" }}>
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ color: theme.colors.text.muted, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 20 }}>
          {t("premium.footer.note")}
        </Text>
      </ScrollView>

      {/* Satın Al butonu */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 16 + insets.bottom,
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={handleBuy} style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
          <LinearGradient
            colors={[accent, "#8f4fff", accent]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ paddingVertical: 15, alignItems: "center", borderRadius: theme.radius.lg }}
          >
            <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "900" }}>
              {t("premium.cta.buy")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});

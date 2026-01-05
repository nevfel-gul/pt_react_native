import { themeui } from "@/constants/themeui";
import { useRouter } from "expo-router";
import {
  Check,
  Crown,
  Sparkles
} from "lucide-react-native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PremiumScreen() {
  const router = useRouter();

  const features = [
    "Sınırsız öğrenci & kayıt",
    "Gelişmiş istatistik ve raporlar",
    "Online randevu & takvim senkronizasyonu",
    "Otomatik bildirimler",
    "Premium destek",
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* HERO */}
          <View style={styles.hero}>
            <View style={styles.crownWrapper}>
              <Crown size={34} color="#facc15" />
            </View>

            <Text style={styles.heroTitle}>Premium’a Geç</Text>
            <Text style={styles.heroSubtitle}>
              İşini büyütmek için tüm profesyonel araçlara eriş
            </Text>
          </View>

          {/* PLAN CARD */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Sparkles size={18} color="#a78bfa" />
              <Text style={styles.planTitle}>Premium Plan</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.price}>₺249</Text>
              <Text style={styles.period}> / ay</Text>
            </View>

            <View style={styles.featureList}>
              {features.map((item, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.checkWrapper}>
                    <Check size={14} color="#22c55e" />
                  </View>
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.buyButton}
            activeOpacity={0.85}
            onPress={() => {
              // BURASI ŞİMDİLİK DUMMY
              alert("Premium satın alım (dummy)");
            }}
          >
            <Text style={styles.buyButtonText}>Premium Satın Al</Text>
          </TouchableOpacity>

          {/* FOOTER NOTE */}
          <Text style={styles.footerNote}>
            İstediğin zaman iptal edebilirsin. Gizli ücret yok.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeui.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: themeui.colors.background,
  },

  header: {
    paddingHorizontal: themeui.spacing.md,
    paddingTop: themeui.spacing.sm + 4,
    paddingBottom: themeui.spacing.sm - 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.xs,
  },
  backText: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.sm,
  },

  hero: {
    alignItems: "center",
    marginTop: themeui.spacing.lg,
    marginBottom: themeui.spacing.lg,
    paddingHorizontal: themeui.spacing.lg,
  },
  crownWrapper: {
    width: 64,
    height: 64,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: themeui.spacing.sm,
  },
  heroTitle: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.xl + 2,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.md - 1,
    textAlign: "center",
    marginTop: themeui.spacing.xs,
  },

  planCard: {
    marginHorizontal: themeui.spacing.md,
    backgroundColor: themeui.colors.surface,
    borderRadius: themeui.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.5)",
    padding: themeui.spacing.lg,
    ...themeui.shadow.soft,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.xs + 2,
    marginBottom: themeui.spacing.sm,
  },
  planTitle: {
    color: "#e9d5ff", // özel premium text rengi - sabit bırakıyoruz
    fontSize: themeui.fontSize.lg,
    fontWeight: "700",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: themeui.spacing.lg - 4,
  },
  price: {
    color: themeui.colors.text.primary,
    fontSize: 32,
    fontWeight: "800",
  },
  period: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.md,
    marginBottom: 4,
    marginLeft: themeui.spacing.xs - 2,
  },

  featureList: {
    gap: themeui.spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.sm,
  },
  checkWrapper: {
    width: 22,
    height: 22,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.md - 1,
  },

  buyButton: {
    marginHorizontal: themeui.spacing.md,
    marginTop: themeui.spacing.lg,
    paddingVertical: themeui.spacing.md - 2,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.premium,
    alignItems: "center",
  },
  buyButtonText: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.lg - 1,
    fontWeight: "800",
  },

  footerNote: {
    color: themeui.colors.text.muted,
    fontSize: themeui.fontSize.xs,
    textAlign: "center",
    marginTop: themeui.spacing.sm,
  },
});

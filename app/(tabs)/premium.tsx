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
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    color: "#f1f5f9",
    fontSize: 13,
  },

  hero: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  crownWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(250,204,21,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    color: "#f1f5f9",
    fontSize: 22,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },

  planCard: {
    marginHorizontal: 16,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.5)",
    padding: 20,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  planTitle: {
    color: "#e9d5ff",
    fontSize: 16,
    fontWeight: "700",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  price: {
    color: "#f1f5f9",
    fontSize: 32,
    fontWeight: "800",
  },
  period: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 4,
    marginLeft: 4,
  },

  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(34,197,94,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    color: "#e5e7eb",
    fontSize: 13,
  },

  buyButton: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#7c3aed",
    alignItems: "center",
  },
  buyButtonText: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: "800",
  },

  footerNote: {
    color: "#64748b",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
  },
});

// app/(tabs)/summary.tsx  (veya istediğin path)

import { Activity, BarChart2, Users } from "lucide-react-native";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type RangeKey = "7g" | "30g" | "all";

export default function SummaryScreen() {
  const [selectedRange, setSelectedRange] = useState<RangeKey>("7g");

  // Sırf görsel dursun diye ufak dummy bar değerleri
  const bars = [0.3, 0.6, 0.9, 0.5, 0.7];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Özet / Analiz</Text>
            <Text style={styles.pageSubtitle}>
              Bu ekran tamamen kolpa verilerle taslak olarak hazır. Sonra
              backend’den gelen gerçek istatistikleri buraya bağlarız.
            </Text>

            {/* Tarih aralığı chipleri */}
            <View style={styles.rangeRow}>
              <RangeChip
                label="Son 7 gün"
                active={selectedRange === "7g"}
                onPress={() => setSelectedRange("7g")}
              />
              <RangeChip
                label="Son 30 gün"
                active={selectedRange === "30g"}
                onPress={() => setSelectedRange("30g")}
              />
              <RangeChip
                label="Tümü"
                active={selectedRange === "all"}
                onPress={() => setSelectedRange("all")}
              />
            </View>
          </View>

          {/* KART 1 – Genel İstatistikler */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color="#3b82f6" />
              <Text style={styles.cardTitle}>Genel İstatistikler</Text>
            </View>
            <Text style={styles.cardHint}>
              Rakamlar şimdilik uydurma, sadece yer tutucu. Tasarım dursun
              diye koyduk.
            </Text>

            <StatRow label="Toplam öğrenci" value="23" sub="Aktif + pasif" />
            <StatRow label="Aktif öğrenci" value="18" sub="Son 60 gün içinde ölçüm yapılmış" />
            <StatRow label="Bu hafta ölçüm" value="5" sub="Tanita veya performans testi" />
          </View>

          {/* KART 2 – Hedeflere göre kaba ilerleme */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color="#22c55e" />
              <Text style={styles.cardTitle}>Hedef Bazlı İlerleme</Text>
            </View>
            <Text style={styles.cardHint}>
              Tamamen kolpa yüzdeler. İleride yağ-kas, mezura, test skorları
              ile gerçek hesap çıkar.
            </Text>

            <ProgressRow label="Yağ kaybı odaklı" percent={60} />
            <ProgressRow label="Kas kazanımı odaklı" percent={45} />
            <ProgressRow label="Genel sağlık / hareketlilik" percent={55} />
          </View>

          {/* KART 3 – Öğrenci segmentleri */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Users size={18} color="#38bdf8" />
              <Text style={styles.cardTitle}>Öğrenci Segmentleri (Dummy)</Text>
            </View>

            <TagRow label="Haftada 2 gün gelen" value="9 kişi" />
            <TagRow label="Haftada 3 gün gelen" value="6 kişi" />
            <TagRow label="Online / hibrit" value="4 kişi" />
            <TagRow label="Tam başlangıç seviyesi" value="7 kişi" />
          </View>

          {/* KART 4 – Basit fake bar chart */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color="#f97316" />
              <Text style={styles.cardTitle}>Günlük Seans Doluluk (Demo)</Text>
            </View>
            <Text style={styles.cardHint}>
              Her sütun bir günü temsil ediyor. Yükseklikler random,
              backend yok şu an 🙂
            </Text>

            <View style={styles.chartContainer}>
              {bars.map((ratio, idx) => (
                <View key={idx} style={styles.chartBarWrapper}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: 80 + 60 * ratio },
                    ]}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.chartFooterText}>
              Bugünün tahmini doluluk oranı: %72 (uydurma).
            </Text>
          </View>

          {/* KART 5 – Son aktiviteler (dummy log) */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color="#a855f7" />
              <Text style={styles.cardTitle}>Son Aktiviteler (Dummy)</Text>
            </View>

            {[
              "Ayşe Y. için Tanita ölçümü eklendi",
              "Can B. kuvvet testleri güncellendi",
              "Zehra K. postür notu kaydedildi",
              "Mert A. için yeni program oluşturuldu",
            ].map((text, index) => (
              <View
                key={index}
                style={[
                  styles.activityRow,
                  index > 0 && styles.activityRowBorder,
                ]}
              >
                <View style={styles.activityDot} />
                <Text style={styles.activityText}>{text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* Küçük bileşenler */

function RangeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.rangeChip,
        active && styles.rangeChipActive,
      ]}
    >
      <Text
        style={[
          styles.rangeChipText,
          active && styles.rangeChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.statRow}>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ProgressRow({ label, percent }: { label: string; percent: number }) {
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressLabel}>{percent}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${percent}%` },
          ]}
        />
      </View>
    </View>
  );
}

function TagRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tagRow}>
      <Text style={styles.tagLabel}>{label}</Text>
      <View style={styles.tagPill}>
        <Text style={styles.tagPillText}>{value}</Text>
      </View>
    </View>
  );
}

/* STYLES */

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
    paddingBottom: 6,
  },
  pageTitle: {
    color: "#f9fafb",
    fontSize: 20,
    fontWeight: "700",
  },
  pageSubtitle: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  rangeRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginRight: 6,
    backgroundColor: "#020617",
  },
  rangeChipActive: {
    backgroundColor: "rgba(37,99,235,0.15)",
    borderColor: "#3b82f6",
  },
  rangeChipText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  rangeChipTextActive: {
    color: "#bfdbfe",
    fontWeight: "600",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#020617",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  cardHint: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },
  statSub: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 2,
  },
  statValue: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
  },
  progressRow: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    color: "#e5e7eb",
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#3b82f6",
  },
  tagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
  },
  tagLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.15)",
  },
  tagPillText: {
    color: "#e5e7eb",
    fontSize: 11,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 2,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: "center",
  },
  chartBar: {
    width: 10,
    borderRadius: 999,
    backgroundColor: "#3b82f6",
  },
  chartFooterText: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 8,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  activityRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 8,
  },
  activityText: {
    color: "#e5e7eb",
    fontSize: 12,
    flex: 1,
  },
});

import { themeui } from "@/constants/themeui";
import { Activity, BarChart2, Users } from "lucide-react-native";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RangeKey = "7g" | "30g" | "all";

export default function SummaryScreen() {
  const [selectedRange, setSelectedRange] = useState<RangeKey>("7g");

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

            {/* RANGE CHIPS */}
            <View style={styles.rangeRow}>
              <View style={{ flex: 1 }}>
                <RangeChip
                  label="Son 7 gün"
                  active={selectedRange === "7g"}
                  onPress={() => setSelectedRange("7g")}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RangeChip
                  label="Son 30 gün"
                  active={selectedRange === "30g"}
                  onPress={() => setSelectedRange("30g")}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RangeChip
                  label="Tümü"
                  active={selectedRange === "all"}
                  onPress={() => setSelectedRange("all")}
                />
              </View>
            </View>

          </View>

          {/* KART 1 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color="#60a5fa" />
              <Text style={styles.cardTitle}>Genel İstatistikler</Text>
            </View>

            <Text style={styles.cardHint}>
              Rakamlar şimdilik uydurma, sadece yer tutucu.
            </Text>

            <StatRow label="Toplam öğrenci" value="23" sub="Aktif + pasif" />
            <StatRow
              label="Aktif öğrenci"
              value="18"
              sub="Son 60 gün içinde ölçüm yapılmış"
            />
            <StatRow
              label="Bu hafta ölçüm"
              value="5"
              sub="Tanita veya performans testi"
            />
          </View>

          {/* KART 2 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color="#22c55e" />
              <Text style={styles.cardTitle}>Hedef Bazlı İlerleme</Text>
            </View>

            <Text style={styles.cardHint}>
              Kolpa yüzdeler. Gerçek değerler backend’den gelecek.
            </Text>

            <ProgressRow label="Yağ kaybı odaklı" percent={60} />
            <ProgressRow label="Kas kazanımı odaklı" percent={45} />
            <ProgressRow label="Genel sağlık / hareketlilik" percent={55} />
          </View>

          {/* KART 3 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Users size={18} color="#38bdf8" />
              <Text style={styles.cardTitle}>Öğrenci Segmentleri</Text>
            </View>

            <TagRow label="Haftada 2 gün gelen" value="9 kişi" />
            <TagRow label="Haftada 3 gün gelen" value="6 kişi" />
            <TagRow label="Online / hibrit" value="4 kişi" />
            <TagRow label="Tam başlangıç seviyesi" value="7 kişi" />
          </View>

          {/* KART 4 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color="#f97316" />
              <Text style={styles.cardTitle}>Günlük Seans Doluluk</Text>
            </View>

            <Text style={styles.cardHint}>
              Backend yok, çubuklar demo amaçlı 🙂
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
              Bugünün tahmini doluluk oranı: %72 (uydurma)
            </Text>
          </View>

          {/* KART 5 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color="#a855f7" />
              <Text style={styles.cardTitle}>Son Aktiviteler</Text>
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

/* COMPONENTS -------------------------------------------------- */

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
      style={[styles.rangeChip, active && styles.rangeChipActive]}
    >
      <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
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
        {sub && <Text style={styles.statSub}>{sub}</Text>}
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

/* STYLES ------------------------------------------------------ */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeui.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: themeui.colors.background,
  },

  /* HEADER */
  header: {
    paddingHorizontal: themeui.spacing.md,
    paddingTop: themeui.spacing.sm + 4,
    paddingBottom: themeui.spacing.xs,
  },
  pageTitle: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.title,
    fontWeight: "700",
  },
  pageSubtitle: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.xs,
    marginTop: themeui.spacing.xs - 2,
  },
  rangeRow: {
    flexDirection: "row",
    marginTop: themeui.spacing.sm - 2,
  },

  /* RANGE CHIPS */
  rangeChip: {
    paddingHorizontal: themeui.spacing.md - 4,
    paddingVertical: themeui.spacing.xs,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.surface,
    borderWidth: 1,
    borderColor: themeui.colors.border,
    marginRight: themeui.spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeChipActive: {
    backgroundColor: "rgba(96,165,250,0.25)",
    borderColor: themeui.colors.primary,
  },
  rangeChipText: {
    fontSize: themeui.fontSize.sm,
    color: themeui.colors.text.secondary,
  },
  rangeChipTextActive: {
    color: "#bfdbfe",
    fontWeight: "600",
  },

  /* CARD */
  card: {
    marginHorizontal: themeui.spacing.md,
    marginTop: themeui.spacing.md - 2,
    backgroundColor: themeui.colors.surface,
    borderRadius: themeui.radius.lg,
    borderWidth: 1,
    borderColor: themeui.colors.border,
    padding: themeui.spacing.md,
    ...themeui.shadow.soft,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.lg - 1,
    fontWeight: "600",
    marginLeft: themeui.spacing.xs,
  },
  cardHint: {
    color: themeui.colors.text.muted,
    fontSize: themeui.fontSize.xs,
    marginTop: themeui.spacing.xs - 2,
    marginBottom: themeui.spacing.sm - 2,
  },

  /* STAT ROW */
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: themeui.spacing.sm - 2,
    borderTopWidth: 1,
    borderTopColor: themeui.colors.border,
  },
  statLabel: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.sm,
  },
  statSub: {
    color: themeui.colors.text.muted,
    fontSize: themeui.fontSize.xs,
    marginTop: 2,
  },
  statValue: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.md,
    fontWeight: "600",
  },

  /* PROGRESS */
  progressRow: { marginTop: themeui.spacing.sm - 2 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: themeui.spacing.xs - 2,
  },
  progressLabel: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.primary,
  },

  /* TAG ROW */
  tagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: themeui.spacing.sm - 2,
    borderTopWidth: 1,
    borderTopColor: themeui.colors.border,
  },
  tagLabel: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.sm,
  },
  tagPill: {
    paddingHorizontal: themeui.spacing.sm - 4,
    paddingVertical: themeui.spacing.xs - 2,
    backgroundColor: "rgba(148,163,184,0.15)",
    borderRadius: themeui.radius.pill,
  },
  tagPillText: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.xs,
  },

  /* CHART */
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: themeui.spacing.sm,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: "center",
  },
  chartBar: {
    width: 12,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.primary,
  },
  chartFooterText: {
    color: themeui.colors.text.muted,
    fontSize: themeui.fontSize.xs,
    marginTop: themeui.spacing.sm - 2,
  },

  /* ACTIVITY */
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: themeui.spacing.sm - 2,
  },
  activityRowBorder: {
    borderTopWidth: 1,
    borderTopColor: themeui.colors.border,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.success,
    marginRight: themeui.spacing.sm - 4,
  },
  activityText: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.sm,
    flex: 1,
  },
});

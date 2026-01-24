import { themeui } from "@/constants/themeui";
import { Activity, BarChart2, Users } from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
            <Text style={styles.pageTitle}>{t("summary.title")}</Text>

            <Text style={styles.pageSubtitle}>{t("summary.subtitle")}</Text>

            {/* RANGE CHIPS */}
            <View style={styles.rangeRow}>
              <View style={{ flex: 1 }}>
                <RangeChip
                  labelKey="summary.range.7d"
                  active={selectedRange === "7g"}
                  onPress={() => setSelectedRange("7g")}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RangeChip
                  labelKey="summary.range.30d"
                  active={selectedRange === "30g"}
                  onPress={() => setSelectedRange("30g")}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RangeChip
                  labelKey="filter.all"
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
              <Text style={styles.cardTitle}>
                {t("summary.card.generalStats")}
              </Text>
            </View>

            <Text style={styles.cardHint}>
              {t("summary.card.generalStats.hint")}
            </Text>

            <StatRow
              labelKey="summary.stat.totalStudents"
              value="23"
              subKey="summary.stat.totalStudents.sub"
            />
            <StatRow
              labelKey="summary.stat.activeStudents"
              value="18"
              subKey="summary.stat.activeStudents.sub"
            />
            <StatRow
              labelKey="summary.stat.thisWeekMeasurement"
              value="5"
              subKey="summary.stat.thisWeekMeasurement.sub"
            />
          </View>

          {/* KART 2 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color="#22c55e" />
              <Text style={styles.cardTitle}>{t("summary.card.goalProgress")}</Text>
            </View>

            <Text style={styles.cardHint}>
              {t("summary.card.goalProgress.hint")}
            </Text>

            <ProgressRow labelKey="summary.goal.fatLoss" percent={60} />
            <ProgressRow labelKey="summary.goal.muscleGain" percent={45} />
            <ProgressRow labelKey="summary.goal.generalHealth" percent={55} />
          </View>

          {/* KART 3 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Users size={18} color="#38bdf8" />
              <Text style={styles.cardTitle}>
                {t("summary.card.studentSegments")}
              </Text>
            </View>

            <TagRow
              labelKey="summary.segment.twiceWeek"
              value={t("summary.segment.people", { count: 9 })}
            />
            <TagRow
              labelKey="summary.segment.threeTimesWeek"
              value={t("summary.segment.people", { count: 6 })}
            />
            <TagRow
              labelKey="summary.segment.onlineHybrid"
              value={t("summary.segment.people", { count: 4 })}
            />
            <TagRow
              labelKey="summary.segment.beginner"
              value={t("summary.segment.people", { count: 7 })}
            />
          </View>

          {/* KART 4 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color="#f97316" />
              <Text style={styles.cardTitle}>
                {t("summary.card.dailySessionFill")}
              </Text>
            </View>

            <Text style={styles.cardHint}>
              {t("summary.card.dailySessionFill.hint")}
            </Text>

            <View style={styles.chartContainer}>
              {bars.map((ratio, idx) => (
                <View key={idx} style={styles.chartBarWrapper}>
                  <View style={[styles.chartBar, { height: 80 + 60 * ratio }]} />
                </View>
              ))}
            </View>

            <Text style={styles.chartFooterText}>
              {t("summary.dailyFill.todayEstimate")}
            </Text>
          </View>

          {/* KART 5 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color="#a855f7" />
              <Text style={styles.cardTitle}>
                {t("summary.card.recentActivities")}
              </Text>
            </View>

            {(
              [
                "summary.activity.tanitaAdded",
                "summary.activity.strengthUpdated",
                "summary.activity.postureSaved",
                "summary.activity.programCreated",
              ] as const
            ).map((key, index) => (
              <View
                key={key}
                style={[
                  styles.activityRow,
                  index > 0 && styles.activityRowBorder,
                ]}
              >
                <View style={styles.activityDot} />
                <Text style={styles.activityText}>{t(key)}</Text>
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
  labelKey,
  active,
  onPress,
}: {
  labelKey: string;
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.rangeChip, active && styles.rangeChipActive]}
    >
      <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
        {t(labelKey)}
      </Text>
    </TouchableOpacity>
  );
}

function StatRow({
  labelKey,
  value,
  subKey,
}: {
  labelKey: string;
  value: string;
  subKey?: string;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.statRow}>
      <View>
        <Text style={styles.statLabel}>{t(labelKey)}</Text>
        {subKey && <Text style={styles.statSub}>{t(subKey)}</Text>}
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ProgressRow({ labelKey, percent }: { labelKey: string; percent: number }) {
  const { t } = useTranslation();

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{t(labelKey)}</Text>
        <Text style={styles.progressLabel}>{percent}%</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function TagRow({ labelKey, value }: { labelKey: string; value: string }) {
  const { t } = useTranslation();

  return (
    <View style={styles.tagRow}>
      <Text style={styles.tagLabel}>{t(labelKey)}</Text>

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

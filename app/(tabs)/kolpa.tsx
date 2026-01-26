// ❌ kaldır: import { themeui } from "@/constants/themeui";
import { Activity, BarChart2, Users } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ NEW THEME
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

type RangeKey = "7g" | "30g" | "all";

export default function SummaryScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // ✅ styles theme’e bağlı
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
                  theme={theme}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RangeChip
                  labelKey="summary.range.30d"
                  active={selectedRange === "30g"}
                  onPress={() => setSelectedRange("30g")}
                  theme={theme}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RangeChip
                  labelKey="filter.all"
                  active={selectedRange === "all"}
                  onPress={() => setSelectedRange("all")}
                  theme={theme}
                />
              </View>
            </View>
          </View>

          {/* KART 1 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>{t("summary.card.generalStats")}</Text>
            </View>

            <Text style={styles.cardHint}>{t("summary.card.generalStats.hint")}</Text>

            <StatRow
              labelKey="summary.stat.totalStudents"
              value="23"
              subKey="summary.stat.totalStudents.sub"
              theme={theme}
            />
            <StatRow
              labelKey="summary.stat.activeStudents"
              value="18"
              subKey="summary.stat.activeStudents.sub"
              theme={theme}
            />
            <StatRow
              labelKey="summary.stat.thisWeekMeasurement"
              value="5"
              subKey="summary.stat.thisWeekMeasurement.sub"
              theme={theme}
            />
          </View>

          {/* KART 2 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color={theme.colors.success} />
              <Text style={styles.cardTitle}>{t("summary.card.goalProgress")}</Text>
            </View>

            <Text style={styles.cardHint}>{t("summary.card.goalProgress.hint")}</Text>

            <ProgressRow labelKey="summary.goal.fatLoss" percent={60} theme={theme} />
            <ProgressRow labelKey="summary.goal.muscleGain" percent={45} theme={theme} />
            <ProgressRow labelKey="summary.goal.generalHealth" percent={55} theme={theme} />
          </View>

          {/* KART 3 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Users size={18} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>{t("summary.card.studentSegments")}</Text>
            </View>

            <TagRow
              labelKey="summary.segment.twiceWeek"
              value={t("summary.segment.people", { count: 9 })}
              theme={theme}
            />
            <TagRow
              labelKey="summary.segment.threeTimesWeek"
              value={t("summary.segment.people", { count: 6 })}
              theme={theme}
            />
            <TagRow
              labelKey="summary.segment.onlineHybrid"
              value={t("summary.segment.people", { count: 4 })}
              theme={theme}
            />
            <TagRow
              labelKey="summary.segment.beginner"
              value={t("summary.segment.people", { count: 7 })}
              theme={theme}
            />
          </View>

          {/* KART 4 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color={theme.colors.warning} />
              <Text style={styles.cardTitle}>{t("summary.card.dailySessionFill")}</Text>
            </View>

            <Text style={styles.cardHint}>{t("summary.card.dailySessionFill.hint")}</Text>

            <View style={styles.chartContainer}>
              {bars.map((ratio, idx) => (
                <View key={idx} style={styles.chartBarWrapper}>
                  <View style={[styles.chartBar, { height: 80 + 60 * ratio }]} />
                </View>
              ))}
            </View>

            <Text style={styles.chartFooterText}>{t("summary.dailyFill.todayEstimate")}</Text>
          </View>

          {/* KART 5 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color={theme.colors.premium} />
              <Text style={styles.cardTitle}>{t("summary.card.recentActivities")}</Text>
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
                style={[styles.activityRow, index > 0 && styles.activityRowBorder]}
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
  theme,
}: {
  labelKey: string;
  active: boolean;
  onPress: () => void;
  theme: ThemeUI;
}) {
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
  theme,
}: {
  labelKey: string;
  value: string;
  subKey?: string;
  theme: ThemeUI;
}) {
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

function ProgressRow({
  labelKey,
  percent,
  theme,
}: {
  labelKey: string;
  percent: number;
  theme: ThemeUI;
}) {
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

function TagRow({
  labelKey,
  value,
  theme,
}: {
  labelKey: string;
  value: string;
  theme: ThemeUI;
}) {
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    /* HEADER */
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm + 4,
      paddingBottom: theme.spacing.xs,
    },
    pageTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.title,
      fontWeight: "700",
    },
    pageSubtitle: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs - 2,
    },
    rangeRow: {
      flexDirection: "row",
      marginTop: theme.spacing.sm - 2,
    },

    /* RANGE CHIPS */
    rangeChip: {
      paddingHorizontal: theme.spacing.md - 4,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    rangeChipActive: {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.primary,
    },
    rangeChipText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    rangeChipTextActive: {
      color: theme.colors.text.primary,
      fontWeight: "600",
    },

    /* CARD */
    card: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md - 2,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadow.soft,
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    cardTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.lg - 1,
      fontWeight: "600",
      marginLeft: theme.spacing.xs,
    },
    cardHint: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs - 2,
      marginBottom: theme.spacing.sm - 2,
    },

    /* STAT ROW */
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm - 2,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statLabel: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
    },
    statSub: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      marginTop: 2,
    },
    statValue: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md,
      fontWeight: "600",
    },

    /* PROGRESS */
    progressRow: { marginTop: theme.spacing.sm - 2 },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs - 2,
    },
    progressLabel: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
    },
    progressBar: {
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.border,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },

    /* TAG ROW */
    tagRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm - 2,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    tagLabel: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
    },
    tagPill: {
      paddingHorizontal: theme.spacing.sm - 4,
      paddingVertical: theme.spacing.xs - 2,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.pill,
    },
    tagPillText: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.xs,
    },

    /* CHART */
    chartContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
    },
    chartBarWrapper: {
      flex: 1,
      alignItems: "center",
    },
    chartBar: {
      width: 12,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    chartFooterText: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.sm - 2,
    },

    /* ACTIVITY */
    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm - 2,
    },
    activityRowBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    activityDot: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.success,
      marginRight: theme.spacing.sm - 4,
    },
    activityText: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      flex: 1,
    },
  });
}

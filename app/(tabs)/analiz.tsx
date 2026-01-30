import { Activity, BarChart2, Users } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ THEME
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

// ✅ FIREBASE
import { auth } from "@/services/firebase";
import { recordsColRef, studentsColRef } from "@/services/firestorePaths";
import {
  Timestamp,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";

type RangeKey = "7g" | "30g" | "all";

type SummaryState = {
  loading: boolean;

  totalStudents: number;
  activeStudents: number;
  measurementsInRange: number;

  segTwiceWeek: number;
  segThreeTimesWeek: number;
  segOnlineHybrid: number; // şimdilik 0 (alan yok)
  segBeginner: number; // trainingGoals’dan yakalamaya çalışıyoruz

  bars: number[]; // 0..1 normalized
  barLabels: string[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toISOKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Range seçimi:
 * - 7g => 7 gün
 * - 30g => 30 gün
 * - all => grafikte son 14 gün (performans için), ama istersen full all da yaparız
 */
function buildWindow(range: RangeKey) {
  const end = startOfDay(new Date());
  if (range === "7g") {
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { start, days: 7 };
  }
  if (range === "30g") {
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { start, days: 30 };
  }
  // "all": grafiği patlatmamak için son 14 gün
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  return { start, days: 14 };
}

function makeLabels(days: number, start: Date) {
  const labels: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    if (days <= 7) {
      labels.push(d.toLocaleDateString("tr-TR", { weekday: "short" })); // Pzt, Sal...
    } else {
      labels.push(i % 5 === 0 ? String(d.getDate()) : "");
    }
  }
  return labels;
}

function normalizeBars(counts: number[]) {
  const max = Math.max(1, ...counts);
  return counts.map((c) => c / max);
}

function looksBeginner(trainingGoals: any) {
  if (!Array.isArray(trainingGoals)) return false;
  return trainingGoals.some((x) => {
    const s = String(x || "").toLowerCase();
    return s.includes("başlang") || s.includes("begin");
  });
}

function useSummaryData(range: RangeKey): SummaryState {
  const [state, setState] = useState<SummaryState>({
    loading: true,

    totalStudents: 0,
    activeStudents: 0,
    measurementsInRange: 0,

    segTwiceWeek: 0,
    segThreeTimesWeek: 0,
    segOnlineHybrid: 0,
    segBeginner: 0,

    // ✅ FIX: başlangıç boş (length mismatch olmasın)
    bars: [],
    barLabels: [],
  });

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setState((p) => ({ ...p, loading: false }));
      return;
    }

    // -----------------------------
    // 1) STUDENTS canlı
    // -----------------------------
    const qStudents = query(studentsColRef(uid));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      let total = 0;
      let active = 0;

      let twice = 0;
      let three = 0;
      let beginner = 0;

      snap.forEach((doc) => {
        total++;
        const s = doc.data() as any;

        if (s?.aktif === "Aktif") active++;

        const planned =
          typeof s?.plannedDaysPerWeek === "number" ? s.plannedDaysPerWeek : null;
        if (planned === 2) twice++;
        if (planned === 3) three++;

        if (looksBeginner(s?.trainingGoals)) beginner++;
      });

      setState((prev) => ({
        ...prev,
        loading: false,

        totalStudents: total,
        activeStudents: active,

        segTwiceWeek: twice,
        segThreeTimesWeek: three,
        segBeginner: beginner,

        segOnlineHybrid: 0,
      }));
    });

    // -----------------------------
    // 2) RECORDS canlı + daily bars
    // -----------------------------
    const { start, days } = buildWindow(range);

    const dayCounts: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dayCounts[toISOKey(d)] = 0;
    }

    const constraints: QueryConstraint[] = [
      orderBy("createdAt", "asc"),
      where("createdAt", ">=", Timestamp.fromDate(start)),
    ];

    const qRecords = query(recordsColRef(uid), ...constraints);

    const unsubRecords = onSnapshot(qRecords, (snap) => {
      Object.keys(dayCounts).forEach((k) => (dayCounts[k] = 0));
      let inRange = 0;

      snap.forEach((doc) => {
        const r = doc.data() as any;
        const ts: Timestamp | undefined = r?.createdAt;
        const dt = ts?.toDate ? ts.toDate() : null;
        if (!dt) return;

        const key = toISOKey(startOfDay(dt));
        if (key in dayCounts) {
          dayCounts[key] += 1;
          inRange += 1;
        }
      });

      const countsArr = Object.keys(dayCounts)
        .sort()
        .map((k) => dayCounts[k]);

      setState((prev) => ({
        ...prev,
        loading: false,
        measurementsInRange: inRange,
        bars: normalizeBars(countsArr),
        barLabels: makeLabels(days, start),
      }));
    });

    return () => {
      unsubStudents();
      unsubRecords();
    };
  }, [range]);

  return state;
}

/* -------------------- ANIMATED BAR CHART (FIXED) -------------------- */

function AnimatedBars({
  ratios,
  labels,
  theme,
  height = 140,
}: {
  ratios: number[];
  labels: string[];
  theme: ThemeUI;
  height?: number;
}) {
  const animsRef = useRef<Animated.Value[]>([]);

  // ✅ ratios.length değişince anim array’i senkronla (create/reuse)
  useEffect(() => {
    const prev = animsRef.current;
    if (prev.length === ratios.length) return;
    animsRef.current = Array.from({ length: ratios.length }, (_, i) => prev[i] ?? new Animated.Value(0));
  }, [ratios.length]);

  useEffect(() => {
    if (!ratios.length) return;
    const anims = animsRef.current;
    if (anims.length !== ratios.length) return;

    const runs = ratios.map((r, i) =>
      Animated.timing(anims[i], {
        toValue: Math.max(0, Math.min(1, r)),
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })
    );

    Animated.stagger(14, runs).start();
  }, [ratios.join("|")]);

  if (!ratios.length) {
    return (
      <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs, marginTop: theme.spacing.sm }}>
        {""}
      </Text>
    );
  }

  const anims = animsRef.current;

  return (
    <View style={{ marginTop: theme.spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {ratios.map((_, i) => {
          const av = anims[i] ?? new Animated.Value(0); // extra safety
          const h = av.interpolate({
            inputRange: [0, 1],
            outputRange: [10, height],
          });

          return (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "flex-end",
                height: height + 28,
              }}
            >
              <Animated.View
                style={{
                  width: 10,
                  borderRadius: theme.radius.pill,
                  height: h,
                  backgroundColor: theme.colors.primary,
                  opacity: 0.95,
                }}
              />
              <Text
                style={{
                  marginTop: 8,
                  fontSize: theme.fontSize.xs,
                  color: theme.colors.text.muted,
                }}
                numberOfLines={1}
              >
                {labels[i] ?? ""}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* -------------------- SCREEN -------------------- */

export default function SummaryScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selectedRange, setSelectedRange] = useState<RangeKey>("7g");

  const summary = useSummaryData(selectedRange);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
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
              value={String(summary.totalStudents)}
              subKey="summary.stat.totalStudents.sub"
              theme={theme}
            />
            <StatRow
              labelKey="summary.stat.activeStudents"
              value={String(summary.activeStudents)}
              subKey="summary.stat.activeStudents.sub"
              theme={theme}
            />
            <StatRow
              labelKey="summary.stat.thisWeekMeasurement"
              value={String(summary.measurementsInRange)}
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
              value={t("summary.segment.people", { count: summary.segTwiceWeek })}
              theme={theme}
            />
            <TagRow
              labelKey="summary.segment.threeTimesWeek"
              value={t("summary.segment.people", { count: summary.segThreeTimesWeek })}
              theme={theme}
            />
            <TagRow
              labelKey="summary.segment.onlineHybrid"
              value={t("summary.segment.people", { count: summary.segOnlineHybrid })}
              theme={theme}
            />
            <TagRow
              labelKey="summary.segment.beginner"
              value={t("summary.segment.people", { count: summary.segBeginner })}
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

            <AnimatedBars ratios={summary.bars} labels={summary.barLabels} theme={theme} height={140} />

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
              <View key={key} style={[styles.activityRow, index > 0 && styles.activityRowBorder]}>
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
    <TouchableOpacity onPress={onPress} style={[styles.rangeChip, active && styles.rangeChipActive]}>
      <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>{t(labelKey)}</Text>
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
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1, backgroundColor: theme.colors.background },

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
    cardTitleRow: { flexDirection: "row", alignItems: "center" },
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

    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm - 2,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm },
    statSub: { color: theme.colors.text.muted, fontSize: theme.fontSize.xs, marginTop: 2 },
    statValue: { color: theme.colors.text.primary, fontSize: theme.fontSize.md, fontWeight: "600" },

    progressRow: { marginTop: theme.spacing.sm - 2 },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs - 2,
    },
    progressLabel: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm },
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

    tagRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm - 2,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    tagLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm },
    tagPill: {
      paddingHorizontal: theme.spacing.sm - 4,
      paddingVertical: theme.spacing.xs - 2,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.pill,
    },
    tagPillText: { color: theme.colors.text.primary, fontSize: theme.fontSize.xs },

    chartFooterText: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.sm - 2,
    },

    activityRow: { flexDirection: "row", alignItems: "center", paddingVertical: theme.spacing.sm - 2 },
    activityRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
    activityDot: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.success,
      marginRight: theme.spacing.sm - 4,
    },
    activityText: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, flex: 1 },
  });
}

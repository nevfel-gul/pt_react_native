import { DEMO_MODE, DEMO_SUMMARY } from "@/constants/demoData";
import { Activity, BarChart2, CalendarClock, Target, TrendingUp, Users } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { appointmentsColRef, recordsColRef, studentsColRef } from "@/services/firestorePaths";
import i18n from "@/services/i18n";
import {
  Timestamp,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

type RangeKey = "7g" | "30g" | "all";

type SummaryState = {
  loading: boolean;

  totalStudents: number;
  activeStudents: number;
  measurementsInRange: number;

  measuredStudentsInRange: number;

  followUpDue: number;
  followUpOk: number;

  segTwiceWeek: number;
  segThreeTimesWeek: number;
  segOnlineHybrid: number;
  segBeginner: number;

  goalCounts: {
    fatLoss: number;
    muscleGain: number;
    generalHealth: number;
    other: number;
  };
  goalPercents: {
    fatLoss: number;
    muscleGain: number;
    generalHealth: number;
  };

  // günlük sayım ham + normalize
  dailyCounts: number[];
  bars: number[];
  barLabels: string[];

  // randevu yoğunluğu
  appointmentDailyCounts: number[];
  appointmentBars: number[];
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
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  return { start, days: 14 };
}

function makeLabels(days: number, start: Date, lang: string) {
  const labels: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    if (days <= 7) labels.push(d.toLocaleDateString(lang, { weekday: "short" }));
    else labels.push(i % 5 === 0 ? `${d.getDate()}` : "");
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

function goalBucket(trainingGoals: any) {
  const arr = Array.isArray(trainingGoals) ? trainingGoals : [];
  const s = arr.map((x) => String(x || "").toLowerCase()).join(" | ");

  const fat =
    s.includes("yağ") ||
    s.includes("kilo") ||
    s.includes("zayıf") ||
    s.includes("fat") ||
    s.includes("lose") ||
    s.includes("weight");
  const muscle =
    s.includes("kas") ||
    s.includes("muscle") ||
    s.includes("gain") ||
    s.includes("hypertrophy");
  const health =
    s.includes("sağlık") ||
    s.includes("health") ||
    s.includes("form") ||
    s.includes("fitness") ||
    s.includes("genel");

  return { fat, muscle, health };
}

function useSummaryData(range: RangeKey): SummaryState {
  const [state, setState] = useState<SummaryState>({
    loading: true,

    totalStudents: 0,
    activeStudents: 0,
    measurementsInRange: 0,

    measuredStudentsInRange: 0,
    followUpDue: 0,
    followUpOk: 0,

    segTwiceWeek: 0,
    segThreeTimesWeek: 0,
    segOnlineHybrid: 0,
    segBeginner: 0,

    goalCounts: { fatLoss: 0, muscleGain: 0, generalHealth: 0, other: 0 },
    goalPercents: { fatLoss: 0, muscleGain: 0, generalHealth: 0 },

    dailyCounts: [],
    bars: [],
    barLabels: [],

    appointmentDailyCounts: [],
    appointmentBars: [],
  });

  useEffect(() => {
    if (DEMO_MODE) {
      setState(DEMO_SUMMARY);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setState((p) => ({ ...p, loading: false }));
      return;
    }

    let studentMap: Record<string, any> = {};

    // 1) STUDENTS canlı
    const qStudents = query(studentsColRef(uid));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      let total = 0;
      let active = 0;

      let beginner = 0;

      let fatLoss = 0;
      let muscleGain = 0;
      let generalHealth = 0;
      let other = 0;

      studentMap = {};

      snap.forEach((doc) => {
        total++;
        const s = doc.data() as any;
        studentMap[doc.id] = s;

        if (s?.aktif === "Aktif") active++;
        if (looksBeginner(s?.trainingGoals)) beginner++;

        const g = goalBucket(s?.trainingGoals);
        const any = g.fat || g.muscle || g.health;

        if (g.fat) fatLoss++;
        if (g.muscle) muscleGain++;
        if (g.health) generalHealth++;
        if (!any) other++;
      });

      const denom = Math.max(1, total);
      const fatP = Math.round((fatLoss / denom) * 100);
      const musP = Math.round((muscleGain / denom) * 100);
      const heaP = Math.round((generalHealth / denom) * 100);

      setState((prev) => ({
        ...prev,
        loading: false,

        totalStudents: total,
        activeStudents: active,

        segBeginner: beginner,

        goalCounts: { fatLoss, muscleGain, generalHealth, other },
        goalPercents: { fatLoss: fatP, muscleGain: musP, generalHealth: heaP },

        segOnlineHybrid: 0,
      }));
    });

    // 2) RECORDS canlı
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

      const now = new Date();
      const nowDay = startOfDay(now);

      const measuredStudentSet = new Set<string>();
      const lastRecordByStudent: Record<string, Date> = {};
      const countLast7ByStudent: Record<string, number> = {};

      const last7Start = new Date(nowDay);
      last7Start.setDate(nowDay.getDate() - 6);

      snap.forEach((doc) => {
        const r = doc.data() as any;
        const sid = String(r?.studentId || "");
        const ts: Timestamp | undefined = r?.createdAt;
        const dt = ts?.toDate ? ts.toDate() : null;
        if (!dt) return;

        const key = toISOKey(startOfDay(dt));
        if (key in dayCounts) {
          dayCounts[key] += 1;
          inRange += 1;
          if (sid) measuredStudentSet.add(sid);
        }

        if (sid) {
          const prev = lastRecordByStudent[sid];
          if (!prev || dt > prev) lastRecordByStudent[sid] = dt;

          if (dt >= last7Start) {
            countLast7ByStudent[sid] = (countLast7ByStudent[sid] ?? 0) + 1;
          }
        }
      });

      let twice = 0;
      let three = 0;
      Object.keys(countLast7ByStudent).forEach((sid) => {
        const c = countLast7ByStudent[sid] ?? 0;
        if (c >= 2) twice++;
        if (c >= 3) three++;
      });

      let followUpDue = 0;
      let followUpOk = 0;

      Object.keys(studentMap).forEach((sid) => {
        const s = studentMap[sid] ?? {};
        const fu = typeof s.followUpDays === "number" ? s.followUpDays : 30;

        const last = lastRecordByStudent[sid] ?? null;
        if (!last) {
          followUpDue += 1;
          return;
        }

        const diffDays = Math.floor(
          (nowDay.getTime() - startOfDay(last).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays >= fu) followUpDue += 1;
        else followUpOk += 1;
      });

      const countsArr = Object.keys(dayCounts)
        .sort()
        .map((k) => dayCounts[k]);

      setState((prev) => ({
        ...prev,
        loading: false,

        measurementsInRange: inRange,
        measuredStudentsInRange: measuredStudentSet.size,

        segTwiceWeek: twice,
        segThreeTimesWeek: three,

        followUpDue,
        followUpOk,

        dailyCounts: countsArr,
        bars: normalizeBars(countsArr),
        barLabels: makeLabels(days, start, i18n.language),
      }));
    });

    // 3) APPOINTMENTS canlı
    const aptDayCounts: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      aptDayCounts[toISOKey(d)] = 0;
    }

    const qAppointments = query(
      appointmentsColRef(uid),
      orderBy("date", "asc")
    );

    const unsubAppointments = onSnapshot(qAppointments, (snap) => {
      Object.keys(aptDayCounts).forEach((k) => (aptDayCounts[k] = 0));

      const windowKeys = Object.keys(aptDayCounts).sort();

      snap.forEach((doc) => {
        const a = doc.data() as any;
        const ts: Timestamp | undefined = a?.date;
        const dt = ts?.toDate ? ts.toDate() : null;
        if (!dt) return;
          
        const aptDayStart = startOfDay(dt).getTime();
        const repeat: number = typeof a?.repeatDays === "number" && a.repeatDays > 0 ? a.repeatDays : 0;

        for (const key of windowKeys) {
          const keyTime = new Date(key + "T00:00:00").getTime();
          if (keyTime < aptDayStart) continue;

          if (repeat === 0) {
            if (key === toISOKey(startOfDay(dt))) aptDayCounts[key] += 1;
          } else {
            const diffDays = Math.round((keyTime - aptDayStart) / 86400000);
            if (diffDays % repeat === 0) aptDayCounts[key] += 1;
          }
        }
      });

      const aptCountsArr = windowKeys.map((k) => aptDayCounts[k]);

      setState((prev) => ({
        ...prev,
        appointmentDailyCounts: aptCountsArr,
        appointmentBars: normalizeBars(aptCountsArr),
      }));
    });

    return () => {
      unsubStudents();
      unsubRecords();
      unsubAppointments();
    };
  }, [range, i18n.language]);

  return state;
}

/* -------------------- CHART -------------------- */

function DailyActivityChart({
  counts,
  labels,
  theme,
  height = 140,
  today,
  average,
  peak,
  hint,
}: {
  counts: number[];
  labels: string[];
  theme: ThemeUI;
  height?: number;
  today: string;
  average: string;
  peak: string;
  hint: string;
}) {
  const animsRef = useRef<Animated.Value[]>([]);

  const max = useMemo(() => Math.max(0, ...counts), [counts.join("|")]);
  const sum = useMemo(() => counts.reduce((a, b) => a + b, 0), [counts.join("|")]);
  const avg = useMemo(() => (counts.length ? sum / counts.length : 0), [sum, counts.length]);

  const peakIndex = useMemo(() => {
    if (!counts.length) return -1;
    let best = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
    return best;
  }, [counts.join("|")]);

  const ratios = useMemo(() => {
    const denom = Math.max(1, max);
    return counts.map((c) => c / denom);
  }, [counts.join("|"), max]);

  useEffect(() => {
    const prev = animsRef.current;
    if (prev.length === ratios.length) return;
    animsRef.current = Array.from(
      { length: ratios.length },
      (_, i) => prev[i] ?? new Animated.Value(DEMO_MODE ? Math.max(0, Math.min(1, ratios[i])) : 0)
    );
  }, [ratios.length]);

  useEffect(() => {
    if (!ratios.length) return;
    const anims = animsRef.current;
    if (anims.length !== ratios.length) return;

    const runs = ratios.map((r, i) =>
      Animated.timing(anims[i], {
        toValue: Math.max(0, Math.min(1, r)),
        duration: DEMO_MODE ? 0 : 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })
    );

    Animated.stagger(DEMO_MODE ? 0 : 14, runs).start();
  }, [ratios.join("|")]);

  if (!counts.length) return null;

  const anims = animsRef.current;
  const todayCount = counts[counts.length - 1] ?? 0;

  return (
    <View style={{ marginTop: theme.spacing.sm }}>
      {/* Mini stat row */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: theme.spacing.sm }}>
        <ChartStatCard title={today} value={`${todayCount}`} theme={theme} accent={theme.colors.primary} />
        <ChartStatCard title={average} value={`${avg.toFixed(1)}`} theme={theme} accent={theme.colors.accent} />
        <ChartStatCard title={peak} value={`${max}`} theme={theme} accent={theme.colors.warning} />
      </View>

      {/* Bars */}
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSoft,
          borderRadius: theme.radius.lg,
          paddingVertical: 14,
          paddingHorizontal: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          {ratios.map((ratio, i) => {
            const av = anims[i] ?? new Animated.Value(0);
            const h = av.interpolate({
              inputRange: [0, 1],
              outputRange: [6, height],
            });
            const staticH = Math.max(6, ratio * height);

            const isPeak = i === peakIndex;

            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: height + 34,
                }}
              >
                {isPeak && (
                  <Text
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.text.primary,
                      marginBottom: 4,
                      fontWeight: "800",
                    }}
                  >
                    {counts[i] ?? 0}
                  </Text>
                )}

                {DEMO_MODE ? (
                  <View
                    style={{
                      width: 10,
                      borderRadius: theme.radius.pill,
                      height: staticH,
                      backgroundColor: isPeak ? theme.colors.warning : theme.colors.primary,
                      opacity: isPeak ? 1 : 0.85,
                    }}
                  />
                ) : (
                  <Animated.View
                    style={{
                      width: 10,
                      borderRadius: theme.radius.pill,
                      height: h,
                      backgroundColor: isPeak ? theme.colors.warning : theme.colors.primary,
                      opacity: isPeak ? 1 : 0.85,
                    }}
                  />
                )}

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

      <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs, marginTop: 8 }}>
        {hint}
      </Text>
    </View>
  );
}

function ChartStatCard({
  title,
  value,
  theme,
  accent,
}: {
  title: string;
  value: string;
  theme: ThemeUI;
  accent: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        minHeight: 64,
      }}
    >
      <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs, fontWeight: "800" }}>
        {title}
      </Text>
      <Text
        style={{
          color: accent,
          fontSize: theme.fontSize.lg,
          fontWeight: "900",
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/* -------------------- KPI CARD -------------------- */

function KpiCard({
  label,
  value,
  sub,
  accent,
  theme,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  theme: ThemeUI;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        minHeight: 88,
      }}
    >
      <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs, fontWeight: "800" }}>
        {label}
      </Text>
      <Text
        style={{
          color: accent ?? theme.colors.text.primary,
          fontSize: theme.fontSize.lg,
          fontWeight: "900",
          marginTop: 4,
        }}
      >
        {value}
      </Text>
      {!!sub && (
        <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, marginTop: 2 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

/* -------------------- PROGRESS ROW -------------------- */

function GoalBar({
  label,
  percent,
  count,
  color,
  theme,
}: {
  label: string;
  percent: number;
  count: number;
  color: string;
  theme: ThemeUI;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, fontWeight: "700" }}>
          {label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: theme.radius.pill,
              borderWidth: 1,
              borderColor: `${color}40`,
              backgroundColor: `${color}15`,
            }}
          >
            <Text style={{ color: color, fontSize: theme.fontSize.xs, fontWeight: "900" }}>
              {count}
            </Text>
          </View>
          <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs, fontWeight: "800", minWidth: 32, textAlign: "right" }}>
            {clamped}%
          </Text>
        </View>
      </View>
      <View
        style={{
          height: 10,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.border,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${clamped}%`,
            borderRadius: theme.radius.pill,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

/* -------------------- SEGMENT CARD -------------------- */

function SegmentCard({
  label,
  value,
  icon,
  theme,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  theme: ThemeUI;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        minHeight: 80,
        gap: 6,
      }}
    >
      {icon}
      <Text style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.md, fontWeight: "900" }}>
        {value}
      </Text>
      <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs, fontWeight: "700", lineHeight: 14 }}>
        {label}
      </Text>
    </View>
  );
}

/* -------------------- RANGE CHIP -------------------- */

function RangeChip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ThemeUI;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 8,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.surfaceElevated : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
      }}
    >
      <Text
        style={{
          fontSize: theme.fontSize.sm,
          color: active ? theme.colors.text.primary : theme.colors.text.secondary,
          fontWeight: active ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* -------------------- SCREEN -------------------- */

export default function SummaryScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selectedRange, setSelectedRange] = useState<RangeKey>("7g");

  const summary = useSummaryData(selectedRange);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>{t("summary.title")}</Text>
            <Text style={styles.pageSubtitle}>{t("summary.subtitle")}</Text>

            <View style={styles.rangeRow}>
              <RangeChip label={t("summary.range.7d")} active={selectedRange === "7g"} onPress={() => setSelectedRange("7g")} theme={theme} />
              <RangeChip label={t("summary.range.30d")} active={selectedRange === "30g"} onPress={() => setSelectedRange("30g")} theme={theme} />
              <RangeChip label={t("filter.all")} active={selectedRange === "all"} onPress={() => setSelectedRange("all")} theme={theme} />
            </View>
          </View>

          {/* KART 1 — Genel İstatistikler: KPI Grid */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>{t("summary.card.generalStats")}</Text>
            </View>
            <Text style={styles.cardHint}>{t("summary.card.generalStats.hint")}</Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <KpiCard label={t("summary.stat.totalStudents")} value={String(summary.totalStudents)} sub={t("summary.stat.totalStudents.sub")} theme={theme} />
              <KpiCard label={t("summary.stat.activeStudents")} value={String(summary.activeStudents)} sub={t("summary.stat.activeStudents.sub")} accent={theme.colors.success} theme={theme} />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <KpiCard label={t("summary.stat.totalRecords")} value={String(summary.measurementsInRange)} sub={t("summary.stat.totalRecords.sub")} theme={theme} />
              <KpiCard label={t("summary.stat.measuredStudents.title")} value={String(summary.measuredStudentsInRange)} sub={t("summary.stat.measuredStudents.sub")} theme={theme} />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <KpiCard label={t("summary.stat.followUpDue.title")} value={String(summary.followUpDue)} sub={t("summary.stat.followUpDue.sub")} accent={theme.colors.warning} theme={theme} />
              <KpiCard label={t("summary.stat.followUpOk.title")} value={String(summary.followUpOk)} sub={t("summary.stat.followUpOk.sub")} accent={theme.colors.success} theme={theme} />
            </View>
          </View>

          {/* KART 2 — Hedef Dağılımı */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Target size={18} color={theme.colors.success} />
              <Text style={styles.cardTitle}>{t("summary.card.goalProgress")}</Text>
            </View>
            <Text style={styles.cardHint}>{t("summary.card.goalProgress.hint")}</Text>

            <GoalBar
              label={t("summary.goal.fatLoss")}
              percent={summary.goalPercents.fatLoss}
              count={summary.goalCounts.fatLoss}
              color={theme.colors.warning}
              theme={theme}
            />
            <GoalBar
              label={t("summary.goal.muscleGain")}
              percent={summary.goalPercents.muscleGain}
              count={summary.goalCounts.muscleGain}
              color={theme.colors.primary}
              theme={theme}
            />
            <GoalBar
              label={t("summary.goal.generalHealth")}
              percent={summary.goalPercents.generalHealth}
              count={summary.goalCounts.generalHealth}
              color={theme.colors.success}
              theme={theme}
            />
          </View>

          {/* KART 3 — Öğrenci Segmentleri: 2x2 Grid */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Users size={18} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>{t("summary.card.studentSegments")}</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <SegmentCard
                label={t("summary.segment.twiceWeek")}
                value={`${summary.segTwiceWeek} ${t("summary.segment.people")}`}
                icon={<TrendingUp size={18} color={theme.colors.primary} />}
                theme={theme}
              />
              <SegmentCard
                label={t("summary.segment.threeTimesWeek")}
                value={`${summary.segThreeTimesWeek} ${t("summary.segment.people")}`}
                icon={<Activity size={18} color={theme.colors.success} />}
                theme={theme}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <SegmentCard
                label={t("summary.segment.onlineHybrid")}
                value={`${summary.segOnlineHybrid} ${t("summary.segment.people")}`}
                icon={<CalendarClock size={18} color={theme.colors.accent} />}
                theme={theme}
              />
              <SegmentCard
                label={t("summary.segment.beginner")}
                value={`${summary.segBeginner} ${t("summary.segment.people")}`}
                icon={<Users size={18} color={theme.colors.warning} />}
                theme={theme}
              />
            </View>
          </View>

          {/* KART 4 — Randevu Yoğunluğu */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color={theme.colors.warning} />
              <Text style={styles.cardTitle}>{t("summary.card.dailySessionFill")}</Text>
            </View>
            <Text style={styles.cardHint}>{t("summary.card.dailySessionFill.hint")}</Text>

            <DailyActivityChart
              counts={summary.appointmentDailyCounts.length ? summary.appointmentDailyCounts : summary.barLabels.map(() => 0)}
              labels={summary.barLabels}
              theme={theme}
              height={140}
              today={t("summary.chart.today")}
              average={t("summary.chart.average")}
              peak={t("summary.chart.peak")}
              hint={t("summary.hint")}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
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
      fontWeight: "700",
      marginLeft: theme.spacing.xs,
    },
    cardHint: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs - 2,
      marginBottom: 2,
    },
  });
}

import { Activity, BarChart2, Users } from "lucide-react-native";
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
 * - 7g => son 7 gün
 * - 30g => son 30 gün
 * - all => grafik performans için son 14 gün
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
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  return { start, days: 14 };
}

function makeLabels(days: number, start: Date) {
  const labels: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    if (days <= 7) labels.push(d.toLocaleDateString("tr-TR", { weekday: "short" }));
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
  });

  useEffect(() => {
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

/* -------------------- CHART (DAHA ANLAŞILIR) -------------------- */

function DailyActivityChart({
  counts,
  labels,
  theme,
  height = 140,
}: {
  counts: number[];
  labels: string[];
  theme: ThemeUI;
  height?: number;
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
      (_, i) => prev[i] ?? new Animated.Value(0)
    );
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

  if (!counts.length) return null;

  const anims = animsRef.current;

  const todayCount = counts[counts.length - 1] ?? 0;

  return (
    <View style={{ marginTop: theme.spacing.sm }}>
      {/* ✅ ÜST ÖZET: tek bakışta anlaşılsın */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: theme.spacing.sm - 2,
        }}
      >
        <MiniStat title="Bugün" value={`${todayCount}`} theme={theme} />
        <MiniStat title="Ortalama" value={`${avg.toFixed(1)}`} theme={theme} />
        <MiniStat title="Zirve" value={`${max}`} theme={theme} />
      </View>

      {/* ✅ BARLAR: zirve gününü vurgula + alt label */}
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {ratios.map((_, i) => {
          const av = anims[i] ?? new Animated.Value(0);
          const h = av.interpolate({
            inputRange: [0, 1],
            outputRange: [10, height],
          });

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
              {/* sayı (sadece peak’te göster) */}
              {isPeak && (
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.colors.text.primary,
                    marginBottom: 6,
                    fontWeight: "700",
                  }}
                >
                  {counts[i] ?? 0}
                </Text>
              )}

              <Animated.View
                style={{
                  width: 10,
                  borderRadius: theme.radius.pill,
                  height: h,
                  backgroundColor: isPeak ? theme.colors.warning : theme.colors.primary,
                  opacity: isPeak ? 1 : 0.92,
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

      <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs, marginTop: 6 }}>
        Not: Çubuklar gün içindeki toplam kayıt sayısını gösterir. Zirve gün sarı renkle vurgulanır.
      </Text>
    </View>
  );
}

function MiniStat({
  title,
  value,
  theme,
}: {
  title: string;
  value: string;
  theme: ThemeUI;
}) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surfaceElevated,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs }}>
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.text.primary,
          fontSize: theme.fontSize.md,
          fontWeight: "700",
          marginTop: 2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/* -------------------- SCREEN -------------------- */

export default function SummaryScreen() {
  const { theme } = useTheme();

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selectedRange, setSelectedRange] = useState<RangeKey>("7g");

  const summary = useSummaryData(selectedRange);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 64 }} // ✅ daha fazla boşluk
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Özet</Text>
            <Text style={styles.pageSubtitle}>Koç paneli için hızlı durum görüntüsü</Text>

            {/* RANGE CHIPS */}
            <View style={styles.rangeRow}>
              <View style={{ flex: 1 }}>
                <RangeChip
                  label="7 gün"
                  active={selectedRange === "7g"}
                  onPress={() => setSelectedRange("7g")}
                  theme={theme}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RangeChip
                  label="30 gün"
                  active={selectedRange === "30g"}
                  onPress={() => setSelectedRange("30g")}
                  theme={theme}
                />
              </View>

              <View style={{ flex: 1 }}>
                <RangeChip
                  label="Tümü"
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
              <Text style={styles.cardTitle}>Genel Durum</Text>
            </View>

            <Text style={styles.cardHint}>Öğrenci sayıları ve takip görünümü</Text>

            <StatRow
              label="Toplam öğrenci"
              value={String(summary.totalStudents)}
              sub="Sistemde kayıtlı toplam kişi"
              theme={theme}
            />
            <StatRow
              label="Aktif öğrenci"
              value={String(summary.activeStudents)}
              sub="Durumu “Aktif” olanlar"
              theme={theme}
            />
            <StatRow
              label="Toplam kayıt"
              value={String(summary.measurementsInRange)}
              sub="Seçili aralıkta oluşan tüm ölçüm kayıtları"
              theme={theme}
            />
            <StatRow
              label="Ölçüm yapan (farklı)"
              value={String(summary.measuredStudentsInRange)}
              sub="Seçili aralıkta en az 1 kaydı olan öğrenci"
              theme={theme}
            />
            <StatRow
              label="Takip süresi dolan"
              value={String(summary.followUpDue)}
              sub="Follow-up günü geçen veya hiç kaydı olmayan"
              theme={theme}
            />
            <StatRow
              label="Takibi düzenli"
              value={String(summary.followUpOk)}
              sub="Son kaydı follow-up süresi içinde olan"
              theme={theme}
            />
          </View>

          {/* KART 2 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Activity size={18} color={theme.colors.success} />
              <Text style={styles.cardTitle}>Hedef Dağılımı</Text>
            </View>

            <Text style={styles.cardHint}>Öğrencilerin seçtiği hedeflere göre oran</Text>

            <ProgressRow label="Yağ yakımı / Kilo verme" percent={summary.goalPercents.fatLoss} theme={theme} />
            <ProgressRow label="Kas kazanımı" percent={summary.goalPercents.muscleGain} theme={theme} />
            <ProgressRow label="Genel sağlık / Fitness" percent={summary.goalPercents.generalHealth} theme={theme} />
          </View>

          {/* KART 3 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Users size={18} color={theme.colors.accent} />
              <Text style={styles.cardTitle}>Aktivite Segmentleri</Text>
            </View>

            <TagRow label="Son 7 günde 2+ kayıt" value={`${summary.segTwiceWeek} kişi`} theme={theme} />
            <TagRow label="Son 7 günde 3+ kayıt" value={`${summary.segThreeTimesWeek} kişi`} theme={theme} />
            <TagRow label="Online / Hibrit" value={`${summary.segOnlineHybrid} kişi`} theme={theme} />
            <TagRow label="Başlangıç seviyesi" value={`${summary.segBeginner} kişi`} theme={theme} />
          </View>

          {/* KART 4 */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <BarChart2 size={18} color={theme.colors.warning} />
              <Text style={styles.cardTitle}>Günlük Ölçüm Yoğunluğu</Text>
            </View>

            <Text style={styles.cardHint}>
              Gün gün kaç kayıt girildiğini gösterir (zirve gün otomatik vurgulanır)
            </Text>

            <DailyActivityChart
              counts={summary.dailyCounts}
              labels={summary.barLabels}
              theme={theme}
              height={140}
            />
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
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ThemeUI;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
  theme,
}: {
  label: string;
  value: string;
  sub?: string;
  theme: ThemeUI;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.statRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.statLabel}>{label}</Text>
        {!!sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ProgressRow({
  label,
  percent,
  theme,
}: {
  label: string;
  percent: number;
  theme: ThemeUI;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressLabel}>{clamped}%</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
}

function TagRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeUI;
}) {
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
      alignItems: "center",
    },
    statLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm },
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
  });
}

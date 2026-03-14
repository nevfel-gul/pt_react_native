import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { auth } from "@/services/firebase";
import {
  recordsColRef,
  studentDocRef,
  studentNotesColRef,
} from "@/services/firestorePaths";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Edit,
  Eye,
  Mail,
  Phone,
  User,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Svg,
  Text as SvgText,
} from "react-native-svg";

// ─── Tipler ──────────────────────────────────────────────────────────────────
type Bool = boolean | null;

type StudentProfile = {
  name: string;
  email?: string;
  number?: string;
  boy?: string;
  dateOfBirth?: string;
  gender?: string;
  aktif?: "Aktif" | "Pasif";
  assessmentDate?: string;
};
type StudentPARQ = {
  doctorSaidHeartOrHypertension?: Bool;
  doctorSaidHeartOrHypertensionNote?: string;
};
type StudentWork = {
  jobDescription?: string;
  jobRequiresLongSitting?: Bool;
};
type StudentGoals = {
  trainingGoals?: string[];
  otherGoal?: string;
  plannedDaysPerWeek?: number | null;
  followUpDays?: number;
  followUpDaysUpdatedAt?: any;
};
type Student = { id: string } & StudentProfile &
  StudentPARQ &
  StudentWork &
  StudentGoals & {
    ptNote?: string;
    ptNoteUpdatedAt?: any;
  };
type RecordItem = {
  id: string;
  studentId: string;
  createdAt?: any;
  note?: string;
  weight?: string;
  bodyFat?: string;
  bel?: string;
  kalca?: string;
  analysis?: any;
};
type StudentNote = {
  id: string;
  title?: string;
  text: string;
  createdAt?: any;
};

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
const formatDateTR = (iso?: string) => {
  if (!iso) return "-";
  const parts = iso.split("-").map((x) => Number(x));
  if (parts.length !== 3) return "-";
  const [y, m, d] = parts;
  if (!y || !m || !d) return "-";
  return new Date(y, m - 1, d).toLocaleDateString("tr-TR");
};

function num(v: any): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}
function getRecordDate(r: any): Date | null {
  const ts = r?.createdAt;
  return ts?.toDate ? ts.toDate() : null;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isoKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatShortDateTR(d: Date) {
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}
function formatLongDateTR(d: Date) {
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function getBucketKeyForDate(date: Date, mode: BucketMode) {
  if (mode === "day") return isoKey(startOfDay(date));
  if (mode === "week") return isoKey(startOfWeek(date));
  return monthKey(date);
}

// ─── Chart tipleri ────────────────────────────────────────────────────────────
type RangeKey = "7g" | "30g" | "90g" | "all";
type BucketMode = "day" | "week" | "month";
type ChartPoint = {
  key: string;
  label: string;
  fullLabel: string;
  count: number;
};

// ─── Chart builder'lar ────────────────────────────────────────────────────────
function buildDailyPoints(records: any[], days: number): ChartPoint[] {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  const map: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map[isoKey(d)] = 0;
  }
  records.forEach((r) => {
    const dt = getRecordDate(r);
    if (!dt) return;
    const key = isoKey(startOfDay(dt));
    if (key in map) map[key] += 1;
  });
  return Object.keys(map)
    .sort()
    .map((k, i) => {
      const [y, m, d] = k.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const label =
        days <= 7
          ? date.toLocaleDateString("tr-TR", { weekday: "short" })
          : i % 5 === 0 || i === days - 1
            ? formatShortDateTR(date)
            : "";
      return { key: k, label, fullLabel: formatLongDateTR(date), count: map[k] };
    });
}
function buildWeeklyPoints(records: any[], totalDays: number): ChartPoint[] {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (totalDays - 1));
  const firstWeek = startOfWeek(start);
  const lastWeek = startOfWeek(end);
  const points: ChartPoint[] = [];
  const map: Record<string, number> = {};
  for (
    let d = new Date(firstWeek);
    d <= lastWeek;
    d.setDate(d.getDate() + 7)
  ) {
    const ws = new Date(d);
    const we = new Date(d);
    we.setDate(ws.getDate() + 6);
    const key = isoKey(ws);
    map[key] = 0;
    points.push({
      key,
      label: formatShortDateTR(ws),
      fullLabel: `${formatLongDateTR(ws)} – ${formatLongDateTR(we)}`,
      count: 0,
    });
  }
  records.forEach((r) => {
    const dt = getRecordDate(r);
    if (!dt) return;
    if (dt < start || dt > end) return;
    const ws = startOfWeek(dt);
    const key = isoKey(ws);
    if (key in map) map[key] += 1;
  });
  return points.map((p) => ({ ...p, count: map[p.key] ?? 0 }));
}
function buildMonthlyPoints(records: any[]): ChartPoint[] {
  const dated = records
    .map((r) => getRecordDate(r))
    .filter(Boolean) as Date[];
  const today = startOfDay(new Date());
  const oldest = dated.length
    ? new Date(Math.min(...dated.map((d) => d.getTime())))
    : new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const start = startOfMonth(oldest);
  const end = startOfMonth(today);
  const points: ChartPoint[] = [];
  const map: Record<string, number> = {};
  for (
    let d = new Date(start);
    d <= end;
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  ) {
    const current = new Date(d);
    const key = monthKey(current);
    map[key] = 0;
    points.push({
      key,
      label: current.toLocaleDateString("tr-TR", { month: "short" }),
      fullLabel: current.toLocaleDateString("tr-TR", {
        month: "long",
        year: "numeric",
      }),
      count: 0,
    });
  }
  records.forEach((r) => {
    const dt = getRecordDate(r);
    if (!dt) return;
    const key = monthKey(dt);
    if (key in map) map[key] += 1;
  });
  return points.map((p) => ({ ...p, count: map[p.key] ?? 0 }));
}
function buildChartData(records: any[], range: RangeKey) {
  if (range === "7g")
    return {
      mode: "day" as BucketMode,
      title: "Son 7 gün",
      points: buildDailyPoints(records, 7),
    };
  if (range === "30g")
    return {
      mode: "day" as BucketMode,
      title: "Son 30 gün",
      points: buildDailyPoints(records, 30),
    };
  if (range === "90g")
    return {
      mode: "week" as BucketMode,
      title: "Son 90 gün",
      points: buildWeeklyPoints(records, 90),
    };
  return {
    mode: "month" as BucketMode,
    title: "Tüm zaman",
    points: buildMonthlyPoints(records),
  };
}

function getMetricSnapshot(records: any[], key: string, suffix = "") {
  const values = records
    .map((r) => num(r?.[key]))
    .filter((v): v is number => v != null);
  const latest = values[0] ?? null;
  const previous = values[1] ?? null;
  let deltaText = "Önceki veri yok";
  if (latest != null && previous != null) {
    const diff = latest - previous;
    const sign = diff > 0 ? "+" : "";
    deltaText = `${sign}${diff.toFixed(1)}${suffix} önceki kayıda göre`;
  }
  return {
    value: latest != null ? `${latest}${suffix}` : "-",
    deltaText,
  };
}

// ─── SVG smooth path ──────────────────────────────────────────────────────────
function buildSmoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i].x + (pts[i + 1].x - pts[i].x) / 3;
    const cp1y = pts[i].y;
    const cp2x = pts[i + 1].x - (pts[i + 1].x - pts[i].x) / 3;
    const cp2y = pts[i + 1].y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

// ─── Metrik zaman serisi ──────────────────────────────────────────────────────
function buildMetricSeries(
  records: any[],
  key: string,
): Array<{ date: Date; value: number; label: string }> {
  return records
    .map((r) => {
      const v = num(r?.[key]);
      const dt = getRecordDate(r);
      return v != null && dt
        ? { date: dt, value: v, label: formatShortDateTR(dt) }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.date.getTime() - b!.date.getTime()) as Array<{
      date: Date;
      value: number;
      label: string;
    }>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANİMASYONLU ÇİZGİ GRAFİK
// ─────────────────────────────────────────────────────────────────────────────
const METRIC_TABS = [
  { key: "weight", label: "Kilo", suffix: " kg", color: "#38bdf8", gradId: "gW" },
  { key: "bodyFat", label: "Yağ %", suffix: "%", color: "#a78bfa", gradId: "gF" },
  { key: "bel", label: "Bel", suffix: " cm", color: "#34d399", gradId: "gB" },
  { key: "kalca", label: "Kalça", suffix: " cm", color: "#fb923c", gradId: "gK" },
] as const;

type MetricKey = (typeof METRIC_TABS)[number]["key"];

function MetricLineChart({
  theme,
  records,
}: {
  theme: ThemeUI;
  records: any[];
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("weight");
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const W = 320;
  const H = 200;
  const PAD = { top: 20, right: 16, bottom: 36, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const metaCfg = METRIC_TABS.find((m) => m.key === activeMetric)!;

  const series = useMemo(
    () => buildMetricSeries(records, activeMetric),
    [records, activeMetric],
  );

  const { minV, maxV, pts, areaPath, linePath } = useMemo(() => {
    if (series.length === 0)
      return { minV: 0, maxV: 1, pts: [], areaPath: "", linePath: "" };
    const vals = series.map((s) => s.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const pad = (rawMax - rawMin) * 0.15 || 1;
    const minV = rawMin - pad;
    const maxV = rawMax + pad;
    const svgW = Math.max(W, series.length * 36);
    const usedChartW = svgW - PAD.left - PAD.right;
    const toX = (i: number) =>
      series.length > 1
        ? PAD.left + (i / (series.length - 1)) * usedChartW
        : PAD.left + usedChartW / 2;
    const toY = (v: number) =>
      PAD.top + chartH - ((v - minV) / (maxV - minV)) * chartH;
    const pts = series.map((s, i) => ({ x: toX(i), y: toY(s.value) }));
    const linePath = buildSmoothPath(pts);
    const areaPath =
      linePath +
      ` L ${pts[pts.length - 1].x} ${PAD.top + chartH}` +
      ` L ${pts[0].x} ${PAD.top + chartH} Z`;
    return { minV, maxV, pts, areaPath, linePath };
  }, [series]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    setActivePointIndex(series.length > 0 ? series.length - 1 : null);
  }, [activeMetric, series.length]);

  const activePoint =
    activePointIndex != null ? series[activePointIndex] : null;
  const activeXY =
    activePointIndex != null ? pts[activePointIndex] : null;

  const yTicks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count }, (_, i) => {
      const v = minV + ((maxV - minV) * i) / (count - 1);
      const y = PAD.top + chartH - ((v - minV) / (maxV - minV)) * chartH;
      return { v: v.toFixed(0), y };
    });
  }, [minV, maxV]);

  const svgW = Math.max(W, series.length * 36);

  return (
    <View style={{ marginTop: 8 }}>
      {/* Metrik tab'ları */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
      >
        {METRIC_TABS.map((m) => {
          const active = m.key === activeMetric;
          return (
            <TouchableOpacity
              key={m.key}
              activeOpacity={0.8}
              onPress={() => setActiveMetric(m.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: active ? m.color : "rgba(148,163,184,0.3)",
                backgroundColor: active ? `${m.color}18` : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? m.color : theme.colors.text.muted,
                  fontSize: 12,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                }}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grafik kutusu */}
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSoft,
          borderRadius: theme.radius.lg,
          paddingVertical: 12,
          paddingHorizontal: 8,
          overflow: "hidden",
        }}
      >
        {series.length < 2 ? (
          <View
            style={{
              height: H,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.colors.text.muted,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {series.length === 0
                ? `${metaCfg.label} verisi henüz yok.`
                : "Grafik için en az 2 ölçüm gerekli."}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={series.length > 10}
          >
            <Animated.View style={{ opacity: fadeAnim, width: svgW }}>
              <Svg width={svgW} height={H}>
                <Defs>
                  <LinearGradient
                    id={metaCfg.gradId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <Stop
                      offset="0%"
                      stopColor={metaCfg.color}
                      stopOpacity="0.28"
                    />
                    <Stop
                      offset="100%"
                      stopColor={metaCfg.color}
                      stopOpacity="0.01"
                    />
                  </LinearGradient>
                </Defs>

                {/* Grid yatay çizgiler */}
                {yTicks.map((t, i) => (
                  <G key={i}>
                    <Line
                      x1={PAD.left}
                      y1={t.y}
                      x2={svgW - PAD.right}
                      y2={t.y}
                      stroke={theme.colors.border}
                      strokeWidth={1}
                      opacity={0.5}
                      strokeDasharray="4 4"
                    />
                    <SvgText
                      x={PAD.left - 6}
                      y={t.y + 4}
                      textAnchor="end"
                      fontSize={10}
                      fontWeight="700"
                      fill={theme.colors.text.muted}
                    >
                      {t.v}
                    </SvgText>
                  </G>
                ))}

                {/* X ekseni alt çizgisi */}
                <Line
                  x1={PAD.left}
                  y1={PAD.top + chartH}
                  x2={svgW - PAD.right}
                  y2={PAD.top + chartH}
                  stroke={theme.colors.border}
                  strokeWidth={1}
                  opacity={0.7}
                />

                {/* X etiketleri */}
                {series.map((s, i) => {
                  const step = Math.max(1, Math.ceil(series.length / 7));
                  if (i % step !== 0 && i !== series.length - 1) return null;
                  const x =
                    series.length > 1
                      ? PAD.left +
                      (i / (series.length - 1)) *
                      (svgW - PAD.left - PAD.right)
                      : PAD.left + (svgW - PAD.left - PAD.right) / 2;
                  return (
                    <SvgText
                      key={s.label + i}
                      x={x}
                      y={H - 6}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight="700"
                      fill={theme.colors.text.muted}
                    >
                      {s.label}
                    </SvgText>
                  );
                })}

                {/* Alan dolgusu */}
                <Path d={areaPath} fill={`url(#${metaCfg.gradId})`} />

                {/* Çizgi */}
                <Path
                  d={linePath}
                  fill="none"
                  stroke={metaCfg.color}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Tüm noktalar */}
                {pts.map((p, i) => (
                  <Circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill={metaCfg.color}
                    opacity={0.45}
                  />
                ))}

                {/* Aktif nokta */}
                {activeXY && (
                  <G>
                    <Line
                      x1={activeXY.x}
                      y1={PAD.top}
                      x2={activeXY.x}
                      y2={PAD.top + chartH}
                      stroke={metaCfg.color}
                      strokeWidth={1.2}
                      opacity={0.45}
                      strokeDasharray="3 3"
                    />
                    <Circle
                      cx={activeXY.x}
                      cy={activeXY.y}
                      r={6}
                      fill={metaCfg.color}
                      opacity={0.18}
                    />
                    <Circle
                      cx={activeXY.x}
                      cy={activeXY.y}
                      r={3.5}
                      fill={metaCfg.color}
                    />
                  </G>
                )}

                {/* Dokunmatik alanlar */}
                {pts.map((p, i) => (
                  <Circle
                    key={`tap-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={16}
                    fill="transparent"
                    onPress={() => setActivePointIndex(i)}
                  />
                ))}
              </Svg>
            </Animated.View>
          </ScrollView>
        )}

        {/* Aktif nokta bilgisi */}
        {activePoint && (
          <View
            style={{
              marginTop: 8,
              marginHorizontal: 8,
              borderWidth: 1,
              borderColor: `${metaCfg.color}30`,
              backgroundColor: `${metaCfg.color}0e`,
              borderRadius: theme.radius.md,
              paddingVertical: 10,
              paddingHorizontal: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: theme.colors.text.secondary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {activePoint.date.toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Text
              style={{
                color: metaCfg.color,
                fontSize: 15,
                fontWeight: "900",
              }}
            >
              {activePoint.value}
              {metaCfg.suffix}
            </Text>
          </View>
        )}

        {/* Delta */}
        {series.length >= 2 &&
          (() => {
            const last = series[series.length - 1].value;
            const prev = series[series.length - 2].value;
            const diff = last - prev;
            const sign = diff > 0 ? "+" : "";
            const color =
              diff === 0
                ? theme.colors.text.muted
                : diff < 0
                  ? "#34d399"
                  : "#f87171";
            return (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  marginTop: 4,
                  paddingHorizontal: 12,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text.muted,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  Son 2 ölçüm farkı:{" "}
                </Text>
                <Text
                  style={{ color, fontSize: 12, fontWeight: "900" }}
                >
                  {sign}
                  {diff.toFixed(1)}
                  {metaCfg.suffix}
                </Text>
              </View>
            );
          })()}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  GAUGE KARTI
// ─────────────────────────────────────────────────────────────────────────────
type GaugeConfig = {
  label: string;
  value: string | null;
  min: number;
  max: number;
  numericValue: number | null;
  statusLabel: string | null;
  thresholds: Array<{ upto: number; color: string; label: string }>;
  unit?: string;
};

function AnimatedGaugeCard({
  theme,
  config,
}: {
  theme: ThemeUI;
  config: GaugeConfig;
}) {
  const animProgress = useRef(new Animated.Value(0)).current;
  const [needleAngle, setNeedleAngle] = useState(-Math.PI);

  const SIZE = 130;
  const CX = SIZE / 2;
  const CY = SIZE * 0.62;
  const R = SIZE * 0.38;
  const STROKE = 11;
  const startAngle = -Math.PI;
  const totalAngle = Math.PI;

  const normalised =
    config.numericValue != null
      ? Math.min(
        1,
        Math.max(
          0,
          (config.numericValue - config.min) / (config.max - config.min),
        ),
      )
      : 0;

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: normalised,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const id = animProgress.addListener(({ value }) => {
      setNeedleAngle(startAngle + value * totalAngle);
    });
    return () => animProgress.removeListener(id);
  }, [config.numericValue]);

  function polar(cx: number, cy: number, r: number, angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }
  function arc(cx: number, cy: number, r: number, a1: number, a2: number) {
    const s = polar(cx, cy, r, a1);
    const e = polar(cx, cy, r, a2);
    const large = a2 - a1 > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const bgSegments = config.thresholds.map((t, i) => {
    const prevUpto =
      i === 0 ? config.min : config.thresholds[i - 1].upto;
    const a1 =
      startAngle +
      ((prevUpto - config.min) / (config.max - config.min)) * totalAngle;
    const a2 =
      startAngle +
      ((Math.min(t.upto, config.max) - config.min) /
        (config.max - config.min)) *
      totalAngle;
    return { path: arc(CX, CY, R, a1, a2), color: t.color };
  });

  const progressPath = arc(CX, CY, R, startAngle, needleAngle);

  const activeThreshold =
    config.numericValue != null
      ? config.thresholds.find((t) => config.numericValue! <= t.upto) ??
      config.thresholds[config.thresholds.length - 1]
      : null;
  const trackColor = activeThreshold?.color ?? "#38bdf8";

  const needleTip = polar(CX, CY, R - STROKE / 2 - 2, needleAngle);
  const needleBase1 = polar(CX, CY, 5, needleAngle + Math.PI / 2);
  const needleBase2 = polar(CX, CY, 5, needleAngle - Math.PI / 2);

  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.lg,
        padding: 10,
        alignItems: "center",
        minWidth: 140,
      }}
    >
      <Text
        style={{
          color: theme.colors.text.muted,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.4,
          marginBottom: 2,
          textAlign: "center",
        }}
      >
        {config.label}
      </Text>

      {config.numericValue == null ? (
        <View style={{ height: SIZE * 0.75, justifyContent: "center" }}>
          <Text
            style={{
              color: theme.colors.text.muted,
              fontSize: 20,
              fontWeight: "900",
            }}
          >
            —
          </Text>
        </View>
      ) : (
        <Svg width={SIZE} height={SIZE * 0.72}>
          {bgSegments.map((seg, i) => (
            <Path
              key={i}
              d={seg.path}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              opacity={0.18}
            />
          ))}
          <Path
            d={progressPath}
            fill="none"
            stroke={trackColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            opacity={0.85}
          />
          <Circle cx={CX} cy={CY} r={6} fill={theme.colors.surface} />
          <Circle cx={CX} cy={CY} r={3.5} fill={trackColor} />
          <Path
            d={`M ${needleBase1.x} ${needleBase1.y} L ${needleTip.x} ${needleTip.y} L ${needleBase2.x} ${needleBase2.y} Z`}
            fill={trackColor}
            opacity={0.9}
          />
          <SvgText
            x={CX - R + 2}
            y={CY + 16}
            textAnchor="middle"
            fontSize={9}
            fontWeight="700"
            fill={theme.colors.text.muted}
          >
            {config.min}
          </SvgText>
          <SvgText
            x={CX + R - 2}
            y={CY + 16}
            textAnchor="middle"
            fontSize={9}
            fontWeight="700"
            fill={theme.colors.text.muted}
          >
            {config.max}
          </SvgText>
        </Svg>
      )}

      <Text
        style={{
          color: trackColor ?? theme.colors.text.primary,
          fontSize: 18,
          fontWeight: "900",
          marginTop: -4,
          lineHeight: 22,
        }}
      >
        {config.value ?? "—"}
      </Text>

      {!!config.statusLabel && (
        <View
          style={{
            marginTop: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: `${trackColor}20`,
            borderWidth: 1,
            borderColor: `${trackColor}40`,
          }}
        >
          <Text
            style={{
              color: trackColor!,
              fontSize: 10,
              fontWeight: "800",
            }}
          >
            {config.statusLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CollapsibleCard
// ─────────────────────────────────────────────────────────────────────────────
function CollapsibleCard({
  theme,
  styles,
  title,
  open,
  setOpen,
  children,
}: {
  theme: ThemeUI;
  styles: ReturnType<typeof makeStyles>;
  title: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const h = useRef(new Animated.Value(open ? 1 : 0)).current;
  const r = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(h, {
        toValue: open ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(r, {
        toValue: open ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [open]);

  const height = h.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, contentH)],
  });
  const rotate = r.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={18} color={theme.colors.text.muted} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={{ height, overflow: "hidden" }}>
        <View
          onLayout={(e) => {
            const next = Math.ceil(e.nativeEvent.layout.height);
            if (next !== contentH) setContentH(next);
          }}
          style={{ paddingTop: theme.spacing.xs }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  KPI
// ─────────────────────────────────────────────────────────────────────────────
function KPI({
  theme,
  label,
  value,
  subText,
}: {
  theme: ThemeUI;
  label: string;
  value: string;
  subText?: string;
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
        minHeight: 92,
      }}
    >
      <Text
        style={{
          color: theme.colors.text.muted,
          fontSize: theme.fontSize.xs,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.text.primary,
          fontSize: theme.fontSize.lg,
          fontWeight: "900",
          marginTop: 4,
        }}
      >
        {value}
      </Text>
      {!!subText && (
        <Text
          style={{
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.xs,
            marginTop: 6,
            lineHeight: 16,
            fontWeight: "700",
          }}
        >
          {subText}
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANALİTİKLER KARTI (Ölçümler)
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsCard({
  theme,
  styles,
  records,
  range,
  setRange,
  open,
  setOpen,
}: {
  theme: ThemeUI;
  styles: ReturnType<typeof makeStyles>;
  records: any[];
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const summary = useMemo(() => {
    const chart = buildChartData(records, range);
    const counts = chart.points.map((p) => p.count);
    const total = counts.reduce((a, b) => a + b, 0);
    const avg = chart.points.length ? total / chart.points.length : 0;
    const peak = chart.points.reduce<ChartPoint | null>((acc, p) => {
      if (!acc || p.count > acc.count) return p;
      return acc;
    }, null);
    const safeIdx =
      chart.points.length === 0
        ? 0
        : Math.min(Math.max(selectedIndex, 0), chart.points.length - 1);
    const selectedPoint = chart.points[safeIdx] ?? null;
    const selectedPeriodRecords = selectedPoint
      ? records
        .filter((r) => {
          const dt = getRecordDate(r);
          if (!dt) return false;
          return (
            getBucketKeyForDate(dt, chart.mode) === selectedPoint.key
          );
        })
        .sort((a, b) => {
          const da = getRecordDate(a)?.getTime() ?? 0;
          const db = getRecordDate(b)?.getTime() ?? 0;
          return db - da;
        })
      : [];
    const weight = getMetricSnapshot(records, "weight", " kg");
    const fat = getMetricSnapshot(records, "bodyFat", " %");
    const bel = getMetricSnapshot(records, "bel", " cm");
    const kalca = getMetricSnapshot(records, "kalca", " cm");
    return {
      chart, total, avg, peak,
      safeIdx, selectedPoint, selectedPeriodRecords,
      weight, fat, bel, kalca,
    };
  }, [records, range, selectedIndex]);

  useEffect(() => {
    const chart = buildChartData(records, range);
    setSelectedIndex(
      chart.points.length > 0 ? chart.points.length - 1 : 0,
    );
  }, [range, records.length]);

  const rangeItems: Array<{ key: RangeKey; label: string }> = [
    { key: "7g", label: "7 Gün" },
    { key: "30g", label: "30 Gün" },
    { key: "90g", label: "90 Gün" },
    { key: "all", label: "Tümü" },
  ];

  return (
    <CollapsibleCard
      theme={theme}
      styles={styles}
      title="Analitikler • Ölçümler"
      open={open}
      setOpen={setOpen}
    >
      <Text
        style={{
          color: theme.colors.text.secondary,
          fontSize: theme.fontSize.sm,
          lineHeight: 18,
          marginTop: 2,
        }}
      >
        Kayıt sıklığı, ölçüm trendleri ve değişim analizleri.
      </Text>

      {/* Range seçici */}
      <View
        style={{
          flexDirection: "row",
          marginTop: theme.spacing.sm,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {rangeItems.map((item) => {
          const active = range === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              onPress={() => setRange(item.key)}
              style={[
                {
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 7,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceSoft,
                },
                active && {
                  borderColor: theme.colors.accent,
                  backgroundColor: "rgba(56,189,248,0.12)",
                },
              ]}
            >
              <Text
                style={{
                  color: active
                    ? theme.colors.accent
                    : theme.colors.text.secondary,
                  fontSize: theme.fontSize.xs,
                  fontWeight: "900",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Özet kutu */}
      <View
        style={{
          marginTop: theme.spacing.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSoft,
          borderRadius: theme.radius.md,
          padding: theme.spacing.sm,
        }}
      >
        <Text
          style={{
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.sm,
            fontWeight: "900",
          }}
        >
          {summary.chart.title}
        </Text>
        <Text
          style={{
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.xs,
            lineHeight: 17,
            marginTop: 6,
          }}
        >
          Toplam kayıt:{" "}
          <Text
            style={{
              color: theme.colors.text.primary,
              fontWeight: "900",
            }}
          >
            {summary.total}
          </Text>
          {"  •  "}
          Ortalama:{" "}
          <Text
            style={{
              color: theme.colors.text.primary,
              fontWeight: "900",
            }}
          >
            {summary.avg.toFixed(1)}
          </Text>
          {"  •  "}
          En yoğun:{" "}
          <Text
            style={{
              color: theme.colors.text.primary,
              fontWeight: "900",
            }}
          >
            {summary.peak
              ? `${summary.peak.fullLabel} (${summary.peak.count})`
              : "-"}
          </Text>
        </Text>
      </View>

      {/* KPI'lar */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginTop: theme.spacing.sm,
        }}
      >
        <KPI
          theme={theme}
          label="Son Kilo"
          value={summary.weight.value}
          subText={summary.weight.deltaText}
        />
        <KPI
          theme={theme}
          label="Son Yağ %"
          value={summary.fat.value}
          subText={summary.fat.deltaText}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <KPI
          theme={theme}
          label="Bel Çevresi"
          value={summary.bel.value}
          subText={summary.bel.deltaText}
        />
        <KPI
          theme={theme}
          label="Kalça Çevresi"
          value={summary.kalca.value}
          subText={summary.kalca.deltaText}
        />
      </View>

      {/* ✅ YENİ: Animasyonlu çizgi grafik */}
      <MetricLineChart theme={theme} records={records} />

      {/* Seçili dönem kayıtları */}
      <View style={{ marginTop: 14 }}>
        <Text
          style={{
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.sm,
            fontWeight: "900",
          }}
        >
          Seçili dönemin kayıtları
        </Text>
        {summary.selectedPeriodRecords.length ? (
          summary.selectedPeriodRecords.map((r: any) => {
            const dt = getRecordDate(r);
            const ds = dt
              ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}`
              : "-";
            return (
              <View
                key={r.id}
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text.muted,
                    fontSize: theme.fontSize.xs,
                  }}
                >
                  {ds}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text.primary,
                    fontSize: theme.fontSize.sm,
                    marginTop: 2,
                  }}
                >
                  {r.note?.trim() ? r.note : "Not yok"}
                </Text>
              </View>
            );
          })
        ) : (
          <Text
            style={{ marginTop: 6, color: theme.colors.text.muted }}
          >
            Seçili dönemde kayıt yok.
          </Text>
        )}
      </View>
    </CollapsibleCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEST SONUÇLARI KARTI (Gauge)
// ─────────────────────────────────────────────────────────────────────────────
function TestsCard({
  theme,
  styles,
  records,
  open,
  setOpen,
}: {
  theme: ThemeUI;
  styles: ReturnType<typeof makeStyles>;
  records: any[];
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setSelectedIndex(0);
    setPickerOpen(false);
  }, [records.length]);

  const safeIdx =
    records.length > 0
      ? Math.min(Math.max(selectedIndex, 0), records.length - 1)
      : 0;
  const selectedRecord = records?.[safeIdx] ?? null;
  const a = selectedRecord?.analysis ?? {};

  const selectedDt = getRecordDate(selectedRecord);
  const selectedDateLabel = selectedDt
    ? `${selectedDt.toLocaleDateString("tr-TR")} • ${selectedDt.toLocaleTimeString("tr-TR")}`
    : "-";

  // ─── Gauge konfigürasyonları — tamamen dinamik ────────────────────────────
  const gauges: GaugeConfig[] = useMemo(() => {
    const bmiNum = num(a?.bmi);
    const vo2Num = num(a?.bruceVO2Max);

    const statusToNum = (
      raw: string | undefined,
      map: Record<string, number>,
    ): number | null => {
      if (!raw || raw === "-") return null;
      return map[raw] ?? null;
    };

    const qualMap = {
      "Çok Zayıf": 10, "Zayıf": 25, "Orta Altı": 35,
      "Orta": 50, "İyi": 70, "Mükemmel": 90,
      "Very Poor": 10, "Poor": 25, "Below Average": 35,
      "Average": 50, "Good": 70, "Excellent": 90,
      "Fair": 45,
    };

    const srNum = num(a?.sitAndReachBest);

    return [
      {
        label: "BMI",
        value: bmiNum != null ? bmiNum.toFixed(1) : null,
        numericValue: bmiNum,
        min: 10, max: 45,
        statusLabel: a?.bmiStatus ?? null,
        thresholds: [
          { upto: 18.5, color: "#60a5fa", label: "Zayıf" },
          { upto: 24.9, color: "#34d399", label: "Normal" },
          { upto: 29.9, color: "#fbbf24", label: "Fazla Kilolu" },
          { upto: 45, color: "#f87171", label: "Obez" },
        ],
      },
      {
        label: "VO₂max",
        value: vo2Num != null ? `${vo2Num.toFixed(1)}` : null,
        numericValue: vo2Num,
        min: 20, max: 75,
        statusLabel: a?.vo2Status ?? null,
        unit: "ml/kg/dk",
        thresholds: [
          { upto: 35, color: "#f87171", label: "Zayıf" },
          { upto: 42, color: "#fbbf24", label: "Orta" },
          { upto: 52, color: "#34d399", label: "İyi" },
          { upto: 75, color: "#38bdf8", label: "Mükemmel" },
        ],
      },
      {
        label: "YMCA",
        value: a?.ymcaStatus && a.ymcaStatus !== "-" ? a.ymcaStatus : null,
        numericValue: statusToNum(a?.ymcaStatus, qualMap),
        min: 0, max: 100,
        statusLabel: a?.ymcaStatus ?? null,
        thresholds: [
          { upto: 20, color: "#f87171", label: "Çok Zayıf" },
          { upto: 40, color: "#fb923c", label: "Zayıf" },
          { upto: 60, color: "#fbbf24", label: "Orta" },
          { upto: 80, color: "#34d399", label: "İyi" },
          { upto: 100, color: "#38bdf8", label: "Mükemmel" },
        ],
      },
      {
        label: "Sit & Reach",
        value: srNum != null ? `${srNum} cm` : null,
        numericValue: srNum,
        min: -20, max: 40,
        statusLabel: null,
        thresholds: [
          { upto: 0, color: "#f87171", label: "Düşük" },
          { upto: 15, color: "#fbbf24", label: "Orta" },
          { upto: 25, color: "#34d399", label: "İyi" },
          { upto: 40, color: "#38bdf8", label: "Mükemmel" },
        ],
      },
      {
        label: "Push-up",
        value: a?.pushupStatus && a.pushupStatus !== "-" ? a.pushupStatus : null,
        numericValue: statusToNum(a?.pushupStatus, qualMap),
        min: 0, max: 100,
        statusLabel: a?.pushupStatus ?? null,
        thresholds: [
          { upto: 20, color: "#f87171", label: "Zayıf" },
          { upto: 40, color: "#fb923c", label: "Orta Altı" },
          { upto: 60, color: "#fbbf24", label: "Orta" },
          { upto: 80, color: "#34d399", label: "İyi" },
          { upto: 100, color: "#38bdf8", label: "Mükemmel" },
        ],
      },
      {
        label: "Plank",
        value: a?.plankStatus && a.plankStatus !== "-" ? a.plankStatus : null,
        numericValue: statusToNum(a?.plankStatus, qualMap),
        min: 0, max: 100,
        statusLabel: a?.plankStatus ?? null,
        thresholds: [
          { upto: 25, color: "#f87171", label: "Zayıf" },
          { upto: 50, color: "#fbbf24", label: "Orta" },
          { upto: 75, color: "#34d399", label: "İyi" },
          { upto: 100, color: "#38bdf8", label: "Mükemmel" },
        ],
      },
    ];
  }, [a]);

  return (
    <CollapsibleCard
      theme={theme}
      styles={styles}
      title="Analitikler • Test Sonuçları"
      open={open}
      setOpen={(v) => {
        setOpen(v);
        if (!v) setPickerOpen(false);
      }}
    >
      <Text
        style={{
          color: theme.colors.text.secondary,
          fontSize: theme.fontSize.sm,
          lineHeight: 18,
          marginTop: 2,
        }}
      >
        Seçili kaydın test sonuçları gösterge grafikleriyle görselleştirilir.
      </Text>

      {/* Kayıt seçici */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setPickerOpen((prev) => !prev)}
        style={{
          marginTop: theme.spacing.sm,
          borderWidth: 1,
          borderColor: pickerOpen
            ? theme.colors.accent
            : theme.colors.border,
          backgroundColor: theme.colors.surfaceSoft,
          borderRadius: theme.radius.md,
          padding: theme.spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: theme.colors.text.muted,
              fontSize: theme.fontSize.xs,
              fontWeight: "800",
            }}
          >
            Seçili kayıt
          </Text>
          <Text
            style={{
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.sm,
              fontWeight: "900",
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {selectedDateLabel}
          </Text>
        </View>
        <Animated.View
          style={{
            transform: [{ rotate: pickerOpen ? "180deg" : "0deg" }],
          }}
        >
          <ChevronDown size={18} color={theme.colors.text.muted} />
        </Animated.View>
      </TouchableOpacity>

      {/* Açılan liste */}
      {pickerOpen && (
        <View
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            overflow: "hidden",
          }}
        >
          {records.length ? (
            records.slice(0, 12).map((r, i) => {
              const dt = getRecordDate(r);
              const ds = dt
                ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}`
                : "-";
              const isActive = i === safeIdx;
              return (
                <TouchableOpacity
                  key={r.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedIndex(i);
                    setPickerOpen(false);
                  }}
                  style={{
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: theme.colors.border,
                    backgroundColor: isActive
                      ? "rgba(56,189,248,0.10)"
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: isActive
                        ? theme.colors.text.primary
                        : theme.colors.text.secondary,
                      fontSize: theme.fontSize.sm,
                      fontWeight: isActive ? "900" : "700",
                    }}
                  >
                    {i === 0 ? `Son kayıt • ${ds}` : ds}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={{ padding: theme.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.text.muted,
                  fontSize: theme.fontSize.sm,
                }}
              >
                Kayıt yok.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ✅ Gauge kartları — 2'li grid */}
      {gauges
        .reduce<GaugeConfig[][]>((rows, g, i) => {
          if (i % 2 === 0) rows.push([g]);
          else rows[rows.length - 1].push(g);
          return rows;
        }, [])
        .map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: rowIdx === 0 ? 12 : 10,
            }}
          >
            {row.map((cfg, ci) => (
              <AnimatedGaugeCard key={ci} theme={theme} config={cfg} />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}

      {!selectedRecord && (
        <Text
          style={{
            marginTop: 12,
            color: theme.colors.text.muted,
            textAlign: "center",
          }}
        >
          Henüz kayıt eklenmedi.
        </Text>
      )}
    </CollapsibleCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANA EKRAN
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const listRef = useRef<FlatList<RecordItem>>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);
  const [range, setRange] = useState<RangeKey>("30g");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [ptNote, setPtNote] = useState("");
  const [ptNoteOpen, setPtNoteOpen] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const uid = auth.currentUser?.uid;
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const toggleNote = (noteId: string) => {
    setExpandedNoteId((cur) => (cur === noteId ? null : noteId));
  };

  const parqQuestions = useMemo(
    () => [
      { key: "doctorSaidHeartOrHypertension" as const, noteKey: "doctorSaidHeartOrHypertensionNote" as const, labelKey: "parq.q1" },
      { key: "chestPainDuringActivityOrDaily" as const, noteKey: "chestPainDuringActivityOrDailyNote" as const, labelKey: "parq.q2" },
      { key: "dizzinessOrLostConsciousnessLast12Months" as const, noteKey: "dizzinessOrLostConsciousnessLast12MonthsNote" as const, labelKey: "parq.q3" },
      { key: "diagnosedOtherChronicDisease" as const, noteKey: "diagnosedOtherChronicDiseaseNote" as const, labelKey: "parq.q4" },
      { key: "usesMedicationForChronicDisease" as const, noteKey: "usesMedicationForChronicDiseaseNote" as const, labelKey: "parq.q5" },
      { key: "boneJointSoftTissueProblemWorseWithActivity" as const, noteKey: "boneJointSoftTissueProblemWorseWithActivityNote" as const, labelKey: "parq.q6" },
      { key: "doctorSaidOnlyUnderMedicalSupervision" as const, noteKey: "doctorSaidOnlyUnderMedicalSupervisionNote" as const, labelKey: "parq.q7" },
    ],
    [],
  );

  const personalQuestions = useMemo(
    () => [
      { key: "hadPainOrInjury" as const, noteKey: "hadPainOrInjuryNote" as const, labelKey: "personal.q1" },
      { key: "hadSurgery" as const, noteKey: "hadSurgeryNote" as const, labelKey: "personal.q2" },
      { key: "diagnosedChronicDiseaseByDoctor" as const, noteKey: "diagnosedChronicDiseaseByDoctorNote" as const, labelKey: "personal.q3" },
      { key: "currentlyUsesMedications" as const, noteKey: "currentlyUsesMedicationsNote" as const, labelKey: "personal.q4" },
      { key: "weeklyPhysicalActivity30MinOrLess" as const, noteKey: "weeklyPhysicalActivity30MinOrLessNote" as const, labelKey: "personal.q5" },
      { key: "hasSportsHistoryOrCurrentlyDoingSport" as const, noteKey: "hasSportsHistoryOrCurrentlyDoingSportNote" as const, labelKey: "personal.q6" },
      { key: "jobRequiresLongSitting" as const, labelKey: "personal.q7" },
      { key: "jobRequiresRepetitiveMovement" as const, labelKey: "personal.q8" },
      { key: "jobRequiresHighHeels" as const, labelKey: "personal.q9" },
      { key: "jobCausesAnxiety" as const, labelKey: "personal.q10" },
    ],
    [],
  );

  // ─── Firebase yükle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !uid) return;
    const load = async () => {
      try {
        const ref = studentDocRef(uid!, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) { setStudent(null); return; }
        const d = snap.data() as any;
        setStudent({
          id: snap.id, ...d,
          aktif: d.aktif ?? "Aktif",
          trainingGoals: Array.isArray(d.trainingGoals) ? d.trainingGoals : [],
          followUpDays: typeof d.followUpDays === "number" ? d.followUpDays : 30,
        });
        setPtNote((d.ptNote as string) ?? "");
      } catch (err) {
        console.error(err);
        setStudent(null);
      } finally {
        setLoadingStudent(false);
      }
    };
    load();
  }, [id, uid]);

  useEffect(() => {
    if (!id || !uid) return;
    const qy = query(
      recordsColRef(auth.currentUser?.uid!),
      where("studentId", "==", id),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setRecords(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoadingRecords(false);
      },
      (err) => { console.error(err); setLoadingRecords(false); },
    );
    return () => unsub();
  }, [id, uid]);

  useEffect(() => {
    if (!id || !uid) return;
    const qy = query(studentNotesColRef(uid, id), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoadingNotes(false);
      },
      (err) => { console.error(err); setLoadingNotes(false); },
    );
    return () => unsub();
  }, [id, uid]);

  // ─── Aksiyonlar ────────────────────────────────────────────────────────────
  const goBack = () => router.replace("/(tabs)");

  const toggleAktif = async () => {
    if (!student) return;
    try {
      setToggling(true);
      const newStatus = student.aktif === "Aktif" ? "Pasif" : "Aktif";
      await updateDoc(studentDocRef(auth.currentUser?.uid!, student.id), { aktif: newStatus });
      setStudent({ ...student, aktif: newStatus });
    } catch (err) { console.error(err); }
    finally { setToggling(false); }
  };

  const setFollowUpDays = async (days: number) => {
    if (!student) return;
    try {
      setSavingFollowUp(true);
      await updateDoc(studentDocRef(auth.currentUser?.uid!, student.id), {
        followUpDays: days,
        followUpDaysUpdatedAt: serverTimestamp(),
      });
      setStudent({ ...student, followUpDays: days });
    } catch (err) {
      console.error(err);
      Alert.alert(t("common.error"), t("studentDetail.followUp.saveError"));
    } finally { setSavingFollowUp(false); }
  };

  const addRecord = () => {
    if (!student) return;
    router.push({ pathname: "/newrecord/[id]", params: { id: student.id } });
  };

  const openNewNote = () => {
    setNewNoteText("");
    setNewNoteTitle("");
    setNoteModalOpen(true);
  };

  const saveNewNote = async () => {
    if (!id) return;
    const text = newNoteText.trim();
    if (!text) { Alert.alert(t("common.error"), "Not boş olamaz"); return; }
    try {
      setSavingNote(true);
      const title = newNoteTitle.trim();
      await addDoc(studentNotesColRef(auth.currentUser?.uid!, id), {
        title: title.length ? title : null,
        text,
        createdAt: serverTimestamp(),
      });
      setNoteModalOpen(false);
      setNewNoteText("");
    } catch (e) {
      console.error(e);
      Alert.alert(t("common.error"), "Not kaydedilemedi");
    } finally { setSavingNote(false); }
  };

  const viewRecord = useCallback(
    (recordId: string) => {
      router.push({ pathname: "/record/[id]", params: { id: recordId } });
    },
    [router],
  );

  const goEdit = () => {
    if (!student) return;
    router.push({ pathname: "/newstudent", params: { id: student.id, mode: "edit" } });
  };

  const firstLetter = student?.name?.[0]?.toUpperCase() ?? "?";

  const renderRecordItem = useCallback(
    ({ item }: { item: RecordItem }) => {
      const dt = item.createdAt?.toDate ? item.createdAt.toDate() : null;
      const dateStr = dt
        ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}`
        : "-";
      return (
        <TouchableOpacity
          style={styles.recordCard}
          onPress={() => viewRecord(item.id)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.recordDate}>{dateStr}</Text>
            <Text style={styles.recordNote}>
              {item.note || t("studentDetail.records.noNote")}
            </Text>
          </View>
          <Eye size={18} color={theme.colors.text.primary} />
        </TouchableOpacity>
      );
    },
    [styles, theme.colors.text.primary, t, viewRecord],
  );

  const onTogglePtNote = useCallback(() => {
    setPtNoteOpen((prev) => {
      const next = !prev;
      if (next) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      return next;
    });
  }, []);

  const onFocusPtNote = useCallback(() => {
    setPtNoteOpen(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 250);
  }, []);

  // ─── Loading / not found ───────────────────────────────────────────────────
  if (loadingStudent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>{t("studentDetail.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("studentDetail.notFound")}</Text>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <ArrowLeft size={18} color={theme.colors.text.primary} />
            <Text style={styles.backButtonText}>{t("studentDetail.back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={records}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* HEADER */}
              <View style={styles.header}>
                <View style={styles.headerTopRow}>
                  <TouchableOpacity style={styles.backButton} onPress={goBack}>
                    <ArrowLeft size={18} color={theme.colors.text.primary} />
                    <Text style={styles.backButtonText}>{t("studentDetail.back")}</Text>
                  </TouchableOpacity>
                  <View style={[styles.headerActions, { justifyContent: "flex-end" }]}>
                    <View style={{ flexDirection: "row" }}>
                      <TouchableOpacity style={styles.editButton} onPress={addRecord} activeOpacity={0.85}>
                        <Edit size={14} color={theme.colors.text.onAccent} />
                        <Text style={styles.editButtonText}>{t("studentDetail.addRecord")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editButton, { marginLeft: theme.spacing.xs }]}
                        onPress={goEdit}
                        activeOpacity={0.85}
                      >
                        <Edit size={14} color={theme.colors.text.onAccent} />
                        <Text style={styles.editButtonText}>{t("studentDetail.edit")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.studentRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{firstLetter}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={toggleAktif}
                      disabled={toggling}
                      style={[
                        styles.statusBadgeBtn,
                        student.aktif === "Aktif" ? styles.statusActive : styles.statusPassive,
                        toggling && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={
                          student.aktif === "Aktif"
                            ? styles.statusActiveText
                            : styles.statusPassiveText
                        }
                      >
                        {student.aktif === "Aktif"
                          ? t("studentDetail.student.active")
                          : t("studentDetail.student.passive")}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.metaLine}>
                      <Calendar size={14} color={theme.colors.text.muted} />
                      <Text style={styles.metaText}>
                        {t("studentDetail.student.assessmentDate")}{" "}
                        {formatDateTR(student.assessmentDate)}
                      </Text>
                    </View>
                    <View style={styles.followUpWrap}>
                      <Text style={styles.followUpLabel}>
                        {t("studentDetail.followUp.label")}
                      </Text>
                      <View style={styles.followUpPillsRow}>
                        {[7, 20, 30].map((d) => {
                          const active = (student.followUpDays ?? 30) === d;
                          return (
                            <TouchableOpacity
                              key={d}
                              activeOpacity={0.85}
                              disabled={savingFollowUp}
                              onPress={() => setFollowUpDays(d)}
                              style={[
                                styles.followUpPill,
                                active && styles.followUpPillActive,
                                savingFollowUp && { opacity: 0.7 },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.followUpPillText,
                                  active && styles.followUpPillTextActive,
                                ]}
                              >
                                {d === 7
                                  ? t("studentDetail.followUp.week1")
                                  : t("studentDetail.followUp.days", { count: d })}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        {savingFollowUp && (
                          <Text style={styles.followUpSavingText}>
                            {t("studentDetail.followUp.saving")}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.followUpHint}>
                        {t("studentDetail.followUp.hint")}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* KİŞİSEL BİLGİLER */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("studentDetail.section.personalInfo")}
                </Text>
                <InfoRow styles={styles} label={t("studentDetail.label.email")} value={student.email || "-"} icon={<Mail size={16} color={theme.colors.primary} />} />
                <InfoRow styles={styles} label={t("studentDetail.label.phone")} value={student.number || "-"} icon={<Phone size={16} color={theme.colors.primary} />} />
                <InfoRow styles={styles} label={t("studentDetail.label.gender")} value={student.gender || "-"} icon={<User size={16} color={theme.colors.primary} />} />
                <InfoRow styles={styles} label={t("studentDetail.label.birthDate")} value={formatDateTR(student.dateOfBirth)} icon={<Calendar size={16} color={theme.colors.primary} />} />
                <InfoRow styles={styles} label={t("studentDetail.label.height")} value={student.boy || "-"} icon={<User size={16} color={theme.colors.primary} />} lastRow />
              </View>

              {/* ✅ ANALİTİKLER — çizgi grafik dahil */}
              <AnalyticsCard
                theme={theme}
                styles={styles}
                records={records}
                range={range}
                setRange={setRange}
                open={analyticsOpen}
                setOpen={setAnalyticsOpen}
              />

              {/* ✅ TEST SONUÇLARI — gauge kartları */}
              <TestsCard
                theme={theme}
                styles={styles}
                records={records}
                open={testsOpen}
                setOpen={setTestsOpen}
              />

              {/* PARQ */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t("studentDetail.section.parq")}</Text>
                {parqQuestions.map((q, idx) => (
                  <QAItem
                    key={q.key}
                    styles={styles}
                    index={idx + 1}
                    question={t(q.labelKey)}
                    answer={(student as any)[q.key] as Bool}
                    note={q.noteKey ? ((student as any)[q.noteKey] as string) : ""}
                    lastItem={idx === parqQuestions.length - 1}
                  />
                ))}
              </View>

              {/* KİŞİSEL DETAYLAR */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("studentDetail.section.personalDetails")}
                </Text>
                {personalQuestions.map((q, idx) => (
                  <QAItem
                    key={q.key}
                    styles={styles}
                    index={idx + 1}
                    question={t((q as any).labelKey)}
                    answer={(student as any)[q.key] as Bool}
                    note={(q as any).noteKey ? ((student as any)[(q as any).noteKey] as string) : ""}
                  />
                ))}
                <InfoRow
                  styles={styles}
                  label={t("studentDetail.label.plannedDaysPerWeek")}
                  value={student.plannedDaysPerWeek ? String(student.plannedDaysPerWeek) : "-"}
                  icon={<Calendar size={16} color={theme.colors.primary} />}
                />
                <InfoRow
                  styles={styles}
                  label={t("studentDetail.label.job")}
                  value={student.jobDescription || "-"}
                  icon={<User size={16} color={theme.colors.primary} />}
                />
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.subTitle}>{t("studentDetail.label.trainingGoals")}</Text>
                  <View style={styles.chipWrap}>
                    {student.trainingGoals && student.trainingGoals.length ? (
                      student.trainingGoals.map((g) => (
                        <Chip key={g} styles={styles} label={g} />
                      ))
                    ) : (
                      <Text style={styles.mutedText}>-</Text>
                    )}
                  </View>
                  {!!student.otherGoal?.trim() && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.miniLabel}>{t("studentDetail.label.other")}</Text>
                      <Text style={styles.noteText}>{student.otherGoal}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* NOTLAR */}
              <CollapsibleCard
                theme={theme}
                styles={styles}
                title="Notlar"
                open={notesOpen}
                setOpen={(v) => {
                  setNotesOpen(v);
                  if (!v) setExpandedNoteId(null);
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openNewNote}
                  style={{
                    marginTop: theme.spacing.xs,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: theme.radius.md,
                    paddingVertical: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: theme.colors.text.primary, fontWeight: "900" }}>
                    + Yeni Not
                  </Text>
                </TouchableOpacity>

                {loadingNotes ? (
                  <View style={{ marginTop: theme.spacing.sm }}>
                    <ActivityIndicator color={theme.colors.accent} />
                  </View>
                ) : notes.length ? (
                  <View style={{ marginTop: theme.spacing.sm }}>
                    {notes.slice(0, 12).map((n) => {
                      const dt = n.createdAt?.toDate ? n.createdAt.toDate() : null;
                      const dateStr = dt
                        ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}`
                        : "-";
                      const raw = (n.text ?? "").trim();
                      const lines = raw.split("\n").map((x) => x.trim()).filter(Boolean);
                      const title = ((n.title ?? "").trim() || (lines[0] ?? "Not")).slice(0, 60);
                      const preview = lines.slice(1).join(" ").slice(0, 90);
                      return (
                        <View
                          key={n.id}
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: theme.colors.border,
                            paddingVertical: 10,
                          }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => toggleNote(n.id)}
                            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: theme.colors.text.primary, fontWeight: "900" }}>{title}</Text>
                              <Text style={{ marginTop: 4, color: theme.colors.text.muted, fontSize: theme.fontSize.xs, fontWeight: "700" }}>{dateStr}</Text>
                              {!!preview && expandedNoteId !== n.id && (
                                <Text style={{ marginTop: 6, color: theme.colors.text.secondary }}>{preview}…</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                          {expandedNoteId === n.id && (
                            <View style={{
                              marginTop: 10,
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                              backgroundColor: theme.colors.surfaceSoft,
                              borderRadius: theme.radius.md,
                              padding: theme.spacing.sm,
                            }}>
                              <Text style={{ color: theme.colors.text.primary, lineHeight: 20, fontSize: theme.fontSize.sm }}>
                                {n.text}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ marginTop: theme.spacing.sm, color: theme.colors.text.muted }}>
                    Henüz not yok.
                  </Text>
                )}
              </CollapsibleCard>

              <Text style={styles.recordsTitle}>
                {t("studentDetail.section.records")}
              </Text>
            </View>
          }
          renderItem={renderRecordItem}
          ListEmptyComponent={
            !loadingRecords ? (
              <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                <View style={styles.card}>
                  <Text style={styles.emptyText}>
                    {t("studentDetail.records.empty")}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />

        {/* NOT MODAL */}
        {noteModalOpen && (
          <Pressable
            onPress={() => setNoteModalOpen(false)}
            style={{
              position: "absolute",
              left: 0, right: 0, top: 0, bottom: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
              justifyContent: "center",
              padding: theme.spacing.md,
            }}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
              >
                <View style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  ...(theme.shadow?.soft ?? {}),
                  maxHeight: "85%",
                  overflow: "hidden",
                }}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                      padding: theme.spacing.md,
                      paddingBottom: theme.spacing.md + 80,
                    }}
                  >
                    <Text style={{ color: theme.colors.text.primary, fontWeight: "900", fontSize: theme.fontSize.lg }}>
                      Yeni Not
                    </Text>
                    <TextInput
                      value={newNoteTitle}
                      onChangeText={setNewNoteTitle}
                      placeholder="Not başlığı..."
                      placeholderTextColor={theme.colors.text.muted}
                      style={[styles.editInput, { marginTop: theme.spacing.sm }]}
                      returnKeyType="next"
                    />
                    <TextInput
                      value={newNoteText}
                      onChangeText={setNewNoteText}
                      placeholder="Notunu yaz..."
                      placeholderTextColor={theme.colors.text.muted}
                      multiline
                      textAlignVertical="top"
                      style={[styles.ptNoteInput, { marginTop: theme.spacing.sm, minHeight: 160 }]}
                    />
                  </ScrollView>
                  <View style={{
                    position: "absolute",
                    left: 0, right: 0, bottom: 0,
                    padding: theme.spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => setNoteModalOpen(false)}
                        activeOpacity={0.85}
                        style={[styles.cancelButton, { flex: 1, alignItems: "center", marginLeft: 0 }]}
                      >
                        <Text style={styles.cancelButtonText}>İptal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={saveNewNote}
                        disabled={savingNote}
                        activeOpacity={0.85}
                        style={[styles.saveButton, { flex: 1, alignItems: "center", opacity: savingNote ? 0.6 : 1, marginLeft: 0 }]}
                      >
                        <Text style={styles.saveButtonText}>
                          {savingNote ? "Kaydediliyor..." : "Kaydet"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Pressable>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  UI PARÇALARI
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({
  styles, icon, label, value, lastRow,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon?: React.ReactNode;
  label: string;
  value: string;
  lastRow?: boolean;
}) {
  return (
    <View style={lastRow ? styles.infoRowLast : styles.infoRow}>
      <View style={styles.infoLabelRow}>
        {icon}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function QAItem({
  styles, index, question, answer, note, lastItem,
}: {
  styles: ReturnType<typeof makeStyles>;
  index: number;
  question: string;
  answer: Bool;
  note?: string;
  lastItem?: boolean;
}) {
  const { t } = useTranslation();
  const val =
    answer === true
      ? t("recordNew.option.yes")
      : answer === false
        ? t("recordNew.option.no")
        : "-";
  const isYes = answer === true;
  return (
    <View style={lastItem ? styles.qaItemLast : styles.qaItem}>
      <View style={styles.qaTop}>
        <Text style={styles.qaQuestion}>{index}. {question}</Text>
        <View style={[styles.badge, isYes ? styles.badgeYes : answer === false ? styles.badgeNo : styles.badgeNA]}>
          <Text style={[styles.badgeText, isYes ? styles.badgeTextYes : answer === false ? styles.badgeTextNo : styles.badgeTextNA]}>
            {val}
          </Text>
        </View>
      </View>
      {isYes && !!note?.trim() && (
        <View style={styles.noteBox}>
          <Text style={styles.miniLabel}>{t("common.description")}</Text>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      )}
    </View>
  );
}

function Chip({ styles, label }: { styles: ReturnType<typeof makeStyles>; label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { color: theme.colors.text.secondary, marginTop: theme.spacing.xs },
    errorText: { color: theme.colors.danger, marginBottom: theme.spacing.xs },

    header: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm + 4,
      paddingBottom: theme.spacing.xs,
    },
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm - 2,
    },
    statusBadgeBtn: {
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm - 2,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    backButtonText: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      marginLeft: theme.spacing.xs,
    },
    cancelButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginLeft: theme.spacing.xs,
    },
    cancelButtonText: { color: theme.colors.text.primary, fontSize: theme.fontSize.xs, fontWeight: "800" },
    saveButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginLeft: theme.spacing.xs,
    },
    saveButtonText: { color: theme.colors.text.onAccent, fontSize: theme.fontSize.xs, fontWeight: "900" },
    editRow: { marginTop: theme.spacing.sm },
    editLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, fontWeight: "700", marginBottom: 6 },
    editInput: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm - 2,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
    },
    headerActions: {
      flexDirection: "row",
      marginLeft: theme.spacing.xs,
      justifyContent: "flex-end",
      alignItems: "center",
      flex: 1,
    },
    toggleButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.pill },
    toggleButtonActive: { backgroundColor: theme.colors.success, borderColor: theme.colors.success, borderWidth: 1, opacity: 0.9 },
    toggleButtonPassive: { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger, borderWidth: 1, opacity: 0.9 },
    toggleButtonText: { fontSize: theme.fontSize.sm, fontWeight: "600", color: theme.colors.text.onAccent },
    editQWrap: { marginTop: theme.spacing.sm },
    editQTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: "800" },
    editQButtons: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
    editQBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft },
    editQBtnActive: { borderColor: theme.colors.accent, backgroundColor: "rgba(56,189,248,0.12)" },
    editQBtnText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, fontWeight: "900" },
    editQBtnTextActive: { color: theme.colors.accent },
    editQNote: {
      marginTop: 10,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      padding: theme.spacing.sm,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      lineHeight: 18,
      minHeight: 70,
    },
    editButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm - 2,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.editButtonbackground,
      opacity: 0.9,
      marginLeft: theme.spacing.xs,
    },
    editButtonText: { color: theme.colors.text.onAccent, fontSize: theme.fontSize.xs, fontWeight: "700", marginLeft: theme.spacing.xs },
    studentRow: { flexDirection: "row", alignItems: "center", marginTop: theme.spacing.sm },
    avatar: {
      width: 58, height: 58,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
      alignItems: "center", justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    avatarText: { color: theme.colors.text.onAccent, fontSize: 23, fontWeight: "800" },
    studentName: { color: theme.colors.text.primary, fontSize: theme.fontSize.lg + 3, fontWeight: "700" },
    statusBadge: { marginTop: theme.spacing.xs, paddingHorizontal: theme.spacing.sm - 4, paddingVertical: theme.spacing.xs - 2, borderRadius: theme.radius.pill, alignSelf: "flex-start" },
    statusActive: { backgroundColor: theme.colors.successSoft },
    statusPassive: { backgroundColor: theme.colors.dangerSoft },
    statusActiveText: { color: theme.colors.success, fontSize: theme.fontSize.xs, fontWeight: "700" },
    statusPassiveText: { color: theme.colors.danger, fontSize: theme.fontSize.xs, fontWeight: "700" },
    metaLine: { flexDirection: "row", alignItems: "center", marginTop: theme.spacing.xs },
    metaText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginLeft: theme.spacing.xs },
    card: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...(theme.shadow?.soft ?? {}),
    },
    cardTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.lg - 1, fontWeight: "700", marginBottom: theme.spacing.sm - 4 },
    subTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.md, fontWeight: "700" },
    mutedText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.md, marginTop: theme.spacing.xs },
    infoRow: {
      flexDirection: "row", justifyContent: "space-between",
      paddingVertical: theme.spacing.sm - 2,
      borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    infoRowLast: { flexDirection: "row", justifyContent: "space-between", paddingVertical: theme.spacing.sm - 2 },
    infoLabelRow: { flexDirection: "row", alignItems: "center" },
    infoLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginLeft: theme.spacing.xs },
    infoValue: { color: theme.colors.text.primary, fontSize: theme.fontSize.md - 1, maxWidth: "55%", textAlign: "right" },
    qaItem: { paddingVertical: theme.spacing.sm - 2, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    qaItemLast: { paddingVertical: theme.spacing.sm - 2 },
    qaTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    qaQuestion: { color: theme.colors.text.primary, fontSize: theme.fontSize.md - 1, fontWeight: "600", flex: 1, lineHeight: 18 },
    badge: { paddingHorizontal: theme.spacing.sm - 2, paddingVertical: theme.spacing.xs - 2, borderRadius: theme.radius.pill, borderWidth: 1, alignSelf: "flex-start", marginLeft: theme.spacing.md - 4 },
    badgeYes: { backgroundColor: theme.colors.successSoft, borderColor: "rgba(34,197,94,0.35)" },
    badgeNo: { backgroundColor: theme.colors.dangerSoft, borderColor: "rgba(248,113,113,0.35)" },
    badgeNA: { backgroundColor: "rgba(148,163,184,0.12)", borderColor: "rgba(148,163,184,0.25)" },
    badgeText: { fontSize: theme.fontSize.xs, fontWeight: "800" },
    badgeTextYes: { color: theme.colors.success },
    badgeTextNo: { color: theme.colors.danger },
    badgeTextNA: { color: theme.colors.text.secondary },
    noteBox: {
      marginTop: theme.spacing.sm, padding: theme.spacing.sm,
      borderRadius: theme.radius.md, borderWidth: 1,
      borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft,
    },
    miniLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, marginBottom: 4 },
    noteText: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, lineHeight: 17 },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: theme.spacing.sm - 2 },
    chip: {
      paddingHorizontal: theme.spacing.sm - 2, paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill, borderWidth: 1,
      borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft,
      marginRight: theme.spacing.xs + 2, marginBottom: theme.spacing.xs + 2,
    },
    chipText: { color: theme.colors.text.primary, fontSize: theme.fontSize.xs, fontWeight: "600" },
    recordsTitle: {
      marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs + 2,
      color: theme.colors.primary, fontSize: theme.fontSize.lg, fontWeight: "700",
    },
    recordCard: {
      marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm - 2,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
      paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    ptNoteHint: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm, lineHeight: 18 },
    ptNoteInput: {
      minHeight: 140, borderRadius: theme.radius.md, borderWidth: 1,
      borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft,
      padding: theme.spacing.sm, color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm, lineHeight: 18,
    },
    ptNoteSaveBtn: {
      marginTop: theme.spacing.sm, borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent, paddingVertical: theme.spacing.sm,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: theme.colors.border,
    },
    ptNoteSaveText: { color: theme.colors.text.onAccent, fontSize: theme.fontSize.md, fontWeight: "800" },
    recordDate: { color: theme.colors.text.primary, fontSize: theme.fontSize.md - 1, fontWeight: "600" },
    recordNote: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginTop: 2 },
    emptyText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.md - 1 },
    listContent: { paddingBottom: 180 },
    ptNoteHeaderPress: { paddingVertical: 2 },
    ptNotePreview: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 2 },
    recordNotePress: { marginTop: 2 },
    listFooterSpace: { height: 40 },
    followUpWrap: { marginTop: theme.spacing.sm },
    followUpLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, fontWeight: "700" },
    followUpPillsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: theme.spacing.xs },
    followUpPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft },
    followUpPillActive: { borderColor: theme.colors.accent, backgroundColor: "rgba(56,189,248,0.12)" },
    followUpPillText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, fontWeight: "800" },
    followUpPillTextActive: { color: theme.colors.accent },
    followUpSavingText: { color: theme.colors.text.muted, fontSize: theme.fontSize.xs, fontWeight: "700", marginLeft: 4 },
    followUpHint: { marginTop: 6, color: theme.colors.text.muted, fontSize: theme.fontSize.xs, lineHeight: 16 },
  });
}
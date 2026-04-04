// app/calendar.tsx
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { auth } from "@/services/firebase";
import {
    appointmentDocRef,
    appointmentsColRef,
    recordsColRef,
    studentsColRef,
} from "@/services/firestorePaths";
import { useFocusEffect } from "expo-router";
import {
    addDoc,
    deleteDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";

/* -------------------- TYPES -------------------- */
type Student = {
    id: string;
    name?: string;
    fullName?: string;
    followUpDays?: number;
};

type RecordDoc = {
    id: string;
    studentId?: string;
    createdAt?: Timestamp | Date | number | string;
    date?: Timestamp | Date | number | string;
    createdAtMs?: number;
};

type DueItem = {
    studentId: string;
    studentName: string;
    lastRecordAt: Date | null;
    dueDate: Date;
    status: "overdue" | "dueSoon" | "ok" | "never";
    daysToDue: number;
};

type DayBucket = {
    dateKey: string;
    total: number;
    maxSeverity: "overdue" | "dueSoon" | "ok" | "never";
};

type DueFilter = "all" | "overdue" | "dueSoon" | "ok";

type Appointment = {
    id: string;
    studentId: string;
    studentName: string;
    dayOfWeek: number; // 0=Sun … 6=Sat
    time: string;      // "HH:MM"
    grade?: string;
};

/* -------------------- HELPERS -------------------- */
function toDateSafe(v: any): Date | null {
    if (!v) return null;
    if (typeof v === "object" && typeof v.toDate === "function") {
        try { return v.toDate(); } catch { }
    }
    if (typeof v === "number") {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v === "string") {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    return null;
}

function ymd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, days: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysDiff(a: Date, b: Date): number {
    const A = startOfDay(a).getTime();
    const B = startOfDay(b).getTime();
    return Math.round((A - B) / (1000 * 60 * 60 * 24));
}

function severityRank(s: DueItem["status"]) {
    switch (s) {
        case "overdue":  return 0;
        case "dueSoon":  return 1;
        case "ok":       return 2;
        case "never":    return 3;
    }
}

/** Returns the day-of-week (0–6) for a "YYYY-MM-DD" string without timezone issues */
function dowFromDateString(dateStr: string): number {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/* -------------------- UI COMPONENTS -------------------- */
function StatCard({
    theme, label, value, bg, fg, active, onPress,
}: {
    theme: ThemeUI; label: string; value: number;
    bg: string; fg: string; active?: boolean; onPress?: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={10}
            style={({ pressed }) => [
                ui.statCard,
                {
                    backgroundColor: bg,
                    borderColor: active ? fg : theme.colors.border,
                    borderWidth: active ? 2 : 1,
                    opacity: pressed ? 0.92 : 1,
                },
            ]}
        >
            <Text style={{ color: fg, fontWeight: "900", fontSize: theme.fontSize.title }}>
                {value}
            </Text>
            <Text style={{
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.xs,
                fontWeight: "800",
                marginTop: 2,
            }}>
                {label}
            </Text>
        </Pressable>
    );
}

function LegendDot({ label, color, theme }: { label: string; color: string; theme: ThemeUI }) {
    return (
        <View style={base.legendItem}>
            <View style={[base.dot, { backgroundColor: color }]} />
            <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>
                {label}
            </Text>
        </View>
    );
}

/* -------------------- SCREEN -------------------- */
export default function CalendarFollowUpScreen() {
    const { theme } = useTheme();
    const uid = auth.currentUser?.uid;
    const { t } = useTranslation();

    const APPT_COLOR = theme.colors.premium; // violet/purple

    /* ---------- state ---------- */
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [records, setRecords] = useState<RecordDoc[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>(ymd(new Date()));
    const [filter, setFilter] = useState<DueFilter>("all");

    // modal
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formStudentId, setFormStudentId] = useState("");
    const [formStudentName, setFormStudentName] = useState("");
    const [formDow, setFormDow] = useState<number>(1); // Monday default
    const [formTime, setFormTime] = useState("");
    const [formGrade, setFormGrade] = useState("");

    // ✅ FIX: remount Calendar on focus to avoid blank bug
    const [calKey, setCalKey] = useState(0);
    useFocusEffect(useCallback(() => { setCalKey((k) => k + 1); }, []));

    /* ---------- subscriptions ---------- */
    useEffect(() => {
        if (!uid) return;
        setLoading(true);

        const unsubStudents = onSnapshot(studentsColRef(uid), (snap) => {
            setStudents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });

        const qy = query(recordsColRef(uid), orderBy("createdAt", "desc"));
        const unsubRecords = onSnapshot(
            qy,
            (snap) => {
                setRecords(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
                setLoading(false);
            },
            () => setLoading(false)
        );

        const unsubAppts = onSnapshot(appointmentsColRef(uid), (snap) => {
            setAppointments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });

        return () => { unsubStudents(); unsubRecords(); unsubAppts(); };
    }, [uid]);

    /* ---------- derived data ---------- */
    const formatHumanDiff = useCallback(
        (daysToDue: number, status: DueItem["status"]) => {
            if (status === "never") return t("calendar.diff.never");
            if (daysToDue === 0) return t("calendar.diff.today");
            if (daysToDue > 0) return t("calendar.diff.overdueDays", { days: daysToDue });
            return t("calendar.diff.remainingDays", { days: Math.abs(daysToDue) });
        },
        [t]
    );

    const dueItems = useMemo<DueItem[]>(() => {
        const today = startOfDay(new Date());
        const lastByStudent = new Map<string, Date>();

        for (const r of records) {
            const sid = r.studentId;
            if (!sid) continue;
            const d = toDateSafe(r.createdAt) ?? toDateSafe(r.date) ??
                (typeof r.createdAtMs === "number" ? toDateSafe(r.createdAtMs) : null);
            if (!d) continue;
            const prev = lastByStudent.get(sid);
            if (!prev || d.getTime() > prev.getTime()) lastByStudent.set(sid, d);
        }

        const items: DueItem[] = students.map((s) => {
            const name = s.name ?? s.fullName ?? t("calendar.student.unnamed");
            const last = lastByStudent.get(s.id) ?? null;

            if (!last) {
                return {
                    studentId: s.id, studentName: name,
                    lastRecordAt: null, dueDate: today,
                    status: "never", daysToDue: 0,
                };
            }

            const period = typeof s.followUpDays === "number" ? s.followUpDays : 30;
            const dueDate = addDays(startOfDay(last), period);
            const diff = daysDiff(today, dueDate);

            let status: DueItem["status"] = "ok";
            if (diff > 0) status = "overdue";
            else status = -diff <= 7 ? "dueSoon" : "ok";

            return { studentId: s.id, studentName: name, lastRecordAt: last, dueDate, status, daysToDue: diff };
        });

        items.sort((a, b) => {
            const ra = severityRank(a.status), rb = severityRank(b.status);
            if (ra !== rb) return ra - rb;
            if (a.status === "overdue" && b.status === "overdue") return b.daysToDue - a.daysToDue;
            return a.studentName.localeCompare(b.studentName);
        });

        return items;
    }, [students, records, t]);

    const stats = useMemo(() => {
        let overdue = 0, dueSoon = 0, ok = 0;
        for (const it of dueItems) {
            if (it.status === "overdue") overdue++;
            else if (it.status === "dueSoon") dueSoon++;
            else if (it.status === "ok") ok++;
        }
        return { overdue, dueSoon, ok };
    }, [dueItems]);

    const dayBuckets = useMemo(() => {
        const buckets = new Map<string, DayBucket>();
        for (const item of dueItems) {
            if (item.status === "never") continue;
            const key = ymd(item.dueDate);
            const existing = buckets.get(key) ?? { dateKey: key, total: 0, maxSeverity: "ok" as DayBucket["maxSeverity"] };
            existing.total += 1;
            const rankCur = severityRank(existing.maxSeverity);
            const rankNew = severityRank(item.status);
            if (rankNew < rankCur) existing.maxSeverity = item.status;
            buckets.set(key, existing);
        }
        return buckets;
    }, [dueItems]);

    /** Set of day-of-week values that have appointments */
    const appointmentDows = useMemo(
        () => new Set(appointments.map((a) => a.dayOfWeek)),
        [appointments]
    );

    const selectedDow = useMemo(() => dowFromDateString(selectedDay), [selectedDay]);

    const selectedAppointments = useMemo(
        () => appointments.filter((a) => a.dayOfWeek === selectedDow).sort((a, b) => a.time.localeCompare(b.time)),
        [appointments, selectedDow]
    );

    const markedDates = useMemo(() => ({ [selectedDay]: { selected: true } }), [selectedDay]);

    const selectedItems = useMemo(() => {
        if (filter === "all") return dueItems.filter((x) => ymd(x.dueDate) === selectedDay);
        return dueItems.filter((x) => x.status === filter);
    }, [dueItems, selectedDay, filter]);

    const filterLabel = useMemo(() => {
        if (filter === "all") return "";
        if (filter === "overdue") return ` • ${t("calendar.filters.overdue")}`;
        if (filter === "dueSoon") return ` • ${t("calendar.filters.dueSoon")}`;
        return ` • ${t("calendar.filters.ok")}`;
    }, [filter, t]);

    /* ---------- appointment actions ---------- */
    const openModal = useCallback(() => {
        setFormStudentId("");
        setFormStudentName("");
        setFormDow(selectedDow);
        setFormTime("");
        setFormGrade("");
        setModalVisible(true);
    }, [selectedDow]);

    const saveAppointment = useCallback(async () => {
        if (!uid) return;
        if (!formStudentId) { Alert.alert(t("appointment.errorStudent")); return; }
        if (!TIME_REGEX.test(formTime)) { Alert.alert(t("appointment.errorTime")); return; }

        setSaving(true);
        try {
            await addDoc(appointmentsColRef(uid), {
                studentId: formStudentId,
                studentName: formStudentName,
                dayOfWeek: formDow,
                time: formTime.trim(),
                grade: formGrade.trim() || null,
                createdAt: serverTimestamp(),
            });
            setModalVisible(false);
        } finally {
            setSaving(false);
        }
    }, [uid, formStudentId, formStudentName, formDow, formTime, formGrade, t]);

    const deleteAppointment = useCallback(
        (id: string) => {
            if (!uid) return;
            Alert.alert(
                t("appointment.deleteTitle"),
                t("appointment.deleteConfirm"),
                [
                    { text: t("appointment.cancel"), style: "cancel" },
                    {
                        text: t("appointment.delete"),
                        style: "destructive",
                        onPress: () => deleteDoc(appointmentDocRef(uid, id)),
                    },
                ]
            );
        },
        [uid, t]
    );

    /* ---------- guard ---------- */
    if (!uid) {
        return (
            <SafeAreaView style={[base.safeArea, { backgroundColor: theme.colors.background }]}>
                <View style={[base.center, { padding: theme.spacing.lg }]}>
                    <Text style={[base.title, { color: theme.colors.text.primary }]}>
                        {t("calendar.auth.requiredTitle")}
                    </Text>
                    <Text style={[base.sub, { color: theme.colors.text.secondary }]}>
                        {t("calendar.auth.requiredDesc")}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    /* ---------- render ---------- */
    return (
        <SafeAreaView style={[base.safeArea, { backgroundColor: theme.colors.background }]}>
            <View style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* HEADER */}
                    <View style={[base.header, { paddingHorizontal: theme.spacing.lg }]}>
                        <Text style={[base.h1, { color: theme.colors.text.primary }]}>{t("calendar.title")}</Text>
                        <Text style={[base.h2, { color: theme.colors.text.secondary }]}>{t("calendar.subtitle")}</Text>
                    </View>

                    {/* STAT CARDS */}
                    <View style={[ui.statsRow3, { paddingHorizontal: theme.spacing.lg }]}>
                        <StatCard
                            theme={theme} label={t("calendar.filters.overdue")}
                            value={stats.overdue} bg={theme.colors.dangerSoft} fg={theme.colors.danger}
                            active={filter === "overdue"}
                            onPress={() => setFilter((f) => (f === "overdue" ? "all" : "overdue"))}
                        />
                        <StatCard
                            theme={theme} label={t("calendar.filters.dueSoon")}
                            value={stats.dueSoon} bg={"rgba(245,158,11,0.15)"} fg={theme.colors.warning}
                            active={filter === "dueSoon"}
                            onPress={() => setFilter((f) => (f === "dueSoon" ? "all" : "dueSoon"))}
                        />
                        <StatCard
                            theme={theme} label={t("calendar.filters.ok")}
                            value={stats.ok} bg={theme.colors.successSoft} fg={theme.colors.success}
                            active={filter === "ok"}
                            onPress={() => setFilter((f) => (f === "ok" ? "all" : "ok"))}
                        />
                    </View>

                    {/* CALENDAR */}
                    <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
                        <View style={[base.card, {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            borderRadius: theme.radius.lg,
                        }]}>
                            {loading ? (
                                <View style={[base.center, { padding: theme.spacing.lg }]}>
                                    <ActivityIndicator />
                                    <Text style={[base.sub, { marginTop: theme.spacing.sm, color: theme.colors.text.secondary }]}>
                                        {t("common.loading")}
                                    </Text>
                                </View>
                            ) : (
                                <Calendar
                                    key={calKey}
                                    style={{ backgroundColor: theme.colors.surface }}
                                    onDayPress={(day) => {
                                        setSelectedDay(day.dateString);
                                        setFilter("all");
                                    }}
                                    markedDates={markedDates}
                                    theme={{
                                        backgroundColor: theme.colors.surface,
                                        calendarBackground: theme.colors.surface,
                                        textSectionTitleColor: theme.colors.text.muted,
                                        dayTextColor: theme.colors.text.primary,
                                        monthTextColor: theme.colors.text.primary,
                                        selectedDayBackgroundColor: "transparent",
                                        selectedDayTextColor: theme.colors.text.primary,
                                        todayTextColor: theme.colors.primary,
                                        arrowColor: theme.colors.text.accent,
                                        textDisabledColor: theme.colors.text.muted,
                                    }}
                                    dayComponent={({ date, state }) => {
                                        const key = date?.dateString;
                                        const day = date?.day;
                                        const bucket = key ? dayBuckets.get(key) : undefined;
                                        const isSelected = key === selectedDay;
                                        const isDisabled = state === "disabled";
                                        const todayKey = ymd(new Date());
                                        const isToday = key === todayKey;

                                        const dow = key ? dowFromDateString(key) : -1;
                                        const hasAppt = appointmentDows.has(dow) && dow >= 0;

                                        const cellBg = isSelected ? theme.colors.accent : "transparent";
                                        const textColor = isDisabled
                                            ? theme.colors.text.muted
                                            : isSelected
                                                ? theme.colors.text.onAccent
                                                : isToday
                                                    ? theme.colors.accent
                                                    : theme.colors.text.primary;

                                        const dotColor = bucket?.maxSeverity === "overdue"
                                            ? theme.colors.danger
                                            : bucket?.maxSeverity === "dueSoon"
                                                ? theme.colors.warning
                                                : theme.colors.success;

                                        return (
                                            <Pressable
                                                onPress={() => {
                                                    if (!key) return;
                                                    setSelectedDay(key);
                                                    setFilter("all");
                                                }}
                                                hitSlop={10}
                                                style={[
                                                    ui.dayCellSquare,
                                                    {
                                                        backgroundColor: cellBg,
                                                        borderRadius: 12,
                                                        shadowColor: isSelected ? theme.colors.accent : "transparent",
                                                        shadowOpacity: isSelected ? 0.25 : 0,
                                                        shadowRadius: isSelected ? 12 : 0,
                                                        shadowOffset: { width: 0, height: 8 },
                                                        elevation: isSelected ? 3 : 0,
                                                        borderWidth: isSelected ? 0 : 1,
                                                        borderColor: isSelected ? "transparent" : "rgba(255,255,255,0.04)",
                                                    },
                                                ]}
                                            >
                                                <Text style={{ color: textColor, fontWeight: "900", fontSize: 14, lineHeight: 16 }}>
                                                    {day}
                                                </Text>

                                                {/* Dots: follow-up dot + appointment dot */}
                                                {(bucket?.total || hasAppt) ? (
                                                    <View style={ui.dotsWrap}>
                                                        {bucket?.total ? (
                                                            <View style={[ui.dotMini, { backgroundColor: dotColor }]} />
                                                        ) : null}
                                                        {hasAppt ? (
                                                            <View style={[ui.dotMini, { backgroundColor: APPT_COLOR }]} />
                                                        ) : null}
                                                    </View>
                                                ) : null}
                                            </Pressable>
                                        );
                                    }}
                                />
                            )}
                        </View>

                        {/* Legend */}
                        <View style={[base.legendRow, { marginTop: theme.spacing.md }]}>
                            <LegendDot label={t("calendar.legend.overdue")} color={theme.colors.danger} theme={theme} />
                            <LegendDot label={t("calendar.legend.dueSoon", { days: 7 })} color={theme.colors.warning} theme={theme} />
                            <LegendDot label={t("calendar.legend.ok")} color={theme.colors.success} theme={theme} />
                            <LegendDot label={t("appointment.legend")} color={APPT_COLOR} theme={theme} />
                        </View>
                    </View>

                    {/* APPOINTMENTS SECTION */}
                    <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
                        <View style={[ui.listHeaderRow, { marginBottom: 10 }]}>
                            <Text style={[base.sectionTitle, { color: theme.colors.text.primary, marginBottom: 0 }]}>
                                {t("appointment.title")}
                                {" • "}
                                {t(`appointment.day.${selectedDow}`)}
                            </Text>
                            <Text style={{ color: theme.colors.text.secondary, fontWeight: "800" }}>
                                {selectedAppointments.length}
                            </Text>
                        </View>

                        {selectedAppointments.length === 0 ? (
                            <View style={[base.emptyBox, {
                                backgroundColor: theme.colors.surfaceSoft,
                                borderColor: theme.colors.border,
                                borderRadius: theme.radius.lg,
                                padding: theme.spacing.md,
                            }]}>
                                <Text style={{ color: theme.colors.text.secondary }}>{t("appointment.empty")}</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 10 }}>
                                {selectedAppointments.map((appt) => (
                                    <View
                                        key={appt.id}
                                        style={[base.row, {
                                            backgroundColor: theme.colors.surface,
                                            borderColor: APPT_COLOR + "55",
                                            borderRadius: theme.radius.lg,
                                            padding: theme.spacing.md,
                                            borderLeftWidth: 3,
                                            borderLeftColor: APPT_COLOR,
                                        }]}
                                    >
                                        {/* Colored indicator */}
                                        <View style={[ui.apptTimeBadge, { backgroundColor: theme.colors.premiumSoft }]}>
                                            <Text style={{ color: APPT_COLOR, fontWeight: "900", fontSize: theme.fontSize.md }}>
                                                {appt.time}
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Text style={[base.rowTitle, { color: theme.colors.text.primary }]}>
                                                {appt.studentName}
                                            </Text>
                                            {appt.grade ? (
                                                <Text style={[base.rowSub, { color: theme.colors.text.secondary }]}>
                                                    {appt.grade}
                                                </Text>
                                            ) : null}
                                        </View>

                                        <View style={[base.badge, { backgroundColor: theme.colors.premiumSoft, borderRadius: theme.radius.pill }]}>
                                            <Text style={{ color: APPT_COLOR, fontSize: theme.fontSize.sm, fontWeight: "800" }}>
                                                {t("appointment.badge")}
                                            </Text>
                                        </View>

                                        {/* Delete button */}
                                        <Pressable
                                            onPress={() => deleteAppointment(appt.id)}
                                            hitSlop={8}
                                            style={{ paddingLeft: 8 }}
                                        >
                                            <X size={16} color={theme.colors.text.muted} />
                                        </Pressable>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* FOLLOW-UP LIST */}
                    <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
                        <View style={ui.listHeaderRow}>
                            <Text style={[base.sectionTitle, { color: theme.colors.text.primary }]}>
                                {t("calendar.list.title", { date: selectedDay })}
                                {filterLabel}
                            </Text>
                            <Text style={{ color: theme.colors.text.secondary, fontWeight: "800" }}>
                                {t("calendar.list.count", { count: selectedItems.length })}
                            </Text>
                        </View>

                        {selectedItems.length === 0 ? (
                            <View style={[base.emptyBox, {
                                backgroundColor: theme.colors.surfaceSoft,
                                borderColor: theme.colors.border,
                                borderRadius: theme.radius.lg,
                                padding: theme.spacing.lg,
                            }]}>
                                <Text style={{ color: theme.colors.text.secondary }}>{t("calendar.empty")}</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 10 }}>
                                {selectedItems.map((item) => {
                                    const badge =
                                        item.status === "overdue"
                                            ? { text: t("calendar.badge.overdue"), bg: theme.colors.dangerSoft, fg: theme.colors.danger }
                                            : item.status === "dueSoon"
                                                ? { text: t("calendar.badge.dueSoon"), bg: "rgba(245,158,11,0.15)", fg: theme.colors.warning }
                                                : item.status === "never"
                                                    ? { text: t("calendar.badge.never"), bg: theme.colors.surfaceSoft, fg: theme.colors.text.muted }
                                                    : { text: t("calendar.badge.ok"), bg: theme.colors.successSoft, fg: theme.colors.success };

                                    return (
                                        <Pressable
                                            key={item.studentId}
                                            style={({ pressed }) => [
                                                base.row,
                                                {
                                                    backgroundColor: theme.colors.surface,
                                                    borderColor: theme.colors.border,
                                                    borderRadius: theme.radius.lg,
                                                    padding: theme.spacing.md,
                                                    opacity: pressed ? 0.92 : 1,
                                                },
                                            ]}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={[base.rowTitle, { color: theme.colors.text.primary }]}>
                                                    {item.studentName}
                                                </Text>
                                                <Text style={[base.rowSub, { color: theme.colors.text.secondary }]}>
                                                    {formatHumanDiff(item.daysToDue, item.status)}
                                                    {"  •  "}
                                                    {t("calendar.lastRecord", { date: item.lastRecordAt ? ymd(item.lastRecordAt) : "—" })}
                                                </Text>
                                            </View>
                                            <View style={[base.badge, { backgroundColor: badge.bg, borderRadius: theme.radius.pill }]}>
                                                <Text style={{ color: badge.fg, fontSize: theme.fontSize.sm, fontWeight: "800" }}>
                                                    {badge.text}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* FAB */}
                <Pressable
                    onPress={openModal}
                    style={({ pressed }) => [
                        ui.fab,
                        {
                            backgroundColor: APPT_COLOR,
                            opacity: pressed ? 0.85 : 1,
                            shadowColor: APPT_COLOR,
                        },
                    ]}
                >
                    <Text style={{ color: "#fff", fontSize: 26, fontWeight: "300", lineHeight: 30 }}>+</Text>
                    <Text style={{ color: "#fff", fontSize: theme.fontSize.sm, fontWeight: "700" }}>
                        {t("appointment.add")}
                    </Text>
                </Pressable>
            </View>

            {/* =================== APPOINTMENT MODAL =================== */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <Pressable
                        style={ui.modalBackdrop}
                        onPress={() => setModalVisible(false)}
                    />

                    <View style={[ui.modalSheet, { backgroundColor: theme.colors.surface }]}>
                        {/* Modal header */}
                        <View style={[ui.modalHeader, { borderBottomColor: theme.colors.border }]}>
                            <Text style={[ui.modalTitle, { color: theme.colors.text.primary }]}>
                                {t("appointment.add")}
                            </Text>
                            <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                                <X size={22} color={theme.colors.text.muted} />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Student picker */}
                            <View>
                                <Text style={[ui.formLabel, { color: theme.colors.text.secondary }]}>
                                    {t("appointment.selectStudent")}
                                </Text>
                                <ScrollView
                                    style={[ui.studentPicker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft }]}
                                    nestedScrollEnabled
                                    showsVerticalScrollIndicator
                                >
                                    {students.map((s) => {
                                        const name = s.name ?? s.fullName ?? t("calendar.student.unnamed");
                                        const isSelected = s.id === formStudentId;
                                        return (
                                            <Pressable
                                                key={s.id}
                                                onPress={() => { setFormStudentId(s.id); setFormStudentName(name); }}
                                                style={[
                                                    ui.studentItem,
                                                    {
                                                        borderBottomColor: theme.colors.border,
                                                        backgroundColor: isSelected ? APPT_COLOR + "22" : "transparent",
                                                    },
                                                ]}
                                            >
                                                <Text style={{
                                                    color: isSelected ? APPT_COLOR : theme.colors.text.primary,
                                                    fontWeight: isSelected ? "800" : "500",
                                                    fontSize: theme.fontSize.md,
                                                }}>
                                                    {name}
                                                </Text>
                                                {isSelected && (
                                                    <Text style={{ color: APPT_COLOR, fontSize: 16 }}>✓</Text>
                                                )}
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Day of week picker */}
                            <View>
                                <Text style={[ui.formLabel, { color: theme.colors.text.secondary }]}>
                                    {t("appointment.day")}
                                </Text>
                                <View style={ui.dowRow}>
                                    {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                                        const isActive = formDow === dow;
                                        return (
                                            <Pressable
                                                key={dow}
                                                onPress={() => setFormDow(dow)}
                                                style={[
                                                    ui.dowChip,
                                                    {
                                                        backgroundColor: isActive ? APPT_COLOR : theme.colors.surfaceSoft,
                                                        borderColor: isActive ? APPT_COLOR : theme.colors.border,
                                                    },
                                                ]}
                                            >
                                                <Text style={{
                                                    color: isActive ? "#fff" : theme.colors.text.secondary,
                                                    fontWeight: isActive ? "800" : "500",
                                                    fontSize: theme.fontSize.xs,
                                                }}>
                                                    {t(`appointment.day.short.${dow}`)}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Time input */}
                            <View>
                                <Text style={[ui.formLabel, { color: theme.colors.text.secondary }]}>
                                    {t("appointment.time")}
                                </Text>
                                <TextInput
                                    value={formTime}
                                    onChangeText={setFormTime}
                                    placeholder={t("appointment.timePlaceholder")}
                                    placeholderTextColor={theme.colors.text.muted}
                                    keyboardType="numbers-and-punctuation"
                                    maxLength={5}
                                    style={[ui.textInput, {
                                        color: theme.colors.text.primary,
                                        borderColor: TIME_REGEX.test(formTime) ? theme.colors.success : theme.colors.border,
                                        backgroundColor: theme.colors.surfaceSoft,
                                    }]}
                                />
                            </View>

                            {/* Grade input (optional) */}
                            <View>
                                <Text style={[ui.formLabel, { color: theme.colors.text.secondary }]}>
                                    {t("appointment.grade")}
                                </Text>
                                <TextInput
                                    value={formGrade}
                                    onChangeText={setFormGrade}
                                    placeholder={t("appointment.gradePlaceholder")}
                                    placeholderTextColor={theme.colors.text.muted}
                                    style={[ui.textInput, {
                                        color: theme.colors.text.primary,
                                        borderColor: theme.colors.border,
                                        backgroundColor: theme.colors.surfaceSoft,
                                    }]}
                                />
                            </View>

                            {/* Action buttons */}
                            <View style={ui.modalActions}>
                                <Pressable
                                    onPress={() => setModalVisible(false)}
                                    style={[ui.btnCancel, { borderColor: theme.colors.border }]}
                                >
                                    <Text style={{ color: theme.colors.text.secondary, fontWeight: "700" }}>
                                        {t("appointment.cancel")}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={saveAppointment}
                                    disabled={saving}
                                    style={({ pressed }) => [
                                        ui.btnSave,
                                        { backgroundColor: APPT_COLOR, opacity: pressed || saving ? 0.7 : 1 },
                                    ]}
                                >
                                    {saving
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={{ color: "#fff", fontWeight: "800" }}>{t("appointment.save")}</Text>
                                    }
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

/* -------------------- STYLES -------------------- */
const base = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { paddingTop: 10, paddingBottom: 10 },
    h1: { fontSize: 22, fontWeight: "900" },
    h2: { marginTop: 4, fontSize: 13, fontWeight: "700" },
    card: { borderWidth: 1, overflow: "hidden" },
    legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 10 },
    sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
    emptyBox: { borderWidth: 1 },
    row: { borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    rowTitle: { fontSize: 15, fontWeight: "900" },
    rowSub: { marginTop: 4, fontSize: 12, fontWeight: "700" },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0 },
    center: { alignItems: "center", justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "900" },
    sub: { fontSize: 13, fontWeight: "700" },
});

const ui = StyleSheet.create({
    statsRow3: { flexDirection: "row", gap: 10 },
    statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },

    dayCellSquare: {
        width: 44, height: 44,
        alignItems: "center", justifyContent: "center",
        marginVertical: 4, position: "relative",
    },
    dotsWrap: {
        position: "absolute", bottom: 6, alignSelf: "center",
        flexDirection: "row", alignItems: "center", gap: 3,
    },
    dotMini: { width: 6, height: 6, borderRadius: 6 },

    listHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

    apptTimeBadge: {
        paddingHorizontal: 10, paddingVertical: 8,
        borderRadius: 10, minWidth: 52, alignItems: "center",
    },

    // FAB
    fab: {
        position: "absolute", bottom: 20, right: 20,
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 18, paddingVertical: 12,
        borderRadius: 999,
        shadowOpacity: 0.35, shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }, elevation: 6,
    },

    // Modal
    modalBackdrop: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
    },
    modalSheet: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        maxHeight: "85%", borderTopLeftRadius: 24, borderTopRightRadius: 24,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 17, fontWeight: "800" },

    formLabel: { fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },

    studentPicker: { borderWidth: 1, borderRadius: 12, maxHeight: 180 },
    studentItem: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1,
    },

    dowRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    dowChip: {
        paddingHorizontal: 10, paddingVertical: 7,
        borderRadius: 8, borderWidth: 1, minWidth: 40, alignItems: "center",
    },

    textInput: {
        borderWidth: 1, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 15,
    },

    modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    btnCancel: {
        flex: 1, paddingVertical: 13, borderRadius: 12,
        borderWidth: 1, alignItems: "center", justifyContent: "center",
    },
    btnSave: {
        flex: 2, paddingVertical: 13, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
});

// app/(tabs)/calendar.tsx
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { auth } from "@/services/firebase";
import { appointmentDocRef, appointmentsColRef, recordsColRef, studentsColRef } from "@/services/firestorePaths";
import { useFocusEffect } from "expo-router";
import { addDoc, deleteDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "firebase/firestore";
import { Trash2, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */
type Student = { id: string; name?: string; fullName?: string; followUpDays?: number };

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

type Appointment = {
    id: string;
    studentId: string;
    studentName?: string;
    date: Timestamp; // full datetime (date + time)
    note?: string;
    createdAt?: Timestamp;
};

type DueFilter = "all" | "overdue" | "dueSoon" | "ok";

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
function toDateSafe(v: any): Date | null {
    if (!v) return null;
    if (typeof v === "object" && typeof v.toDate === "function") {
        try { return v.toDate(); } catch { }
    }
    if (typeof v === "number") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
    if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
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
    return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / (1000 * 60 * 60 * 24));
}

function severityRank(s: DueItem["status"]) {
    return s === "overdue" ? 0 : s === "dueSoon" ? 1 : s === "ok" ? 2 : 3;
}

/* ------------------------------------------------------------------ */
/*  WHEEL PICKER                                                        */
/* ------------------------------------------------------------------ */
const ITEM_H = 52;
const WHEEL_ITEMS = 5; // visible rows (selected = center)

function WheelPicker({
    data,
    initialIndex = 0,
    onChange,
    theme,
}: {
    data: string[];
    initialIndex?: number;
    onChange: (index: number) => void;
    theme: ThemeUI;
}) {
    const scrollRef = useRef<ScrollView>(null);
    const [sel, setSel] = useState(initialIndex);

    useEffect(() => {
        const timer = setTimeout(() => {
            scrollRef.current?.scrollTo({ y: initialIndex * ITEM_H, animated: false });
        }, 80);
        return () => clearTimeout(timer);
    }, [initialIndex]);

    const handleScrollEnd = (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        const idx = Math.max(0, Math.min(data.length - 1, Math.round(y / ITEM_H)));
        setSel(idx);
        onChange(idx);
    };

    return (
        <View style={{ height: ITEM_H * WHEEL_ITEMS, overflow: "hidden", flex: 1 }}>
            {/* selection highlight */}
            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    top: ITEM_H * 2,
                    left: 6,
                    right: 6,
                    height: ITEM_H,
                    borderRadius: 10,
                    backgroundColor: "rgba(255,255,255,0.07)",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    zIndex: 1,
                }}
            />
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_H}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScrollEnd}
                contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
            >
                {data.map((item, i) => {
                    const dist = Math.abs(i - sel);
                    return (
                        <Pressable
                            key={i}
                            style={{ height: ITEM_H, alignItems: "center", justifyContent: "center" }}
                            onPress={() => {
                                scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
                                setSel(i);
                                onChange(i);
                            }}
                        >
                            <Text
                                style={{
                                    color: theme.colors.text.primary,
                                    fontSize: dist === 0 ? 18 : 14,
                                    fontWeight: dist === 0 ? "900" : "400",
                                    opacity: dist === 0 ? 1 : dist === 1 ? 0.45 : 0.18,
                                }}
                            >
                                {item}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  STATIC DATA FOR PICKERS                                             */
/* ------------------------------------------------------------------ */
const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function buildDayLabels(): { label: string; date: Date }[] {
    const result: { label: string; date: Date }[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayName = TR_DAYS[d.getDay()];
        const label =
            i === 0
                ? `Bugün ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`
                : i === 1
                    ? `Yarın ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`
                    : `${dayName} ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
        result.push({ label, date: d });
    }
    return result;
}

const DAY_ITEMS = buildDayLabels();
const HOUR_ITEMS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, "0")); // 06–22
const MINUTE_ITEMS = ["00", "15", "30", "45"];

/* ------------------------------------------------------------------ */
/*  STAT CARD                                                           */
/* ------------------------------------------------------------------ */
function StatCard({ theme, label, value, bg, fg, active, onPress }: { theme: ThemeUI; label: string; value: number; bg: string; fg: string; active?: boolean; onPress?: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={10}
            style={({ pressed }) => [s.statCard, { backgroundColor: bg, borderColor: active ? fg : theme.colors.border, borderWidth: active ? 2 : 1, opacity: pressed ? 0.92 : 1 }]}
        >
            <Text style={{ color: fg, fontWeight: "900", fontSize: theme.fontSize.title }}>{value}</Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, fontWeight: "800", marginTop: 2 }}>{label}</Text>
        </Pressable>
    );
}

/* ------------------------------------------------------------------ */
/*  LEGEND DOT                                                          */
/* ------------------------------------------------------------------ */
function LegendDot({ label, color, theme }: { label: string; color: string; theme: ThemeUI }) {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 10, backgroundColor: color }} />
            <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>{label}</Text>
        </View>
    );
}

/* ------------------------------------------------------------------ */
/*  ADD APPOINTMENT MODAL                                               */
/* ------------------------------------------------------------------ */
function AddAppointmentModal({
    visible,
    students,
    theme,
    onClose,
    onSave,
    t,
}: {
    visible: boolean;
    students: Student[];
    theme: ThemeUI;
    onClose: () => void;
    onSave: (studentId: string, studentName: string, date: Date, note: string) => void;
    t: (key: string, opts?: any) => string;
}) {
    const [step, setStep] = useState<"student" | "datetime">("student");
    const [search, setSearch] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedStudentName, setSelectedStudentName] = useState("");
    const [dayIndex, setDayIndex] = useState(0);
    const [hourIndex, setHourIndex] = useState(3); // 09:00
    const [minuteIndex, setMinuteIndex] = useState(0);
    const [note, setNote] = useState("");

    useEffect(() => {
        if (visible) {
            setStep("student");
            setSearch("");
            setSelectedStudentId("");
            setSelectedStudentName("");
            setDayIndex(0);
            setHourIndex(3);
            setMinuteIndex(0);
            setNote("");
        }
    }, [visible]);

    const filteredStudents = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return students;
        return students.filter(
            (s) => (s.name ?? "").toLowerCase().includes(q) || (s.fullName ?? "").toLowerCase().includes(q)
        );
    }, [students, search]);

    const handleSelectStudent = (id: string, name: string) => {
        setSelectedStudentId(id);
        setSelectedStudentName(name);
        setStep("datetime");
    };

    const handleSave = () => {
        const dayInfo = DAY_ITEMS[dayIndex];
        if (!dayInfo || !selectedStudentId) return;

        const date = new Date(dayInfo.date);
        date.setHours(parseInt(HOUR_ITEMS[hourIndex] ?? "9", 10));
        date.setMinutes(parseInt(MINUTE_ITEMS[minuteIndex] ?? "0", 10));
        date.setSeconds(0);
        onSave(selectedStudentId, selectedStudentName, date, note);
    };

    const selectedDayLabel = DAY_ITEMS[dayIndex]?.label ?? "";

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />

                <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: "90%" }}>
                    {/* Handle */}
                    <View style={{ alignItems: "center", paddingTop: 12 }}>
                        <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
                    </View>

                    {/* Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            {step === "datetime" && (
                                <Pressable onPress={() => setStep("student")} hitSlop={12}>
                                    <Text style={{ color: theme.colors.premium, fontSize: 14, fontWeight: "700" }}>← Geri</Text>
                                </Pressable>
                            )}
                            <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: "900" }}>
                                {step === "student" ? t("calendar.appointment.add") : selectedStudentName}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={12}>
                            <X size={20} color={theme.colors.text.secondary} />
                        </Pressable>
                    </View>

                    {/* STEP 1: Student list */}
                    {step === "student" && (
                        <View style={{ flex: 1 }}>
                            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                <TextInput
                                    value={search}
                                    onChangeText={setSearch}
                                    placeholder={t("calendar.appointment.selectStudent")}
                                    placeholderTextColor={theme.colors.text.muted}
                                    style={{ backgroundColor: theme.colors.surfaceSoft, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 12, color: theme.colors.text.primary, fontSize: 14 }}
                                />
                            </View>
                            {filteredStudents.length === 0 ? (
                                <View style={{ padding: 24, alignItems: "center" }}>
                                    <Text style={{ color: theme.colors.text.muted }}>{t("calendar.appointment.noStudents")}</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredStudents}
                                    keyExtractor={(item) => item.id}
                                    style={{ maxHeight: 380 }}
                                    renderItem={({ item }) => {
                                        const name = item.name ?? item.fullName ?? "—";
                                        return (
                                            <Pressable
                                                onPress={() => handleSelectStudent(item.id, name)}
                                                style={({ pressed }) => ({ padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: pressed ? theme.colors.surfaceSoft : "transparent" })}
                                            >
                                                <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: "700" }}>{name}</Text>
                                            </Pressable>
                                        );
                                    }}
                                />
                            )}
                        </View>
                    )}

                    {/* STEP 2: Date + Time picker */}
                    {step === "datetime" && (
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
                            {/* Date + Time label */}
                            <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
                                <Text style={{ color: theme.colors.text.muted, fontSize: 12, fontWeight: "700" }}>
                                    {selectedDayLabel}  {HOUR_ITEMS[hourIndex]}:{MINUTE_ITEMS[minuteIndex]}
                                </Text>
                            </View>

                            {/* 3 column wheel pickers */}
                            <View style={{ flexDirection: "row", paddingHorizontal: 12, gap: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, marginVertical: 8 }}>
                                {/* Column labels */}
                                <View style={{ position: "absolute", top: 8, left: 0, right: 0, flexDirection: "row", zIndex: 2 }}>
                                    <Text style={{ flex: 3, textAlign: "center", color: theme.colors.text.muted, fontSize: 10, fontWeight: "700" }}>GÜN</Text>
                                    <Text style={{ flex: 1, textAlign: "center", color: theme.colors.text.muted, fontSize: 10, fontWeight: "700" }}>SAAT</Text>
                                    <Text style={{ flex: 1, textAlign: "center", color: theme.colors.text.muted, fontSize: 10, fontWeight: "700" }}>DK</Text>
                                </View>

                                <View style={{ flex: 3 }}>
                                    <WheelPicker data={DAY_ITEMS.map((d) => d.label)} initialIndex={dayIndex} onChange={setDayIndex} theme={theme} />
                                </View>
                                <View style={{ width: 1, backgroundColor: theme.colors.border, alignSelf: "stretch", marginVertical: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <WheelPicker data={HOUR_ITEMS} initialIndex={hourIndex} onChange={setHourIndex} theme={theme} />
                                </View>
                                <View style={{ width: 1, backgroundColor: theme.colors.border, alignSelf: "stretch", marginVertical: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <WheelPicker data={MINUTE_ITEMS} initialIndex={minuteIndex} onChange={setMinuteIndex} theme={theme} />
                                </View>
                            </View>

                            {/* Note */}
                            <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
                                <TextInput
                                    value={note}
                                    onChangeText={setNote}
                                    placeholder={t("calendar.appointment.notePlaceholder")}
                                    placeholderTextColor={theme.colors.text.muted}
                                    multiline
                                    numberOfLines={3}
                                    style={{ backgroundColor: theme.colors.surfaceSoft, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 12, color: theme.colors.text.primary, fontSize: 14, minHeight: 72, textAlignVertical: "top" }}
                                />
                            </View>

                            {/* Save button */}
                            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                                <Pressable
                                    onPress={handleSave}
                                    style={({ pressed }) => ({ backgroundColor: theme.colors.premium, borderRadius: 14, paddingVertical: 14, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                                >
                                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>{t("calendar.appointment.save")}</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */
/*  SCREEN                                                              */
/* ------------------------------------------------------------------ */
export default function CalendarFollowUpScreen() {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const uid = auth.currentUser?.uid;

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [records, setRecords] = useState<RecordDoc[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>(ymd(new Date()));
    const [filter, setFilter] = useState<DueFilter>("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [calKey, setCalKey] = useState(0);

    useFocusEffect(useCallback(() => { setCalKey((k) => k + 1); }, []));

    useEffect(() => {
        if (!uid) return;
        setLoading(true);

        const unsubStudents = onSnapshot(studentsColRef(uid), (snap) => {
            setStudents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });

        const qRecords = query(recordsColRef(uid), orderBy("createdAt", "desc"));
        const unsubRecords = onSnapshot(qRecords, (snap) => {
            setRecords(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
            setLoading(false);
        }, () => setLoading(false));

        const qApt = query(appointmentsColRef(uid), orderBy("date", "asc"));
        const unsubApt = onSnapshot(qApt, (snap) => {
            setAppointments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });

        return () => { unsubStudents(); unsubRecords(); unsubApt(); };
    }, [uid]);

    const formatHumanDiff = useCallback((daysToDue: number, status: DueItem["status"]) => {
        if (status === "never") return t("calendar.diff.never");
        if (daysToDue === 0) return t("calendar.diff.today");
        if (daysToDue > 0) return t("calendar.diff.overdueDays", { days: daysToDue });
        return t("calendar.diff.remainingDays", { days: Math.abs(daysToDue) });
    }, [t]);

    const handleSaveAppointment = useCallback(async (studentId: string, studentName: string, date: Date, note: string) => {
        if (!uid) return;
        try {
            await addDoc(appointmentsColRef(uid), {
                studentId,
                studentName,
                date: Timestamp.fromDate(date),
                note: note.trim() || null,
                createdAt: serverTimestamp(),
            });
            setShowAddModal(false);
        } catch (e) { console.error(e); }
    }, [uid]);

    const handleDeleteAppointment = useCallback((aptId: string) => {
        if (!uid) return;
        Alert.alert(
            t("calendar.appointment.delete"),
            t("calendar.appointment.deleteConfirm"),
            [
                { text: t("calendar.appointment.cancel"), style: "cancel" },
                { text: t("calendar.appointment.delete"), style: "destructive", onPress: async () => { try { await deleteDoc(appointmentDocRef(uid, aptId)); } catch (e) { console.error(e); } } },
            ]
        );
    }, [uid, t]);

    /* computed */
    const dueItems = useMemo<DueItem[]>(() => {
        const today = startOfDay(new Date());
        const lastByStudent = new Map<string, Date>();

        for (const r of records) {
            const sid = r.studentId;
            if (!sid) continue;
            const d = toDateSafe(r.createdAt) ?? toDateSafe(r.date) ?? (typeof r.createdAtMs === "number" ? toDateSafe(r.createdAtMs) : null);
            if (!d) continue;
            const prev = lastByStudent.get(sid);
            if (!prev || d.getTime() > prev.getTime()) lastByStudent.set(sid, d);
        }

        const items: DueItem[] = students.map((s) => {
            const name = s.name ?? s.fullName ?? t("calendar.student.unnamed");
            const last = lastByStudent.get(s.id) ?? null;

            if (!last) return { studentId: s.id, studentName: name, lastRecordAt: null, dueDate: today, status: "never", daysToDue: 0 };

            const period = typeof s.followUpDays === "number" ? s.followUpDays : 30;
            const dueDate = addDays(startOfDay(last), period);
            const diff = daysDiff(today, dueDate);
            const status: DueItem["status"] = diff > 0 ? "overdue" : -diff <= 7 ? "dueSoon" : "ok";

            return { studentId: s.id, studentName: name, lastRecordAt: last, dueDate, status, daysToDue: diff };
        });

        items.sort((a, b) => {
            const ra = severityRank(a.status), rb = severityRank(b.status);
            if (ra !== rb) return ra - rb;
            if (a.status === "overdue") return b.daysToDue - a.daysToDue;
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
            if (severityRank(item.status) < severityRank(existing.maxSeverity)) existing.maxSeverity = item.status;
            buckets.set(key, existing);
        }
        return buckets;
    }, [dueItems]);

    const appointmentBuckets = useMemo(() => {
        const map = new Map<string, number>();
        for (const apt of appointments) {
            const d = toDateSafe(apt.date);
            if (!d) continue;
            const key = ymd(d);
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return map;
    }, [appointments]);

    const selectedAppointments = useMemo(() =>
        appointments.filter((apt) => { const d = toDateSafe(apt.date); return d ? ymd(d) === selectedDay : false; }),
        [appointments, selectedDay]
    );

    const markedDates = useMemo(() => ({ [selectedDay]: { selected: true } }), [selectedDay]);

    const selectedItems = useMemo(() => {
        if (filter === "all") return dueItems.filter((x) => ymd(x.dueDate) === selectedDay);
        return dueItems.filter((x) => x.status === filter);
    }, [dueItems, selectedDay, filter]);

    const filterLabel = useMemo(() => {
        if (filter === "overdue") return ` • ${t("calendar.filters.overdue")}`;
        if (filter === "dueSoon") return ` • ${t("calendar.filters.dueSoon")}`;
        if (filter === "ok") return ` • ${t("calendar.filters.ok")}`;
        return "";
    }, [filter, t]);

    if (!uid) {
        return (
            <SafeAreaView style={[s.safeArea, { backgroundColor: theme.colors.background }]}>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <Text style={{ color: theme.colors.text.primary, fontSize: 18, fontWeight: "900" }}>{t("calendar.auth.requiredTitle")}</Text>
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: "700", marginTop: 6 }}>{t("calendar.auth.requiredDesc")}</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[s.safeArea, { backgroundColor: theme.colors.background }]}>
            <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* HEADER */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 }}>
                        <Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: "900" }}>{t("calendar.title")}</Text>
                        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: "700", marginTop: 4 }}>{t("calendar.subtitle")}</Text>
                    </View>

                    {/* 3 STAT CARDS */}
                    <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20 }}>
                        <StatCard theme={theme} label={t("calendar.filters.overdue")} value={stats.overdue} bg={theme.colors.dangerSoft} fg={theme.colors.danger} active={filter === "overdue"} onPress={() => setFilter((f) => f === "overdue" ? "all" : "overdue")} />
                        <StatCard theme={theme} label={t("calendar.filters.dueSoon")} value={stats.dueSoon} bg="rgba(245,158,11,0.15)" fg={theme.colors.warning} active={filter === "dueSoon"} onPress={() => setFilter((f) => f === "dueSoon" ? "all" : "dueSoon")} />
                        <StatCard theme={theme} label={t("calendar.filters.ok")} value={stats.ok} bg={theme.colors.successSoft} fg={theme.colors.success} active={filter === "ok"} onPress={() => setFilter((f) => f === "ok" ? "all" : "ok")} />
                    </View>

                    {/* CALENDAR */}
                    <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
                        <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, backgroundColor: theme.colors.surface, overflow: "hidden" }}>
                            {loading ? (
                                <View style={{ padding: 24, alignItems: "center" }}>
                                    <ActivityIndicator />
                                    <Text style={{ color: theme.colors.text.secondary, marginTop: 8, fontSize: 13, fontWeight: "700" }}>{t("common.loading")}</Text>
                                </View>
                            ) : (
                                <Calendar
                                    key={calKey}
                                    style={{ backgroundColor: theme.colors.surface }}
                                    onDayPress={(day) => { setSelectedDay(day.dateString); setFilter("all"); }}
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
                                        const aptCount = key ? (appointmentBuckets.get(key) ?? 0) : 0;
                                        const isSelected = key === selectedDay;
                                        const isDisabled = state === "disabled";
                                        const isToday = key === ymd(new Date());

                                        const cellBg = isSelected ? theme.colors.accent : "transparent";
                                        const textColor = isDisabled ? theme.colors.text.muted : isSelected ? theme.colors.text.onAccent : isToday ? theme.colors.accent : theme.colors.text.primary;

                                        const dotColor = bucket?.maxSeverity === "overdue" ? theme.colors.danger : bucket?.maxSeverity === "dueSoon" ? theme.colors.warning : theme.colors.success;
                                        const hasFollowUp = !!bucket?.total;
                                        const hasAppointment = aptCount > 0;

                                        return (
                                            <Pressable
                                                onPress={() => { if (!key) return; setSelectedDay(key); setFilter("all"); }}
                                                hitSlop={6}
                                                style={[
                                                    s.dayCell,
                                                    {
                                                        backgroundColor: cellBg,
                                                        shadowColor: isSelected ? theme.colors.accent : "transparent",
                                                        shadowOpacity: isSelected ? 0.25 : 0,
                                                        shadowRadius: isSelected ? 12 : 0,
                                                        shadowOffset: { width: 0, height: 8 },
                                                        elevation: isSelected ? 3 : 0,
                                                    },
                                                ]}
                                            >
                                                <Text style={{ color: textColor, fontWeight: "900", fontSize: 14, lineHeight: 16 }}>{day}</Text>

                                                {/* dots row */}
                                                {(hasFollowUp || hasAppointment) ? (
                                                    <View style={{ position: "absolute", bottom: 5, flexDirection: "row", gap: 3, alignItems: "center" }}>
                                                        {hasFollowUp && <View style={{ width: 6, height: 6, borderRadius: 6, backgroundColor: dotColor }} />}
                                                        {hasAppointment && (
                                                            /* appointment: small square marker */
                                                            <View style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: theme.colors.premium }} />
                                                        )}
                                                    </View>
                                                ) : null}
                                            </Pressable>
                                        );
                                    }}
                                />
                            )}
                        </View>

                        {/* Legend */}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                            <LegendDot label={t("calendar.legend.overdue")} color={theme.colors.danger} theme={theme} />
                            <LegendDot label={t("calendar.legend.dueSoon", { days: 7 })} color={theme.colors.warning} theme={theme} />
                            <LegendDot label={t("calendar.legend.ok")} color={theme.colors.success} theme={theme} />
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.colors.premium }} />
                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>{t("calendar.legend.appointment")}</Text>
                            </View>
                        </View>
                    </View>

                    {/* RANDEVULAR - seçili gün */}
                    <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <Text style={{ color: theme.colors.premium, fontSize: 16, fontWeight: "900" }}>{t("calendar.appointment.sectionTitle")}</Text>
                            <Pressable
                                onPress={() => setShowAddModal(true)}
                                style={({ pressed }) => ({
                                    backgroundColor: theme.colors.premium,
                                    borderRadius: 20,
                                    width: 32,
                                    height: 32,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: pressed ? 0.8 : 1,
                                })}
                            >
                                <Text style={{ color: "#fff", fontSize: 22, lineHeight: 26, fontWeight: "900" }}>+</Text>
                            </Pressable>
                        </View>

                        {selectedAppointments.length === 0 ? (
                            <View style={{ backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 16 }}>
                                <Text style={{ color: theme.colors.text.secondary }}>{t("calendar.appointment.empty")}</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 8 }}>
                                {selectedAppointments.map((apt) => {
                                    const aptDate = toDateSafe(apt.date);
                                    const timeStr = aptDate ? `${String(aptDate.getHours()).padStart(2, "0")}:${String(aptDate.getMinutes()).padStart(2, "0")}` : "";
                                    return (
                                        <View key={apt.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.premium, borderRadius: 14, padding: 14 }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: theme.colors.premium }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: "900" }}>{apt.studentName ?? "—"}</Text>
                                                {timeStr ? <Text style={{ color: theme.colors.premium, fontSize: 12, fontWeight: "700", marginTop: 2 }}>🕐 {timeStr}</Text> : null}
                                                {apt.note ? <Text style={{ color: theme.colors.text.secondary, fontSize: 12, fontWeight: "600", marginTop: 2 }}>{apt.note}</Text> : null}
                                            </View>
                                            <Pressable onPress={() => handleDeleteAppointment(apt.id)} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
                                                <Trash2 size={16} color={theme.colors.danger} />
                                            </Pressable>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* TAKİP LİSTESİ */}
                    <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: "900" }}>
                                {t("calendar.list.title", { date: selectedDay })}{filterLabel}
                            </Text>
                            <Text style={{ color: theme.colors.text.secondary, fontWeight: "800" }}>{t("calendar.list.count", { count: selectedItems.length })}</Text>
                        </View>

                        {selectedItems.length === 0 ? (
                            <View style={{ backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 16 }}>
                                <Text style={{ color: theme.colors.text.secondary }}>{t("calendar.empty")}</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 10 }}>
                                {selectedItems.map((item) => {
                                    const badge = item.status === "overdue"
                                        ? { text: t("calendar.badge.overdue"), bg: theme.colors.dangerSoft, fg: theme.colors.danger }
                                        : item.status === "dueSoon"
                                            ? { text: t("calendar.badge.dueSoon"), bg: "rgba(245,158,11,0.15)", fg: theme.colors.warning }
                                            : item.status === "never"
                                                ? { text: t("calendar.badge.never"), bg: theme.colors.surfaceSoft, fg: theme.colors.text.muted }
                                                : { text: t("calendar.badge.ok"), bg: theme.colors.successSoft, fg: theme.colors.success };
                                    return (
                                        <View key={item.studentId} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 14 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: "900" }}>{item.studentName}</Text>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                                                    {formatHumanDiff(item.daysToDue, item.status)}{"  •  "}{t("calendar.lastRecord", { date: item.lastRecordAt ? ymd(item.lastRecordAt) : "—" })}
                                                </Text>
                                            </View>
                                            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: badge.bg }}>
                                                <Text style={{ color: badge.fg, fontSize: 11, fontWeight: "800" }}>{badge.text}</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </ScrollView>

            </View>

            {/* MODAL */}
            <AddAppointmentModal
                visible={showAddModal}
                students={students}
                theme={theme}
                onClose={() => setShowAddModal(false)}
                onSave={handleSaveAppointment}
                t={t}
            />
        </SafeAreaView>
    );
}

/* ------------------------------------------------------------------ */
/*  STYLES                                                              */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
    safeArea: { flex: 1 },
    statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16 },
    dayCell: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginVertical: 4, borderRadius: 12 },
});

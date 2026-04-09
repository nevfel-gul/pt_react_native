// app/calendar.tsx
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { auth } from "@/services/firebase";
import { appointmentDocRef, appointmentsColRef, recordsColRef, studentsColRef } from "@/services/firestorePaths";
import { useFocusEffect } from "expo-router";
import { addDoc, deleteDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "firebase/firestore";
import { Plus, Trash2, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
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
    daysToDue: number; // today - dueDate
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
    date: Timestamp;
    note?: string;
    createdAt?: Timestamp;
};

// ✅ filtre
type DueFilter = "all" | "overdue" | "dueSoon" | "ok";

/* -------------------- HELPERS -------------------- */
function toDateSafe(v: any): Date | null {
    if (!v) return null;
    if (typeof v === "object" && typeof v.toDate === "function") {
        try {
            return v.toDate();
        } catch { }
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
        case "overdue":
            return 0;
        case "dueSoon":
            return 1;
        case "ok":
            return 2;
        case "never":
            return 3;
    }
}

/* -------------------- UI -------------------- */
function StatCard({
    theme,
    label,
    value,
    bg,
    fg,
    active,
    onPress,
}: {
    theme: ThemeUI;
    label: string;
    value: number;
    bg: string;
    fg: string;
    active?: boolean;
    onPress?: () => void;
}) {
    // ✅ tasarımı bozma: aynı kutu, sadece tıklanınca opacity + aktifken border biraz belirgin
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
            <Text
                style={{
                    color: theme.colors.text.secondary,
                    fontSize: theme.fontSize.xs,
                    fontWeight: "800",
                    marginTop: 2,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

/* -------------------- SCREEN -------------------- */
export default function CalendarFollowUpScreen() {
    const { theme } = useTheme();
    const uid = auth.currentUser?.uid;

    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [records, setRecords] = useState<RecordDoc[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>(ymd(new Date()));
    const [showAddModal, setShowAddModal] = useState(false);

    // ✅ aktif filtre
    const [filter, setFilter] = useState<DueFilter>("all");

    // ✅ FIX: ekran focus olunca Calendar'ı remount et (ilk açılışta beyaz kalma bug'ı)
    const [calKey, setCalKey] = useState(0);
    useFocusEffect(
        useCallback(() => {
            setCalKey((k) => k + 1);
        }, [])
    );

    useEffect(() => {
        if (!uid) return;

        setLoading(true);

        const unsubStudents = onSnapshot(studentsColRef(uid), (snap) => {
            const arr: Student[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            setStudents(arr);
        });

        const qy = query(recordsColRef(uid), orderBy("createdAt", "desc"));
        const unsubRecords = onSnapshot(
            qy,
            (snap) => {
                const arr: RecordDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
                setRecords(arr);
                setLoading(false);
            },
            () => setLoading(false)
        );

        const qApt = query(appointmentsColRef(uid), orderBy("date", "asc"));
        const unsubAppointments = onSnapshot(qApt, (snap) => {
            const arr: Appointment[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            setAppointments(arr);
        });

        return () => {
            unsubStudents();
            unsubRecords();
            unsubAppointments();
        };
    }, [uid]);

    // ✅ i18n: insan dili fark metni
    const formatHumanDiff = useCallback(
        (daysToDue: number, status: DueItem["status"]) => {
            if (status === "never") return t("calendar.diff.never");
            if (daysToDue === 0) return t("calendar.diff.today");
            if (daysToDue > 0) return t("calendar.diff.overdueDays", { days: daysToDue });
            return t("calendar.diff.remainingDays", { days: Math.abs(daysToDue) });
        },
        [t]
    );

    const handleSaveAppointment = useCallback(
        async (studentId: string, studentName: string, note: string) => {
            if (!uid || !studentId) return;
            try {
                const dateObj = new Date(selectedDay + "T00:00:00");
                await addDoc(appointmentsColRef(uid), {
                    studentId,
                    studentName,
                    date: Timestamp.fromDate(dateObj),
                    note: note.trim() || null,
                    createdAt: serverTimestamp(),
                });
                setShowAddModal(false);
            } catch (e) {
                console.error(e);
            }
        },
        [uid, selectedDay]
    );

    const handleDeleteAppointment = useCallback(
        (aptId: string) => {
            if (!uid) return;
            Alert.alert(
                t("calendar.appointment.delete"),
                t("calendar.appointment.deleteConfirm"),
                [
                    { text: t("calendar.appointment.cancel"), style: "cancel" },
                    {
                        text: t("calendar.appointment.delete"),
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await deleteDoc(appointmentDocRef(uid, aptId));
                            } catch (e) {
                                console.error(e);
                            }
                        },
                    },
                ]
            );
        },
        [uid, t]
    );

    const dueItems = useMemo<DueItem[]>(() => {
        const today = startOfDay(new Date());
        const lastByStudent = new Map<string, Date>();

        for (const r of records) {
            const sid = r.studentId;
            if (!sid) continue;

            const d =
                toDateSafe(r.createdAt) ??
                toDateSafe(r.date) ??
                (typeof r.createdAtMs === "number" ? toDateSafe(r.createdAtMs) : null);

            if (!d) continue;

            const prev = lastByStudent.get(sid);
            if (!prev || d.getTime() > prev.getTime()) lastByStudent.set(sid, d);
        }

        const items: DueItem[] = students.map((s) => {
            const name = s.name ?? s.fullName ?? t("calendar.student.unnamed");
            const last = lastByStudent.get(s.id) ?? null;

            if (!last) {
                const dueDate = today; // “hemen” gelsin gibi
                return {
                    studentId: s.id,
                    studentName: name,
                    lastRecordAt: null,
                    dueDate,
                    status: "never",
                    daysToDue: 0,
                };
            }

            const period = typeof s.followUpDays === "number" ? s.followUpDays : 30;
            const dueDate = addDays(startOfDay(last), period);
            const diff = daysDiff(today, dueDate);

            let status: DueItem["status"] = "ok";
            if (diff > 0) status = "overdue";
            else status = -diff <= 7 ? "dueSoon" : "ok";

            return {
                studentId: s.id,
                studentName: name,
                lastRecordAt: last,
                dueDate,
                status,
                daysToDue: diff,
            };
        });

        items.sort((a, b) => {
            const ra = severityRank(a.status);
            const rb = severityRank(b.status);
            if (ra !== rb) return ra - rb;
            if (a.status === "overdue" && b.status === "overdue") return b.daysToDue - a.daysToDue;
            return a.studentName.localeCompare(b.studentName);
        });

        return items;
    }, [students, records, t]);

    const stats = useMemo(() => {
        let overdue = 0,
            dueSoon = 0,
            ok = 0;
        for (const it of dueItems) {
            if (it.status === "overdue") overdue++;
            else if (it.status === "dueSoon") dueSoon++;
            else if (it.status === "ok") ok++;
        }
        return { overdue, dueSoon, ok };
    }, [dueItems]);

    // ✅ Randevu bucket: tarih → randevu sayısı
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

    // ✅ Seçili gündeki randevular
    const selectedAppointments = useMemo(() => {
        return appointments.filter((apt) => {
            const d = toDateSafe(apt.date);
            return d ? ymd(d) === selectedDay : false;
        });
    }, [appointments, selectedDay]);

    const dayBuckets = useMemo(() => {
        const buckets = new Map<string, DayBucket>();

        for (const item of dueItems) {
            if (item.status === "never") continue;

            const key = ymd(item.dueDate);
            const existing = buckets.get(key) ?? {
                dateKey: key,
                total: 0,
                maxSeverity: "ok" as DayBucket["maxSeverity"],
            };

            existing.total += 1;

            const rankCur = severityRank(existing.maxSeverity);
            const rankNew = severityRank(item.status);
            if (rankNew < rankCur) existing.maxSeverity = item.status;

            buckets.set(key, existing);
        }

        return buckets;
    }, [dueItems]);

    // ✅ markedDates sadece lib için (biz selected'ı dayComponent ile çiziyoruz)
    const markedDates = useMemo(() => {
        return { [selectedDay]: { selected: true } };
    }, [selectedDay]);

    // ✅ LIST: seçili gün + kart filtresi
    const selectedItems = useMemo(() => {
        // ✅ ALL: seçili gün listesi
        if (filter === "all") {
            return dueItems.filter((x) => ymd(x.dueDate) === selectedDay);
        }

        // ✅ Stat kartı seçiliyse: TÜM GÜNLERDEKİ o statü
        return dueItems.filter((x) => x.status === filter);
    }, [dueItems, selectedDay, filter]);

    const filterLabel = useMemo(() => {
        if (filter === "all") return "";
        if (filter === "overdue") return ` • ${t("calendar.filters.overdue")}`;
        if (filter === "dueSoon") return ` • ${t("calendar.filters.dueSoon")}`;
        return ` • ${t("calendar.filters.ok")}`;
    }, [filter, t]);

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
                    <Text style={[base.h2, { color: theme.colors.text.secondary }]}>
                        {t("calendar.subtitle")}
                    </Text>
                </View>

                {/* 3 STAT (tıklanabilir filtre) */}
                <View style={[ui.statsRow3, { paddingHorizontal: theme.spacing.lg }]}>
                    <StatCard
                        theme={theme}
                        label={t("calendar.filters.overdue")}
                        value={stats.overdue}
                        bg={theme.colors.dangerSoft}
                        fg={theme.colors.danger}
                        active={filter === "overdue"}
                        onPress={() => setFilter((f) => (f === "overdue" ? "all" : "overdue"))}
                    />
                    <StatCard
                        theme={theme}
                        label={t("calendar.filters.dueSoon")}
                        value={stats.dueSoon}
                        bg={"rgba(245,158,11,0.15)"}
                        fg={theme.colors.warning}
                        active={filter === "dueSoon"}
                        onPress={() => setFilter((f) => (f === "dueSoon" ? "all" : "dueSoon"))}
                    />
                    <StatCard
                        theme={theme}
                        label={t("calendar.filters.ok")}
                        value={stats.ok}
                        bg={theme.colors.successSoft}
                        fg={theme.colors.success}
                        active={filter === "ok"}
                        onPress={() => setFilter((f) => (f === "ok" ? "all" : "ok"))}
                    />
                </View>

                {/* CALENDAR */}
                <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
                    <View
                        style={[
                            base.card,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                                borderRadius: theme.radius.lg,
                            },
                        ]}
                    >
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
                                    setFilter("all"); // ✅ takvimden gün seçilince tekrar "o gün" moduna dön
                                }}
                                markedDates={markedDates}
                                theme={{
                                    backgroundColor: theme.colors.surface,
                                    calendarBackground: theme.colors.surface,
                                    textSectionTitleColor: theme.colors.text.muted,
                                    dayTextColor: theme.colors.text.primary,
                                    monthTextColor: theme.colors.text.primary,

                                    // ✅ default selected boyamasını kapat
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

                                    const todayKey = ymd(new Date());
                                    const isToday = key === todayKey;

                                    // ✅ selected: mavi kare
                                    const cellBg = isSelected ? theme.colors.accent : "transparent";

                                    // ✅ text: selected beyaz, today mavi, normal beyaz
                                    const textColor = isDisabled
                                        ? theme.colors.text.muted
                                        : isSelected
                                            ? theme.colors.text.onAccent
                                            : isToday
                                                ? theme.colors.accent
                                                : theme.colors.text.primary;

                                    // ✅ dot rengi: severity'e göre
                                    const dotColor =
                                        bucket?.maxSeverity === "overdue"
                                            ? theme.colors.danger
                                            : bucket?.maxSeverity === "dueSoon"
                                                ? theme.colors.warning
                                                : theme.colors.success;

                                    const hasFollowUp = !!bucket?.total;
                                    const hasAppointment = aptCount > 0;

                                    return (
                                        <Pressable
                                            onPress={() => {
                                                if (!key) return;
                                                setSelectedDay(key);
                                                setFilter("all"); // ✅ gün basınca o günün verileri gelsin
                                            }}
                                            hitSlop={10}
                                            style={[
                                                ui.dayCellSquare,
                                                {
                                                    backgroundColor: cellBg,
                                                    borderRadius: 12,

                                                    // ✅ selected glow
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

                                            {/* takip + randevu dots */}
                                            {(hasFollowUp || hasAppointment) ? (
                                                <View style={ui.dotsWrap}>
                                                    {hasFollowUp && (
                                                        <View style={[ui.dotMini, { backgroundColor: dotColor }]} />
                                                    )}
                                                    {hasAppointment && (
                                                        <View style={[ui.dotMini, {
                                                            backgroundColor: theme.colors.premium,
                                                            marginLeft: hasFollowUp ? 3 : 0,
                                                        }]} />
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
                    <View style={[base.legendRow, { marginTop: theme.spacing.md }]}>
                        <LegendDot label={t("calendar.legend.overdue")} color={theme.colors.danger} theme={theme} />
                        <LegendDot
                            label={t("calendar.legend.dueSoon", { days: 7 })}
                            color={theme.colors.warning}
                            theme={theme}
                        />
                        <LegendDot label={t("calendar.legend.ok")} color={theme.colors.success} theme={theme} />
                        <LegendDot label={t("calendar.legend.appointment")} color={theme.colors.premium} theme={theme} />
                    </View>
                </View>

                {/* RANDEVULAR */}
                <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
                    <View style={ui.listHeaderRow}>
                        <Text style={[base.sectionTitle, { color: theme.colors.premium }]}>
                            {t("calendar.appointment.sectionTitle")}
                        </Text>
                        <Text style={{ color: theme.colors.text.secondary, fontWeight: "800" }}>
                            {selectedAppointments.length}
                        </Text>
                    </View>

                    {selectedAppointments.length === 0 ? (
                        <View
                            style={[
                                base.emptyBox,
                                {
                                    backgroundColor: theme.colors.surfaceSoft,
                                    borderColor: theme.colors.border,
                                    borderRadius: theme.radius.lg,
                                    padding: theme.spacing.lg,
                                },
                            ]}
                        >
                            <Text style={{ color: theme.colors.text.secondary }}>{t("calendar.appointment.empty")}</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {selectedAppointments.map((apt) => (
                                <View
                                    key={apt.id}
                                    style={[
                                        base.row,
                                        {
                                            backgroundColor: theme.colors.surface,
                                            borderColor: theme.colors.premium,
                                            borderRadius: theme.radius.lg,
                                            padding: theme.spacing.md,
                                        },
                                    ]}
                                >
                                    <View
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 10,
                                            backgroundColor: theme.colors.premium,
                                            marginRight: 4,
                                        }}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[base.rowTitle, { color: theme.colors.text.primary }]}>
                                            {apt.studentName ?? "—"}
                                        </Text>
                                        {apt.note ? (
                                            <Text style={[base.rowSub, { color: theme.colors.text.secondary }]}>
                                                {apt.note}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Pressable
                                        onPress={() => handleDeleteAppointment(apt.id)}
                                        hitSlop={12}
                                        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
                                    >
                                        <Trash2 size={16} color={theme.colors.danger} />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* TAKİP LİSTESİ */}
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
                        <View
                            style={[
                                base.emptyBox,
                                {
                                    backgroundColor: theme.colors.surfaceSoft,
                                    borderColor: theme.colors.border,
                                    borderRadius: theme.radius.lg,
                                    padding: theme.spacing.lg,
                                },
                            ]}
                        >
                            <Text style={{ color: theme.colors.text.secondary }}>{t("calendar.empty")}</Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {selectedItems.map((item) => {
                                const badge =
                                    item.status === "overdue"
                                        ? {
                                            text: t("calendar.badge.overdue"),
                                            bg: theme.colors.dangerSoft,
                                            fg: theme.colors.danger,
                                        }
                                        : item.status === "dueSoon"
                                            ? {
                                                text: t("calendar.badge.dueSoon"),
                                                bg: "rgba(245,158,11,0.15)",
                                                fg: theme.colors.warning,
                                            }
                                            : item.status === "never"
                                                ? {
                                                    text: t("calendar.badge.never"),
                                                    bg: theme.colors.surfaceSoft,
                                                    fg: theme.colors.text.muted,
                                                }
                                                : {
                                                    text: t("calendar.badge.ok"),
                                                    bg: theme.colors.successSoft,
                                                    fg: theme.colors.success,
                                                };

                                return (
                                    <Pressable
                                        key={item.studentId}
                                        onPress={() => {
                                            // router.push(`/student/${item.studentId}` as any)
                                        }}
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
                                                {t("calendar.lastRecord", {
                                                    date: item.lastRecordAt ? ymd(item.lastRecordAt) : "—",
                                                })}
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

            {/* FAB: Randevu Ekle */}

            <Pressable
                onPress={() => setShowAddModal(true)}
                style={({ pressed }) => [
                    ui.fab,
                    { backgroundColor: theme.colors.premium, opacity: pressed ? 0.85 : 1 },
                ]}
            >
                <Plus size={24} color="#fff" />
            </Pressable>

            {/* Randevu Ekle Modal */}
            <AddAppointmentModal
                visible={showAddModal}
                date={selectedDay}
                students={students}
                theme={theme}
                onClose={() => setShowAddModal(false)}
                onSave={handleSaveAppointment}
                t={t}
            />
            </View>
        </SafeAreaView>
    );
}

/* -------------------- ADD APPOINTMENT MODAL -------------------- */
function AddAppointmentModal({
    visible,
    date,
    students,
    theme,
    onClose,
    onSave,
    t,
}: {
    visible: boolean;
    date: string;
    students: Student[];
    theme: ThemeUI;
    onClose: () => void;
    onSave: (studentId: string, studentName: string, note: string) => void;
    t: (key: string, opts?: any) => string;
}) {
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedStudentName, setSelectedStudentName] = useState("");
    const [note, setNote] = useState("");
    const [showStudentPicker, setShowStudentPicker] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (visible) {
            setSelectedStudentId("");
            setSelectedStudentName("");
            setNote("");
            setShowStudentPicker(false);
            setSearch("");
        }
    }, [visible]);

    const filteredStudents = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return students;
        return students.filter(
            (s) =>
                (s.name ?? "").toLowerCase().includes(q) ||
                (s.fullName ?? "").toLowerCase().includes(q)
        );
    }, [students, search]);

    const canSave = selectedStudentId.length > 0;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1, justifyContent: "flex-end" }}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
                    onPress={onClose}
                />
                <View
                    style={{
                        backgroundColor: theme.colors.surface,
                        borderTopLeftRadius: theme.radius.xl,
                        borderTopRightRadius: theme.radius.xl,
                        padding: theme.spacing.lg,
                        paddingBottom: 32,
                        gap: theme.spacing.md,
                    }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View>
                            <Text style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.lg, fontWeight: "900" }}>
                                {t("calendar.appointment.add")}
                            </Text>
                            <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.sm, marginTop: 2 }}>
                                {date}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={12}>
                            <X size={22} color={theme.colors.text.secondary} />
                        </Pressable>
                    </View>

                    {/* Student Picker Button */}
                    <TouchableOpacity
                        onPress={() => setShowStudentPicker(true)}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: theme.colors.surfaceSoft,
                            borderRadius: theme.radius.md,
                            borderWidth: 1,
                            borderColor: selectedStudentId ? theme.colors.premium : theme.colors.border,
                            padding: theme.spacing.md,
                        }}
                    >
                        <Text
                            style={{
                                color: selectedStudentId ? theme.colors.text.primary : theme.colors.text.muted,
                                fontSize: theme.fontSize.md,
                                fontWeight: selectedStudentId ? "700" : "400",
                            }}
                        >
                            {selectedStudentName || t("calendar.appointment.selectStudent")}
                        </Text>
                        <Plus size={16} color={theme.colors.premium} />
                    </TouchableOpacity>

                    {/* Note Input */}
                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder={t("calendar.appointment.notePlaceholder")}
                        placeholderTextColor={theme.colors.text.muted}
                        multiline
                        numberOfLines={3}
                        style={{
                            backgroundColor: theme.colors.surfaceSoft,
                            borderRadius: theme.radius.md,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            padding: theme.spacing.md,
                            color: theme.colors.text.primary,
                            fontSize: theme.fontSize.md,
                            minHeight: 80,
                            textAlignVertical: "top",
                        }}
                    />

                    {/* Buttons */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => ({
                                flex: 1,
                                padding: theme.spacing.md,
                                borderRadius: theme.radius.md,
                                alignItems: "center",
                                backgroundColor: theme.colors.surfaceSoft,
                                opacity: pressed ? 0.8 : 1,
                            })}
                        >
                            <Text style={{ color: theme.colors.text.secondary, fontWeight: "700" }}>
                                {t("calendar.appointment.cancel")}
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => canSave && onSave(selectedStudentId, selectedStudentName, note)}
                            style={({ pressed }) => ({
                                flex: 1,
                                padding: theme.spacing.md,
                                borderRadius: theme.radius.md,
                                alignItems: "center",
                                backgroundColor: canSave ? theme.colors.premium : theme.colors.border,
                                opacity: pressed ? 0.85 : 1,
                            })}
                        >
                            <Text style={{ color: "#fff", fontWeight: "900" }}>
                                {t("calendar.appointment.save")}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Student Picker Sub-modal */}
            <Modal
                visible={showStudentPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStudentPicker(false)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
                    onPress={() => setShowStudentPicker(false)}
                />
                <View
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: theme.colors.surface,
                        borderTopLeftRadius: theme.radius.xl,
                        borderTopRightRadius: theme.radius.xl,
                        maxHeight: "70%",
                        paddingBottom: 32,
                    }}
                >
                    <View style={{ padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder={t("calendar.appointment.selectStudent")}
                            placeholderTextColor={theme.colors.text.muted}
                            style={{
                                backgroundColor: theme.colors.surfaceSoft,
                                borderRadius: theme.radius.md,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                padding: theme.spacing.md,
                                color: theme.colors.text.primary,
                                fontSize: theme.fontSize.md,
                            }}
                        />
                    </View>

                    {filteredStudents.length === 0 ? (
                        <View style={{ padding: theme.spacing.lg, alignItems: "center" }}>
                            <Text style={{ color: theme.colors.text.muted }}>{t("calendar.appointment.noStudents")}</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredStudents}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const name = item.name ?? item.fullName ?? "—";
                                return (
                                    <Pressable
                                        onPress={() => {
                                            setSelectedStudentId(item.id);
                                            setSelectedStudentName(name);
                                            setShowStudentPicker(false);
                                        }}
                                        style={({ pressed }) => ({
                                            padding: theme.spacing.md,
                                            paddingHorizontal: theme.spacing.lg,
                                            borderBottomWidth: 1,
                                            borderBottomColor: theme.colors.border,
                                            backgroundColor: pressed ? theme.colors.surfaceSoft : "transparent",
                                        })}
                                    >
                                        <Text style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.md, fontWeight: "700" }}>
                                            {name}
                                        </Text>
                                    </Pressable>
                                );
                            }}
                        />
                    )}
                </View>
            </Modal>
        </Modal>
    );
}

function LegendDot({ label, color, theme }: { label: string; color: string; theme: ThemeUI }) {
    return (
        <View style={base.legendItem}>
            <View style={[base.dot, { backgroundColor: color }]} />
            <Text style={{ color: theme.colors.text.secondary, fontSize: theme.fontSize.sm }}>{label}</Text>
        </View>
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

    row: {
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    rowTitle: { fontSize: 15, fontWeight: "900" },
    rowSub: { marginTop: 4, fontSize: 12, fontWeight: "700" },

    badge: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0 },

    center: { alignItems: "center", justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "900" },
    sub: { fontSize: 13, fontWeight: "700" },
});

const ui = StyleSheet.create({
    statsRow3: { flexDirection: "row", gap: 10 },
    statCard: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
    },

    dayCellSquare: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 4,
        position: "relative",
    },

    dotsWrap: {
        position: "absolute",
        bottom: 6,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
    },

    dotMini: {
        width: 6,
        height: 6,
        borderRadius: 6,
    },

    listHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    fab: {
        position: "absolute",
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
});

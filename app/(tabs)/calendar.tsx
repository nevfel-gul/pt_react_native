// app/calendar.tsx
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { auth } from "@/services/firebase";
import { recordsColRef, studentsColRef } from "@/services/firestorePaths";
import { useFocusEffect } from "expo-router";
import { onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
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

function formatHumanDiff(daysToDue: number, status: DueItem["status"]) {
    if (status === "never") return "Kayıt eklenmemiş";
    if (daysToDue === 0) return "Bugün gelmeli";
    if (daysToDue > 0) return `${daysToDue} gün gecikti`;
    return `${Math.abs(daysToDue)} gün kaldı`;
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
}: {
    theme: ThemeUI;
    label: string;
    value: number;
    bg: string;
    fg: string;
}) {
    return (
        <View style={[ui.statCard, { backgroundColor: bg, borderColor: theme.colors.border }]}>
            <Text style={{ color: fg, fontWeight: "900", fontSize: theme.fontSize.title }}>{value}</Text>
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
        </View>
    );
}

/* -------------------- SCREEN -------------------- */
export default function CalendarFollowUpScreen() {
    const { theme } = useTheme();
    const uid = auth.currentUser?.uid;

    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [records, setRecords] = useState<RecordDoc[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>(ymd(new Date()));

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

        return () => {
            unsubStudents();
            unsubRecords();
        };
    }, [uid]);

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
            const name = s.name ?? s.fullName ?? "İsimsiz Öğrenci";
            const last = lastByStudent.get(s.id) ?? null;

            if (!last) {
                // ✅ kayıt yok ama listede görünecek
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
    }, [students, records]);

    const stats = useMemo(() => {
        // ✅ 3 kart: overdue / dueSoon / ok
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

    const dayBuckets = useMemo(() => {
        const buckets = new Map<string, DayBucket>();

        for (const item of dueItems) {
            // ✅ “never” takvimde işaretlemesin (takvim kalabalık olmasın)
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

    const markedDates = useMemo(() => {
        return { [selectedDay]: { selected: true, selectedColor: theme.colors.accent } };
    }, [selectedDay, theme]);

    const selectedItems = useMemo(() => {
        // ✅ seçilen güne ait olanlar (never dahil)
        return dueItems.filter((x) => ymd(x.dueDate) === selectedDay);
    }, [dueItems, selectedDay]);

    if (!uid) {
        return (
            <SafeAreaView style={[base.safeArea, { backgroundColor: theme.colors.background }]}>
                <View style={[base.center, { padding: theme.spacing.lg }]}>
                    <Text style={[base.title, { color: theme.colors.text.primary }]}>Giriş gerekli</Text>
                    <Text style={[base.sub, { color: theme.colors.text.secondary }]}>
                        Takvimi görmek için giriş yapmalısın.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[base.safeArea, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
                showsVerticalScrollIndicator={false}
            >
                {/* HEADER */}
                <View style={[base.header, { paddingHorizontal: theme.spacing.lg }]}>
                    <Text style={[base.h1, { color: theme.colors.text.primary }]}>Takip Takvimi</Text>
                    <Text style={[base.h2, { color: theme.colors.text.secondary }]}>
                        Bir güne dokun → altta o günün listesi görünür.
                    </Text>
                </View>

                {/* 3 STAT */}
                <View style={[ui.statsRow3, { paddingHorizontal: theme.spacing.lg }]}>
                    <StatCard
                        theme={theme}
                        label="Gecikmiş"
                        value={stats.overdue}
                        bg={theme.colors.dangerSoft}
                        fg={theme.colors.danger}
                    />
                    <StatCard
                        theme={theme}
                        label="Yaklaşan"
                        value={stats.dueSoon}
                        bg={"rgba(245,158,11,0.15)"}
                        fg={theme.colors.warning}
                    />
                    <StatCard
                        theme={theme}
                        label="Normal"
                        value={stats.ok}
                        bg={theme.colors.successSoft}
                        fg={theme.colors.success}
                    />
                </View>

                {/* CALENDAR (✅ biraz kısaltıldı) */}
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
                                    Yükleniyor...
                                </Text>
                            </View>
                        ) : (
                            <Calendar
                                key={calKey} // ✅ focus olunca remount (beyaz kalma bug'ı)
                                style={{ backgroundColor: theme.colors.surface }} // ✅ dış container beyazını ezer
                                onDayPress={(day) => setSelectedDay(day.dateString)}
                                markedDates={markedDates}
                                theme={{
                                    backgroundColor: theme.colors.surface,
                                    calendarBackground: theme.colors.surface,
                                    textSectionTitleColor: theme.colors.text.muted,
                                    dayTextColor: theme.colors.text.primary,
                                    monthTextColor: theme.colors.text.primary,
                                    selectedDayBackgroundColor: theme.colors.accent,
                                    selectedDayTextColor: theme.colors.text.onAccent,
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

                                    const badgeBg =
                                        bucket?.maxSeverity === "overdue"
                                            ? theme.colors.danger
                                            : bucket?.maxSeverity === "dueSoon"
                                                ? theme.colors.warning
                                                : theme.colors.success;

                                    const textColor = isDisabled
                                        ? theme.colors.text.muted
                                        : isSelected
                                            ? theme.colors.text.onAccent
                                            : theme.colors.text.primary;

                                    const cellBg = isSelected ? theme.colors.accent : "transparent";

                                    return (
                                        <Pressable
                                            onPress={() => key && setSelectedDay(key)}
                                            hitSlop={12} // ✅ rahat tıklansın
                                            style={[
                                                ui.dayCellCompact,
                                                {
                                                    backgroundColor: cellBg,
                                                    borderRadius: theme.radius.md,
                                                },
                                            ]}
                                        >
                                            <Text style={{ color: textColor, fontWeight: "900", fontSize: 14 }}>{day}</Text>

                                            {bucket?.total ? (
                                                <View
                                                    style={[
                                                        ui.countBadgeCompact,
                                                        { backgroundColor: isSelected ? theme.colors.text.onAccent : badgeBg },
                                                    ]}
                                                >
                                                    <Text
                                                        style={{
                                                            color: isSelected ? theme.colors.accent : theme.colors.text.onAccent,
                                                            fontSize: 10,
                                                            fontWeight: "900",
                                                        }}
                                                    >
                                                        {bucket.total}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View style={{ height: 16 }} />
                                            )}
                                        </Pressable>
                                    );
                                }}
                            />
                        )}
                    </View>

                    {/* Legend */}
                    <View style={[base.legendRow, { marginTop: theme.spacing.md }]}>
                        <LegendDot label="Gecikmiş" color={theme.colors.danger} theme={theme} />
                        <LegendDot label="Yaklaşıyor (≤7g)" color={theme.colors.warning} theme={theme} />
                        <LegendDot label="Normal" color={theme.colors.success} theme={theme} />
                    </View>
                </View>

                {/* LIST */}
                <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
                    <View style={ui.listHeaderRow}>
                        <Text style={[base.sectionTitle, { color: theme.colors.text.primary }]}>
                            {selectedDay} • Liste
                        </Text>

                        <Text style={{ color: theme.colors.text.secondary, fontWeight: "800" }}>
                            {selectedItems.length} kişi
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
                            <Text style={{ color: theme.colors.text.secondary }}>
                                Seçtiğin gün için planlı kayıt yok.
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {selectedItems.map((item) => {
                                const badge =
                                    item.status === "overdue"
                                        ? { text: "GECİKTİ", bg: theme.colors.dangerSoft, fg: theme.colors.danger }
                                        : item.status === "dueSoon"
                                            ? { text: "YAKLAŞTI", bg: "rgba(245,158,11,0.15)", fg: theme.colors.warning }
                                            : item.status === "never"
                                                ? { text: "KAYIT YOK", bg: theme.colors.surfaceSoft, fg: theme.colors.text.muted }
                                                : { text: "OK", bg: theme.colors.successSoft, fg: theme.colors.success };

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
                                                Son kayıt: {item.lastRecordAt ? ymd(item.lastRecordAt) : "—"}
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
        </SafeAreaView>
    );
}

function LegendDot({
    label,
    color,
    theme,
}: {
    label: string;
    color: string;
    theme: ThemeUI;
}) {
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
        borderWidth: 1,
        borderRadius: 16,
    },

    // ✅ takvim biraz kısaldı (height düşürüldü)
    dayCellCompact: {
        alignItems: "center",
        justifyContent: "center",
        height: 48,
        marginVertical: 3,
    },
    countBadgeCompact: {
        marginTop: 6,
        minWidth: 22,
        height: 16,
        paddingHorizontal: 7,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },

    listHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
});

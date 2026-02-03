import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { ChevronDown } from "lucide-react-native";
import { Animated, Easing } from "react-native";

import { auth } from "@/services/firebase";
import { recordsColRef, studentDocRef } from "@/services/firestorePaths";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";

import { ArrowLeft, Calendar, Edit, Eye, Mail, Phone, User } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

type Bool = boolean | null;

type Student = {
    id: string;

    name: string;
    email?: string;
    number?: string;
    boy?: string;
    dateOfBirth?: string; // YYYY-MM-DD
    gender?: string;
    aktif?: "Aktif" | "Pasif";
    assessmentDate?: string; // YYYY-MM-DD
    ptNote?: string;
    ptNoteUpdatedAt?: any;

    doctorSaidHeartOrHypertension?: Bool;
    doctorSaidHeartOrHypertensionNote?: string;

    chestPainDuringActivityOrDaily?: Bool;
    chestPainDuringActivityOrDailyNote?: string;

    dizzinessOrLostConsciousnessLast12Months?: Bool;
    dizzinessOrLostConsciousnessLast12MonthsNote?: string;

    diagnosedOtherChronicDisease?: Bool;
    diagnosedOtherChronicDiseaseNote?: string;

    usesMedicationForChronicDisease?: Bool;
    usesMedicationForChronicDiseaseNote?: string;

    boneJointSoftTissueProblemWorseWithActivity?: Bool;
    boneJointSoftTissueProblemWorseWithActivityNote?: string;

    doctorSaidOnlyUnderMedicalSupervision?: Bool;
    doctorSaidOnlyUnderMedicalSupervisionNote?: string;

    hadPainOrInjury?: Bool;
    hadPainOrInjuryNote?: string;

    hadSurgery?: Bool;
    hadSurgeryNote?: string;

    diagnosedChronicDiseaseByDoctor?: Bool;
    diagnosedChronicDiseaseByDoctorNote?: string;

    currentlyUsesMedications?: Bool;
    currentlyUsesMedicationsNote?: string;

    weeklyPhysicalActivity30MinOrLess?: Bool;
    weeklyPhysicalActivity30MinOrLessNote?: string;

    hasSportsHistoryOrCurrentlyDoingSport?: Bool;
    hasSportsHistoryOrCurrentlyDoingSportNote?: string;

    plannedDaysPerWeek?: number | null;
    jobDescription?: string;

    jobRequiresLongSitting?: Bool;
    jobRequiresRepetitiveMovement?: Bool;
    jobRequiresHighHeels?: Bool;
    jobCausesAnxiety?: Bool;

    trainingGoals?: string[];
    otherGoal?: string;
    followUpDays?: number;
    followUpDaysUpdatedAt?: any;

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


const formatDateTR = (iso?: string) => {
    if (!iso) return "-";
    const parts = iso.split("-").map((x) => Number(x));
    if (parts.length !== 3) return "-";
    const [y, m, d] = parts;
    if (!y || !m || !d) return "-";
    return new Date(y, m - 1, d).toLocaleDateString("tr-TR");
};

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
    const [range, setRange] = useState<"7g" | "30g" | "90g" | "all">("30g");

    const [ptNote, setPtNote] = useState("");
    const [savingPtNote, setSavingPtNote] = useState(false);
    const [ptNoteOpen, setPtNoteOpen] = useState(false);
    const [savingFollowUp, setSavingFollowUp] = useState(false);

    const parqQuestions = useMemo(
        () => [
            {
                key: "doctorSaidHeartOrHypertension" as const,
                noteKey: "doctorSaidHeartOrHypertensionNote" as const,
                labelKey: "parq.q1",
            },
            {
                key: "chestPainDuringActivityOrDaily" as const,
                noteKey: "chestPainDuringActivityOrDailyNote" as const,
                labelKey: "parq.q2",
            },
            {
                key: "dizzinessOrLostConsciousnessLast12Months" as const,
                noteKey: "dizzinessOrLostConsciousnessLast12MonthsNote" as const,
                labelKey: "parq.q3",
            },
            {
                key: "diagnosedOtherChronicDisease" as const,
                noteKey: "diagnosedOtherChronicDiseaseNote" as const,
                labelKey: "parq.q4",
            },
            {
                key: "usesMedicationForChronicDisease" as const,
                noteKey: "usesMedicationForChronicDiseaseNote" as const,
                labelKey: "parq.q5",
            },
            {
                key: "boneJointSoftTissueProblemWorseWithActivity" as const,
                noteKey: "boneJointSoftTissueProblemWorseWithActivityNote" as const,
                labelKey: "parq.q6",
            },
            {
                key: "doctorSaidOnlyUnderMedicalSupervision" as const,
                noteKey: "doctorSaidOnlyUnderMedicalSupervisionNote" as const,
                labelKey: "parq.q7",
            },
        ],
        []
    );

    const personalQuestions = useMemo(
        () => [
            { key: "hadPainOrInjury" as const, noteKey: "hadPainOrInjuryNote" as const, labelKey: "personal.q1" },
            { key: "hadSurgery" as const, noteKey: "hadSurgeryNote" as const, labelKey: "personal.q2" },
            {
                key: "diagnosedChronicDiseaseByDoctor" as const,
                noteKey: "diagnosedChronicDiseaseByDoctorNote" as const,
                labelKey: "personal.q3",
            },
            { key: "currentlyUsesMedications" as const, noteKey: "currentlyUsesMedicationsNote" as const, labelKey: "personal.q4" },
            {
                key: "weeklyPhysicalActivity30MinOrLess" as const,
                noteKey: "weeklyPhysicalActivity30MinOrLessNote" as const,
                labelKey: "personal.q5",
            },
            {
                key: "hasSportsHistoryOrCurrentlyDoingSport" as const,
                noteKey: "hasSportsHistoryOrCurrentlyDoingSportNote" as const,
                labelKey: "personal.q6",
            },
            { key: "jobRequiresLongSitting" as const, labelKey: "personal.q7" },
            { key: "jobRequiresRepetitiveMovement" as const, labelKey: "personal.q8" },
            { key: "jobRequiresHighHeels" as const, labelKey: "personal.q9" },
            { key: "jobCausesAnxiety" as const, labelKey: "personal.q10" },
        ],
        []
    );

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            try {
                const ref = studentDocRef(auth.currentUser?.uid!, id);
                const snap = await getDoc(ref);

                if (!snap.exists()) {
                    setStudent(null);
                    return;
                }

                const d = snap.data() as any;

                setStudent({
                    id: snap.id,
                    ...d,
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
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const qy = query(recordsColRef(auth.currentUser?.uid!), where("studentId", "==", id), orderBy("createdAt", "desc"));

        const unsub = onSnapshot(
            qy,
            (snap) => {
                setRecords(
                    snap.docs.map((d) => ({
                        id: d.id,
                        ...(d.data() as any),
                    }))
                );
                setLoadingRecords(false);
            },
            (err) => {
                console.error(err);
                setLoadingRecords(false);
            }
        );

        return () => unsub();
    }, [id]);

    const goBack = () => router.replace("/(tabs)");

    const toggleAktif = async () => {
        if (!student) return;

        try {
            setToggling(true);
            const newStatus = student.aktif === "Aktif" ? "Pasif" : "Aktif";
            await updateDoc(studentDocRef(auth.currentUser?.uid!, student.id), { aktif: newStatus });
            setStudent({ ...student, aktif: newStatus });
        } catch (err) {
            console.error(err);
        } finally {
            setToggling(false);
        }
    };

    const savePtNote = async () => {
        if (!student) return;

        try {
            setSavingPtNote(true);

            await updateDoc(studentDocRef(auth.currentUser?.uid!, student.id), {
                ptNote: ptNote.trim(),
                ptNoteUpdatedAt: serverTimestamp(),
            });

            Alert.alert(t("common.success"), t("studentDetail.ptNote.saved"));
        } catch (err) {
            console.error("ptNote save error:", err);
            Alert.alert(t("common.error"), t("studentDetail.ptNote.saveError"));
        } finally {
            setSavingPtNote(false);
        }
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
            console.error("followUpDays save error:", err);
            Alert.alert(t("common.error"), t("studentDetail.followUp.saveError"));
        } finally {
            setSavingFollowUp(false);
        }
    };

    const addRecord = () => {
        if (!student) return;
        router.push({ pathname: "/newrecord/[id]", params: { id: student.id } });
    };

    const viewRecord = (recordId: string) => router.push({ pathname: "/record/[id]", params: { id: recordId } });

    // ✅ EDIT artık newstudent ekranında
    const goEdit = () => {
        if (!student) return;
        router.push({ pathname: "/newstudent", params: { id: student.id, mode: "edit" } });
    };

    const firstLetter = student?.name?.[0]?.toUpperCase() ?? "?";

    const onTogglePtNote = useCallback(() => {
        setPtNoteOpen((prev) => {
            const next = !prev;

            if (next) {
                setTimeout(() => {
                    listRef.current?.scrollToEnd({ animated: true });
                }, 50);
            }

            return next;
        });
    }, []);

    const onFocusPtNote = useCallback(() => {
        setPtNoteOpen(true);
        setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
        }, 250);
    }, []);

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
                            <View style={styles.header}>
                                <View style={styles.headerTopRow}>
                                    <TouchableOpacity style={styles.backButton} onPress={goBack}>
                                        <ArrowLeft size={18} color={theme.colors.text.primary} />
                                        <Text style={styles.backButtonText}>{t("studentDetail.back")}</Text>
                                    </TouchableOpacity>

                                    {/* ✅ EDIT BLOĞU sadeleşti */}
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
                                            <Text style={student.aktif === "Aktif" ? styles.statusActiveText : styles.statusPassiveText}>
                                                {student.aktif === "Aktif" ? t("studentDetail.student.active") : t("studentDetail.student.passive")}
                                            </Text>
                                        </TouchableOpacity>

                                        <View style={styles.metaLine}>
                                            <Calendar size={14} color={theme.colors.text.muted} />
                                            <Text style={styles.metaText}>
                                                {t("studentDetail.student.assessmentDate")} {formatDateTR(student.assessmentDate)}
                                            </Text>
                                        </View>

                                        <View style={styles.followUpWrap}>
                                            <Text style={styles.followUpLabel}>{t("studentDetail.followUp.label")}</Text>

                                            <View style={styles.followUpPillsRow}>
                                                {[7, 20, 30].map((d) => {
                                                    const active = (student.followUpDays ?? 30) === d;

                                                    return (
                                                        <TouchableOpacity
                                                            key={d}
                                                            activeOpacity={0.85}
                                                            disabled={savingFollowUp}
                                                            onPress={() => setFollowUpDays(d)}
                                                            style={[styles.followUpPill, active && styles.followUpPillActive, savingFollowUp && { opacity: 0.7 }]}
                                                        >
                                                            <Text style={[styles.followUpPillText, active && styles.followUpPillTextActive]}>
                                                                {d === 7 ? t("studentDetail.followUp.week1") : t("studentDetail.followUp.days", { count: d })}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}

                                                {savingFollowUp && <Text style={styles.followUpSavingText}>{t("studentDetail.followUp.saving")}</Text>}
                                            </View>

                                            <Text style={styles.followUpHint}>{t("studentDetail.followUp.hint")}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* PERSONAL INFO (view-only) */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{t("studentDetail.section.personalInfo")}</Text>

                                <>
                                    <InfoRow
                                        styles={styles}
                                        label={t("studentDetail.label.email")}
                                        value={student.email || "-"}
                                        icon={<Mail size={16} color={theme.colors.primary} />}
                                    />
                                    <InfoRow
                                        styles={styles}
                                        label={t("studentDetail.label.phone")}
                                        value={student.number || "-"}
                                        icon={<Phone size={16} color={theme.colors.primary} />}
                                    />
                                    <InfoRow
                                        styles={styles}
                                        label={t("studentDetail.label.gender")}
                                        value={student.gender || "-"}
                                        icon={<User size={16} color={theme.colors.primary} />}
                                    />
                                    <InfoRow
                                        styles={styles}
                                        label={t("studentDetail.label.birthDate")}
                                        value={formatDateTR(student.dateOfBirth)}
                                        icon={<Calendar size={16} color={theme.colors.primary} />}
                                    />
                                    <InfoRow
                                        styles={styles}
                                        label={t("studentDetail.label.height")}
                                        value={student.boy || "-"}
                                        icon={<User size={16} color={theme.colors.primary} />}
                                    />
                                </>
                            </View>
                            <AnalyticsCard theme={theme} styles={styles} records={records} range={range} setRange={setRange} open={analyticsOpen} setOpen={setAnalyticsOpen} />
                            <TestsCard theme={theme} styles={styles} records={records} open={testsOpen} setOpen={setTestsOpen} />

                            {/* PARQ (view-only) */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{t("studentDetail.section.parq")}</Text>

                                {parqQuestions.map((q, idx) => {
                                    const answer = (student as any)[q.key] as Bool;
                                    const note = q.noteKey ? ((student as any)[q.noteKey] as string) : "";
                                    return (
                                        <QAItem
                                            key={q.key}
                                            styles={styles}
                                            index={idx + 1}
                                            question={t(q.labelKey)}
                                            answer={answer}
                                            note={note}
                                        />
                                    );
                                })}
                            </View>

                            {/* PERSONAL DETAILS (view-only) */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{t("studentDetail.section.personalDetails")}</Text>

                                {personalQuestions.map((q, idx) => {
                                    const answer = (student as any)[q.key] as Bool;
                                    const note = (q as any).noteKey ? ((student as any)[(q as any).noteKey] as string) : "";
                                    return (
                                        <QAItem
                                            key={q.key}
                                            styles={styles}
                                            index={idx + 1}
                                            question={t((q as any).labelKey)}
                                            answer={answer}
                                            note={note}
                                        />
                                    );
                                })}

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
                                            student.trainingGoals.map((g) => <Chip key={g} styles={styles} label={g} />)
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

                            {/* PT NOTE (aynı) */}
                            <View style={styles.card}>
                                <TouchableOpacity activeOpacity={0.85} onPress={onTogglePtNote}>
                                    <Text style={styles.cardTitle}>{t("studentDetail.section.ptNote")}</Text>

                                    {!ptNoteOpen ? (
                                        <Text style={styles.ptNoteHint}>
                                            {ptNote?.trim()
                                                ? ptNote.trim().slice(0, 80) + (ptNote.trim().length > 80 ? "…" : "")
                                                : t("studentDetail.ptNote.hint")}
                                        </Text>
                                    ) : (
                                        <Text style={styles.ptNoteHint}>{t("studentDetail.ptNote.hint")}</Text>
                                    )}
                                </TouchableOpacity>

                                {ptNoteOpen && (
                                    <View style={{ marginTop: 10 }}>
                                        <TextInput
                                            value={ptNote}
                                            onChangeText={setPtNote}
                                            placeholder={t("studentDetail.ptNote.placeholder")}
                                            placeholderTextColor={theme.colors.text.muted}
                                            multiline
                                            textAlignVertical="top"
                                            style={styles.ptNoteInput}
                                            onFocus={onFocusPtNote}
                                        />

                                        <TouchableOpacity
                                            style={[styles.ptNoteSaveBtn, savingPtNote && { opacity: 0.6 }]}
                                            onPress={savePtNote}
                                            disabled={savingPtNote}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.ptNoteSaveText}>{savingPtNote ? t("common.saving") : t("common.save")}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.recordsTitle}>{t("studentDetail.section.records")}</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const dateStr = item.createdAt?.toDate
                            ? `${item.createdAt.toDate().toLocaleDateString("tr-TR")} • ${item.createdAt.toDate().toLocaleTimeString("tr-TR")}`
                            : "-";

                        return (
                            <TouchableOpacity style={styles.recordCard} onPress={() => viewRecord(item.id)}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.recordDate}>{dateStr}</Text>
                                    <Text style={styles.recordNote}>{item.note || t("studentDetail.records.noNote")}</Text>
                                </View>
                                <Eye size={18} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        !loadingRecords ? (
                            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                                <View style={styles.card}>
                                    <Text style={styles.emptyText}>{t("studentDetail.records.empty")}</Text>
                                </View>
                            </View>
                        ) : null
                    }
                    ListFooterComponent={<View style={{ height: 40 }} />}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}


/* ----------------- UI PIECES ----------------- */

function InfoRow({
    styles,
    icon,
    label,
    value,
}: {
    styles: ReturnType<typeof makeStyles>;
    icon?: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
                {icon}
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

function QAItem({
    styles,
    index,
    question,
    answer,
    note,
}: {
    styles: ReturnType<typeof makeStyles>;
    index: number;
    question: string;
    answer: Bool;
    note?: string;
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
        <View style={styles.qaItem}>
            <View style={styles.qaTop}>
                <Text style={styles.qaQuestion}>
                    {index}. {question}
                </Text>

                <View
                    style={[
                        styles.badge,
                        isYes ? styles.badgeYes : answer === false ? styles.badgeNo : styles.badgeNA,
                    ]}
                >
                    <Text
                        style={[
                            styles.badgeText,
                            isYes ? styles.badgeTextYes : answer === false ? styles.badgeTextNo : styles.badgeTextNA,
                        ]}
                    >
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
type RangeKey = "7g" | "30g" | "90g" | "all";

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

function isoKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function windowFor(range: RangeKey) {
    const end = startOfDay(new Date());
    const days =
        range === "7g" ? 7 : range === "30g" ? 30 : range === "90g" ? 90 : 14;
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    return { start, days };
}

function normalize(arr: number[]) {
    const max = Math.max(1, ...arr);
    return arr.map((x) => x / max);
}

function makeLabels(days: number, start: Date) {
    const out: string[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (days <= 7) out.push(d.toLocaleDateString("tr-TR", { weekday: "short" }));
        else out.push(i % 7 === 0 ? String(d.getDate()) : "");
    }
    return out;
}

/* ---------- Collapsible shell ---------- */
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

    const height = h.interpolate({ inputRange: [0, 1], outputRange: [0, 520] });
    const rotate = r.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

    return (
        <View style={styles.card}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setOpen(!open)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
                <Text style={styles.cardTitle}>{title}</Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <ChevronDown size={18} color={theme.colors.text.muted} />
                </Animated.View>
            </TouchableOpacity>

            <Animated.View style={{ height, overflow: "hidden" }}>
                <View style={{ paddingTop: theme.spacing.xs }}>{children}</View>
            </Animated.View>
        </View>
    );
}

/* ---------- Small KPI ---------- */
function KPI({
    theme,
    label,
    value,
}: {
    theme: ThemeUI;
    label: string;
    value: string;
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
            }}
        >
            <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs, fontWeight: "800" }}>
                {label}
            </Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.lg, fontWeight: "900", marginTop: 4 }}>
                {value}
            </Text>
        </View>
    );
}

/* ---------- Bars (daily measurement counts) ---------- */
function DailyBarsPro({
    theme,
    ratios,
    counts,
    labels,
}: {
    theme: ThemeUI;
    ratios: number[];
    counts: number[];
    labels: string[];
}) {
    const H = 150; // grafik alanı yüksekliği
    const animsRef = useRef<Animated.Value[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // ✅ garanti
    if (animsRef.current.length !== ratios.length) {
        animsRef.current = ratios.map((r) => new Animated.Value(Math.max(0, Math.min(1, r ?? 0))));
    }

    useEffect(() => {
        if (!ratios?.length) return;
        const runs = ratios.map((r, i) =>
            Animated.spring(animsRef.current[i], {
                toValue: Math.max(0, Math.min(1, r ?? 0)),
                speed: 18,
                bounciness: 6,
                useNativeDriver: false,
            })
        );
        Animated.stagger(10, runs).start();
    }, [ratios.join("|")]);

    if (!ratios?.length) {
        return (
            <Text style={{ marginTop: theme.spacing.sm, color: theme.colors.text.muted, fontSize: theme.fontSize.xs }}>
                Grafik için veri yok.
            </Text>
        );
    }

    // grid çizgileri (0%, 33%, 66%, 100%)
    const grid = [0, 1 / 3, 2 / 3, 1];

    const Tooltip = ({ i }: { i: number }) => {
        const c = counts?.[i] ?? 0;
        return (
            <View
                style={{
                    position: "absolute",
                    bottom: H + 18,
                    left: -18,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    ...(theme.shadow?.soft ?? {}),
                }}
            >
                <Text style={{ color: theme.colors.text.primary, fontSize: 12, fontWeight: "900" }}>
                    {c} kayıt
                </Text>
            </View>
        );
    };

    return (
        <View style={{ marginTop: theme.spacing.sm }}>
            {/* Grid + arka plan */}
            <View
                style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: theme.radius.lg,
                    paddingHorizontal: 10,
                    paddingVertical: 12,
                    overflow: "hidden",
                }}
            >
                {/* grid çizgileri */}
                <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
                    {grid.map((g, idx) => (
                        <View
                            key={idx}
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: 12 + (1 - g) * H,
                                height: 1,
                                backgroundColor: idx === 0 ? "transparent" : theme.colors.border,
                                opacity: idx === 3 ? 0.45 : 0.28,
                            }}
                        />
                    ))}
                </View>

                {/* bars */}
                <View style={{ flexDirection: "row", alignItems: "flex-end", height: H + 24 }}>
                    {ratios.map((_, i) => {
                        const h = animsRef.current[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: [6, H],
                        });

                        const isActive = activeIndex === i;

                        return (
                            <Pressable
                                key={i}
                                onPress={() => setActiveIndex((cur) => (cur === i ? null : i))}
                                style={{
                                    flex: 1,
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    height: H + 24,
                                    position: "relative",
                                }}
                            >
                                {isActive ? <Tooltip i={i} /> : null}

                                {/* bar container */}
                                <View
                                    style={{
                                        width: 12,
                                        height: H,
                                        borderRadius: 999,
                                        backgroundColor: "rgba(148,163,184,0.10)",
                                        overflow: "hidden",
                                        justifyContent: "flex-end",
                                    }}
                                >
                                    <Animated.View
                                        style={{
                                            height: h,
                                            borderRadius: 999,
                                            backgroundColor: isActive ? theme.colors.accent : theme.colors.primary,
                                            opacity: isActive ? 1 : 0.9,
                                        }}
                                    />
                                </View>

                                {/* label */}
                                <Text
                                    style={{
                                        marginTop: 8,
                                        fontSize: theme.fontSize.xs,
                                        color: isActive ? theme.colors.text.primary : theme.colors.text.muted,
                                        fontWeight: isActive ? "900" : "700",
                                        minHeight: 14,
                                    }}
                                >
                                    {labels?.[i] ?? ""}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* küçük legend */}
                <Text style={{ marginTop: 6, color: theme.colors.text.muted, fontSize: theme.fontSize.xs }}>
                    Dokun: Günlük kayıt sayısını gör
                </Text>
            </View>
        </View>
    );
}



/* ---------- Analytics Card (Tanita+Mezura) ---------- */
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
    const { start, days } = windowFor(range);

    const summary = useMemo(() => {
        // daily counts
        const map: Record<string, number> = {};
        for (let i = 0; i < days; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            map[isoKey(d)] = 0;
        }

        const inRange: any[] = [];
        records.forEach((r) => {
            const dt = getRecordDate(r);
            if (!dt) return;
            const key = isoKey(startOfDay(dt));
            if (key in map) {
                map[key] += 1;
                inRange.push(r);
            }
        });

        const counts = Object.keys(map).sort().map((k) => map[k]);
        const bars = normalize(counts);
        const maxCount = Math.max(0, ...counts);
        const avgCount = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;

        const labels = makeLabels(days, start);

        // latest record
        const latest = records[0] ?? null;
        const weight = latest ? num(latest.weight) : null;
        const fat = latest ? num(latest.bodyFat) : null;
        const bel = latest ? num(latest.bel) : null;
        const kalca = latest ? num(latest.kalca) : null;

        return {
            inRangeCount: inRange.length,
            bars,
            counts,          // ✅ yeni
            maxCount,        // ✅ yeni
            avgCount,
            labels,
            latestKPIs: {
                weight: weight != null ? `${weight} kg` : "-",
                fat: fat != null ? `${fat} %` : "-",
                bel: bel != null ? `${bel} cm` : "-",
                kalca: kalca != null ? `${kalca} cm` : "-",
            },
            recent: records.slice(0, 4),
        };
    }, [records, range]);

    return (
        <CollapsibleCard
            theme={theme}
            styles={styles}
            title="Analitikler • Ölçümler"
            open={open}
            setOpen={setOpen}
        >
            {/* range pills */}
            <View style={{ flexDirection: "row", marginTop: theme.spacing.xs, flexWrap: "wrap", gap: 8 }}>
                {(["7g", "30g", "90g", "all"] as const).map((k) => {
                    const active = range === k;
                    return (
                        <TouchableOpacity
                            key={k}
                            activeOpacity={0.85}
                            onPress={() => setRange(k)}
                            style={[
                                {
                                    paddingHorizontal: theme.spacing.sm,
                                    paddingVertical: 6,
                                    borderRadius: theme.radius.pill,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.surfaceSoft,
                                },
                                active && { borderColor: theme.colors.accent, backgroundColor: "rgba(56,189,248,0.12)" },
                            ]}
                        >
                            <Text style={{ color: active ? theme.colors.accent : theme.colors.text.secondary, fontSize: theme.fontSize.xs, fontWeight: "900" }}>
                                {k}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* KPIs */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: theme.spacing.sm }}>
                <KPI theme={theme} label="Son Kilo" value={summary.latestKPIs.weight} />
                <KPI theme={theme} label="Son Yağ" value={summary.latestKPIs.fat} />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <KPI theme={theme} label="Bel" value={summary.latestKPIs.bel} />
                <KPI theme={theme} label="Kalça" value={summary.latestKPIs.kalca} />
            </View>

            <Text style={{ marginTop: theme.spacing.sm, color: theme.colors.text.muted, fontSize: theme.fontSize.xs }}>
                Seçili aralıkta toplam kayıt: <Text style={{ color: theme.colors.text.primary, fontWeight: "900" }}>{summary.inRangeCount}</Text>
            </Text>

            {/* bars */}
            <DailyBarsPro
                theme={theme}
                ratios={summary.bars}
                counts={summary.counts}
                labels={summary.labels}
            />

            {/* recent mini list */}
            <View style={{ marginTop: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: "900" }}>Son kayıtlar</Text>
                {summary.recent.length ? (
                    summary.recent.map((r: any) => {
                        const dt = getRecordDate(r);
                        const ds = dt ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}` : "-";
                        return (
                            <View key={r.id} style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                                <Text style={{ color: theme.colors.text.muted, fontSize: theme.fontSize.xs }}>{ds}</Text>
                                <Text style={{ color: theme.colors.text.primary, fontSize: theme.fontSize.sm }}>
                                    {r.note?.trim() ? r.note : "Not yok"}
                                </Text>
                            </View>
                        );
                    })
                ) : (
                    <Text style={{ marginTop: 6, color: theme.colors.text.muted }}>Kayıt yok</Text>
                )}
            </View>
        </CollapsibleCard>
    );
}

/* ---------- Tests Card (analysis fields) ---------- */
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
    const latest = records?.[0] ?? null;
    const a = latest?.analysis ?? {};

    return (
        <CollapsibleCard
            theme={theme}
            styles={styles}
            title="Analitikler • Test Sonuçları"
            open={open}
            setOpen={setOpen}
        >
            <View style={{ flexDirection: "row", gap: 10 }}>
                <KPI theme={theme} label="BMI" value={a?.bmi ? String(a.bmi) : "-"} />
                <KPI theme={theme} label="BMI Durum" value={a?.bmiStatus || "-"} />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <KPI theme={theme} label="VO₂max" value={a?.bruceVO2Max ? `${a.bruceVO2Max}` : "-"} />
                <KPI theme={theme} label="VO₂ Durum" value={a?.vo2Status || "-"} />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <KPI theme={theme} label="YMCA" value={a?.ymcaStatus || "-"} />
                <KPI theme={theme} label="Sit&Reach" value={a?.sitAndReachBest != null ? String(a.sitAndReachBest) : "-"} />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <KPI theme={theme} label="Push-up" value={a?.pushupStatus || "-"} />
                <KPI theme={theme} label="Plank" value={a?.plankStatus || "-"} />
            </View>

            <Text style={{ marginTop: theme.spacing.sm, color: theme.colors.text.muted, fontSize: theme.fontSize.xs }}>
                Not: Bu kart “son kaydın analysis alanlarını” gösteriyor.
            </Text>
        </CollapsibleCard>
    );
}

function Chip({ styles, label }: { styles: ReturnType<typeof makeStyles>; label: string }) {
    return (
        <View style={styles.chip}>
            <Text style={styles.chipText}>{label}</Text>
        </View>
    );
}
/* ----------------- STYLES ----------------- */
function makeStyles(theme: ThemeUI) {
    return StyleSheet.create({
        safeArea: { flex: 1, backgroundColor: theme.colors.background },
        container: { flex: 1, backgroundColor: theme.colors.background },

        center: { flex: 1, justifyContent: "center", alignItems: "center" },
        loadingText: { color: theme.colors.text.secondary, marginTop: theme.spacing.xs },
        errorText: { color: theme.colors.danger, marginBottom: theme.spacing.xs },

        /* HEADER */
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
        cancelButtonText: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.xs,
            fontWeight: "800",
        },
        saveButton: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accent,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginLeft: theme.spacing.xs,
        },
        saveButtonText: {
            color: theme.colors.text.onAccent,
            fontSize: theme.fontSize.xs,
            fontWeight: "900",
        },

        editRow: { marginTop: theme.spacing.sm },
        editLabel: {
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.sm,
            fontWeight: "700",
            marginBottom: 6,
        },
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

        toggleButton: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.pill,
        },
        toggleButtonActive: {
            backgroundColor: theme.colors.success,
            borderColor: theme.colors.success,
            borderWidth: 1,
            opacity: 0.9,
        },
        toggleButtonPassive: {
            backgroundColor: theme.colors.danger,
            borderColor: theme.colors.danger,
            borderWidth: 1,
            opacity: 0.9,
        },

        toggleButtonText: {
            fontSize: theme.fontSize.sm,
            fontWeight: "600",
            color: theme.colors.text.onAccent,
        },
        editQWrap: { marginTop: theme.spacing.sm },
        editQTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, fontWeight: "800" },

        editQButtons: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
        editQBtn: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceSoft,
        },
        editQBtnActive: {
            borderColor: theme.colors.accent,
            backgroundColor: "rgba(56,189,248,0.12)",
        },
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
        editButtonText: {
            color: theme.colors.text.onAccent,
            fontSize: theme.fontSize.xs,
            fontWeight: "700",
            marginLeft: theme.spacing.xs,
        },

        /* STUDENT HEADER CARD */
        studentRow: { flexDirection: "row", alignItems: "center", marginTop: theme.spacing.sm },
        avatar: {
            width: 58,
            height: 58,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginRight: theme.spacing.md,
        },
        avatarText: { color: theme.colors.text.onAccent, fontSize: 23, fontWeight: "800" },
        studentName: { color: theme.colors.text.primary, fontSize: theme.fontSize.lg + 3, fontWeight: "700" },

        statusBadge: {
            marginTop: theme.spacing.xs,
            paddingHorizontal: theme.spacing.sm - 4,
            paddingVertical: theme.spacing.xs - 2,
            borderRadius: theme.radius.pill,
            alignSelf: "flex-start",
        },
        statusActive: { backgroundColor: theme.colors.successSoft },
        statusPassive: { backgroundColor: theme.colors.dangerSoft },
        statusActiveText: { color: theme.colors.success, fontSize: theme.fontSize.xs, fontWeight: "700" },
        statusPassiveText: { color: theme.colors.danger, fontSize: theme.fontSize.xs, fontWeight: "700" },

        metaLine: { flexDirection: "row", alignItems: "center", marginTop: theme.spacing.xs },
        metaText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginLeft: theme.spacing.xs },

        /* CARDS */
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
        cardTitle: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.lg - 1,
            fontWeight: "700",
            marginBottom: theme.spacing.sm - 4,
        },
        subTitle: { color: theme.colors.text.primary, fontSize: theme.fontSize.md, fontWeight: "700" },
        mutedText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.md, marginTop: theme.spacing.xs },

        /* INFO ROW */
        infoRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: theme.spacing.sm - 2,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        infoLabelRow: { flexDirection: "row", alignItems: "center" },
        infoLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginLeft: theme.spacing.xs },
        infoValue: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.md - 1,
            maxWidth: "55%",
            textAlign: "right",
        },

        /* QA */
        qaItem: {
            paddingVertical: theme.spacing.sm - 2,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
        },
        qaTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
        qaQuestion: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.md - 1,
            fontWeight: "600",
            flex: 1,
            lineHeight: 18,
        },

        badge: {
            paddingHorizontal: theme.spacing.sm - 2,
            paddingVertical: theme.spacing.xs - 2,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            alignSelf: "flex-start",
            marginLeft: theme.spacing.md - 4,
        },
        badgeYes: { backgroundColor: theme.colors.successSoft, borderColor: "rgba(34,197,94,0.35)" },
        badgeNo: { backgroundColor: theme.colors.dangerSoft, borderColor: "rgba(248,113,113,0.35)" },
        badgeNA: { backgroundColor: "rgba(148,163,184,0.12)", borderColor: "rgba(148,163,184,0.25)" },
        badgeText: { fontSize: theme.fontSize.xs, fontWeight: "800" },
        badgeTextYes: { color: theme.colors.success },
        badgeTextNo: { color: theme.colors.danger },
        badgeTextNA: { color: theme.colors.text.secondary },

        noteBox: {
            marginTop: theme.spacing.sm,
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceSoft,
        },
        miniLabel: { color: theme.colors.text.secondary, fontSize: theme.fontSize.xs, marginBottom: 4 },
        noteText: { color: theme.colors.text.primary, fontSize: theme.fontSize.sm, lineHeight: 17 },

        chipWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: theme.spacing.sm - 2 },
        chip: {
            paddingHorizontal: theme.spacing.sm - 2,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceSoft,
            marginRight: theme.spacing.xs + 2,
            marginBottom: theme.spacing.xs + 2,
        },
        chipText: { color: theme.colors.text.primary, fontSize: theme.fontSize.xs, fontWeight: "600" },

        /* RECORDS */
        recordsTitle: {
            marginHorizontal: theme.spacing.md,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xs + 2,
            color: theme.colors.primary,
            fontSize: theme.fontSize.lg,
            fontWeight: "700",
        },
        recordCard: {
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.sm - 2,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        ptNoteHint: {
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.sm,
            marginBottom: theme.spacing.sm,
            lineHeight: 18,
        },

        ptNoteInput: {
            minHeight: 140,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceSoft,
            padding: theme.spacing.sm,
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.sm,
            lineHeight: 18,
        },

        ptNoteSaveBtn: {
            marginTop: theme.spacing.sm,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accent,
            paddingVertical: theme.spacing.sm,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.border,
        },

        ptNoteSaveText: {
            color: theme.colors.text.onAccent,
            fontSize: theme.fontSize.md,
            fontWeight: "800",
        },

        recordDate: { color: theme.colors.text.primary, fontSize: theme.fontSize.md - 1, fontWeight: "600" },
        recordNote: { color: theme.colors.text.secondary, fontSize: theme.fontSize.sm, marginTop: 2 },
        emptyText: { color: theme.colors.text.secondary, fontSize: theme.fontSize.md - 1 },

        /* ✅ ADDED (sadece yeni eklenenler) */
        listContent: {
            paddingBottom: 180,
        },
        ptNoteHeaderPress: {
            paddingVertical: 2,
        },
        ptNotePreview: {
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.sm,
            lineHeight: 18,
            marginTop: 2,
        },
        recordNotePress: {
            marginTop: 2,
        },
        listFooterSpace: {
            height: 40,
        },
        followUpWrap: {
            marginTop: theme.spacing.sm,
        },

        followUpLabel: {
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.sm,
            fontWeight: "700",
        },

        followUpPillsRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginTop: theme.spacing.xs,
        },

        followUpPill: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: theme.radius.pill,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceSoft,
        },

        followUpPillActive: {
            borderColor: theme.colors.accent,
            backgroundColor: "rgba(56,189,248,0.12)",
        },

        followUpPillText: {
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.xs,
            fontWeight: "800",
        },

        followUpPillTextActive: {
            color: theme.colors.accent,
        },

        followUpSavingText: {
            color: theme.colors.text.muted,
            fontSize: theme.fontSize.xs,
            fontWeight: "700",
            marginLeft: 4,
        },

        followUpHint: {
            marginTop: 6,
            color: theme.colors.text.muted,
            fontSize: theme.fontSize.xs,
            lineHeight: 16,
        },

    });
}


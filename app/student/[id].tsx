// app/student/[id].tsx

import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

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
};

type RecordItem = {
    id: string;
    studentId: string;
    createdAt?: any;
    status?: "Aktif" | "Pasif";
    note?: string;
};

const formatDateTR = (iso?: string) => {
    if (!iso) return "-";
    const parts = iso.split("-").map((x) => Number(x));
    if (parts.length !== 3) return "-";
    const [y, m, d] = parts;
    if (!y || !m || !d) return "-";
    return new Date(y, m - 1, d).toLocaleDateString("tr-TR");
};

const boolText = (v?: Bool) => {
    if (v === true) return "Evet";
    if (v === false) return "Hayır";
    return "-";
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

    const [ptNote, setPtNote] = useState("");
    const [savingPtNote, setSavingPtNote] = useState(false);
    const [ptNoteOpen, setPtNoteOpen] = useState(false);

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
        []
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

        const qy = query(
            recordsColRef(auth.currentUser?.uid!),
            where("studentId", "==", id),
            orderBy("createdAt", "desc")
        );

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

    const addRecord = () => {
        if (!student) return;
        router.push({ pathname: "/newrecord/[id]", params: { id: student.id } });
    };

    const viewRecord = (recordId: string) =>
        router.push({ pathname: "/record/[id]", params: { id: recordId } });

    const firstLetter = student?.name?.[0]?.toUpperCase() ?? "?";

    const onTogglePtNote = useCallback(() => {
        setPtNoteOpen((prev) => {
            const next = !prev;

            // ✅ sadece AÇILIRKEN en sona kaydır (input görünsün)
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
            // input ekranda kalsın diye sona doğru kaydır
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
                    contentContainerStyle={styles.listContent} // klavye açılınca yazı kaybolmasın diye ekstra boşluk
                    ListHeaderComponent={
                        <View>
                            {/* ✅ HEADER artık liste içinde: scroll ile yukarı gider (sabit kalmaz) */}
                            <View style={styles.header}>
                                <View style={styles.headerTopRow}>
                                    <TouchableOpacity style={styles.backButton} onPress={goBack}>
                                        <ArrowLeft size={18} color={theme.colors.text.primary} />
                                        <Text style={styles.backButtonText}>{t("studentDetail.back")}</Text>
                                    </TouchableOpacity>

                                    <View style={styles.headerActions}>
                                        <TouchableOpacity
                                            style={[
                                                styles.toggleButton,
                                                student.aktif === "Aktif" ? styles.toggleButtonPassive : styles.toggleButtonActive,
                                            ]}
                                            onPress={toggleAktif}
                                            disabled={toggling}
                                        >
                                            <Text style={styles.toggleButtonText}>
                                                {student.aktif === "Aktif"
                                                    ? t("studentDetail.toggle.makePassive")
                                                    : t("studentDetail.toggle.makeActive")}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.editButton} onPress={addRecord}>
                                            <Edit size={14} color={theme.colors.text.onAccent} />
                                            <Text style={styles.editButtonText}>{t("studentDetail.addRecord")}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.studentRow}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{firstLetter}</Text>
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.studentName}>{student.name}</Text>

                                        <View
                                            style={[
                                                styles.statusBadge,
                                                student.aktif === "Aktif" ? styles.statusActive : styles.statusPassive,
                                            ]}
                                        >
                                            <Text
                                                style={student.aktif === "Aktif" ? styles.statusActiveText : styles.statusPassiveText}
                                            >
                                                {student.aktif === "Aktif"
                                                    ? t("studentDetail.student.active")
                                                    : t("studentDetail.student.passive")}
                                            </Text>
                                        </View>

                                        <View style={styles.metaLine}>
                                            <Calendar size={14} color={theme.colors.text.muted} />
                                            <Text style={styles.metaText}>
                                                {t("studentDetail.student.assessmentDate")} {formatDateTR(student.assessmentDate)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Personal info */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{t("studentDetail.section.personalInfo")}</Text>

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
                            </View>

                            {/* PAR-Q */}
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

                            {/* Personal details */}
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

                            {/* ✅ PT NOTE artık kayıtların ÜSTÜNDE ve kapalı/açık */}
                            <View style={styles.card}>
                                <TouchableOpacity activeOpacity={0.85} onPress={onTogglePtNote}>
                                    <Text style={styles.cardTitle}>{t("studentDetail.section.ptNote")}</Text>

                                    {/* kapalıyken kısa preview */}
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
                                            <Text style={styles.ptNoteSaveText}>
                                                {savingPtNote ? t("common.saving") : t("common.save")}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.recordsTitle}>{t("studentDetail.section.records")}</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const dateStr =
                            item.createdAt?.toDate
                                ? `${item.createdAt.toDate().toLocaleDateString("tr-TR")} • ${item.createdAt
                                    .toDate()
                                    .toLocaleTimeString("tr-TR")}`
                                : "-";

                        return (
                            <TouchableOpacity style={styles.recordCard} onPress={() => viewRecord(item.id)}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.recordDate}>{dateStr}</Text>
                                    <Text style={styles.recordNote}>{item.note || "Not yok"}</Text>
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
                    // footer sadece boşluk (pt note artık üstte)
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
    const val = boolText(answer);
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
                    <Text style={styles.miniLabel}>Açıklama</Text>
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

        headerActions: { flexDirection: "row", marginLeft: theme.spacing.xs },

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
    });
}


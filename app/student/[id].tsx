// app/student/[id].tsx

import { themeui } from "@/constants/themeui";
import { recordsColRef, studentDocRef } from "@/services/firestorePaths";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    getDoc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where
} from "firebase/firestore";
import {
    ArrowLeft,
    Calendar,
    Edit,
    Eye,
    Mail,
    Phone,
    Power,
    User,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Bool = boolean | null;

type Student = {
    id: string;

    // Kişisel
    name: string;
    email?: string;
    number?: string;
    boy?: string;
    dateOfBirth?: string; // YYYY-MM-DD
    gender?: string;
    aktif?: "Aktif" | "Pasif";
    assessmentDate?: string; // YYYY-MM-DD

    // PAR-Q (7)
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

    // Kişisel Detaylar
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
    // iOS safe parse (YYYY-MM-DD)
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
    const { id } = useLocalSearchParams<{ id: string }>();

    const [student, setStudent] = useState<Student | null>(null);
    const [records, setRecords] = useState<RecordItem[]>([]);
    const [loadingStudent, setLoadingStudent] = useState(true);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [toggling, setToggling] = useState(false);

    // Question definitions (map ile temiz basacağız)
    const parqQuestions = useMemo(
        () => [
            {
                key: "doctorSaidHeartOrHypertension" as const,
                noteKey: "doctorSaidHeartOrHypertensionNote" as const,
                label:
                    "Doktorunuz kalp hastalığı veya yüksek tansiyon ile ilgili bir sorununuz olduğunu söyledi mi?",
            },
            {
                key: "chestPainDuringActivityOrDaily" as const,
                noteKey: "chestPainDuringActivityOrDailyNote" as const,
                label:
                    "Dinlenme sırasında, günlük aktiviteler sırasında ya da fiziksel aktivite sırasında göğsünüzde ağrı hisseder misiniz?",
            },
            {
                key: "dizzinessOrLostConsciousnessLast12Months" as const,
                noteKey: "dizzinessOrLostConsciousnessLast12MonthsNote" as const,
                label:
                    "Baş dönmesi nedeniyle dengeniz bozulur mu, ya da son 12 ay içerisinde bilincinizi yitirdiniz mi?",
            },
            {
                key: "diagnosedOtherChronicDisease" as const,
                noteKey: "diagnosedOtherChronicDiseaseNote" as const,
                label: "Kalp ve tansiyon dışında bir başka kronik hastalık teşhisi aldınız mı?",
            },
            {
                key: "usesMedicationForChronicDisease" as const,
                noteKey: "usesMedicationForChronicDiseaseNote" as const,
                label: "Kronik bir hastalık nedeniyle ilaç kullanıyor musunuz?",
            },
            {
                key: "boneJointSoftTissueProblemWorseWithActivity" as const,
                noteKey: "boneJointSoftTissueProblemWorseWithActivityNote" as const,
                label:
                    "Son 12 ay içerisinde fiziksel aktivite artışı ile kötüleşebilecek bir kemik, bağ, yumuşak doku probleminiz oldu mu?",
            },
            {
                key: "doctorSaidOnlyUnderMedicalSupervision" as const,
                noteKey: "doctorSaidOnlyUnderMedicalSupervisionNote" as const,
                label:
                    "Doktorunuz fiziksel aktivitenizi sadece tıbbi gözetim altında yapabileceğinizi söyledi mi?",
            },
        ],
        []
    );

    const personalQuestions = useMemo(
        () => [
            {
                key: "hadPainOrInjury" as const,
                noteKey: "hadPainOrInjuryNote" as const,
                label: "Hiç ağrı veya yaralanman oldu mu? (ayak bileği, diz, kalça, sırt, omuz vb)",
            },
            {
                key: "hadSurgery" as const,
                noteKey: "hadSurgeryNote" as const,
                label: "Hiç ameliyat geçirdin mi?",
            },
            {
                key: "diagnosedChronicDiseaseByDoctor" as const,
                noteKey: "diagnosedChronicDiseaseByDoctorNote" as const,
                label:
                    "Bir doktor tarafından kalp hastalığı, yüksek tansiyon, kolesterol, diyabet gibi kronik bir hastalık teşhisi kondu mu?",
            },
            {
                key: "currentlyUsesMedications" as const,
                noteKey: "currentlyUsesMedicationsNote" as const,
                label: "Halen almakta olduğun ilaçlar var mı?",
            },
            {
                key: "weeklyPhysicalActivity30MinOrLess" as const,
                noteKey: "weeklyPhysicalActivity30MinOrLessNote" as const,
                label: "Haftalık fiziksel aktivite süreniz 30 dakika veya daha az mı?",
            },
            {
                key: "hasSportsHistoryOrCurrentlyDoingSport" as const,
                noteKey: "hasSportsHistoryOrCurrentlyDoingSportNote" as const,
                label: "Herhangi bir spor geçmişiniz veya şu an devam ettiğiniz bir spor branşı var mı?",
            },
            { key: "jobRequiresLongSitting" as const, label: "Yaptığınız iş uzun süre oturmanızı gerektiriyor mu?" },
            { key: "jobRequiresRepetitiveMovement" as const, label: "Yaptığınız iş uzun süre tekrarlı hareket gerektiriyor mu?" },
            { key: "jobRequiresHighHeels" as const, label: "Yaptığınız iş topuklu ayakkabı giymenizi gerektiriyor mu?" },
            { key: "jobCausesAnxiety" as const, label: "Yaptığınız iş endişeye yol açıyor mu?" },
        ],
        []
    );

    // LOAD STUDENT
    useEffect(() => {
        if (!id) return;

        const load = async () => {
            try {
                const ref = studentDocRef(id);
                const snap = await getDoc(ref);

                if (!snap.exists()) {
                    setStudent(null);
                    return;
                }

                const d = snap.data() as any;
                setStudent({
                    id: snap.id,
                    ...d,
                    // fallbackler
                    aktif: d.aktif ?? "Aktif",
                    trainingGoals: Array.isArray(d.trainingGoals) ? d.trainingGoals : [],
                });
            } catch (err) {
                console.error(err);
                setStudent(null);
            } finally {
                setLoadingStudent(false);
            }
        };

        load();
    }, [id]);

    // LOAD RECORDS
    useEffect(() => {
        if (!id) return;

        const qy = query(recordsColRef(), where("studentId", "==", id), orderBy("createdAt", "desc"));


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

    const goBack = () => router.back();

    const toggleAktif = async () => {
        if (!student) return;

        try {
            setToggling(true);
            const newStatus = student.aktif === "Aktif" ? "Pasif" : "Aktif";
            await updateDoc(studentDocRef(student.id), { aktif: newStatus });
            setStudent({ ...student, aktif: newStatus });
        } catch (err) {
            console.error(err);
        } finally {
            setToggling(false);
        }
    };

    const addRecord = () => {
        if (!student) return;
        router.push({ pathname: "/newrecord/[id]", params: { id: student.id } });
    };

    const viewRecord = (recordId: string) =>
        router.push({ pathname: "/record/[id]", params: { id: recordId } });

    // LOADING / ERROR
    if (loadingStudent) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#60a5fa" />
                    <Text style={styles.loadingText}>Öğrenci yükleniyor...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!student) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>Öğrenci bulunamadı.</Text>

                    <TouchableOpacity style={styles.backButton} onPress={goBack}>
                        <ArrowLeft size={18} color="#f1f5f9" />
                        <Text style={styles.backButtonText}>Geri</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const firstLetter = student.name?.[0]?.toUpperCase() ?? "?";

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.backButton} onPress={goBack}>
                            <ArrowLeft size={18} color="#f1f5f9" />
                            <Text style={styles.backButtonText}>Geri</Text>
                        </TouchableOpacity>

                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.toggleButton}
                                onPress={toggleAktif}
                                disabled={toggling}
                            >
                                <Power size={14} color="#022c22" />
                                <Text style={styles.toggleButtonText}>
                                    {student.aktif === "Aktif" ? "Pasif Yap" : "Aktif Yap"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.editButton} onPress={addRecord}>
                                <Edit size={14} color="#f1f5f9" />
                                <Text style={styles.editButtonText}>Kayıt Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* STUDENT CARD */}
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
                                    style={
                                        student.aktif === "Aktif"
                                            ? styles.statusActiveText
                                            : styles.statusPassiveText
                                    }
                                >
                                    {student.aktif === "Aktif" ? "Aktif Öğrenci" : "Pasif Öğrenci"}
                                </Text>
                            </View>

                            <View style={styles.metaLine}>
                                <Calendar size={14} color="#94a3b8" />
                                <Text style={styles.metaText}>
                                    Değerlendirme: {formatDateTR(student.assessmentDate)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* CONTENT */}
                <FlatList
                    data={records}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ListHeaderComponent={
                        <View>
                            {/* Kişisel Bilgiler */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Kişisel Bilgiler</Text>

                                <InfoRow
                                    label="E-posta"
                                    value={student.email || "-"}
                                    icon={<Mail size={16} color="#60a5fa" />}
                                />
                                <InfoRow
                                    label="Telefon"
                                    value={student.number || "-"}
                                    icon={<Phone size={16} color="#60a5fa" />}
                                />
                                <InfoRow
                                    label="Cinsiyet"
                                    value={student.gender || "-"}
                                    icon={<User size={16} color="#60a5fa" />}
                                />
                                <InfoRow
                                    label="Doğum Tarihi"
                                    value={formatDateTR(student.dateOfBirth)}
                                    icon={<Calendar size={16} color="#60a5fa" />}
                                />
                                <InfoRow label="Boy (cm)" value={student.boy || "-"} icon={<User size={16} color="#60a5fa" />} />
                            </View>

                            {/* PAR-Q */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>PAR-Q Testi</Text>

                                {parqQuestions.map((q, idx) => {
                                    const answer = (student as any)[q.key] as Bool;
                                    const note = q.noteKey ? ((student as any)[q.noteKey] as string) : "";
                                    return (
                                        <QAItem
                                            key={q.key}
                                            index={idx + 1}
                                            question={q.label}
                                            answer={answer}
                                            note={note}
                                        />
                                    );
                                })}
                            </View>

                            {/* Kişisel Detaylar */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Kişisel Detaylar</Text>

                                {personalQuestions.map((q, idx) => {
                                    const answer = (student as any)[q.key] as Bool;
                                    const note = (q as any).noteKey ? ((student as any)[(q as any).noteKey] as string) : "";
                                    return (
                                        <QAItem
                                            key={q.key}
                                            index={idx + 1}
                                            question={q.label}
                                            answer={answer}
                                            note={note}
                                        />
                                    );
                                })}

                                <InfoRow
                                    label="Haftada kaç gün gelmeyi planlıyor?"
                                    value={student.plannedDaysPerWeek ? String(student.plannedDaysPerWeek) : "-"}
                                    icon={<Calendar size={16} color="#60a5fa" />}
                                />

                                <InfoRow
                                    label="Meslek"
                                    value={student.jobDescription || "-"}
                                    icon={<User size={16} color="#60a5fa" />}
                                />

                                <View style={{ marginTop: 12 }}>
                                    <Text style={styles.subTitle}>Antrenman Hedefleri</Text>

                                    <View style={styles.chipWrap}>
                                        {student.trainingGoals && student.trainingGoals.length ? (
                                            student.trainingGoals.map((g) => (
                                                <Chip key={g} label={g} />
                                            ))
                                        ) : (
                                            <Text style={styles.mutedText}>-</Text>
                                        )}
                                    </View>

                                    {!!student.otherGoal?.trim() && (
                                        <View style={{ marginTop: 10 }}>
                                            <Text style={styles.miniLabel}>Diğer</Text>
                                            <Text style={styles.noteText}>{student.otherGoal}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <Text style={styles.recordsTitle}>Kayıtlar</Text>
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
                            <TouchableOpacity
                                style={styles.recordCard}
                                onPress={() => viewRecord(item.id)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.recordDate}>{dateStr}</Text>
                                    <Text style={styles.recordNote}>{item.note || "Not yok"}</Text>
                                </View>
                                <Eye size={18} color="#f1f5f9" />
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        !loadingRecords ? (
                            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                                <View style={styles.card}>
                                    <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>
                                </View>
                            </View>
                        ) : null
                    }
                />
            </View>
        </SafeAreaView>
    );
}

/* ----------------- UI PIECES ----------------- */

function InfoRow({
    icon,
    label,
    value,
}: {
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
    index,
    question,
    answer,
    note,
}: {
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
                            isYes
                                ? styles.badgeTextYes
                                : answer === false
                                    ? styles.badgeTextNo
                                    : styles.badgeTextNA,
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

function Chip({ label }: { label: string }) {
    return (
        <View style={styles.chip}>
            <Text style={styles.chipText}>{label}</Text>
        </View>
    );
}

/* ----------------- STYLES ----------------- */
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: themeui.colors.background },
    container: { flex: 1, backgroundColor: themeui.colors.background },

    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { color: themeui.colors.text.secondary, marginTop: themeui.spacing.xs },
    errorText: { color: themeui.colors.danger, marginBottom: themeui.spacing.xs },

    /* HEADER */
    header: { paddingHorizontal: themeui.spacing.md, paddingTop: themeui.spacing.sm + 4, paddingBottom: themeui.spacing.xs },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: themeui.spacing.sm - 2,
    },

    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.xs,
        paddingHorizontal: themeui.spacing.sm,
        paddingVertical: themeui.spacing.xs,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.surface,
        borderWidth: 1,
        borderColor: themeui.colors.border,
    },
    backButtonText: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.sm },

    headerActions: { flexDirection: "row", gap: themeui.spacing.xs },

    toggleButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.xs,
        paddingHorizontal: themeui.spacing.sm - 2,
        paddingVertical: themeui.spacing.xs,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.success,
    },
    toggleButtonText: { color: "#022c22", fontSize: themeui.fontSize.xs, fontWeight: "700" },

    editButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.xs,
        paddingHorizontal: themeui.spacing.sm - 2,
        paddingVertical: themeui.spacing.xs,
        borderRadius: themeui.radius.pill,
        backgroundColor: "#1d4ed8",
    },
    editButtonText: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.xs, fontWeight: "700" },

    /* STUDENT HEADER CARD */
    studentRow: { flexDirection: "row", alignItems: "center", gap: themeui.spacing.md },
    avatar: {
        width: 58,
        height: 58,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { color: themeui.colors.surface, fontSize: 23, fontWeight: "800" },
    studentName: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.lg + 3, fontWeight: "700" },

    statusBadge: {
        marginTop: themeui.spacing.xs,
        paddingHorizontal: themeui.spacing.sm - 4,
        paddingVertical: themeui.spacing.xs - 2,
        borderRadius: themeui.radius.pill,
        alignSelf: "flex-start",
    },
    statusActive: { backgroundColor: themeui.colors.successSoft },
    statusPassive: { backgroundColor: themeui.colors.dangerSoft },
    statusActiveText: { color: themeui.colors.success, fontSize: themeui.fontSize.xs, fontWeight: "700" },
    statusPassiveText: { color: themeui.colors.danger, fontSize: themeui.fontSize.xs, fontWeight: "700" },

    metaLine: { flexDirection: "row", alignItems: "center", gap: themeui.spacing.xs, marginTop: themeui.spacing.xs },
    metaText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.sm },

    /* CARDS */
    card: {
        marginHorizontal: themeui.spacing.md,
        marginTop: themeui.spacing.sm,
        backgroundColor: themeui.colors.surface,
        borderRadius: themeui.radius.lg,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        padding: themeui.spacing.md,
        ...themeui.shadow.soft,
    },
    cardTitle: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.lg - 1,
        fontWeight: "700",
        marginBottom: themeui.spacing.sm - 4,
    },
    subTitle: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.md, fontWeight: "700" },
    mutedText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.md, marginTop: themeui.spacing.xs },

    /* INFO ROW */
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: themeui.spacing.sm - 2,
        borderBottomWidth: 1,
        borderBottomColor: themeui.colors.border,
    },
    infoLabelRow: { flexDirection: "row", alignItems: "center", gap: themeui.spacing.xs },
    infoLabel: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.sm },
    infoValue: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.md - 1, maxWidth: "55%", textAlign: "right" },

    /* QA */
    qaItem: {
        paddingVertical: themeui.spacing.sm - 2,
        borderBottomWidth: 1,
        borderBottomColor: themeui.colors.border,
    },
    qaTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: themeui.spacing.md - 4 },
    qaQuestion: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.md - 1, fontWeight: "600", flex: 1, lineHeight: 18 },

    badge: {
        paddingHorizontal: themeui.spacing.sm - 2,
        paddingVertical: themeui.spacing.xs - 2,
        borderRadius: themeui.radius.pill,
        borderWidth: 1,
        alignSelf: "flex-start",
    },
    badgeYes: { backgroundColor: themeui.colors.successSoft, borderColor: "rgba(34,197,94,0.35)" },
    badgeNo: { backgroundColor: themeui.colors.dangerSoft, borderColor: "rgba(248,113,113,0.35)" },
    badgeNA: { backgroundColor: "rgba(148,163,184,0.12)", borderColor: "rgba(148,163,184,0.25)" },
    badgeText: { fontSize: themeui.fontSize.xs, fontWeight: "800" },
    badgeTextYes: { color: themeui.colors.success },
    badgeTextNo: { color: themeui.colors.danger },
    badgeTextNA: { color: themeui.colors.text.secondary },

    noteBox: {
        marginTop: themeui.spacing.sm,
        padding: themeui.spacing.sm,
        borderRadius: themeui.radius.md,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        backgroundColor: themeui.colors.surfaceSoft,
    },
    miniLabel: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.xs, marginBottom: 4 },
    noteText: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.sm, lineHeight: 17 },

    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: themeui.spacing.xs + 2, marginTop: themeui.spacing.sm - 2 },
    chip: {
        paddingHorizontal: themeui.spacing.sm - 2,
        paddingVertical: themeui.spacing.xs,
        borderRadius: themeui.radius.pill,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        backgroundColor: "rgba(96,165,250,0.12)",
    },
    chipText: { color: "#bfdbfe", fontSize: themeui.fontSize.xs, fontWeight: "600" },

    /* RECORDS */
    recordsTitle: {
        marginHorizontal: themeui.spacing.md,
        marginTop: themeui.spacing.md,
        marginBottom: themeui.spacing.xs + 2,
        color: themeui.colors.primary,
        fontSize: themeui.fontSize.lg,
        fontWeight: "700",
    },
    recordCard: {
        marginHorizontal: themeui.spacing.md,
        marginBottom: themeui.spacing.sm - 2,
        backgroundColor: themeui.colors.surface,
        borderRadius: themeui.radius.md,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        paddingVertical: themeui.spacing.sm,
        paddingHorizontal: themeui.spacing.sm,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: themeui.spacing.sm - 2,
    },
    recordDate: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.md - 1, fontWeight: "600" },
    recordNote: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.sm, marginTop: 2 },
    emptyText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.md - 1 },
});

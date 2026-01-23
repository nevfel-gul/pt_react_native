// app/record/[id].tsx
import { themeui } from "@/constants/themeui";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowLeft,
    BicepsFlexed,
    Calendar,
    HandHeart,
    Mail,
    PersonStanding,
    Phone,
    SquareActivity,
    User,
    VenusAndMars
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth } from "@/services/firebase";
import { recordDocRef, studentDocRef } from "@/services/firestorePaths";
import { getDoc } from "firebase/firestore";

type Student = {
    id: string;
    name: string;
    email?: string;
    number?: string;
    boy?: string;
    dateOfBirth?: string;
    gender?: string;
    aktif?: "Aktif" | "Pasif";
};

type RecordType = {
    id: string;
    studentId: string;
    [key: string]: any;
};

export default function RecordDetailScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [record, setRecord] = useState<RecordType | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 🔹 Kayıt: /users/{uid}/records/{id}
                const recRef = recordDocRef(auth.currentUser?.uid!, id as string);
                const recSnap = await getDoc(recRef);

                if (!recSnap.exists()) {
                    setError(t("recordDetail.notFound"));
                    setRecord(null);
                    return;
                }

                const recData = recSnap.data() as any;
                const r: RecordType = {
                    id: recSnap.id,
                    studentId: recData.studentId,
                    ...recData,
                };
                setRecord(r);

                // 🔹 Öğrenci: /users/{uid}/students/{studentId}
                if (recData.studentId) {
                    const stuRef = studentDocRef(auth.currentUser?.uid!, recData.studentId);
                    const stuSnap = await getDoc(stuRef);
                    if (stuSnap.exists()) {
                        const s = stuSnap.data() as any;
                        setStudent({
                            id: stuSnap.id,
                            name: s.name ?? "",
                            email: s.email,
                            number: s.number,
                            boy: s.boy,
                            dateOfBirth: s.dateOfBirth,
                            gender: s.gender,
                            aktif: (s.aktif as "Aktif" | "Pasif") ?? "Aktif",
                        });
                    }
                }
            } catch (err: any) {
                console.error("Kayıt detay hata:", err);
                setError(err?.message ?? t("recordDetail.fetchError"));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleGoBack = () => {
        if (student) {
            router.push({ pathname: "/student/[id]", params: { id: student.id } });
        } else {
            router.back();
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.loadingText}>{t("recordDetail.loading")}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !record) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error || t("recordDetail.notFound")}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <ArrowLeft size={18} color="#e5e7eb" />
                        <Text style={styles.backButtonText}>{t("recordDetail.back")}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const firstLetter = student?.name?.[0]?.toUpperCase() ?? "?";

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                    {/* HEADER */}
                    <View style={styles.header}>
                        <View style={styles.headerTopRow}>
                            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                                <ArrowLeft size={18} color="#e5e7eb" />
                                <Text style={styles.backButtonText}>{t("recordDetail.back")}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Öğrenci özet */}
                        <View style={styles.studentRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{firstLetter}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.studentName}>{student?.name ?? "-"}</Text>
                                <Text style={styles.studentMeta}>
                                    {student?.boy ? `${student.boy} ${t("common.unit.cm")}` : ""}
                                </Text>
                                {student?.aktif && (
                                    <View style={styles.statusRow}>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                student.aktif === "Aktif"
                                                    ? styles.statusBadgeActive
                                                    : styles.statusBadgeInactive,
                                            ]}
                                        >
                                            <Text
                                                style={
                                                    student.aktif === "Aktif"
                                                        ? styles.statusTextActive
                                                        : styles.statusTextInactive
                                                }
                                            >
                                                {student.aktif === "Aktif"
                                                    ? t("recordDetail.student.active")
                                                    : t("recordDetail.student.passive")}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* KİŞİSEL BİLGİLER */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <User size={18} color="#60a5fa" />
                            {"  "}{t("recordDetail.section.personal")}
                        </Text>
                        <InfoRow
                            icon={<Mail size={16} color="#9ca3af" />}
                            label={t("recordDetail.label.email")}
                            value={student?.email || "-"}
                            firstLine={true}
                        />
                        <InfoRow
                            icon={<Phone size={16} color="#9ca3af" />}
                            label={t("recordDetail.label.phone")}
                            value={student?.number || "-"}
                        />
                        <InfoRow
                            icon={<Calendar size={16} color="#9ca3af" />}
                            label={t("recordDetail.label.dob")}
                            value={
                                student?.dateOfBirth
                                    ? new Date(student.dateOfBirth).toLocaleDateString("tr-TR")
                                    : "-"
                            }
                        />
                        <InfoRow
                            icon={<VenusAndMars size={16} color="#9ca3af" />}
                            label={t("recordDetail.label.gender")}
                            value={student?.gender || "-"}
                        />
                    </View>

                    {/* FİZİKSEL ÖLÇÜMLER / TANITA */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <HandHeart size={18} color="#60a5fa" />
                            {"  "}{t("recordDetail.section.tanita")}
                        </Text>

                        <InfoRow label={t("recordDetail.label.weight")} value={formatVal(record.weight, t("common.unit.kg"))} firstLine={true} />

                        <InfoRow label={t("recordDetail.label.bodyFat")} value={formatVal(record.bodyFat, t("common.unit.percent"))} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.bodyFatStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.label.bmi")} value={formatVal(record.bodyMassIndex)} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.bmiStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.label.bmr")} value={formatVal(record.basalMetabolism, t("common.unit.kcal"))} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.basalMetabolismStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.label.totalMuscle")} value={formatVal(record.totalMuscleMass, t("common.unit.kg"))} />

                        <InfoRow label={t("recordDetail.label.leanBodyMass")} value={formatVal(record.leanBodyMass, t("common.unit.kg"))} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.leanBodyMassStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.label.bodyWater")} value={formatVal(record.bodyWaterMass, t("common.unit.percent"))} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.bodyWaterMassStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.label.metabolicAge")} value={record.metabolicAge?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.metabolicAgeStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.label.impedance")} value={record.impedance?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.impedanceStatus || "-"}
                        </Text>

                        <InfoRow
                            label={t("recordDetail.label.waistHipRaw")}
                            value={
                                record.bel && record.kalca
                                    ? `Bel: ${record.bel} cm, Kalça: ${record.kalca} cm`
                                    : "-"
                            }
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.comment")} {record.analysis?.bellyHipRatioStatus || "-"}
                        </Text>
                    </View>

                    {/* ÇEVRE ÖLÇÜMLERİ */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t("recordDetail.section.tape")}</Text>
                        <InfoRow label={t("recordDetail.tape.neck")} value={formatVal(record.boyun, t("common.unit.cm"))} firstLine={true} />
                        <InfoRow label={t("recordDetail.tape.shoulder")} value={formatVal(record.omuz, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.chest")} value={formatVal(record.gogus, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.rightArm")} value={formatVal(record.sagKol, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.leftArm")} value={formatVal(record.solKol, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.waist")} value={formatVal(record.bel, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.hip")} value={formatVal(record.kalca, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.rightLeg")} value={formatVal(record.sagBacak, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.leftLeg")} value={formatVal(record.solBacak, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.rightCalf")} value={formatVal(record.sagKalf, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.leftCalf")} value={formatVal(record.solKalf, t("common.unit.cm"))} />
                        <InfoRow label={t("recordDetail.tape.note")} value={record.mezuraNote || "-"} multiline />
                    </View>

                    {/* AEROBİK TESTLER */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <SquareActivity size={18} color="#60a5fa" />
                            {"  "}{t("recordDetail.section.aerobic")}
                        </Text>

                        <InfoRow label={t("recordDetail.aerobic.restingHr")} value={record.dinlenikNabiz?.toString() ?? "-"} firstLine={true} />

                        <InfoRow label={t("recordDetail.aerobic.carvonen")} value={record.carvonenMultiplier?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.targetHr")}{" "}
                            {record.analysis?.carvonenTargetHR
                                ? `${record.analysis.carvonenTargetHR} ${t("common.unit.bpm")}`
                                : "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.aerobic.ymcaPulse")} value={record.toparlanmaNabzi?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.ymca")} {record.analysis?.ymcaStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.aerobic.bruceTime")} value={record.testSuresi?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.vo2")}{" "}
                            {record.analysis?.bruceVO2Max
                                ? `${record.analysis.bruceVO2Max} ${t("common.unit.vo2")}`
                                : "-"}{" "}
                            — {record.analysis?.vo2Status || "-"}
                        </Text>
                    </View>

                    {/* HAREKET & POSTÜR */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <PersonStanding size={18} color="#60a5fa" />
                            {"  "}{t("recordDetail.section.mobility")}
                        </Text>

                        <InfoRow label={t("recordDetail.posture.ankle.front")} value={record.ayakveayakbilegionden || "-"} multiline firstLine={true} />
                        <InfoRow label={t("recordDetail.posture.ankle.side")} value={record.ayakveayakbilegiyandan || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.ankle.back")} value={record.ayakveayakbilegiarkadan || "-"} multiline />

                        <InfoRow label={t("recordDetail.posture.knee.front")} value={record.dizonden || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.knee.side")} value={record.dizyandan || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.knee.back")} value={record.dizarkadan || "-"} multiline />

                        <InfoRow label={t("recordDetail.posture.lphk.front")} value={record.lphkonden || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.lphk.side")} value={record.lphkyandan || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.lphk.back")} value={record.lphkarkadan || "-"} multiline />

                        <InfoRow label={t("recordDetail.posture.shoulders.front")} value={record.omuzlaronden || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.shoulders.side")} value={record.omuzlaryandan || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.shoulders.back")} value={record.omuzlararkadan || "-"} multiline />

                        <InfoRow label={t("recordDetail.posture.headNeck.front")} value={record.basboyunonden || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.headNeck.side")} value={record.basboyunyandan || "-"} multiline />
                        <InfoRow label={t("recordDetail.posture.headNeck.back")} value={record.basboyunarkadan || "-"} multiline />

                        <InfoRow label={t("recordDetail.posture.pronation")} value={record.pronation || "-"} />
                        <InfoRow label={t("recordDetail.posture.lower")} value={record.lower || "-"} />
                        <InfoRow label={t("recordDetail.posture.upper")} value={record.upper || "-"} />
                    </View>

                    {/* OVERHEAD SQUAT + SIT & REACH */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t("recordDetail.section.ohs")}</Text>
                        <InfoRow label={t("recordDetail.ohs.footTurnsOut")} value={boolBadge(record.footTurnsOut)} firstLine={true} />
                        <InfoRow label={t("recordDetail.ohs.kneeMovesInward")} value={boolBadge(record.kneeMovesInward)} />
                        <InfoRow label={t("recordDetail.ohs.kneeMovesOutward")} value={boolBadge(record.kneeMovesOutward)} />
                        <InfoRow label={t("recordDetail.ohs.excessiveForwardLean")} value={boolBadge(record.excessiveForwardLean)} />
                        <InfoRow label={t("recordDetail.ohs.lowBackArches")} value={boolBadge(record.lowBackArches)} />
                        <InfoRow label={t("recordDetail.ohs.lowBackRound")} value={boolBadge(record.lowBackRound)} />
                        <InfoRow label={t("recordDetail.ohs.armsFallForward")} value={boolBadge(record.armsFallForward)} />
                        <InfoRow label={t("recordDetail.ohs.notes")} value={record.overheadsquatnotes || "-"} multiline />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t("recordDetail.section.sitReach")}</Text>

                        <InfoRow label={t("recordDetail.sitReach.value1")} value={formatVal(record.sitandreach1)} firstLine={true} />
                        <InfoRow label={t("recordDetail.sitReach.value2")} value={formatVal(record.sitandreach2)} />
                        <InfoRow label={t("recordDetail.sitReach.value3")} value={formatVal(record.sitandreach3)} />
                        <InfoRow label={t("recordDetail.sitReach.tightness")} value={record.sitandreachnotes || "-"} multiline />
                        <Text
                            style={[
                                styles.analysisText,
                                { borderTopColor: "#0f172a", borderTopWidth: 1, paddingVertical: 6 }
                            ]}
                        >
                            {t("recordDetail.analysis.bestValue")}{" "}
                            {record.analysis?.sitAndReachBest != null
                                ? `${record.analysis.sitAndReachBest} ${t("common.unit.cm")}`
                                : "-"}
                            {"  "} |  {t("recordDetail.analysis.status")} {record.analysis?.sitAndReachStatus || "-"}
                        </Text>
                    </View>

                    {/* KUVVET TESTLERİ */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <BicepsFlexed size={18} color="#60a5fa" />
                            {"  "}{t("recordDetail.section.strength")}
                        </Text>

                        <InfoRow label={t("recordDetail.strength.pushup")} value={record.pushup?.toString() ?? "-"} firstLine={true} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.pushupScore")} {record.analysis?.pushupStatus || "-"}
                        </Text>

                        <InfoRow
                            label={t("recordDetail.strength.modifiedPushup")}
                            value={
                                typeof record.modifiedpushup === "string"
                                    ? record.modifiedpushup
                                    : record.modifiedpushup === true
                                        ? "Evet"
                                        : record.modifiedpushup === false
                                            ? "Hayır"
                                            : "-"
                            }
                        />

                        <InfoRow label={t("recordDetail.strength.wallSit")} value={record.wallsit?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.wallSitScore")} {record.analysis?.wallSitStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.strength.plank")} value={record.plank?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.plankScore")} {record.analysis?.plankStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.strength.situp")} value={record.mekik?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.situpScore")} {record.analysis?.mekikStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.strength.rmSquatWeight")} value={record.rmsquatweight?.toString() ?? "-"} />
                        <InfoRow label={t("recordDetail.strength.rmSquatRep")} value={record.rmsquatrep?.toString() ?? "-"} />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.rmSquatScore")} {record.analysis?.rmSquatStatus || "-"}
                        </Text>

                        <InfoRow label={t("recordDetail.strength.notes")} value={record.kuvvetnotes || "-"} multiline />
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

// -------- helper görünümler --------

function InfoRow({
    icon,
    label,
    value,
    multiline,
    firstLine
}: {
    icon?: React.ReactNode;
    label: string;
    value: string;
    multiline?: boolean;
    firstLine?: boolean;
}) {
    return (
        <View style={[firstLine ? styles.infoRowFirstLine : styles.infoRow, multiline && { alignItems: "flex-start" }]}>
            <View style={styles.infoLabelRow}>
                {icon}
                <Text style={styles.infoLabelText}>{label}</Text>
            </View>
            <Text
                style={[
                    styles.infoValueText,
                    multiline && { textAlign: "left", maxWidth: "60%" },
                ]}
            >
                {value}
            </Text>
        </View>
    );
}

function formatVal(v: any, unit?: string) {
    if (v === null || v === undefined || v === "") return "-";
    if (unit) return `${v} ${unit}`;
    return String(v);
}

function boolBadge(v: any): string {
    if (v === true) return "Evet";
    if (v === false) return "Hayır";
    return "-";
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: themeui.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: themeui.colors.background,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: themeui.colors.background,
    },

    loadingText: {
        color: themeui.colors.text.secondary,
        marginTop: themeui.spacing.xs + 2,
    },
    errorText: {
        color: themeui.colors.danger,
        marginBottom: themeui.spacing.sm,
    },

    /* HEADER */
    header: {
        paddingHorizontal: themeui.spacing.md,
        paddingTop: themeui.spacing.sm + 4,
        paddingBottom: themeui.spacing.xs + 4,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        marginBottom: themeui.spacing.sm,
    },

    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.xs,
        paddingHorizontal: themeui.spacing.sm - 2,
        paddingVertical: themeui.spacing.xs,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.background,
        borderWidth: 1,
        borderColor: themeui.colors.border,
    },
    backButtonText: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.sm,
    },

    /* STUDENT */
    studentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.sm + 2,
        marginTop: themeui.spacing.xs,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: themeui.colors.text.primary,
        fontSize: 24,
        fontWeight: "700",
    },
    studentName: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.title,
        fontWeight: "700",
    },
    studentMeta: {
        color: themeui.colors.text.muted,
        marginTop: 2,
    },

    statusRow: { marginTop: themeui.spacing.xs },
    statusBadge: {
        paddingHorizontal: themeui.spacing.sm - 4,
        paddingVertical: themeui.spacing.xs - 2,
        borderRadius: themeui.radius.pill,
    },
    statusBadgeActive: { backgroundColor: themeui.colors.successSoft },
    statusBadgeInactive: { backgroundColor: themeui.colors.dangerSoft },

    statusTextActive: {
        color: themeui.colors.success,
        fontSize: themeui.fontSize.xs,
        fontWeight: "600",
    },
    statusTextInactive: {
        color: themeui.colors.danger,
        fontSize: themeui.fontSize.xs,
        fontWeight: "600",
    },

    /* CARD */
    card: {
        marginHorizontal: themeui.spacing.md,
        marginBottom: themeui.spacing.sm,
        backgroundColor: themeui.colors.surface,
        borderRadius: themeui.radius.lg,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        padding: themeui.spacing.md - 2,
        ...themeui.shadow.soft,
    },
    cardTitle: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.lg - 1,
        fontWeight: "600",
        marginBottom: themeui.spacing.xs,
    },

    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: themeui.spacing.xs,
        borderTopWidth: 1,
        borderTopColor: themeui.colors.surfaceSoft,
    },
    infoRowFirstLine: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: themeui.spacing.xs,
    },

    infoLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.xs,
    },
    infoLabelText: {
        color: themeui.colors.text.muted,
        fontSize: themeui.fontSize.sm,
    },
    infoValueText: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.md - 1,
        fontWeight: "500",
        maxWidth: "55%",
        textAlign: "right",
    },
    analysisText: {
        marginTop: 2,
        marginBottom: 8,
        fontSize: 12,
        color: "#9ca3af",
    },

});


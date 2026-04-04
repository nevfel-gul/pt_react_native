// app/record/[id].tsx
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
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
    VenusAndMars,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
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

    const { theme } = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme]);

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
    }, [id, t]);

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
                    <ActivityIndicator size="large" color={theme.colors.accent} />
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
                        <ArrowLeft size={18} color={theme.colors.text.primary} />
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
                                <ArrowLeft size={18} color={theme.colors.text.primary} />
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
                            <User size={18} color={theme.colors.primary} />
                            {"  "}
                            {t("recordDetail.section.personal")}
                        </Text>
                        <InfoRow
                            styles={styles}
                            icon={<Mail size={16} color={theme.colors.text.muted} />}
                            label={t("recordDetail.label.email")}
                            value={student?.email || "-"}
                            firstLine={true}
                        />
                        <InfoRow
                            styles={styles}
                            icon={<Phone size={16} color={theme.colors.text.muted} />}
                            label={t("recordDetail.label.phone")}
                            value={student?.number || "-"}
                        />
                        <InfoRow
                            styles={styles}
                            icon={<Calendar size={16} color={theme.colors.text.muted} />}
                            label={t("recordDetail.label.dob")}
                            value={
                                student?.dateOfBirth
                                    ? new Date(student.dateOfBirth).toLocaleDateString("tr-TR")
                                    : "-"
                            }
                        />
                        <InfoRow
                            styles={styles}
                            icon={<VenusAndMars size={16} color={theme.colors.text.muted} />}
                            label={t("recordDetail.label.gender")}
                            value={student?.gender || "-"}
                        />
                    </View>

                    {/* FİZİKSEL ÖLÇÜMLER / TANITA */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <HandHeart size={18} color={theme.colors.primary} />
                            {"  "}
                            {t("recordDetail.section.tanita")}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.weight")}
                            value={formatVal(record.weight, t("common.unit.kg"))}
                            firstLine={true}
                        />

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.bodyFat")}
                            value={formatVal(record.bodyFat, t("common.unit.percent"))}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.bodyFatStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.bmi")}
                            value={formatVal(record.bodyMassIndex)}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.bmiStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.bmr")}
                            value={formatVal(record.basalMetabolism, t("common.unit.kcal"))}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")}{" "}
                            {record.analysis?.basalMetabolismStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.totalMuscle")}
                            value={formatVal(record.totalMuscleMass, t("common.unit.kg"))}
                        />

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.leanBodyMass")}
                            value={formatVal(record.leanBodyMass, t("common.unit.kg"))}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")}{" "}
                            {record.analysis?.leanBodyMassStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.bodyWater")}
                            value={formatVal(record.bodyWaterMass, t("common.unit.percent"))}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")}{" "}
                            {record.analysis?.bodyWaterMassStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.metabolicAge")}
                            value={record.metabolicAge?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")}{" "}
                            {record.analysis?.metabolicAgeStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.impedance")}
                            value={record.impedance?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.status")} {record.analysis?.impedanceStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.label.waistHipRaw")}
                            value={
                                record.bel && record.kalca
                                    ? `Bel: ${record.bel} cm, Kalça: ${record.kalca} cm`
                                    : "-"
                            }
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.comment")}{" "}
                            {record.analysis?.bellyHipRatioStatus || "-"}
                        </Text>
                    </View>

                    {/* ÇEVRE ÖLÇÜMLERİ */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t("recordDetail.section.tape")}</Text>
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.neck")}
                            value={formatVal(record.boyun, t("common.unit.cm"))}
                            firstLine={true}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.shoulder")}
                            value={formatVal(record.omuz, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.chest")}
                            value={formatVal(record.gogus, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.rightArm")}
                            value={formatVal(record.sagKol, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.leftArm")}
                            value={formatVal(record.solKol, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.waist")}
                            value={formatVal(record.bel, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.hip")}
                            value={formatVal(record.kalca, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.rightLeg")}
                            value={formatVal(record.sagBacak, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.leftLeg")}
                            value={formatVal(record.solBacak, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.rightCalf")}
                            value={formatVal(record.sagKalf, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.leftCalf")}
                            value={formatVal(record.solKalf, t("common.unit.cm"))}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.tape.note")}
                            value={record.mezuraNote || "-"}
                            multiline
                        />
                    </View>

                    {/* AEROBİK TESTLER */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <SquareActivity size={18} color={theme.colors.primary} />
                            {"  "}
                            {t("recordDetail.section.aerobic")}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.aerobic.restingHr")}
                            value={record.dinlenikNabiz?.toString() ?? "-"}
                            firstLine={true}
                        />

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.aerobic.carvonen")}
                            value={record.carvonenMultiplier?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.targetHr")}{" "}
                            {record.analysis?.carvonenTargetHR
                                ? `${record.analysis.carvonenTargetHR} ${t("common.unit.bpm")}`
                                : "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.aerobic.ymcaPulse")}
                            value={record.toparlanmaNabzi?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.ymca")} {record.analysis?.ymcaStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.aerobic.bruceTime")}
                            value={record.testSuresi?.toString() ?? "-"}
                        />
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
                            <PersonStanding size={18} color={theme.colors.primary} />
                            {"  "}
                            {t("recordDetail.section.mobility")}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.ankle.front")}
                            value={record.ayakveayakbilegionden || "-"}
                            multiline
                            firstLine={true}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.ankle.side")}
                            value={record.ayakveayakbilegiyandan || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.ankle.back")}
                            value={record.ayakveayakbilegiarkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.knee.front")}
                            value={record.dizonden || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.knee.side")}
                            value={record.dizyandan || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.knee.back")}
                            value={record.dizarkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.lphk.front")}
                            value={record.lphkonden || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.lphk.side")}
                            value={record.lphkyandan || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.lphk.back")}
                            value={record.lphkarkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.shoulders.front")}
                            value={record.omuzlaronden || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.shoulders.side")}
                            value={record.omuzlaryandan || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.shoulders.back")}
                            value={record.omuzlararkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.headNeck.front")}
                            value={record.basboyunonden || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.headNeck.side")}
                            value={record.basboyunyandan || "-"}
                            multiline
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.headNeck.back")}
                            value={record.basboyunarkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.pronation")}
                            value={record.pronation || "-"}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.lower")}
                            value={record.lower || "-"}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.posture.upper")}
                            value={record.upper || "-"}
                        />
                    </View>

                    {/* OVERHEAD SQUAT + SIT & REACH */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t("recordDetail.section.ohs")}</Text>
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.ohs.footTurnsOut")}
                            value={boolBadge(record.footTurnsOut)}
                            firstLine={true}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.ohs.kneeMovesInward")}
                            value={boolBadge(record.kneeMovesInward)}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.ohs.kneeMovesOutward")}
                            value={boolBadge(record.kneeMovesOutward)}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.ohs.excessiveForwardLean")}
                            value={boolBadge(record.excessiveForwardLean)}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.ohs.lowBackArches")}
                            value={boolBadge(record.lowBackArches)}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.ohs.lowBackRound")}
                            value={boolBadge(record.lowBackRound)}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.ohs.armsFallForward")}
                            value={boolBadge(record.armsFallForward)}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.ohs.notes")}
                            value={record.overheadsquatnotes || "-"}
                            multiline
                        />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{t("recordDetail.section.sitReach")}</Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.sitReach.value1")}
                            value={formatVal(record.sitandreach1)}
                            firstLine={true}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.sitReach.value2")}
                            value={formatVal(record.sitandreach2)}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.sitReach.value3")}
                            value={formatVal(record.sitandreach3)}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.sitReach.tightness")}
                            value={record.sitandreachnotes || "-"}
                            multiline
                        />
                        <Text
                            style={[
                                styles.analysisText,
                                {
                                    borderTopColor: theme.colors.surfaceSoft,
                                    borderTopWidth: 1,
                                    paddingVertical: 6,
                                },
                            ]}
                        >
                            {t("recordDetail.analysis.bestValue")}{" "}
                            {record.analysis?.sitAndReachBest != null
                                ? `${record.analysis.sitAndReachBest} ${t("common.unit.cm")}`
                                : "-"}
                            {"  "} | {t("recordDetail.analysis.status")}{" "}
                            {record.analysis?.sitAndReachStatus || "-"}
                        </Text>
                    </View>

                    {/* KUVVET TESTLERİ */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <BicepsFlexed size={18} color={theme.colors.primary} />
                            {"  "}
                            {t("recordDetail.section.strength")}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.strength.pushup")}
                            value={record.pushup?.toString() ?? "-"}
                            firstLine={true}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.pushupScore")} {record.analysis?.pushupStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
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

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.strength.wallSit")}
                            value={record.wallsit?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.wallSitScore")}{" "}
                            {record.analysis?.wallSitStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.strength.plank")}
                            value={record.plank?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.plankScore")} {record.analysis?.plankStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.strength.situp")}
                            value={record.mekik?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.situpScore")} {record.analysis?.mekikStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.strength.rmSquatWeight")}
                            value={record.rmsquatweight?.toString() ?? "-"}
                        />
                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.strength.rmSquatRep")}
                            value={record.rmsquatrep?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            {t("recordDetail.analysis.rmSquatScore")}{" "}
                            {record.analysis?.rmSquatStatus || "-"}
                        </Text>

                        <InfoRow
                            styles={styles}
                            label={t("recordDetail.strength.notes")}
                            value={record.kuvvetnotes || "-"}
                            multiline
                        />
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

// -------- helper görünümler --------

function InfoRow({
    styles,
    icon,
    label,
    value,
    multiline,
    firstLine,
}: {
    styles: ReturnType<typeof makeStyles>;
    icon?: React.ReactNode;
    label: string;
    value: string;
    multiline?: boolean;
    firstLine?: boolean;
}) {
    return (
        <View
            style={[
                firstLine ? styles.infoRowFirstLine : styles.infoRow,
                multiline && { alignItems: "flex-start" },
            ]}
        >
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

function makeStyles(theme: ThemeUI) {
    return StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        center: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.background,
        },

        loadingText: {
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.xs + 4,
            fontSize: theme.fontSize.sm,
        },
        errorText: {
            color: theme.colors.danger,
            marginBottom: theme.spacing.sm,
            fontSize: theme.fontSize.sm,
            fontWeight: "700",
        },

        /* HEADER */
        header: {
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.sm + 6,
            paddingBottom: theme.spacing.sm,
        },
        headerTopRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
        },

        backButton: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs + 2,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        backButtonText: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.sm,
            fontWeight: "700",
            marginLeft: theme.spacing.xs,
        },

        /* STUDENT */
        studentRow: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
        },
        avatar: {
            width: 56,
            height: 56,
            borderRadius: 999,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginRight: theme.spacing.sm,
        },
        avatarText: {
            color: theme.colors.text.onAccent,
            fontSize: 20,
            fontWeight: "900",
        },

        studentName: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.lg + 2,
            fontWeight: "800",
            lineHeight: theme.fontSize.lg + 6,
        },
        studentMeta: {
            color: theme.colors.text.muted,
            marginTop: 4,
            fontSize: theme.fontSize.sm,
        },

        statusRow: {
            marginTop: theme.spacing.xs,
        },
        statusBadge: {
            alignSelf: "flex-start",
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs - 1,
            borderRadius: 999,
            borderWidth: 1,
        },
        statusBadgeActive: {
            backgroundColor: theme.colors.successSoft,
            borderColor: "rgba(34,197,94,0.25)",
        },
        statusBadgeInactive: {
            backgroundColor: theme.colors.dangerSoft,
            borderColor: "rgba(239,68,68,0.25)",
        },

        statusTextActive: {
            color: theme.colors.success,
            fontSize: theme.fontSize.xs,
            fontWeight: "800",
        },
        statusTextInactive: {
            color: theme.colors.danger,
            fontSize: theme.fontSize.xs,
            fontWeight: "800",
        },

        /* CARD */
        card: {
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            ...(theme.shadow?.soft ?? {}),
        },

        cardTitle: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.lg,
            fontWeight: "800",
            marginBottom: theme.spacing.sm,
        },

        infoRowFirstLine: {
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: theme.spacing.xs + 2,
        },
        infoRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: theme.spacing.xs + 2,
            borderTopWidth: 1,
            borderTopColor: theme.colors.surfaceSoft,
        },

        infoLabelRow: {
            flexDirection: "row",
            alignItems: "center",
        },
        infoLabelText: {
            color: theme.colors.text.muted,
            fontSize: theme.fontSize.sm,
            marginLeft: theme.spacing.xs,
            fontWeight: "700",
        },
        infoValueText: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.md,
            fontWeight: "700",
            maxWidth: "58%",
            textAlign: "right",
        },

        analysisText: {
            marginTop: theme.spacing.xs,
            marginBottom: theme.spacing.sm,
            fontSize: theme.fontSize.xs + 1,
            color: theme.colors.text.secondary,
            lineHeight: 16,
        },
    });
}

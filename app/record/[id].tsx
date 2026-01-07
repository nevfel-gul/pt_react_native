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
                    setError("Kayıt bulunamadı.");
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
                setError(err?.message ?? "Veri çekme hatası");
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
                    <Text style={styles.loadingText}>Kayıt yükleniyor...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !record) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error || "Kayıt bulunamadı."}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <ArrowLeft size={18} color="#e5e7eb" />
                        <Text style={styles.backButtonText}>Geri</Text>
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
                                <Text style={styles.backButtonText}>Geri</Text>
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
                                    {student?.boy ? `${student.boy} cm` : ""}
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
                                                    ? "Aktif Öğrenci"
                                                    : "Pasif Öğrenci"}
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
                            {"  "}Kişisel Bilgiler
                        </Text>
                        <InfoRow
                            icon={<Mail size={16} color="#9ca3af" />}
                            label="Email"
                            value={student?.email || "-"}
                        />
                        <InfoRow
                            icon={<Phone size={16} color="#9ca3af" />}
                            label="Telefon"
                            value={student?.number || "-"}
                        />
                        <InfoRow
                            icon={<Calendar size={16} color="#9ca3af" />}
                            label="Doğum Tarihi"
                            value={
                                student?.dateOfBirth
                                    ? new Date(student.dateOfBirth).toLocaleDateString("tr-TR")
                                    : "-"
                            }
                        />
                        <InfoRow
                            icon={<VenusAndMars size={16} color="#9ca3af" />}
                            label="Cinsiyet"
                            value={student?.gender || "-"}
                        />
                    </View>

                    {/* FİZİKSEL ÖLÇÜMLER / TANITA */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <HandHeart size={18} color="#60a5fa" />
                            {"  "}Fiziksel Ölçümler (Tanita)
                        </Text>

                        <InfoRow label="Kilo" value={formatVal(record.weight, "kg")} />
                        {/* Kilo için özel analiz yok, geçiyoruz */}

                        <InfoRow
                            label="Vücut Yağ Oranı"
                            value={formatVal(record.bodyFat, "%")}
                        />
                        <Text style={styles.analysisText}>
                            Durum: {record.analysis?.bodyFatStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Vücut Kitle İndeksi (BMI)"
                            value={formatVal(record.bodyMassIndex)}
                        />
                        <Text style={styles.analysisText}>
                            Durum: {record.analysis?.bmiStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Bazal Metabolizma"
                            value={formatVal(record.basalMetabolism, "kcal")}
                        />
                        <Text style={styles.analysisText}>
                            Durum: {record.analysis?.basalMetabolismStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Toplam Kas Kütlesi"
                            value={formatVal(record.totalMuscleMass, "kg")}
                        />
                        {/* Toplam kas için ayrı analiz yok */}

                        <InfoRow
                            label="Yağsız Vücut Kütlesi"
                            value={formatVal(record.leanBodyMass, "kg")}
                        />
                        <Text style={styles.analysisText}>
                            Durum: {record.analysis?.leanBodyMassStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Vücut Su Oranı"
                            value={formatVal(record.bodyWaterMass, "%")}
                        />
                        <Text style={styles.analysisText}>
                            Durum: {record.analysis?.bodyWaterMassStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Metabolizma Yaşı"
                            value={record.metabolicAge?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            Durum: {record.analysis?.metabolicAgeStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Empedans"
                            value={record.impedance?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            Durum: {record.analysis?.impedanceStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Bel-Kalça Oranı (ham değerler)"
                            value={
                                record.bel && record.kalca
                                    ? `Bel: ${record.bel} cm, Kalça: ${record.kalca} cm`
                                    : "-"
                            }
                        />
                        <Text style={styles.analysisText}>
                            Yorum: {record.analysis?.bellyHipRatioStatus || "-"}
                        </Text>
                    </View>


                    {/* ÇEVRE ÖLÇÜMLERİ */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Çevre Ölçümleri</Text>
                        <InfoRow label="Boyun" value={formatVal(record.boyun, "cm")} />
                        <InfoRow label="Omuz" value={formatVal(record.omuz, "cm")} />
                        {/* NewRecordScreen'deki alan adı "gogus" */}
                        <InfoRow label="Göğüs" value={formatVal(record.gogus, "cm")} />
                        <InfoRow label="Sağ Kol" value={formatVal(record.sagKol, "cm")} />
                        <InfoRow label="Sol Kol" value={formatVal(record.solKol, "cm")} />
                        <InfoRow label="Bel" value={formatVal(record.bel, "cm")} />
                        <InfoRow label="Kalça" value={formatVal(record.kalca, "cm")} />
                        <InfoRow
                            label="Sağ Bacak"
                            value={formatVal(record.sagBacak, "cm")}
                        />
                        <InfoRow
                            label="Sol Bacak"
                            value={formatVal(record.solBacak, "cm")}
                        />
                        <InfoRow
                            label="Sağ Kalf"
                            value={formatVal(record.sagKalf, "cm")}
                        />
                        <InfoRow
                            label="Sol Kalf"
                            value={formatVal(record.solKalf, "cm")}
                        />
                        <InfoRow
                            label="Mezura Notu"
                            value={record.mezuraNote || "-"}
                            multiline
                        />
                    </View>

                    {/* AEROBİK TESTLER */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <SquareActivity size={18} color="#60a5fa" />
                            {"  "}Aerobik Testler
                        </Text>

                        <InfoRow
                            label="Dinlenik Nabız"
                            value={record.dinlenikNabiz?.toString() ?? "-"}
                        />
                        {/* Direkt veri, ekstra yorum yok */}

                        <InfoRow
                            label="Carvonen (Zone)"
                            value={record.carvonenMultiplier?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            Hedef Nabız:{" "}
                            {record.analysis?.carvonenTargetHR
                                ? `${record.analysis.carvonenTargetHR} atım/dk`
                                : "-"}
                        </Text>

                        <InfoRow
                            label="YMCA 3dk Toparlanma Nabzı"
                            value={record.toparlanmaNabzi?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            YMCA Sonuç: {record.analysis?.ymcaStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Bruce Test Süresi (dk)"
                            value={record.testSuresi?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            VO₂max:{" "}
                            {record.analysis?.bruceVO2Max
                                ? `${record.analysis.bruceVO2Max} ml/kg/dk`
                                : "-"}{" "}
                            — {record.analysis?.vo2Status || "-"}
                        </Text>
                    </View>


                    {/* HAREKET & POSTÜR */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <PersonStanding size={18} color="#60a5fa" />
                            {"  "}Hareket & Postür
                        </Text>
                        <InfoRow
                            label="Ayak / Ayak Bileği (Önden)"
                            value={record.ayakveayakbilegionden || "-"}
                            multiline
                        />
                        <InfoRow
                            label="Ayak / Ayak Bileği (Yandan)"
                            value={record.ayakveayakbilegiyandan || "-"}
                            multiline
                        />
                        <InfoRow
                            label="Ayak / Ayak Bileği (Arkadan)"
                            value={record.ayakveayakbilegiarkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            label="Diz (Önden)"
                            value={record.dizonden || "-"}
                            multiline
                        />
                        <InfoRow
                            label="Diz (Yandan)"
                            value={record.dizyandan || "-"}
                            multiline
                        />
                        <InfoRow
                            label="Diz (Arkadan)"
                            value={record.dizarkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            label="LPHK (Önden)"
                            value={record.lphkonden || "-"}
                            multiline
                        />
                        <InfoRow
                            label="LPHK (Yandan)"
                            value={record.lphkyandan || "-"}
                            multiline
                        />
                        <InfoRow
                            label="LPHK (Arkadan)"
                            value={record.lphkarkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            label="Omuzlar (Önden)"
                            value={record.omuzlaronden || "-"}
                            multiline
                        />
                        <InfoRow
                            label="Omuzlar (Yandan)"
                            value={record.omuzlaryandan || "-"}
                            multiline
                        />
                        <InfoRow
                            label="Omuzlar (Arkadan)"
                            value={record.omuzlararkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            label="Baş & Boyun (Önden)"
                            value={record.basboyunonden || "-"}
                            multiline
                        />
                        <InfoRow
                            label="Baş & Boyun (Yandan)"
                            value={record.basboyunyandan || "-"}
                            multiline
                        />
                        <InfoRow
                            label="Baş & Boyun (Arkadan)"
                            value={record.basboyunarkadan || "-"}
                            multiline
                        />

                        <InfoRow
                            label="Pronation Distortion Syndrome"
                            value={record.pronation || "-"}
                        />
                        <InfoRow
                            label="Lower Crossed Syndrome"
                            value={record.lower || "-"}
                        />
                        <InfoRow
                            label="Upper Crossed Syndrome"
                            value={record.upper || "-"}
                        />
                    </View>

                    {/* OVERHEAD SQUAT + SIT & REACH */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Overhead Squat Testi</Text>
                        <InfoRow
                            label="Foot Turns Out"
                            value={boolBadge(record.footTurnsOut)}
                        />
                        <InfoRow
                            label="Knee Moves Inward"
                            value={boolBadge(record.kneeMovesInward)}
                        />
                        <InfoRow
                            label="Knee Moves Outward"
                            value={boolBadge(record.kneeMovesOutward)}
                        />
                        <InfoRow
                            label="Excessive Forward Lean"
                            value={boolBadge(record.excessiveForwardLean)}
                        />
                        <InfoRow
                            label="Low Back Arches"
                            value={boolBadge(record.lowBackArches)}
                        />
                        <InfoRow
                            label="Low Back Round"
                            value={boolBadge(record.lowBackRound)}
                        />
                        <InfoRow
                            label="Arms Fall Forward"
                            value={boolBadge(record.armsFallForward)}
                        />
                        <InfoRow
                            label="Notlar"
                            value={record.overheadsquatnotes || "-"}
                            multiline
                        />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Sit and Reach Testi</Text>

                        <InfoRow
                            label="Değer 1"
                            value={formatVal(record.sitandreach1)}
                        />
                        <InfoRow
                            label="Değer 2"
                            value={formatVal(record.sitandreach2)}
                        />
                        <InfoRow
                            label="Değer 3"
                            value={formatVal(record.sitandreach3)}
                        />
                        <InfoRow
                            label="Hissedilen Gerginlik"
                            value={record.sitandreachnotes || "-"}
                            multiline
                        />
                        <Text
                            style={[
                                styles.analysisText,
                                {
                                    borderTopColor: "#0f172a", borderTopWidth: 1, paddingVertical: 6,
                                }
                            ]}
                        >
                            En İyi Değer:{" "}
                            {record.analysis?.sitAndReachBest != null
                                ? `${record.analysis.sitAndReachBest} cm`
                                : "-"}
                            {"  "} |  Durum: {record.analysis?.sitAndReachStatus || "-"}
                        </Text>
                    </View>


                    {/* KUVVET TESTLERİ */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            <BicepsFlexed size={18} color="#60a5fa" />
                            {"  "}Kuvvet Testleri
                        </Text>

                        <InfoRow
                            label="Push up (1 dk)"
                            value={record.pushup?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            Push up Skoru: {record.analysis?.pushupStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Push up diz üstü mü?"
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
                            label="Wall Sit (sn)"
                            value={record.wallsit?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            Wall Sit Skoru: {record.analysis?.wallSitStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Plank (sn)"
                            value={record.plank?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            Plank Skoru: {record.analysis?.plankStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Mekik (1 dk)"
                            value={record.mekik?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            Mekik Skoru: {record.analysis?.mekikStatus || "-"}
                        </Text>

                        <InfoRow
                            label="1RM Squat - Kilo"
                            value={record.rmsquatweight?.toString() ?? "-"}
                        />
                        <InfoRow
                            label="1RM Squat - Tekrar"
                            value={record.rmsquatrep?.toString() ?? "-"}
                        />
                        <Text style={styles.analysisText}>
                            1RM Squat Skoru: {record.analysis?.rmSquatStatus || "-"}
                        </Text>

                        <InfoRow
                            label="Kuvvet Notları"
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
    icon,
    label,
    value,
    multiline,
}: {
    icon?: React.ReactNode;
    label: string;
    value: string;
    multiline?: boolean;
}) {
    return (
        <View style={[styles.infoRow, multiline && { alignItems: "flex-start" }]}>
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
        borderBottomWidth: 1,
        borderBottomColor: themeui.colors.surfaceSoft,
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


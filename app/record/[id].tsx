// app/record/[id].tsx

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
                const recRef = recordDocRef(id as string);
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
                    const stuRef = studentDocRef(recData.studentId);
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
                        <InfoRow
                            label="Vücut Yağ Oranı"
                            value={formatVal(record.bodyFat, "%")}
                        />
                        <InfoRow
                            label="Vücut Kitle İndeksi (BMI)"
                            value={formatVal(record.bodyMassIndex)}
                        />
                        <InfoRow
                            label="Bazal Metabolizma"
                            value={formatVal(record.basalMetabolism, "kcal")}
                        />
                        <InfoRow
                            label="Toplam Kas Kütlesi"
                            value={formatVal(record.totalMuscleMass, "kg")}
                        />
                        <InfoRow
                            label="Yağsız Vücut Kütlesi"
                            value={formatVal(record.leanBodyMass, "kg")}
                        />
                        <InfoRow
                            label="Vücut Su Oranı"
                            value={formatVal(record.bodyWaterMass, "%")}
                        />
                        <InfoRow
                            label="Metabolizma Yaşı"
                            value={record.metabolicAge?.toString() ?? "-"}
                        />
                        <InfoRow
                            label="Empedans"
                            value={record.impedance?.toString() ?? "-"}
                        />
                        <InfoRow
                            label="Bel-Kalça Oranı (ham değerler)"
                            value={
                                record.bel && record.kalca
                                    ? `Bel: ${record.bel} cm, Kalça: ${record.kalca} cm`
                                    : "-"
                            }
                        />
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
                        <InfoRow
                            label="Carvonen (Zone)"
                            value={record.carvonenMultiplier?.toString() ?? "-"}
                        />
                        <InfoRow
                            label="YMCA 3dk Toparlanma Nabzı"
                            value={record.toparlanmaNabzi?.toString() ?? "-"}
                        />
                        <InfoRow
                            label="Bruce Test Süresi (dk)"
                            value={record.testSuresi?.toString() ?? "-"}
                        />
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
                        <InfoRow
                            label="Plank (sn)"
                            value={record.plank?.toString() ?? "-"}
                        />
                        <InfoRow
                            label="Mekik (1 dk)"
                            value={record.mekik?.toString() ?? "-"}
                        />
                        <InfoRow
                            label="1RM Squat - Kilo"
                            value={record.rmsquatweight?.toString() ?? "-"}
                        />
                        <InfoRow
                            label="1RM Squat - Tekrar"
                            value={record.rmsquatrep?.toString() ?? "-"}
                        />
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
        backgroundColor: "#020617",
    },
    container: {
        flex: 1,
        backgroundColor: "#020617",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#020617",
    },
    loadingText: {
        color: "#e5e7eb",
        marginTop: 8,
    },
    errorText: {
        color: "#fca5a5",
        marginBottom: 12,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        marginBottom: 12,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#020617",
        borderWidth: 1,
        borderColor: "#1f2937",
    },
    backButtonText: {
        color: "#e5e7eb",
        fontSize: 13,
    },
    studentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#1d4ed8",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#f9fafb",
        fontSize: 24,
        fontWeight: "700",
    },
    studentName: {
        color: "#f9fafb",
        fontSize: 20,
        fontWeight: "700",
    },
    studentMeta: {
        color: "#9ca3af",
        marginTop: 2,
    },
    statusRow: {
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    statusBadgeActive: {
        backgroundColor: "rgba(22,163,74,0.15)",
    },
    statusBadgeInactive: {
        backgroundColor: "rgba(248,113,113,0.15)",
    },
    statusTextActive: {
        color: "#4ade80",
        fontSize: 11,
        fontWeight: "600",
    },
    statusTextInactive: {
        color: "#fca5a5",
        fontSize: 11,
        fontWeight: "600",
    },
    card: {
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: "#020617",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1f2937",
        padding: 14,
    },
    cardTitle: {
        color: "#e5e7eb",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#0f172a",
    },
    infoLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    infoLabelText: {
        color: "#9ca3af",
        fontSize: 12,
    },
    infoValueText: {
        color: "#e5e7eb",
        fontSize: 13,
        fontWeight: "500",
        maxWidth: "55%",
        textAlign: "right",
    },
});


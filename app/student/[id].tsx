// app/student/[id].tsx

import { useLocalSearchParams, useRouter } from "expo-router";
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
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { db } from "@/services/firebase";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    updateDoc,
    where
} from "firebase/firestore";

type Student = {
    id: string;
    name: string;
    email?: string;
    number?: string;
    boy?: string;
    dateOfBirth?: string;
    gender?: string;
    aktif?: "Aktif" | "Pasif";
    assessmentDate?: string;
    // PAR-Q + kişisel detaylar varsa:
    q1?: string;
    q1aciklama?: string;
    q2?: string;
    q2aciklama?: string;
    q3?: string;
    q3aciklama?: string;
    q4?: string;
    q4aciklama?: string;
    q5?: string;
    q5aciklama?: string;
    q6?: string;
    q6aciklama?: string;
    q7?: string;
    q7aciklama?: string;

    qq1?: string;
    qq1aciklama?: string;
    qq2?: string;
    qq2aciklama?: string;
    qq3?: string;
    qq3aciklama?: string;
    qq4?: string;
    qq4aciklama?: string;
    qq5?: string;
    qq5aciklama?: string;
    qq6?: string;
    qq6aciklama?: string;
    qq7?: string;
    qq8?: string;
    qq9?: string;
    qq10?: string;
    qq11?: string;
    qq12?: string;
    qq13?: string[]; // hedefler listesi
    qq14?: string; // diğer
};

type RecordItem = {
    id: string;
    studentId: string;
    createdAt?: any;
    status?: "Aktif" | "Pasif";
    note?: string;
};

export default function StudentDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [student, setStudent] = useState<Student | null>(null);
    const [records, setRecords] = useState<RecordItem[]>([]);
    const [loadingStudent, setLoadingStudent] = useState(true);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [toggling, setToggling] = useState(false);

    // Öğrenci bilgisi
    useEffect(() => {
        if (!id) return;

        const loadStudent = async () => {
            try {
                const ref = doc(db, "students", id);
                const snap = await getDoc(ref);

                if (snap.exists()) {
                    const data = snap.data() as any;
                    setStudent({
                        id: snap.id,
                        name: data.name ?? "",
                        email: data.email,
                        number: data.number,
                        boy: data.boy,
                        dateOfBirth: data.dateOfBirth,
                        gender: data.gender,
                        aktif: (data.aktif as "Aktif" | "Pasif") ?? "Aktif",
                        assessmentDate: data.assessmentDate,
                        q1: data.q1,
                        q1aciklama: data.q1aciklama,
                        q2: data.q2,
                        q2aciklama: data.q2aciklama,
                        q3: data.q3,
                        q3aciklama: data.q3aciklama,
                        q4: data.q4,
                        q4aciklama: data.q4aciklama,
                        q5: data.q5,
                        q5aciklama: data.q5aciklama,
                        q6: data.q6,
                        q6aciklama: data.q6aciklama,
                        q7: data.q7,
                        q7aciklama: data.q7aciklama,
                        qq1: data.qq1,
                        qq1aciklama: data.qq1aciklama,
                        qq2: data.qq2,
                        qq2aciklama: data.qq2aciklama,
                        qq3: data.qq3,
                        qq3aciklama: data.qq3aciklama,
                        qq4: data.qq4,
                        qq4aciklama: data.qq4aciklama,
                        qq5: data.qq5,
                        qq5aciklama: data.qq5aciklama,
                        qq6: data.qq6,
                        qq6aciklama: data.qq6aciklama,
                        qq7: data.qq7,
                        qq8: data.qq8,
                        qq9: data.qq9,
                        qq10: data.qq10,
                        qq11: data.qq11,
                        qq12: data.qq12,
                        qq13: data.qq13 ?? [],
                        qq14: data.qq14,
                    });
                } else {
                    setStudent(null);
                }
            } catch (err) {
                console.error("Öğrenci detay hata:", err);
                setStudent(null);
            } finally {
                setLoadingStudent(false);
            }
        };

        loadStudent();
    }, [id]);

    // Kayıtlar (records) – Firestore yapını buna göre ayarlarsın
    useEffect(() => {
        if (!id) return;

        // Örn: records koleksiyonu, içinde studentId field’ı var
        const q = query(
            collection(db, "records"),
            where("studentId", "==", id),
            // orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const list: RecordItem[] = snap.docs.map((d) => {
                    const data = d.data() as any;
                    return {
                        id: d.id,
                        studentId: data.studentId,
                        createdAt: data.createdAt,
                        status: data.status,
                        note: data.note,
                    };
                });
                setRecords(list);
                setLoadingRecords(false);
            },
            (err) => {
                console.error("Records dinleme hata:", err);
                setLoadingRecords(false);
            }
        );

        return () => unsub();
    }, [id]);

    const handleGoBack = () => {
        router.replace("/(tabs)/explore");
    };

    const handleToggleAktifPasif = async () => {
        if (!student) return;
        try {
            setToggling(true);
            const newStatus = student.aktif === "Aktif" ? "Pasif" : "Aktif";
            await updateDoc(doc(db, "students", student.id), {
                aktif: newStatus,
            });
            setStudent((prev) =>
                prev ? { ...prev, aktif: newStatus } : prev
            );
        } catch (err) {
            console.error("Aktif/Pasif hata:", err);
        } finally {
            setToggling(false);
        }
    };

    const handleAddRecord = () => {
        if (!student) return;

        router.push({
            pathname: "/newrecord/[id]",
            params: { id: student.id },
        });
    };

    const handleRecordDetail = (recordId: string) => {
        router.push({ pathname: "/record/[id]", params: { id: recordId } });
        console.log("Kayıt detay:", recordId);
    };

    if (loadingStudent) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
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
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <ArrowLeft size={18} color="#e5e7eb" />
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
                        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                            <ArrowLeft size={18} color="#e5e7eb" />
                            <Text style={styles.backButtonText}>Geri</Text>
                        </TouchableOpacity>

                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.toggleButton}
                                onPress={handleToggleAktifPasif}
                                disabled={toggling}
                            >
                                <Power size={16} color="#022c22" />
                                <Text style={styles.toggleButtonText}>
                                    {student.aktif === "Aktif" ? "Pasif Yap" : "Aktif Yap"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={handleAddRecord}
                            >
                                <Edit size={16} color="#e5e7eb" />
                                <Text style={styles.editButtonText}>Kayıt Ekle</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.studentRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{firstLetter}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{student.name}</Text>
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
                        </View>
                    </View>
                </View>

                {/* İÇERİK – Scrollable */}
                <FlatList
                    ListHeaderComponent={
                        <View>
                            {/* Kişisel Bilgiler Kartı */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Kişisel Bilgiler</Text>
                                <InfoRow
                                    icon={<Mail size={16} color="#9ca3af" />}
                                    label="Email"
                                    value={student.email || "-"}
                                />
                                <InfoRow
                                    icon={<Phone size={16} color="#9ca3af" />}
                                    label="Telefon"
                                    value={student.number || "-"}
                                />
                                <InfoRow
                                    icon={<User size={16} color="#9ca3af" />}
                                    label="Cinsiyet"
                                    value={student.gender || "-"}
                                />
                                <InfoRow
                                    icon={<Calendar size={16} color="#9ca3af" />}
                                    label="Doğum Tarihi"
                                    value={
                                        student.dateOfBirth
                                            ? new Date(student.dateOfBirth).toLocaleDateString(
                                                "tr-TR"
                                            )
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    icon={<Calendar size={16} color="#9ca3af" />}
                                    label="Değerlendirme Tarihi"
                                    value={
                                        student.assessmentDate
                                            ? new Date(student.assessmentDate).toLocaleDateString(
                                                "tr-TR"
                                            )
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    icon={<User size={16} color="#9ca3af" />}
                                    label="Boy (cm)"
                                    value={student.boy || "-"}
                                />
                            </View>

                            {/* PAR-Q (özet) – elindeki field’lere göre genişletebilirsin */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>PAR-Q Testi</Text>
                                <InfoRow
                                    label="Soru 1"
                                    value={
                                        student.q1
                                            ? `${student.q1}${student.q1aciklama ? ` - ${student.q1aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="Soru 2"
                                    value={
                                        student.q2
                                            ? `${student.q2}${student.q2aciklama ? ` - ${student.q2aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="Soru 3"
                                    value={
                                        student.q3
                                            ? `${student.q3}${student.q3aciklama ? ` - ${student.q3aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                {/* İstersen q4–q7’yi de aynı şekilde eklersin */}
                            </View>

                            {/* Kişisel Detaylar */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Kişisel Detaylar</Text>
                                <InfoRow
                                    label="Ağrı / Yaralanma"
                                    value={
                                        student.qq1
                                            ? `${student.qq1}${student.qq1aciklama ? ` - ${student.qq1aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="Ameliyat Geçirdiniz mi?"
                                    value={
                                        student.qq2
                                            ? `${student.qq2}${student.qq2aciklama ? ` - ${student.qq2aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="Kronik Hastalık"
                                    value={
                                        student.qq3
                                            ? `${student.qq3}${student.qq3aciklama ? ` - ${student.qq3aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="İlaç Kullanımı"
                                    value={
                                        student.qq4
                                            ? `${student.qq4}${student.qq4aciklama ? ` - ${student.qq4aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="Haftalık Aktivite 30dk veya daha az mı?"
                                    value={
                                        student.qq5
                                            ? `${student.qq5}${student.qq5aciklama ? ` - ${student.qq5aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="Spor Geçmişi"
                                    value={
                                        student.qq6
                                            ? `${student.qq6}${student.qq6aciklama ? ` - ${student.qq6aciklama}` : ""
                                            }`
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="Haftalık Planlanan Gün"
                                    value={student.qq7 || "-"}
                                />
                                <InfoRow
                                    label="Meslek"
                                    value={student.qq8 || "-"}
                                />
                                <InfoRow
                                    label="İş: Uzun Süre Oturma"
                                    value={student.qq9 || "-"}
                                />
                                <InfoRow
                                    label="İş: Tekrarlı Hareket"
                                    value={student.qq10 || "-"}
                                />
                                <InfoRow
                                    label="İş: Topuklu Ayakkabı"
                                    value={student.qq11 || "-"}
                                />
                                <InfoRow
                                    label="İş: Stres / Endişe"
                                    value={student.qq12 || "-"}
                                />
                                <InfoRow
                                    label="Antrenman Hedefleri"
                                    value={
                                        student.qq13 && student.qq13.length > 0
                                            ? student.qq13.join(", ")
                                            : "-"
                                    }
                                />
                                <InfoRow
                                    label="Diğer"
                                    value={student.qq14 || "-"}
                                />
                            </View>

                            {/* Kayıtlar başlığı */}
                            <Text style={styles.recordsTitle}>Kayıtlar</Text>
                        </View>
                    }
                    data={records}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    renderItem={({ item }) => {
                        const dateStr = item.createdAt?.toDate
                            ? `${item.createdAt.toDate().toLocaleDateString(
                                "tr-TR"
                            )} ${item.createdAt.toDate().toLocaleTimeString("tr-TR")}`
                            : "-";

                        return (
                            <TouchableOpacity
                                style={styles.recordCard}
                                onPress={() => handleRecordDetail(item.id)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.recordDate}>{dateStr}</Text>
                                    <Text style={styles.recordNote}>
                                        {item.note || "Not yok"}
                                    </Text>
                                </View>
                                <View style={styles.recordRight}>
                                    <Eye size={18} color="#e5e7eb" />
                                </View>
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
                <Text style={styles.infoLabelText}>{label}</Text>
            </View>
            <Text style={styles.infoValueText}>{value}</Text>
        </View>
    );
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
        justifyContent: "space-between",
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
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    toggleButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#22c55e",
    },
    toggleButtonText: {
        color: "#022c22",
        fontSize: 12,
        fontWeight: "600",
    },
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#1d4ed8",
    },
    editButtonText: {
        color: "#e5e7eb",
        fontSize: 12,
        fontWeight: "600",
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
    recordsTitle: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        color: "#3b82f6",
        fontSize: 16,
        fontWeight: "700",
    },
    recordCard: {
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: "#020617",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#1f2937",
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    recordDate: {
        color: "#e5e7eb",
        fontSize: 13,
        fontWeight: "600",
    },
    recordNote: {
        color: "#9ca3af",
        fontSize: 12,
        marginTop: 2,
    },
    recordRight: {
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    emptyText: {
        color: "#9ca3af",
        fontSize: 13,
    },
});

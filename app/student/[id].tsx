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

// -------------------------
// TYPES
// -------------------------

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

    q1?: string;
    q1aciklama?: string;
    q2?: string;
    q2aciklama?: string;
    q3?: string;
    q3aciklama?: string;

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
    qq13?: string[];
    qq14?: string;
};

type RecordItem = {
    id: string;
    studentId: string;
    createdAt?: any;
    status?: "Aktif" | "Pasif";
    note?: string;
};

// -------------------------
// MAIN COMPONENT
// -------------------------

export default function StudentDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [student, setStudent] = useState<Student | null>(null);
    const [records, setRecords] = useState<RecordItem[]>([]);
    const [loadingStudent, setLoadingStudent] = useState(true);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [toggling, setToggling] = useState(false);

    // -------------------------
    // LOAD STUDENT
    // -------------------------
    useEffect(() => {
        if (!id) return;

        const load = async () => {
            try {
                const ref = doc(db, "students", id);
                const snap = await getDoc(ref);

                if (!snap.exists()) return setStudent(null);

                const d = snap.data() as any;

                setStudent({
                    id: snap.id,
                    name: d.name,
                    email: d.email,
                    number: d.number,
                    boy: d.boy,
                    gender: d.gender,
                    dateOfBirth: d.dateOfBirth,
                    aktif: d.aktif ?? "Aktif",
                    assessmentDate: d.assessmentDate,

                    q1: d.q1,
                    q1aciklama: d.q1aciklama,
                    q2: d.q2,
                    q2aciklama: d.q2aciklama,
                    q3: d.q3,
                    q3aciklama: d.q3aciklama,

                    qq1: d.qq1,
                    qq1aciklama: d.qq1aciklama,
                    qq2: d.qq2,
                    qq2aciklama: d.qq2aciklama,
                    qq3: d.qq3,
                    qq3aciklama: d.qq3aciklama,
                    qq4: d.qq4,
                    qq4aciklama: d.qq4aciklama,
                    qq5: d.qq5,
                    qq5aciklama: d.qq5aciklama,
                    qq6: d.qq6,
                    qq6aciklama: d.qq6aciklama,
                    qq7: d.qq7,
                    qq8: d.qq8,
                    qq9: d.qq9,
                    qq10: d.qq10,
                    qq11: d.qq11,
                    qq12: d.qq12,
                    qq13: d.qq13 ?? [],
                    qq14: d.qq14,
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingStudent(false);
            }
        };

        load();
    }, []);

    // -------------------------
    // LOAD STUDENT RECORDS
    // -------------------------
    useEffect(() => {
        if (!id) return;

        const qy = query(collection(db, "records"), where("studentId", "==", id));

        const unsub = onSnapshot(
            qy,
            (snap) => {
                setRecords(
                    snap.docs.map((d) => ({
                        id: d.id,
                        ...d.data(),
                    })) as any
                );
                setLoadingRecords(false);
            },
            () => setLoadingRecords(false)
        );

        return () => unsub();
    }, []);

    const goBack = () => router.replace("/(tabs)/explore");

    const toggleAktif = async () => {
        if (!student) return;

        try {
            setToggling(true);
            const newStatus = student.aktif === "Aktif" ? "Pasif" : "Aktif";

            await updateDoc(doc(db, "students", student.id), { aktif: newStatus });

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

    const viewRecord = (id: string) =>
        router.push({ pathname: "/record/[id]", params: { id } });

    // -------------------------
    // LOADING / ERROR
    // -------------------------
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

    // -------------------------
    // UI
    // -------------------------

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
                                    student.aktif === "Aktif"
                                        ? styles.statusActive
                                        : styles.statusPassive,
                                ]}
                            >
                                <Text
                                    style={
                                        student.aktif === "Aktif"
                                            ? styles.statusActiveText
                                            : styles.statusPassiveText
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

                {/* LIST + DETAIL */}
                <FlatList
                    ListHeaderComponent={
                        <View>

                            {/* PERSONAL INFO */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Kişisel Bilgiler</Text>

                                <InfoRow label="Email" value={student.email || "-"} icon={<Mail size={16} color="#60a5fa" />} />
                                <InfoRow label="Telefon" value={student.number || "-"} icon={<Phone size={16} color="#60a5fa" />} />
                                <InfoRow label="Cinsiyet" value={student.gender || "-"} icon={<User size={16} color="#60a5fa" />} />
                                <InfoRow label="Doğum Tarihi"
                                    value={student.dateOfBirth
                                        ? new Date(student.dateOfBirth).toLocaleDateString("tr-TR")
                                        : "-"}
                                    icon={<Calendar size={16} color="#60a5fa" />}
                                />
                                <InfoRow
                                    label="Değerlendirme Tarihi"
                                    value={
                                        student.assessmentDate
                                            ? new Date(student.assessmentDate).toLocaleDateString("tr-TR")
                                            : "-"
                                    }
                                    icon={<Calendar size={16} color="#60a5fa" />}
                                />

                                <InfoRow label="Boy (cm)" value={student.boy || "-"} icon={<User size={16} color="#60a5fa" />} />
                            </View>

                            {/* PAR-Q */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>PAR-Q Testi</Text>

                                <InfoRow label="Soru 1" value={student.q1 ? `${student.q1} ${student.q1aciklama || ""}` : "-"} />
                                <InfoRow label="Soru 2" value={student.q2 ? `${student.q2} ${student.q2aciklama || ""}` : "-"} />
                                <InfoRow label="Soru 3" value={student.q3 ? `${student.q3} ${student.q3aciklama || ""}` : "-"} />
                            </View>

                            {/* PERSONAL DETAILS */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Kişisel Detaylar</Text>

                                <InfoRow label="Ağrı / Yaralanma" value={student.qq1 || "-"} />
                                <InfoRow label="Ameliyat Geçirdiniz mi?" value={student.qq2 || "-"} />
                                <InfoRow label="Kronik Hastalık" value={student.qq3 || "-"} />
                                <InfoRow label="İlaç Kullanımı" value={student.qq4 || "-"} />
                                <InfoRow label="Haftalık Aktivite" value={student.qq5 || "-"} />
                                <InfoRow label="Spor Geçmişi" value={student.qq6 || "-"} />
                                <InfoRow label="Planlanan Gün" value={student.qq7 || "-"} />
                                <InfoRow label="Meslek" value={student.qq8 || "-"} />
                                <InfoRow label="Uzun Oturma" value={student.qq9 || "-"} />
                                <InfoRow label="Tekrarlı Hareket" value={student.qq10 || "-"} />
                                <InfoRow label="Topuklu Ayakkabı" value={student.qq11 || "-"} />
                                <InfoRow label="Stres / Endişe" value={student.qq12 || "-"} />
                                <InfoRow
                                    label="Hedefler"
                                    value={
                                        student.qq13 && student.qq13.length
                                            ? student.qq13.join(", ")
                                            : "-"
                                    }
                                />
                                <InfoRow label="Diğer" value={student.qq14 || "-"} />
                            </View>

                            <Text style={styles.recordsTitle}>Kayıtlar</Text>
                        </View>
                    }
                    data={records}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    renderItem={({ item }) => {
                        const dateStr = item.createdAt?.toDate
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

// -------------------------
// ROW COMPONENT
// -------------------------
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

// -------------------------
// STYLES
// -------------------------

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
    },
    loadingText: { color: "#94a3b8", marginTop: 10 },
    errorText: { color: "#f87171", marginBottom: 10 },

    /* HEADER */
    header: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 4,
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#1e293b",
    },
    backButtonText: {
        color: "#f1f5f9",
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
        fontWeight: "700",
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
        color: "#f1f5f9",
        fontSize: 12,
        fontWeight: "700",
    },

    /* STUDENT HEADER CARD */
    studentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    avatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "#60a5fa",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#0f172a",
        fontSize: 23,
        fontWeight: "800",
    },
    studentName: {
        color: "#f1f5f9",
        fontSize: 19,
        fontWeight: "700",
    },

    statusBadge: {
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: "flex-start",
    },
    statusActive: {
        backgroundColor: "rgba(34,197,94,0.15)",
    },
    statusPassive: {
        backgroundColor: "rgba(248,113,113,0.15)",
    },
    statusActiveText: {
        color: "#4ade80",
        fontSize: 11,
        fontWeight: "700",
    },
    statusPassiveText: {
        color: "#fca5a5",
        fontSize: 11,
        fontWeight: "700",
    },

    /* CARDS */
    card: {
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: "#0f172a",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1e293b",
        padding: 16,
    },
    cardTitle: {
        color: "#f1f5f9",
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 10,
    },

    /* INFO ROW */
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#1e293b",
    },
    infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    infoLabel: { color: "#94a3b8", fontSize: 12 },
    infoValue: { color: "#f1f5f9", fontSize: 13, maxWidth: "55%", textAlign: "right" },

    /* RECORDS */
    recordsTitle: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        color: "#60a5fa",
        fontSize: 16,
        fontWeight: "700",
    },

    recordCard: {
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: "#0f172a",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#1e293b",
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    recordDate: {
        color: "#f1f5f9",
        fontSize: 13,
        fontWeight: "600",
    },
    recordNote: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 2,
    },

    emptyText: {
        color: "#94a3b8",
        fontSize: 13,
    },
});

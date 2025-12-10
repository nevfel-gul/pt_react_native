
import { db } from "@/services/firebase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import {
    ArrowLeft,
    Calendar,
    HeartPulse,
    Mail,
    Phone,
    Ruler,
    Save,
    User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Student = {
    id: string;
    name: string;
    email?: string;
    number?: string;
    boy?: string;
    gender?: string;
    dateOfBirth?: string;
};

type FormData = {
    goal: string;
    complaint: string;
    trainingFrequency: string;
    sleepQuality: string;
    nutritionNote: string;
    hasPain: boolean;
    hadSurgery: boolean;
    notes: string;
};

export default function NewRecordScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [student, setStudent] = useState<Student | null>(null);
    const [loadingStudent, setLoadingStudent] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        goal: "",
        complaint: "",
        trainingFrequency: "",
        sleepQuality: "",
        nutritionNote: "",
        hasPain: false,
        hadSurgery: false,
        notes: "",
    });

    useEffect(() => {
        const fetchStudent = async () => {
            if (!id) return;
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
                        gender: data.gender,
                        dateOfBirth: data.dateOfBirth,
                    });
                } else {
                    setStudent(null);
                }
            } catch (err) {
                console.error("Öğrenci çekme hatası:", err);
                setStudent(null);
            } finally {
                setLoadingStudent(false);
            }
        };

        fetchStudent();
    }, [id]);

    const handleChange = (field: keyof FormData, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value } as FormData));
    };

    const handleSubmit = async () => {
        if (!id) {
            Alert.alert("Hata", "Öğrenci ID bulunamadı.");
            return;
        }

        // Basit validasyon
        if (!formData.goal.trim()) {
            Alert.alert("Uyarı", "Öğrencinin hedefini yazman lazım.");
            return;
        }

        try {
            setSubmitting(true);

            // 🔹 ŞİMDİLİK DUMMY: sadece console.log + alert
            console.log("Yeni kayıt (dummy):", {
                studentId: id,
                formData,
            });

            await addDoc(collection(db, "records"), {
                studentId: id,
                ...formData,
                createdAt: serverTimestamp(),
            });

            Alert.alert("Tamamdır", "Değerlendirme (dummy) olarak kaydedildi.");
            router.back();
        } catch (err) {
            console.error("Kayıt hata:", err);
            Alert.alert("Hata", "Kayıt sırasında bir hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoBack = () => {
        router.back();
    };

    if (loadingStudent) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.loadingText}>Öğrenci bilgileri yükleniyor...</Text>
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

    const today = new Date().toISOString().split("T")[0];

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

                        <View style={styles.dateRow}>
                            <Calendar size={16} color="#9ca3af" />
                            <Text style={styles.dateText}>Değerlendirme Tarihi: {today}</Text>
                        </View>
                    </View>

                    {/* Öğrenci kartı */}
                    <View style={styles.studentRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {student.name?.[0]?.toUpperCase() ?? "?"}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{student.name}</Text>
                            <View style={styles.studentMetaRow}>
                                {student.email ? (
                                    <View style={styles.metaItem}>
                                        <Mail size={14} color="#9ca3af" />
                                        <Text style={styles.metaText}>{student.email}</Text>
                                    </View>
                                ) : null}
                                {student.number ? (
                                    <View style={styles.metaItem}>
                                        <Phone size={14} color="#9ca3af" />
                                        <Text style={styles.metaText}>{student.number}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.studentMetaRow}>
                                {student.boy ? (
                                    <View style={styles.metaItem}>
                                        <Ruler size={14} color="#9ca3af" />
                                        <Text style={styles.metaText}>{student.boy} cm</Text>
                                    </View>
                                ) : null}
                                {student.gender ? (
                                    <View style={styles.metaItem}>
                                        <User size={14} color="#9ca3af" />
                                        <Text style={styles.metaText}>{student.gender}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>
                </View>

                {/* FORM */}
                <ScrollView
                    style={styles.formWrapper}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Bölüm: Genel Hedef */}
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <HeartPulse size={18} color="#38bdf8" />
                            <Text style={styles.cardTitle}>Genel Bilgiler</Text>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Antrenman hedefi</Text>
                            <TextInput
                                placeholder="Örn: Yağ yakımı, kas kazanımı..."
                                placeholderTextColor="#6b7280"
                                value={formData.goal}
                                onChangeText={(text) => handleChange("goal", text)}
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Şikayet / Rahatsızlık</Text>
                            <TextInput
                                placeholder="Bel, diz, omuz vs. varsa yaz..."
                                placeholderTextColor="#6b7280"
                                value={formData.complaint}
                                onChangeText={(text) => handleChange("complaint", text)}
                                style={[styles.input, styles.inputMultiline]}
                                multiline
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Haftalık antrenman sıklığı</Text>
                            <TextInput
                                placeholder="Örn: Haftada 3 gün"
                                placeholderTextColor="#6b7280"
                                value={formData.trainingFrequency}
                                onChangeText={(text) => handleChange("trainingFrequency", text)}
                                style={styles.input}
                            />
                        </View>
                    </View>

                    {/* Bölüm: Yaşam alışkanlıkları */}
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <HeartPulse size={18} color="#22c55e" />
                            <Text style={styles.cardTitle}>Yaşam Alışkanlıkları</Text>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Uyku kalitesi</Text>
                            <TextInput
                                placeholder="Örn: Gecede ortalama 6–7 saat, sık bölünüyor..."
                                placeholderTextColor="#6b7280"
                                value={formData.sleepQuality}
                                onChangeText={(text) => handleChange("sleepQuality", text)}
                                style={[styles.input, styles.inputMultiline]}
                                multiline
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Beslenme notu</Text>
                            <TextInput
                                placeholder="Günlük beslenme alışkanlıklarını kısaca yaz..."
                                placeholderTextColor="#6b7280"
                                value={formData.nutritionNote}
                                onChangeText={(text) => handleChange("nutritionNote", text)}
                                style={[styles.input, styles.inputMultiline]}
                                multiline
                            />
                        </View>
                    </View>

                    {/* Bölüm: Sağlık Geçmişi (dummy switch’ler) */}
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <HeartPulse size={18} color="#f97316" />
                            <Text style={styles.cardTitle}>Sağlık Geçmişi (Özet)</Text>
                        </View>

                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Ağrı / yaralanma var mı?</Text>
                                <Text style={styles.helpText}>
                                    Bel, diz, omuz gibi bölgelerde düzenli ağrı yaşıyor mu?
                                </Text>
                            </View>
                            <Switch
                                value={formData.hasPain}
                                onValueChange={(val) => handleChange("hasPain", val)}
                            />
                        </View>

                        <View style={styles.switchRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Geçirilmiş ameliyat var mı?</Text>
                                <Text style={styles.helpText}>
                                    Son yıllarda ortopedik ya da başka bir ameliyat.
                                </Text>
                            </View>
                            <Switch
                                value={formData.hadSurgery}
                                onValueChange={(val) => handleChange("hadSurgery", val)}
                            />
                        </View>
                    </View>

                    {/* Bölüm: Eğitmen Notu */}
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <HeartPulse size={18} color="#a855f7" />
                            <Text style={styles.cardTitle}>Eğitmen Notu</Text>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Notlar</Text>
                            <TextInput
                                placeholder="Genel izlenim, dikkat edilmesi gerekenler..."
                                placeholderTextColor="#6b7280"
                                value={formData.notes}
                                onChangeText={(text) => handleChange("notes", text)}
                                style={[styles.input, styles.inputMultiline]}
                                multiline
                            />
                        </View>
                    </View>

                    {/* Kaydet butonu */}
                    <View style={styles.submitWrapper}>
                        <TouchableOpacity
                            style={[styles.saveButton, submitting && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#0f172a" />
                            ) : (
                                <>
                                    <Save size={18} color="#0f172a" />
                                    <Text style={styles.saveButtonText}>Değerlendirmeyi Kaydet (Dummy)</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
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
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dateText: {
        color: "#9ca3af",
        fontSize: 12,
    },
    studentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#1d4ed8",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#f9fafb",
        fontSize: 22,
        fontWeight: "700",
    },
    studentName: {
        color: "#f9fafb",
        fontSize: 18,
        fontWeight: "700",
    },
    studentMetaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 4,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        color: "#9ca3af",
        fontSize: 12,
    },
    formWrapper: {
        flex: 1,
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
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    cardTitle: {
        color: "#e5e7eb",
        fontSize: 15,
        fontWeight: "600",
    },
    field: {
        marginTop: 8,
    },
    label: {
        color: "#e5e7eb",
        fontSize: 12,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: "#1f2937",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: "#e5e7eb",
        fontSize: 13,
        backgroundColor: "#020617",
    },
    inputMultiline: {
        minHeight: 70,
        textAlignVertical: "top",
    },
    helpText: {
        color: "#9ca3af",
        fontSize: 11,
        marginTop: 2,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 10,
    },
    submitWrapper: {
        marginHorizontal: 16,
        marginTop: 4,
    },
    saveButton: {
        marginTop: 8,
        borderRadius: 999,
        backgroundColor: "#38bdf8",
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    saveButtonText: {
        color: "#0f172a",
        fontWeight: "700",
        fontSize: 14,
    },
});

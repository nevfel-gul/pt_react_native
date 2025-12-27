// ---------------------
// UI FIXED + THEME UPDATED VERSION
// ---------------------
import { themeui } from "@/constants/themeui";
import { recordsColRef, studentDocRef } from "@/services/firestorePaths";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, getDoc, serverTimestamp } from "firebase/firestore";
import {
    ArrowLeft,
    HeartPulse,
    Mail,
    Phone,
    Ruler,
    Save,
    User
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
                const ref = studentDocRef(id);

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
            } finally {
                setLoadingStudent(false);
            }
        };

        fetchStudent();
    }, [id]);

    const handleChange = (field: keyof FormData, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!id) {
            Alert.alert("Hata", "Öğrenci ID bulunamadı.");
            return;
        }

        if (!formData.goal.trim()) {
            Alert.alert("Uyarı", "Öğrencinin hedefini yazman lazım.");
            return;
        }

        try {
            setSubmitting(true);

            await addDoc(recordsColRef(), {
                studentId: id,
                ...formData,
                createdAt: serverTimestamp(),
            });

            Alert.alert("Tamamdır", "Değerlendirme kaydedildi (dummy).");
            router.back();
        } catch (err) {
            console.error("Kayıt hata:", err);
            Alert.alert("Hata", "Kayıt sırasında bir hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingStudent) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#60a5fa" />
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
                    <TouchableOpacity style={styles.backButton} onPress={router.back}>
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
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // header varsa 80-100 dene
            >
                <View style={styles.container}>

                    {/* HEADER */}
                    <View style={styles.header}>
                        <View style={styles.headerTopRow}>
                            <TouchableOpacity style={styles.backButton} onPress={router.back}>
                                <ArrowLeft size={18} color="#e5e7eb" />
                                <Text style={styles.backButtonText}>Geri</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* FORM */}
                    <ScrollView
                        style={styles.formWrapper}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    >

                        {/* HEADER */}
                        <View style={styles.header}>
                            {/* STUDENT CARD */}
                            <View style={styles.studentRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {student.name?.[0]?.toUpperCase() ?? "?"}
                                    </Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.studentName}>{student.name}</Text>

                                    <View style={styles.studentMetaRow}>
                                        {student.email && (
                                            <View style={styles.metaItem}>
                                                <Mail size={14} color="#9ca3af" />
                                                <Text style={styles.metaText}>{student.email}</Text>
                                            </View>
                                        )}
                                        {student.number && (
                                            <View style={styles.metaItem}>
                                                <Phone size={14} color="#9ca3af" />
                                                <Text style={styles.metaText}>{student.number}</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.studentMetaRow}>
                                        {student.boy && (
                                            <View style={styles.metaItem}>
                                                <Ruler size={14} color="#9ca3af" />
                                                <Text style={styles.metaText}>{student.boy} cm</Text>
                                            </View>
                                        )}
                                        {student.gender && (
                                            <View style={styles.metaItem}>
                                                <User size={14} color="#9ca3af" />
                                                <Text style={styles.metaText}>{student.gender}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                        {/* KART 1 */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HeartPulse size={18} color="#38bdf8" />
                                <Text style={styles.cardTitle}>Genel Bilgiler</Text>
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Antrenman hedefi</Text>
                                <TextInput
                                    placeholder="Örn: Yağ yakımı, kas kazanımı..."
                                    placeholderTextColor="#64748b"
                                    value={formData.goal}
                                    onChangeText={(t) => handleChange("goal", t)}
                                    style={styles.input}
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Şikayet / Rahatsızlık</Text>
                                <TextInput
                                    placeholder="Bel, diz, omuz varsa yaz..."
                                    placeholderTextColor="#64748b"
                                    value={formData.complaint}
                                    onChangeText={(t) => handleChange("complaint", t)}
                                    style={[styles.input, styles.inputMultiline]}
                                    multiline
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Haftalık antrenman sıklığı</Text>
                                <TextInput
                                    placeholder="Örn: Haftada 3 gün"
                                    placeholderTextColor="#64748b"
                                    value={formData.trainingFrequency}
                                    onChangeText={(t) => handleChange("trainingFrequency", t)}
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        {/* KART 2 */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HeartPulse size={18} color="#22c55e" />
                                <Text style={styles.cardTitle}>Yaşam Alışkanlıkları</Text>
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Uyku kalitesi</Text>
                                <TextInput
                                    placeholder="Gecede 6–7 saat, bölünme var mı?"
                                    placeholderTextColor="#64748b"
                                    value={formData.sleepQuality}
                                    onChangeText={(t) => handleChange("sleepQuality", t)}
                                    style={[styles.input, styles.inputMultiline]}
                                    multiline
                                />
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Beslenme notu</Text>
                                <TextInput
                                    placeholder="Günlük beslenme alışkanlıkları..."
                                    placeholderTextColor="#64748b"
                                    value={formData.nutritionNote}
                                    onChangeText={(t) => handleChange("nutritionNote", t)}
                                    style={[styles.input, styles.inputMultiline]}
                                    multiline
                                />
                            </View>
                        </View>

                        {/* KART 3 */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HeartPulse size={18} color="#f97316" />
                                <Text style={styles.cardTitle}>Sağlık Geçmişi</Text>
                            </View>

                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Ağrı var mı?</Text>
                                    <Text style={styles.helpText}>
                                        Bel, diz, omuz gibi bölgelerde düzenli ağrı?
                                    </Text>
                                </View>
                                <Switch
                                    value={formData.hasPain}
                                    onValueChange={(v) => handleChange("hasPain", v)}
                                />
                            </View>

                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Ameliyat geçmişi?</Text>
                                    <Text style={styles.helpText}>
                                        Son yıllarda ortopedik veya başka bir ameliyat.
                                    </Text>
                                </View>
                                <Switch
                                    value={formData.hadSurgery}
                                    onValueChange={(v) => handleChange("hadSurgery", v)}
                                />
                            </View>
                        </View>

                        {/* KART 4 */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HeartPulse size={18} color="#a855f7" />
                                <Text style={styles.cardTitle}>Eğitmen Notu</Text>
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>Notlar</Text>
                                <TextInput
                                    placeholder="Genel izlenim, dikkat edilmesi gerekenler..."
                                    placeholderTextColor="#64748b"
                                    value={formData.notes}
                                    onChangeText={(t) => handleChange("notes", t)}
                                    style={[styles.input, styles.inputMultiline]}
                                    multiline
                                />
                            </View>
                        </View>
                    </ScrollView>
                    {/* SUBMIT BUTTON */}
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
                                    <Text style={styles.saveButtonText}>
                                        Değerlendirmeyi Kaydet
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* ------------------- STYLES ------------------- */
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
        padding: themeui.spacing.lg,
    },
    loadingText: {
        color: themeui.colors.text.secondary,
        marginTop: themeui.spacing.xs + 4,
    },
    errorText: {
        color: themeui.colors.danger,
        marginBottom: themeui.spacing.xs + 4,
    },

    /* HEADER */
    header: {
        paddingHorizontal: themeui.spacing.md,
        paddingTop: themeui.spacing.sm + 4,
        paddingBottom: themeui.spacing.xs,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: themeui.spacing.md - 2,
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
    backButtonText: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.sm,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.xs,
    },
    dateText: {
        color: themeui.colors.text.secondary,
        fontSize: themeui.fontSize.xs,
    },

    /* STUDENT CARD */
    studentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.md,
        marginTop: themeui.spacing.xs,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: themeui.colors.surface,
        fontSize: 20,
        fontWeight: "700",
    },
    studentName: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.lg + 2,
        fontWeight: "700",
    },
    studentMetaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: themeui.spacing.sm,
        marginTop: themeui.spacing.xs,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.xs - 2,
    },
    metaText: {
        color: themeui.colors.text.secondary,
        fontSize: themeui.fontSize.sm,
    },

    /* FORM CARD */
    formWrapper: { flex: 1 },

    card: {
        marginHorizontal: themeui.spacing.md,
        marginBottom: themeui.spacing.sm,
        backgroundColor: themeui.colors.surface,
        borderRadius: themeui.radius.lg,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        padding: themeui.spacing.md,
        ...themeui.shadow.soft,
    },
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: themeui.spacing.xs + 2,
        marginBottom: themeui.spacing.md - 4,
    },
    cardTitle: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.lg - 1,
        fontWeight: "600",
    },

    /* INPUTS */
    field: { marginTop: themeui.spacing.sm - 2 },
    label: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.sm,
        marginBottom: themeui.spacing.xs,
    },
    input: {
        borderWidth: 1,
        borderColor: themeui.colors.border,
        borderRadius: themeui.radius.md,
        paddingHorizontal: themeui.spacing.sm,
        paddingVertical: themeui.spacing.xs + 4,
        fontSize: themeui.fontSize.md - 1,
        backgroundColor: themeui.colors.surface,
        color: themeui.colors.text.primary,
    },
    inputMultiline: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    helpText: {
        color: themeui.colors.text.muted,
        fontSize: themeui.fontSize.xs,
        marginTop: themeui.spacing.xs - 2,
    },

    /* SWITCH ROW */
    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: themeui.spacing.sm,
        paddingVertical: themeui.spacing.xs - 2,
    },

    /* SUBMIT */
    submitWrapper: {
        paddingHorizontal: themeui.spacing.md + 2,
        paddingVertical: themeui.spacing.sm,
        backgroundColor: themeui.colors.background,
    },
    saveButton: {
        backgroundColor: themeui.colors.accent,
        borderRadius: themeui.radius.pill,
        paddingVertical: themeui.spacing.md - 2,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: themeui.spacing.xs + 2,
    },
    saveButtonText: {
        color: themeui.colors.surface,
        fontSize: themeui.fontSize.md,
        fontWeight: "700",
    },
});

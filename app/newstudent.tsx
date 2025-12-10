import { useRouter } from "expo-router";
import { ArrowLeft, Calendar, Save, User } from "lucide-react-native";
import React, { useState } from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Firebase Firestore importları – kendi dosya yoluna göre güncelle
import { db } from "@/services/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

type Gender = "Kadın" | "Erkek" | "";

type FormState = {
    name: string;
    boy: string;
    dateOfBirth: string;
    number: string;
    email: string;
    gender: Gender;
    assessmentDate: string;
    aktif: "Aktif" | "Pasif";
    // Basit PAR-Q placeholder soruları
    q1: "Evet" | "Hayır" | "";
    q2: "Evet" | "Hayır" | "";
    q3: "Evet" | "Hayır" | "";
};

const YeniOgrenciScreen = () => {
    const router = useRouter();

    const today = new Date().toISOString().split("T")[0];

    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>({
        name: "",
        boy: "",
        dateOfBirth: "",
        number: "",
        email: "",
        gender: "",
        assessmentDate: today,
        aktif: "Aktif",
        q1: "",
        q2: "",
        q3: "",
    });

    const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            Alert.alert("Eksik Bilgi", "Lütfen öğrencinin ad soyad bilgisini gir.");
            return;
        }
        if (!form.number.trim()) {
            Alert.alert("Eksik Bilgi", "Lütfen telefon numarasını gir.");
            return;
        }

        try {
            setSaving(true);

            await addDoc(collection(db, "students"), {
                ...form,
                createdAt: serverTimestamp(),
            });

            Alert.alert("Başarılı", "Öğrenci kaydedildi.", [
                {
                    text: "Tamam",
                    onPress: () => router.replace("/(tabs)/explore"),
                },
            ]);
        } catch (error: any) {
            console.error("Öğrenci kaydedilemedi:", error);
            Alert.alert("Hata", "Öğrenci kaydedilirken bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Üst header kartı */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.replace("/(tabs)/explore")}
                        >
                            <ArrowLeft size={18} color="#e5e7eb" />
                            <Text style={styles.backButtonText}>Geri</Text>
                        </TouchableOpacity>

                        <View style={styles.headerTitleRow}>
                            <View style={styles.iconCircle}>
                                <User size={22} color="#60a5fa" />
                            </View>
                            <View>
                                <Text style={styles.headerTitle}>Yeni Öğrenci</Text>
                                <View style={styles.dateRow}>
                                    <Calendar size={15} color="#9ca3af" />
                                    <Text style={styles.dateText}>
                                        Değerlendirme: {form.assessmentDate}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <ScrollView
                    style={styles.formScroll}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Kişisel Bilgiler */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>

                        <FormInput
                            label="Ad Soyad"
                            placeholder="Ad Soyad"
                            value={form.name}
                            onChangeText={(t) => updateField("name", t)}
                        />

                        <View style={styles.row}>
                            <View style={styles.rowItem}>
                                <FormInput
                                    label="Boy (cm)"
                                    placeholder="Örn: 168"
                                    keyboardType="numeric"
                                    value={form.boy}
                                    onChangeText={(t) => updateField("boy", t)}
                                />
                            </View>
                            <View style={styles.rowItem}>
                                <FormInput
                                    label="Telefon"
                                    placeholder="05xx xxx xx xx"
                                    keyboardType="phone-pad"
                                    value={form.number}
                                    onChangeText={(t) => updateField("number", t)}
                                />
                            </View>
                        </View>

                        <FormInput
                            label="E-mail"
                            placeholder="ornek@mail.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={form.email}
                            onChangeText={(t) => updateField("email", t)}
                        />

                        <View style={styles.row}>
                            <View style={styles.rowItem}>
                                <FormInput
                                    label="Doğum Tarihi"
                                    placeholder="YYYY-AA-GG"
                                    value={form.dateOfBirth}
                                    onChangeText={(t) => updateField("dateOfBirth", t)}
                                />
                                <Text style={styles.helperText}>
                                    (Şimdilik manuel tarih, istersen DatePicker ekleriz)
                                </Text>
                            </View>
                            <View style={styles.rowItem}>
                                <Text style={styles.label}>Cinsiyet</Text>
                                <View style={styles.chipRow}>
                                    <Chip
                                        label="Kadın"
                                        active={form.gender === "Kadın"}
                                        onPress={() => updateField("gender", "Kadın")}
                                    />
                                    <Chip
                                        label="Erkek"
                                        active={form.gender === "Erkek"}
                                        onPress={() => updateField("gender", "Erkek")}
                                    />
                                </View>
                            </View>
                        </View>

                        <Text style={styles.label}>Durum</Text>
                        <View style={styles.chipRow}>
                            <Chip
                                label="Aktif"
                                active={form.aktif === "Aktif"}
                                onPress={() => updateField("aktif", "Aktif")}
                            />
                            <Chip
                                label="Pasif"
                                active={form.aktif === "Pasif"}
                                onPress={() => updateField("aktif", "Pasif")}
                            />
                        </View>
                    </View>

                    {/* Basitleştirilmiş PAR-Q */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>PAR-Q (Özet)</Text>

                        <QuestionYesNo
                            label="Soru 1"
                            description="Kalp / tansiyon ile ilgili bir sağlık probleminiz var mı?"
                            value={form.q1}
                            onChange={(val) => updateField("q1", val)}
                        />
                        <QuestionYesNo
                            label="Soru 2"
                            description="Egzersiz sırasında göğüs ağrısı, nefes darlığı yaşıyor musunuz?"
                            value={form.q2}
                            onChange={(val) => updateField("q2", val)}
                        />
                        <QuestionYesNo
                            label="Soru 3"
                            description="Son 12 ayda ciddi bir yaralanma veya ameliyat geçirdiniz mi?"
                            value={form.q3}
                            onChange={(val) => updateField("q3", val)}
                        />
                    </View>
                </ScrollView>

                {/* Kaydet butonu */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && { opacity: 0.7 }]}
                        disabled={saving}
                        onPress={handleSubmit}
                    >
                        <Save size={18} color="#0f172a" />
                        <Text style={styles.saveButtonText}>
                            {saving ? "Kaydediliyor..." : "Öğrenciyi Kaydet"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

function FormInput(props: {
    label: string;
    value: string;
    placeholder?: string;
    onChangeText: (t: string) => void;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>{props.label}</Text>
            <TextInput
                style={styles.input}
                value={props.value}
                placeholder={props.placeholder}
                placeholderTextColor="#6b7280"
                onChangeText={props.onChangeText}
                keyboardType={props.keyboardType || "default"}
                autoCapitalize={props.autoCapitalize || "sentences"}
            />
        </View>
    );
}

function Chip({
    label,
    active,
    onPress,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.chip,
                active && styles.chipActive,
            ]}
        >
            <Text
                style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

function QuestionYesNo({
    label,
    description,
    value,
    onChange,
}: {
    label: string;
    description: string;
    value: "Evet" | "Hayır" | "";
    onChange: (val: "Evet" | "Hayır") => void;
}) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={styles.questionLabel}>{label}</Text>
            <Text style={styles.questionDescription}>{description}</Text>
            <View style={styles.chipRow}>
                <Chip
                    label="Evet"
                    active={value === "Evet"}
                    onPress={() => onChange("Evet")}
                />
                <Chip
                    label="Hayır"
                    active={value === "Hayır"}
                    onPress={() => onChange("Hayır")}
                />
            </View>
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
    headerCard: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 8,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
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
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#020617",
        borderWidth: 1,
        borderColor: "#1f2937",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        color: "#f9fafb",
        fontSize: 18,
        fontWeight: "700",
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },
    dateText: {
        color: "#9ca3af",
        fontSize: 12,
    },
    formScroll: {
        flex: 1,
    },
    sectionCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: "#020617",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1f2937",
        padding: 14,
    },
    sectionTitle: {
        color: "#e5e7eb",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 10,
    },
    label: {
        color: "#e5e7eb",
        fontSize: 13,
        marginBottom: 4,
    },
    input: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#1f2937",
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 14,
        color: "#e5e7eb",
        backgroundColor: "#020617",
    },
    helperText: {
        color: "#6b7280",
        fontSize: 11,
        marginTop: 2,
    },
    row: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 6,
    },
    rowItem: {
        flex: 1,
    },
    chipRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
        marginBottom: 6,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#1f2937",
        backgroundColor: "#020617",
    },
    chipActive: {
        backgroundColor: "#1d4ed8",
        borderColor: "#1d4ed8",
    },
    chipText: {
        color: "#9ca3af",
        fontSize: 12,
    },
    chipTextActive: {
        color: "#f9fafb",
        fontWeight: "600",
    },
    questionLabel: {
        color: "#e5e7eb",
        fontSize: 13,
        fontWeight: "600",
    },
    questionDescription: {
        color: "#9ca3af",
        fontSize: 12,
        marginTop: 2,
        marginBottom: 4,
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#020617",
        backgroundColor: "#020617",
    },
    saveButton: {
        backgroundColor: "#38bdf8",
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    saveButtonText: {
        color: "#0f172a",
        fontSize: 14,
        fontWeight: "700",
    },
});

export default YeniOgrenciScreen;

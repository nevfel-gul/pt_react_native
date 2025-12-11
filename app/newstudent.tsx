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
            Alert.alert("Eksik Bilgi", "Lütfen öğrencinin adını gir.");
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
        } catch (error) {
            console.error(error);
            Alert.alert("Hata", "Öğrenci kaydedilemedi.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>

                {/* HEADER */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTopRow}>

                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.replace("/(tabs)/explore")}
                        >
                            <ArrowLeft size={18} color="#f1f5f9" />
                            <Text style={styles.backButtonText}>Geri</Text>
                        </TouchableOpacity>

                        <View style={styles.headerTitleRow}>
                            <View style={styles.iconCircle}>
                                <User size={22} color="#60a5fa" />
                            </View>

                            <View>
                                <Text style={styles.headerTitle}>Yeni Öğrenci</Text>

                                <View style={styles.dateRow}>
                                    <Calendar size={14} color="#94a3b8" />
                                    <Text style={styles.dateText}>
                                        Değerlendirme: {form.assessmentDate}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* FORM */}
                <ScrollView
                    style={styles.formScroll}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                >

                    {/* BÖLÜM 1 */}
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
                                    placeholder="168"
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
                            placeholder="mail@example.com"
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

                    {/* BÖLÜM 2 */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>PAR-Q (Özet)</Text>

                        <QuestionYesNo
                            label="Soru 1"
                            description="Kalp / tansiyon hastalığınız var mı?"
                            value={form.q1}
                            onChange={(val) => updateField("q1", val)}
                        />

                        <QuestionYesNo
                            label="Soru 2"
                            description="Egzersizde göğüs ağrısı veya nefes darlığı oluyor mu?"
                            value={form.q2}
                            onChange={(val) => updateField("q2", val)}
                        />

                        <QuestionYesNo
                            label="Soru 3"
                            description="Son 12 ayda ciddi yaralanma / ameliyat geçirdiniz mi?"
                            value={form.q3}
                            onChange={(val) => updateField("q3", val)}
                        />
                    </View>

                </ScrollView>

                {/* BUTON */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={saving}
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

function FormInput({
    label,
    value,
    placeholder,
    onChangeText,
    keyboardType,
    autoCapitalize,
}: {
    label: string;
    value: string;
    placeholder?: string;
    onChangeText: (t: string) => void;
    keyboardType?: any;
    autoCapitalize?: any;
}) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={styles.label}>{label}</Text>

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#64748b"
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                style={styles.input}
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
            style={[styles.chip, active && styles.chipActive]}
        >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.questionLabel}>{label}</Text>
            <Text style={styles.questionDescription}>{description}</Text>

            <View style={styles.chipRow}>
                <Chip label="Evet" active={value === "Evet"} onPress={() => onChange("Evet")} />
                <Chip label="Hayır" active={value === "Hayır"} onPress={() => onChange("Hayır")} />
            </View>
        </View>
    );
}

/* ----------------- STYLES ----------------- */

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#020617" },
    container: { flex: 1, backgroundColor: "#020617" },

    headerCard: {
        paddingHorizontal: 18,
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
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#1e293b",
    },
    backButtonText: { color: "#f1f5f9", fontSize: 13 },

    headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#1e293b",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: "700" },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dateText: { color: "#94a3b8", fontSize: 12 },

    formScroll: { flex: 1 },

    sectionCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: "#0f172a",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1e293b",
        padding: 16,
    },

    sectionTitle: { color: "#f1f5f9", fontSize: 15, fontWeight: "600", marginBottom: 10 },
    label: { color: "#f1f5f9", fontSize: 13, marginBottom: 4 },

    input: {
        backgroundColor: "#0f172a",
        borderColor: "#1e293b",
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#f1f5f9",
        fontSize: 14,
    },

    helperText: { color: "#64748b", fontSize: 11, marginTop: 3 },

    row: { flexDirection: "row", gap: 12, marginBottom: 4 },
    rowItem: { flex: 1 },

    chipRow: { flexDirection: "row", gap: 8, marginTop: 4 },

    chip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#1e293b",
        backgroundColor: "#0f172a",
    },
    chipActive: {
        backgroundColor: "rgba(96,165,250,0.25)",
        borderColor: "#60a5fa",
    },
    chipText: { color: "#94a3b8", fontSize: 12 },
    chipTextActive: { color: "#bfdbfe", fontWeight: "600" },

    questionLabel: { color: "#f1f5f9", fontSize: 13, fontWeight: "600" },
    questionDescription: { color: "#94a3b8", fontSize: 12, marginBottom: 4 },

    footer: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: "#020617",
        borderTopWidth: 1,
        borderTopColor: "#1e293b",
    },

    saveButton: {
        backgroundColor: "#38bdf8",
        borderRadius: 999,
        paddingVertical: 14,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    saveButtonText: {
        color: "#0f172a",
        fontSize: 14,
        fontWeight: "700",
    },
});

export default YeniOgrenciScreen;

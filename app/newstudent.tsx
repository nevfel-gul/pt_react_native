import { themeui } from "@/constants/themeui";
import { auth } from "@/services/firebase";
import { studentsColRef } from "@/services/firestorePaths";
import { User as FirebaseUser, onAuthStateChanged } from "@firebase/auth";
import { useRouter } from "expo-router";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Calendar, Save, User as UserIcon } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Gender = "Kadın" | "Erkek" | "";
type Status = "Aktif" | "Pasif";
type Bool = boolean | null;

type FormState = {
    // Kişisel Bilgiler
    name: string;
    boy: string; // cm
    dateOfBirth: string; // YYYY-MM-DD
    number: string; // phone
    email: string;
    gender: Gender;
    assessmentDate: string;
    aktif: Status;

    // PAR-Q Testi (boolean + açıklama)
    doctorSaidHeartOrHypertension: Bool;
    doctorSaidHeartOrHypertensionNote: string;

    chestPainDuringActivityOrDaily: Bool;
    chestPainDuringActivityOrDailyNote: string;

    dizzinessOrLostConsciousnessLast12Months: Bool;
    dizzinessOrLostConsciousnessLast12MonthsNote: string;

    diagnosedOtherChronicDisease: Bool;
    diagnosedOtherChronicDiseaseNote: string;

    usesMedicationForChronicDisease: Bool;
    usesMedicationForChronicDiseaseNote: string;

    boneJointSoftTissueProblemWorseWithActivity: Bool;
    boneJointSoftTissueProblemWorseWithActivityNote: string;

    doctorSaidOnlyUnderMedicalSupervision: Bool;
    doctorSaidOnlyUnderMedicalSupervisionNote: string;

    // Kişisel Detaylar
    hadPainOrInjury: Bool;
    hadPainOrInjuryNote: string;

    hadSurgery: Bool;
    hadSurgeryNote: string;

    diagnosedChronicDiseaseByDoctor: Bool;
    diagnosedChronicDiseaseByDoctorNote: string;

    currentlyUsesMedications: Bool;
    currentlyUsesMedicationsNote: string;

    weeklyPhysicalActivity30MinOrLess: Bool;
    weeklyPhysicalActivity30MinOrLessNote: string;

    hasSportsHistoryOrCurrentlyDoingSport: Bool;
    hasSportsHistoryOrCurrentlyDoingSportNote: string;

    plannedDaysPerWeek: number | null; // 1-7
    jobDescription: string;

    jobRequiresLongSitting: Bool;
    jobRequiresRepetitiveMovement: Bool;
    jobRequiresHighHeels: Bool;
    jobCausesAnxiety: Bool;

    // Antrenman hedefleri
    trainingGoals: string[]; // çoklu
    otherGoal: string;
};

const YeniOgrenciScreen = () => {
    const router = useRouter();
    const today = new Date().toISOString().split("T")[0];

    const trainingGoalOptions = useMemo(
        () => [
            "Kilo vermek / Yağ yakmak",
            "Kas yapmak / Sıkılaşmak",
            "Formda kalmak / Sağlıklı olmak",
            "Duruşumu düzeltmek / Esneklik kazanmak",
            "Dayanıklılığımı artırmak",
            "Bölgesel şekillenme (örnek: karın, kalça)",
        ],
        []
    );


    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true); // <-- burada true olmalı

    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>({
        // Kişisel Bilgiler
        name: "",
        boy: "",
        dateOfBirth: "",
        number: "",
        email: "",
        gender: "",
        assessmentDate: today,
        aktif: "Aktif",

        // PAR-Q
        doctorSaidHeartOrHypertension: null,
        doctorSaidHeartOrHypertensionNote: "",

        chestPainDuringActivityOrDaily: null,
        chestPainDuringActivityOrDailyNote: "",

        dizzinessOrLostConsciousnessLast12Months: null,
        dizzinessOrLostConsciousnessLast12MonthsNote: "",

        diagnosedOtherChronicDisease: null,
        diagnosedOtherChronicDiseaseNote: "",

        usesMedicationForChronicDisease: null,
        usesMedicationForChronicDiseaseNote: "",

        boneJointSoftTissueProblemWorseWithActivity: null,
        boneJointSoftTissueProblemWorseWithActivityNote: "",

        doctorSaidOnlyUnderMedicalSupervision: null,
        doctorSaidOnlyUnderMedicalSupervisionNote: "",

        // Kişisel Detaylar
        hadPainOrInjury: null,
        hadPainOrInjuryNote: "",

        hadSurgery: null,
        hadSurgeryNote: "",

        diagnosedChronicDiseaseByDoctor: null,
        diagnosedChronicDiseaseByDoctorNote: "",

        currentlyUsesMedications: null,
        currentlyUsesMedicationsNote: "",

        weeklyPhysicalActivity30MinOrLess: null,
        weeklyPhysicalActivity30MinOrLessNote: "",

        hasSportsHistoryOrCurrentlyDoingSport: null,
        hasSportsHistoryOrCurrentlyDoingSportNote: "",

        plannedDaysPerWeek: null,
        jobDescription: "",

        jobRequiresLongSitting: null,
        jobRequiresRepetitiveMovement: null,
        jobRequiresHighHeels: null,
        jobCausesAnxiety: null,

        trainingGoals: [],
        otherGoal: "",
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const toggleMulti = (key: "trainingGoals", value: string) => {
        setForm((prev) => {
            const exists = prev[key].includes(value);
            return {
                ...prev,
                [key]: exists ? prev[key].filter((x) => x !== value) : [...prev[key], value],
            };
        });
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
            await addDoc(studentsColRef(auth.currentUser?.uid!), {
                ...form,
                ownerUid: auth.currentUser?.uid,   // opsiyonel ama iyi
                createdAt: serverTimestamp(),
            });

            Alert.alert("Başarılı", "Öğrenci kaydedildi.", [
                { text: "Tamam", onPress: () => router.replace("/(tabs)") },
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
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // header varsa 80-100 dene
            >

                <View style={styles.container}>
                    {/* HEADER */}
                    <View style={styles.headerCard}>
                        <View style={styles.headerTopRow}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => router.replace("/(tabs)")}
                            >
                                <ArrowLeft size={18} color="#f1f5f9" />
                                <Text style={styles.backButtonText}>Geri</Text>
                            </TouchableOpacity>

                            <View style={styles.headerTitleRow}>
                                <View style={styles.iconCircle}>
                                    <UserIcon size={22} color="#60a5fa" />
                                </View>

                                <View>
                                    <Text style={styles.headerTitle}>Yeni Öğrenci</Text>

                                    <View style={styles.dateRow}>
                                        <Calendar size={14} color="#94a3b8" />
                                        <Text style={styles.dateText}>Değerlendirme: {form.assessmentDate}</Text>
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
                                label="E-posta"
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
                                        <Chip label="Kadın" active={form.gender === "Kadın"} onPress={() => updateField("gender", "Kadın")} />
                                        <Chip label="Erkek" active={form.gender === "Erkek"} onPress={() => updateField("gender", "Erkek")} />
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.label}>Durum</Text>
                            <View style={styles.chipRow}>
                                <Chip label="Aktif" active={form.aktif === "Aktif"} onPress={() => updateField("aktif", "Aktif")} />
                                <Chip label="Pasif" active={form.aktif === "Pasif"} onPress={() => updateField("aktif", "Pasif")} />
                            </View>
                        </View>

                        {/* BÖLÜM 2 - PAR-Q */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>PAR-Q Testi</Text>

                            <QuestionBool
                                title="Doktorunuz kalp hastalığı veya yüksek tansiyon ile ilgili bir sorununuz olduğunu söyledi mi?"
                                value={form.doctorSaidHeartOrHypertension}
                                onChange={(v) => updateField("doctorSaidHeartOrHypertension", v)}
                            />
                            {form.doctorSaidHeartOrHypertension === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.doctorSaidHeartOrHypertensionNote}
                                    onChangeText={(t) => updateField("doctorSaidHeartOrHypertensionNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Dinlenme sırasında, günlük aktiviteler sırasında ya da fiziksel aktivite sırasında göğsünüzde ağrı hisseder misiniz?"
                                value={form.chestPainDuringActivityOrDaily}
                                onChange={(v) => updateField("chestPainDuringActivityOrDaily", v)}
                            />
                            {form.chestPainDuringActivityOrDaily === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.chestPainDuringActivityOrDailyNote}
                                    onChangeText={(t) => updateField("chestPainDuringActivityOrDailyNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Baş dönmesi nedeniyle dengeniz bozulur mu, ya da son 12 ay içerisinde bilincinizi yitirdiniz mi?"
                                value={form.dizzinessOrLostConsciousnessLast12Months}
                                onChange={(v) => updateField("dizzinessOrLostConsciousnessLast12Months", v)}
                            />
                            {form.dizzinessOrLostConsciousnessLast12Months === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.dizzinessOrLostConsciousnessLast12MonthsNote}
                                    onChangeText={(t) => updateField("dizzinessOrLostConsciousnessLast12MonthsNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Kalp ve tansiyon dışında bir başka kronik hastalık teşhisi aldınız mı?"
                                value={form.diagnosedOtherChronicDisease}
                                onChange={(v) => updateField("diagnosedOtherChronicDisease", v)}
                            />
                            {form.diagnosedOtherChronicDisease === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.diagnosedOtherChronicDiseaseNote}
                                    onChangeText={(t) => updateField("diagnosedOtherChronicDiseaseNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Kronik bir hastalık nedeniyle ilaç kullanıyor musunuz?"
                                value={form.usesMedicationForChronicDisease}
                                onChange={(v) => updateField("usesMedicationForChronicDisease", v)}
                            />
                            {form.usesMedicationForChronicDisease === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.usesMedicationForChronicDiseaseNote}
                                    onChangeText={(t) => updateField("usesMedicationForChronicDiseaseNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Son 12 ay içerisinde fiziksel aktivite artışı ile kötüleşebilecek bir kemik, bağ, yumuşak doku probleminiz oldu mu?"
                                value={form.boneJointSoftTissueProblemWorseWithActivity}
                                onChange={(v) => updateField("boneJointSoftTissueProblemWorseWithActivity", v)}
                            />
                            {form.boneJointSoftTissueProblemWorseWithActivity === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.boneJointSoftTissueProblemWorseWithActivityNote}
                                    onChangeText={(t) => updateField("boneJointSoftTissueProblemWorseWithActivityNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Doktorunuz fiziksel aktivitenizi sadece tıbbi gözetim altında yapabileceğinizi söyledi mi?"
                                value={form.doctorSaidOnlyUnderMedicalSupervision}
                                onChange={(v) => updateField("doctorSaidOnlyUnderMedicalSupervision", v)}
                            />
                            {form.doctorSaidOnlyUnderMedicalSupervision === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.doctorSaidOnlyUnderMedicalSupervisionNote}
                                    onChangeText={(t) => updateField("doctorSaidOnlyUnderMedicalSupervisionNote", t)}
                                />
                            )}
                        </View>

                        {/* BÖLÜM 3 - Kişisel Detaylar */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Kişisel Detaylar</Text>

                            <QuestionBool
                                title="Hiç ağrı veya yaralanman oldu mu? (ayak bileği, diz, kalça, sırt, omuz vb)"
                                value={form.hadPainOrInjury}
                                onChange={(v) => updateField("hadPainOrInjury", v)}
                            />
                            {form.hadPainOrInjury === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.hadPainOrInjuryNote}
                                    onChangeText={(t) => updateField("hadPainOrInjuryNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Hiç ameliyat geçirdin mi?"
                                value={form.hadSurgery}
                                onChange={(v) => updateField("hadSurgery", v)}
                            />
                            {form.hadSurgery === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.hadSurgeryNote}
                                    onChangeText={(t) => updateField("hadSurgeryNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Bir doktor tarafından kalp hastalığı, yüksek tansiyon, kolesterol, diyabet gibi kronik bir hastalık teşhisi kondu mu?"
                                value={form.diagnosedChronicDiseaseByDoctor}
                                onChange={(v) => updateField("diagnosedChronicDiseaseByDoctor", v)}
                            />
                            {form.diagnosedChronicDiseaseByDoctor === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.diagnosedChronicDiseaseByDoctorNote}
                                    onChangeText={(t) => updateField("diagnosedChronicDiseaseByDoctorNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Halen almakta olduğun ilaçlar var mı?"
                                value={form.currentlyUsesMedications}
                                onChange={(v) => updateField("currentlyUsesMedications", v)}
                            />
                            {form.currentlyUsesMedications === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.currentlyUsesMedicationsNote}
                                    onChangeText={(t) => updateField("currentlyUsesMedicationsNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Haftalık fiziksel aktivite süreniz 30 dakika veya daha az mı?"
                                value={form.weeklyPhysicalActivity30MinOrLess}
                                onChange={(v) => updateField("weeklyPhysicalActivity30MinOrLess", v)}
                            />
                            {form.weeklyPhysicalActivity30MinOrLess === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.weeklyPhysicalActivity30MinOrLessNote}
                                    onChangeText={(t) => updateField("weeklyPhysicalActivity30MinOrLessNote", t)}
                                />
                            )}

                            <QuestionBool
                                title="Herhangi bir spor geçmişiniz veya şu an devam ettiğiniz bir spor branşı var mı?"
                                value={form.hasSportsHistoryOrCurrentlyDoingSport}
                                onChange={(v) => updateField("hasSportsHistoryOrCurrentlyDoingSport", v)}
                            />
                            {form.hasSportsHistoryOrCurrentlyDoingSport === true && (
                                <FormTextArea
                                    label="Açıklama"
                                    placeholder="Detay yaz..."
                                    value={form.hasSportsHistoryOrCurrentlyDoingSportNote}
                                    onChangeText={(t) => updateField("hasSportsHistoryOrCurrentlyDoingSportNote", t)}
                                />
                            )}

                            <Text style={styles.label}>Haftada kaç gün gelmeyi planlıyorsunuz?</Text>
                            <View style={[styles.chipRow, { flexWrap: "wrap" }]}>
                                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                                    <Chip
                                        key={n}
                                        label={String(n)}
                                        active={form.plannedDaysPerWeek === n}
                                        onPress={() => updateField("plannedDaysPerWeek", n)}
                                    />
                                ))}
                            </View>

                            <FormTextArea
                                label="Halihazırda yaptığınız iş nedir?"
                                placeholder="Mesleğiniz..."
                                value={form.jobDescription}
                                onChangeText={(t) => updateField("jobDescription", t)}
                            />

                            <QuestionBool
                                title="Yaptığınız iş uzun süre oturmanızı gerektiriyor mu?"
                                value={form.jobRequiresLongSitting}
                                onChange={(v) => updateField("jobRequiresLongSitting", v)}
                            />

                            <QuestionBool
                                title="Yaptığınız iş uzun süre tekrarlı hareket gerektiriyor mu?"
                                value={form.jobRequiresRepetitiveMovement}
                                onChange={(v) => updateField("jobRequiresRepetitiveMovement", v)}
                            />

                            <QuestionBool
                                title="Yaptığınız iş topuklu ayakkabı giymenizi gerektiriyor mu?"
                                value={form.jobRequiresHighHeels}
                                onChange={(v) => updateField("jobRequiresHighHeels", v)}
                            />

                            <QuestionBool
                                title="Yaptığınız iş endişeye yol açıyor mu?"
                                value={form.jobCausesAnxiety}
                                onChange={(v) => updateField("jobCausesAnxiety", v)}
                            />

                            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Antrenman Hedefi</Text>
                            <Text style={styles.helperText}>Birden fazla seçebilirsin</Text>

                            <View style={[styles.chipRow, { flexWrap: "wrap", marginTop: 8 }]}>
                                {trainingGoalOptions.map((opt) => (
                                    <Chip
                                        key={opt}
                                        label={opt}
                                        active={form.trainingGoals.includes(opt)}
                                        onPress={() => toggleMulti("trainingGoals", opt)}
                                    />
                                ))}
                            </View>

                            <FormTextArea
                                label="Diğer (opsiyonel)"
                                placeholder="Diğer hedefin..."
                                value={form.otherGoal}
                                onChangeText={(t) => updateField("otherGoal", t)}
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
            </KeyboardAvoidingView>

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

function FormTextArea({
    label,
    value,
    placeholder,
    onChangeText,
}: {
    label: string;
    value: string;
    placeholder?: string;
    onChangeText: (t: string) => void;
}) {
    return (
        <View style={{ marginBottom: 14, marginTop: 8 }}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#64748b"
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.textArea]}
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
        <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

function QuestionBool({
    title,
    value,
    onChange,
}: {
    title: string;
    value: Bool;
    onChange: (val: boolean) => void;
}) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.questionTitle}>{title}</Text>

            <View style={styles.chipRow}>
                <Chip label="Evet" active={value === true} onPress={() => onChange(true)} />
                <Chip label="Hayır" active={value === false} onPress={() => onChange(false)} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: themeui.colors.background },
    container: { flex: 1, backgroundColor: themeui.colors.background },

    headerCard: {
        paddingHorizontal: themeui.spacing.md,
        paddingTop: themeui.spacing.sm,
        paddingBottom: themeui.spacing.xs,
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
        paddingHorizontal: themeui.spacing.sm,
        paddingVertical: themeui.spacing.xs,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.surface,
        borderWidth: 1,
        borderColor: themeui.colors.border,
    },
    backButtonText: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.sm },

    headerTitleRow: { flexDirection: "row", alignItems: "center", gap: themeui.spacing.md },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.surface,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.lg, fontWeight: "700" },
    dateRow: { flexDirection: "row", alignItems: "center", gap: themeui.spacing.xs },
    dateText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.xs },

    formScroll: { flex: 1 },

    sectionCard: {
        marginHorizontal: themeui.spacing.md,
        marginBottom: themeui.spacing.sm,
        backgroundColor: themeui.colors.surface,
        borderRadius: themeui.radius.lg,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        padding: themeui.spacing.md,
    },

    sectionTitle: {
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.md,
        fontWeight: "600",
        marginBottom: themeui.spacing.sm,
    },

    label: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.sm, marginBottom: 4 },

    input: {
        backgroundColor: themeui.colors.surface,
        borderColor: themeui.colors.border,
        borderWidth: 1,
        borderRadius: themeui.radius.md,
        paddingHorizontal: themeui.spacing.sm,
        paddingVertical: 10,
        color: themeui.colors.text.primary,
        fontSize: themeui.fontSize.md,
    },
    textArea: {
        minHeight: 90,
        paddingTop: themeui.spacing.xs,
    },

    helperText: { color: themeui.colors.text.muted, fontSize: themeui.fontSize.xs, marginTop: 3 },

    row: { flexDirection: "row", gap: themeui.spacing.sm, marginBottom: 4 },
    rowItem: { flex: 1 },

    chipRow: { flexDirection: "row", gap: themeui.spacing.xs, marginTop: themeui.spacing.xs },

    chip: {
        paddingHorizontal: themeui.spacing.sm,
        paddingVertical: 7,
        borderRadius: themeui.radius.pill,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        backgroundColor: themeui.colors.surface,
        marginBottom: 6,
    },
    chipActive: {
        backgroundColor: themeui.colors.primary + "33",
        borderColor: themeui.colors.primary,
    },
    chipText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.sm },
    chipTextActive: { color: themeui.colors.primary, fontWeight: "600" },

    questionTitle: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.sm, fontWeight: "600", lineHeight: 18 },

    footer: {
        paddingHorizontal: themeui.spacing.md,
        paddingVertical: themeui.spacing.sm,
        backgroundColor: themeui.colors.background,
    },

    saveButton: {
        backgroundColor: themeui.colors.accent,
        borderRadius: themeui.radius.pill,
        paddingVertical: themeui.spacing.md,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: themeui.spacing.xs,
    },
    saveButtonText: {
        color: themeui.colors.surface,
        fontSize: themeui.fontSize.md,
        fontWeight: "700",
    },
});

export default YeniOgrenciScreen;

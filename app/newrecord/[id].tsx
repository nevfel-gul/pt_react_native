import { recordsColRef, studentDocRef } from "@/services/firestorePaths";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, getDoc, serverTimestamp } from "firebase/firestore";
import {
    ArrowLeft,
    BicepsFlexed,
    Calendar,
    HandHeart,
    HeartPulse,
    Mail,
    PersonStanding,
    Phone,
    Ruler,
    SquareActivity,
    User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
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
    // Fiziksel Ölçümler (Tanita)
    weight: string;
    bodyFat: string;
    restingHeartRate: string;
    bodyMassIndex: string;
    basalMetabolism: string;
    totalMuscleMass: string;
    leanBodyMass: string;
    bodyWaterMass: string;
    impedance: string;
    metabolicAge: string;

    // Mezura çevre ölçümleri
    boyun: string;
    omuz: string;
    gogus: string;
    sagKol: string;
    solKol: string;
    bel: string;
    kalca: string;
    sagBacak: string;
    solBacak: string;
    sagKalf: string;
    solKalf: string;
    mezuraNote: string;

    // Aerobik uygunluk
    dinlenikNabiz: string;
    carvonenMultiplier: string;
    toparlanmaNabzi: string;
    testSuresi: string;

    // Statik postür notları (3 yönden)
    ayakveayakbilegionden: string;
    ayakveayakbilegiyandan: string;
    ayakveayakbilegiarkadan: string;

    dizonden: string;
    dizyandan: string;
    dizarkadan: string;

    lphkonden: string;
    lphkyandan: string;
    lphkarkadan: string;

    omuzlaronden: string;
    omuzlaryandan: string;
    omuzlararkadan: string;

    basboyunonden: string;
    basboyunyandan: string;
    basboyunarkadan: string;

    pronation: string; // "Evet"/"Hayır"
    lower: string;
    upper: string;

    // Overhead squat test – checkbox’lar
    footTurnsOut: boolean;
    kneeMovesInward: boolean;
    kneeMovesOutward: boolean;
    excessiveForwardLean: boolean;
    lowBackArches: boolean;
    lowBackRound: boolean;
    armsFallForward: boolean;
    overheadsquatnotes: string;

    // Sit and Reach
    sitandreach1: string;
    sitandreach2: string;
    sitandreach3: string;
    sitandreachnotes: string;

    // Kuvvet testleri
    pushup: string;
    modifiedpushup: string; // "Evet"/"Hayır"
    wallsit: string;
    plank: string;
    mekik: string;
    rmsquatweight: string;
    rmsquatrep: string;
    kuvvetnotes: string;

    // Tarih
    assessmentDate: string;
};

const STEPS = [
    "Fiziksel Ölçümler",
    "Aerobik Uygunluk",
    "Hareket & Esneklik",
    "Kuvvet Testleri",
];

export default function NewRecordScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [student, setStudent] = useState<Student | null>(null);
    const [loadingStudent, setLoadingStudent] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState(0);

    const isLastStep = step === STEPS.length - 1;

    const [formData, setFormData] = useState<FormData>({
        weight: "",
        bodyFat: "",
        restingHeartRate: "",
        bodyMassIndex: "",
        basalMetabolism: "",
        totalMuscleMass: "",
        leanBodyMass: "",
        bodyWaterMass: "",
        impedance: "",
        metabolicAge: "",

        boyun: "",
        omuz: "",
        gogus: "",
        sagKol: "",
        solKol: "",
        bel: "",
        kalca: "",
        sagBacak: "",
        solBacak: "",
        sagKalf: "",
        solKalf: "",
        mezuraNote: "",

        dinlenikNabiz: "",
        carvonenMultiplier: "",
        toparlanmaNabzi: "",
        testSuresi: "",

        ayakveayakbilegionden: "",
        ayakveayakbilegiyandan: "",
        ayakveayakbilegiarkadan: "",

        dizonden: "",
        dizyandan: "",
        dizarkadan: "",

        lphkonden: "",
        lphkyandan: "",
        lphkarkadan: "",

        omuzlaronden: "",
        omuzlaryandan: "",
        omuzlararkadan: "",

        basboyunonden: "",
        basboyunyandan: "",
        basboyunarkadan: "",

        pronation: "",
        lower: "",
        upper: "",

        footTurnsOut: false,
        kneeMovesInward: false,
        kneeMovesOutward: false,
        excessiveForwardLean: false,
        lowBackArches: false,
        lowBackRound: false,
        armsFallForward: false,
        overheadsquatnotes: "",

        sitandreach1: "",
        sitandreach2: "",
        sitandreach3: "",
        sitandreachnotes: "",

        pushup: "",
        modifiedpushup: "",
        wallsit: "",
        plank: "",
        mekik: "",
        rmsquatweight: "",
        rmsquatrep: "",
        kuvvetnotes: "",

        assessmentDate: new Date().toISOString().split("T")[0],
    });

    const handleChange = (field: keyof FormData, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value as any }));
    };

    const handleNextStep = () => {
        setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    };

    const handlePrevStep = () => {
        if (step === 0) {
            router.back();
            return;
        }
        setStep((prev) => prev - 1);
    };


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

    const handleSubmit = async () => {
        if (!id) {
            Alert.alert("Hata", "Öğrenci ID bulunamadı.");
            return;
        }

        try {
            setSubmitting(true);

            await addDoc(recordsColRef(), {
                studentId: id,
                ...formData,
                createdAt: serverTimestamp(),
            });

            Alert.alert("Tamamdır", "Değerlendirme kaydedildi.");
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
                    <TouchableOpacity style={styles.backButton} onPress={router.back}>
                        <ArrowLeft size={18} color="#e5e7eb" />
                        <Text style={styles.backButtonText}>Geri</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const renderStepIndicator = () => (
        <View style={styles.stepIndicatorWrapper}>
            {STEPS.map((label, index) => {
                const active = index === step;
                const done = index < step;
                return (
                    <View key={index} style={styles.stepItem}>
                        <View
                            style={[
                                styles.stepCircle,
                                done && { backgroundColor: "#22c55e", borderColor: "#22c55e" },
                                active && !done && { backgroundColor: "#38bdf8", borderColor: "#38bdf8" },
                            ]}
                        >
                            <Text style={styles.stepCircleText}>{index + 1}</Text>
                        </View>
                        <Text
                            style={[
                                styles.stepLabel,
                                (active || done) && { color: "#e5e7eb" },
                            ]}
                        >
                            {label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );

    const renderNumericInput = (
        field: keyof FormData,
        label: string,
        placeholder?: string
    ) => (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                placeholder={placeholder}
                placeholderTextColor="#64748b"
                value={formData[field] as string}
                onChangeText={(t) => handleChange(field, t)}
                style={styles.input}
                keyboardType="numeric"
            />
        </View>
    );

    const renderTextArea = (
        field: keyof FormData,
        label: string,
        placeholder?: string
    ) => (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                placeholder={placeholder}
                placeholderTextColor="#64748b"
                value={formData[field] as string}
                onChangeText={(t) => handleChange(field, t)}
                style={[styles.input, styles.inputMultiline]}
                multiline
            />
        </View>
    );

    const renderRadioRow = (
        field: keyof FormData,
        label: string,
        options: string[]
    ) => (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.radioRow}>
                {options.map((opt) => {
                    const selected = formData[field] === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[
                                styles.radioPill,
                                selected && { backgroundColor: "#38bdf8", borderColor: "#38bdf8" },
                            ]}
                            onPress={() => handleChange(field, opt)}
                        >
                            <Text
                                style={[
                                    styles.radioPillText,
                                    selected && { color: "#0f172a" },
                                ]}
                            >
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const renderCheckboxRow = (
        field: keyof FormData,
        label: string
    ) => {
        const value = formData[field] as boolean;
        return (
            <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => handleChange(field, !value)}
            >
                <View
                    style={[
                        styles.checkboxBox,
                        value && { backgroundColor: "#38bdf8", borderColor: "#38bdf8" },
                    ]}
                >
                    {value && <Text style={styles.checkboxBoxText}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{label}</Text>
            </TouchableOpacity>
        );
    };

    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <>
                        {/* FİZİKSEL ÖLÇÜMLER */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HandHeart size={18} color="#38bdf8" />
                                <Text style={styles.cardTitle}>Fiziksel Ölçümler (Tanita)</Text>
                            </View>
                            {renderNumericInput("weight", "Kilo (kg)")}
                            {renderNumericInput("bodyMassIndex", "Vücut Kitle İndeksi (VKİ)")}
                            {renderNumericInput("basalMetabolism", "Bazal Metabolizma Hızı")}
                            {renderNumericInput("bodyFat", "Vücut Yağ Oranı (%)")}
                            {renderNumericInput("totalMuscleMass", "Toplam Kas Kütlesi (kg)")}
                            {renderNumericInput("leanBodyMass", "Yağsız Kütle (kg)")}
                            {renderNumericInput("bodyWaterMass", "Vücut Sıvı Oranı (%)")}
                            {renderNumericInput("impedance", "Empedans (Ω - Ohm)")}
                            {renderNumericInput("metabolicAge", "Metabolik Yaş")}
                        </View>

                        {/* ÇEVRE ÖLÇÜMLERİ */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <Ruler size={18} color="#22c55e" />
                                <Text style={styles.cardTitle}>Çevre Ölçümleri (Mezura)</Text>
                            </View>
                            {renderNumericInput("boyun", "Boyun")}
                            {renderNumericInput("omuz", "Omuz")}
                            {renderNumericInput("gogus", "Göğüs")}
                            {renderNumericInput("sagKol", "Sağ Kol")}
                            {renderNumericInput("solKol", "Sol Kol")}
                            {renderNumericInput("bel", "Bel")}
                            {renderNumericInput("kalca", "Kalça")}
                            {renderNumericInput("sagBacak", "Sağ Bacak")}
                            {renderNumericInput("solBacak", "Sol Bacak")}
                            {renderNumericInput("sagKalf", "Sağ Kalf")}
                            {renderNumericInput("solKalf", "Sol Kalf")}
                            {renderTextArea("mezuraNote", "Mezura Notu")}
                        </View>
                    </>
                );
            case 1:
                return (
                    <>
                        {/* AEROBİK UYGUNLUK */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <SquareActivity size={18} color="#f97316" />
                                <Text style={styles.cardTitle}>
                                    Aerobik Uygunluk / Hedef KAH
                                </Text>
                            </View>

                            {renderNumericInput("dinlenikNabiz", "Dinlenik Nabız")}
                            {renderRadioRow(
                                "carvonenMultiplier",
                                "Carvonen Egzersiz Şiddeti (Zone)",
                                ["0.55", "0.65", "0.75", "0.85", "0.95"]
                            )}
                            {renderNumericInput(
                                "toparlanmaNabzi",
                                "YMCA 3 dk Basamak Testi – Toparlanma Nabzı"
                            )}

                            <View style={[styles.field, { marginTop: 16 }]}>
                                <Text style={styles.label}>Bruce Testi – Süre (dk)</Text>
                                <TextInput
                                    placeholder="Test süresi (dk)"
                                    placeholderTextColor="#64748b"
                                    value={formData.testSuresi}
                                    onChangeText={(t) => handleChange("testSuresi", t)}
                                    style={styles.input}
                                    keyboardType="numeric"
                                />
                                <Text style={styles.helpText}>
                                    Bruce testi protokolü: Koşu bandında her 3 dakikada bir hız ve
                                    eğim artar, dayanabildiği son süre kaydedilir.
                                </Text>
                            </View>
                        </View>
                    </>
                );
            case 2:
                return (
                    <>
                        {/* HAREKET & ESNEKLİK */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <PersonStanding size={18} color="#a855f7" />
                                <Text style={styles.cardTitle}>Statik Postür Analizi</Text>
                            </View>

                            {renderTextArea(
                                "ayakveayakbilegionden",
                                "Ayak & Ayak Bileği (Önden)"
                            )}
                            {renderTextArea(
                                "ayakveayakbilegiyandan",
                                "Ayak & Ayak Bileği (Yandan)"
                            )}
                            {renderTextArea(
                                "ayakveayakbilegiarkadan",
                                "Ayak & Ayak Bileği (Arkadan)"
                            )}

                            {renderTextArea("dizonden", "Diz (Önden)")}
                            {renderTextArea("dizyandan", "Diz (Yandan)")}
                            {renderTextArea("dizarkadan", "Diz (Arkadan)")}

                            {renderTextArea(
                                "lphkonden",
                                "Lumbo-Pelvic-Hip Kompleksi (Önden)"
                            )}
                            {renderTextArea(
                                "lphkyandan",
                                "Lumbo-Pelvic-Hip Kompleksi (Yandan)"
                            )}
                            {renderTextArea(
                                "lphkarkadan",
                                "Lumbo-Pelvic-Hip Kompleksi (Arkadan)"
                            )}

                            {renderTextArea("omuzlaronden", "Omuzlar (Önden)")}
                            {renderTextArea("omuzlaryandan", "Omuzlar (Yandan)")}
                            {renderTextArea("omuzlararkadan", "Omuzlar (Arkadan)")}

                            {renderTextArea(
                                "basboyunonden",
                                "Baş & Boyun Omurları (Önden)"
                            )}
                            {renderTextArea(
                                "basboyunyandan",
                                "Baş & Boyun Omurları (Yandan)"
                            )}
                            {renderTextArea(
                                "basboyunarkadan",
                                "Baş & Boyun Omurları (Arkadan)"
                            )}

                            {renderRadioRow(
                                "pronation",
                                "Pronation Distortion Syndrome",
                                ["Evet", "Hayır"]
                            )}
                            {renderRadioRow(
                                "lower",
                                "Lower Crossed Syndrome",
                                ["Evet", "Hayır"]
                            )}
                            {renderRadioRow(
                                "upper",
                                "Upper Crossed Syndrome",
                                ["Evet", "Hayır"]
                            )}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HeartPulse size={18} color="#38bdf8" />
                                <Text style={styles.cardTitle}>Overhead Squat Testi</Text>
                            </View>

                            <Text style={styles.label}>Yapılan Hatalar</Text>
                            {renderCheckboxRow("footTurnsOut", "Foot Turns Out")}
                            {renderCheckboxRow("kneeMovesInward", "Knee Moves Inward")}
                            {renderCheckboxRow("kneeMovesOutward", "Knee Moves Outward")}
                            {renderCheckboxRow(
                                "excessiveForwardLean",
                                "Excessive Forward Lean"
                            )}
                            {renderCheckboxRow("lowBackArches", "Low Back Arches")}
                            {renderCheckboxRow("lowBackRound", "Low Back Round")}
                            {renderCheckboxRow("armsFallForward", "Arms Fall Forward")}

                            {renderTextArea("overheadsquatnotes", "Notlar", "...")}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HeartPulse size={18} color="#22c55e" />
                                <Text style={styles.cardTitle}>Sit and Reach Testi</Text>
                            </View>

                            {renderNumericInput("sitandreach1", "Değer 1")}
                            {renderNumericInput("sitandreach2", "Değer 2")}
                            {renderNumericInput("sitandreach3", "Değer 3")}
                            {renderTextArea(
                                "sitandreachnotes",
                                "Hangi bölgelerde gerginlik hissedildi?",
                                ""
                            )}
                        </View>
                    </>
                );
            case 3:
                return (
                    <>
                        {/* KUVVET TESTLERİ */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <BicepsFlexed size={18} color="#f97316" />
                                <Text style={styles.cardTitle}>Kuvvet Testleri</Text>
                            </View>

                            {renderNumericInput(
                                "pushup",
                                "1 dk'da yapılan push up sayısı"
                            )}
                            {renderRadioRow(
                                "modifiedpushup",
                                "Push up dizlerin üstünde mi?",
                                ["Evet", "Hayır"]
                            )}

                            {renderNumericInput("wallsit", "Wall Sit – Maks Saniye")}
                            {renderNumericInput("plank", "Plank – Maks Saniye")}
                            {renderNumericInput("mekik", "1 dk Mekik – Maks Tekrar")}

                            {renderNumericInput("rmsquatweight", "1 RM Squat – Kilo (5 ve katları)")}
                            {renderNumericInput("rmsquatrep", "1 RM Squat – Tekrar (2–10)")}

                            {renderTextArea("kuvvetnotes", "Kuvvet Notları")}
                        </View>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <View style={styles.container}>
                    {/* Stepper */}
                    {renderStepIndicator()}

                    {/* FORM */}
                    <ScrollView
                        style={styles.formWrapper}
                        contentContainerStyle={{ paddingBottom: 32 }}
                        showsVerticalScrollIndicator={false}
                    >

                        {/* ÖĞRENCİ KARTI */}
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
                                    {student.dateOfBirth && (
                                        <View style={styles.metaItem}>
                                            <Calendar size={14} color="#9ca3af" />
                                            <Text style={styles.metaText}>
                                                {new Date(student.dateOfBirth).toLocaleDateString("tr-TR")}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                        {renderStepContent()}
                    </ScrollView>

                    {/* ALT BUTONLAR */}
                    <View style={styles.submitWrapper}>
                        <View style={styles.stepButtonsRow}>
                            <TouchableOpacity
                                style={[styles.navButton]}
                                onPress={handlePrevStep}
                            >
                                <Text style={styles.navButtonText}>Geri</Text>
                            </TouchableOpacity>

                            {!isLastStep ? (
                                <TouchableOpacity style={styles.navButtonPrimary} onPress={handleNextStep}>
                                    <Text style={styles.navButtonPrimaryText}>İleri</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.saveButton, submitting && { opacity: 0.6 }]}
                                    onPress={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#0f172a" />
                                    ) : (
                                        <>
                                            <Calendar size={18} color="#0f172a" />
                                            <Text style={styles.saveButtonText}>
                                                Değerlendirmeyi Kaydet
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
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
        padding: 20,
    },
    loadingText: {
        color: "#94a3b8",
        marginTop: 10,
    },
    errorText: {
        color: "#f87171",
        marginBottom: 10,
    },

    header: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 6,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
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

    studentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        marginTop: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#60a5fa",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: "#0f172a",
        fontSize: 20,
        fontWeight: "700",
    },
    studentName: {
        color: "#f1f5f9",
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
        color: "#94a3b8",
        fontSize: 12,
    },
    dateText: {
        color: "#94a3b8",
        fontSize: 12,
    },

    formWrapper: {
        flex: 1,
    },

    card: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: "#0f172a",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1e293b",
        padding: 16,
    },
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    cardTitle: {
        color: "#f1f5f9",
        fontSize: 15,
        fontWeight: "600",
    },

    field: {
        marginTop: 10,
    },
    label: {
        color: "#f1f5f9",
        fontSize: 12,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#1e293b",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        backgroundColor: "#020617",
        color: "#f1f5f9",
    },
    inputMultiline: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    helpText: {
        color: "#64748b",
        fontSize: 11,
        marginTop: 4,
    },

    submitWrapper: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: "#020617",
    },
    saveButton: {
        backgroundColor: "#38bdf8",
        borderRadius: 999,
        paddingVertical: 14,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    saveButtonText: {
        color: "#0f172a",
        fontSize: 14,
        fontWeight: "700",
    },

    stepIndicatorWrapper: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "flex-start",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#1e293b",
    },
    stepItem: {
        alignItems: "center",
        width: 80,
    },
    stepCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: "#334155",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#020617",
    },
    stepCircleText: {
        color: "#e5e7eb",
        fontSize: 12,
        fontWeight: "600",
    },
    stepLabel: {
        marginTop: 4,
        fontSize: 10,
        color: "#64748b",
        textAlign: "center",
    },

    radioRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
    },
    radioPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#334155",
    },
    radioPillText: {
        color: "#e5e7eb",
        fontSize: 12,
    },

    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
    },
    checkboxBox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#334155",
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxBoxText: {
        color: "#0f172a",
        fontSize: 12,
        fontWeight: "700",
    },
    checkboxLabel: {
        color: "#e5e7eb",
        fontSize: 12,
    },

    stepButtonsRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },
    navButton: {
        borderRadius: 999,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: "#1e293b",
    },
    navButtonText: {
        color: "#e5e7eb",
        fontSize: 13,
        fontWeight: "500",
    },
    navButtonPrimary: {
        borderRadius: 999,
        paddingVertical: 12,
        paddingHorizontal: 18,
        backgroundColor: "#22c55e",
        marginLeft: "auto",
    },
    navButtonPrimaryText: {
        color: "#0f172a",
        fontSize: 13,
        fontWeight: "600",
    },
});

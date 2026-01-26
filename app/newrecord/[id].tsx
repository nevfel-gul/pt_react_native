import { auth } from "@/services/firebase";
import { recordsColRef, studentDocRef } from "@/services/firestorePaths";
import { ResizeMode, Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, getDoc, serverTimestamp } from "firebase/firestore";
import {
    ArrowLeft,
    BicepsFlexed,
    Calendar,
    Eye,
    EyeOff,
    HandHeart,
    HeartPulse,
    Mail,
    PersonStanding,
    Phone,
    Ruler,
    SquareActivity,
    User,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ NEW
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

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
    hasPain: boolean;
    hadSurgery: boolean;

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
    kuvvetnotes: string;

    posturNotes: string;
    ohsNotes: string;
    ohsFeetTurnOut: string;
    ohsKneesIn: string;
    ohsForwardLean: string;
    ohsLowBackArch: string;
    ohsArmsFallForward: string;
    note: string;

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

    // ✅ theme
    const { theme } = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme]);

    const [student, setStudent] = useState<Student | null>(null);
    const [showTips, setShowTips] = useState(true);
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
        hasPain: false,
        hadSurgery: false,

        sitandreach1: "",
        sitandreach2: "",
        sitandreach3: "",
        sitandreachnotes: "",

        pushup: "",
        modifiedpushup: "",
        wallsit: "",
        plank: "",
        mekik: "",
        kuvvetnotes: "",

        posturNotes: "",
        ohsNotes: "",
        ohsFeetTurnOut: "",
        ohsKneesIn: "",
        ohsForwardLean: "",
        ohsLowBackArch: "",
        ohsArmsFallForward: "",
        note: "",

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
                const ref = studentDocRef(auth.currentUser?.uid!, id);
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

    const InfoNote = ({ children }: { children: React.ReactNode }) =>
        showTips ? (
            <View style={{ marginTop: 4 }}>
                <Text style={styles.infoNoteLabel}>İpucu:</Text>
                <Text style={styles.infoNoteText}>{children}</Text>
            </View>
        ) : null;

    const Strong = ({ children }: { children: React.ReactNode }) => (
        <Text style={[styles.strongText]}>{children}</Text>
    );

    const HintImageButton = ({
        label,
        videoSource,
    }: {
        label: string;
        videoSource: any;
    }) => {
        const [visible, setVisible] = useState(false);

        return (
            <>
                <TouchableOpacity style={styles.hintButton} onPress={() => setVisible(true)}>
                    <Text style={styles.hintButtonText}>{label}</Text>
                </TouchableOpacity>

                <Modal
                    visible={visible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setVisible(false)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalContent}>
                            <Video
                                source={videoSource}
                                style={styles.hintVideo}
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping
                                shouldPlay={visible}
                                isMuted
                            />
                            <Pressable
                                style={styles.modalCloseButton}
                                onPress={() => setVisible(false)}
                            >
                                <Text style={styles.modalCloseText}>Kapat</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </>
        );
    };

    // Yaş hesaplama
    const getAge = () => {
        if (!student?.dateOfBirth) return 0;
        const dob = new Date(student.dateOfBirth);
        if (isNaN(dob.getTime())) return 0;
        const now = new Date();
        let a = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
        return a;
    };

    // -----------------------------
    // ANALİZ FONKSİYONLARI
    // -----------------------------
    const getBMIStatus = (bmi: number) => {
        if (!bmi) return "";
        if (bmi < 20) return "Zayıf";
        if (bmi < 25) return "Sağlıklı";
        if (bmi < 30) return "Hafif Şişman";
        return "Şişman";
    };

    const getBasalMetabolismStatus = (bmr: number, gender?: string) => {
        if (!bmr || !gender) return "";
        if (gender === "Erkek") {
            if (bmr < 1500) return "Düşük";
            if (bmr < 1900) return "Normal";
            return "Yüksek";
        }
        if (gender === "Kadın") {
            if (bmr < 1200) return "Düşük";
            if (bmr < 1600) return "Normal";
            return "Yüksek";
        }
        return "";
    };

    const getBodyFatStatus = (bodyFat: number, age: number, gender?: string) => {
        if (!bodyFat || !age || !gender) return "";
        if (gender === "Erkek") {
            if (age >= 20 && age <= 29) {
                if (bodyFat < 11) return "Çok Düşük";
                if (bodyFat < 14) return "Düşük";
                if (bodyFat < 21) return "Orta";
                if (bodyFat < 23) return "Yüksek";
                return "Çok Yüksek";
            }
            if (age >= 30 && age <= 39) {
                if (bodyFat < 12) return "Çok Düşük";
                if (bodyFat < 15) return "Düşük";
                if (bodyFat < 22) return "Orta";
                if (bodyFat < 24) return "Yüksek";
                return "Çok Yüksek";
            }
            if (age >= 40 && age <= 49) {
                if (bodyFat < 14) return "Çok Düşük";
                if (bodyFat < 17) return "Düşük";
                if (bodyFat < 24) return "Orta";
                if (bodyFat < 26) return "Yüksek";
                return "Çok Yüksek";
            }
            if (age >= 50 && age <= 59) {
                if (bodyFat < 15) return "Çok Düşük";
                if (bodyFat < 18) return "Düşük";
                if (bodyFat < 25) return "Orta";
                if (bodyFat < 27) return "Yüksek";
                return "Çok Yüksek";
            }
            if (age >= 60) {
                if (bodyFat < 16) return "Çok Düşük";
                if (bodyFat < 19) return "Düşük";
                if (bodyFat < 26) return "Orta";
                if (bodyFat < 28) return "Yüksek";
                return "Çok Yüksek";
            }
        } else if (gender === "Kadın") {
            if (age >= 20 && age <= 29) {
                if (bodyFat < 16) return "Çok Düşük";
                if (bodyFat < 20) return "Düşük";
                if (bodyFat < 29) return "Orta";
                if (bodyFat < 31) return "Yüksek";
                return "Çok Yüksek";
            }
            if (age >= 30 && age <= 39) {
                if (bodyFat < 17) return "Çok Düşük";
                if (bodyFat < 21) return "Düşük";
                if (bodyFat < 30) return "Orta";
                if (bodyFat < 32) return "Yüksek";
                return "Çok Yüksek";
            }
            if (age >= 40 && age <= 49) {
                if (bodyFat < 18) return "Çok Düşük";
                if (bodyFat < 22) return "Düşük";
                if (bodyFat < 31) return "Orta";
                if (bodyFat < 33) return "Yüksek";
                return "Çok Yüksek";
            }
            if (age >= 50 && age <= 59) {
                if (bodyFat < 19) return "Çok Düşük";
                if (bodyFat < 23) return "Düşük";
                if (bodyFat < 32) return "Orta";
                if (bodyFat < 34) return "Yüksek";
                return "Çok Yüksek";
            }
            if (age >= 60) {
                if (bodyFat < 20) return "Çok Düşük";
                if (bodyFat < 24) return "Düşük";
                if (bodyFat < 33) return "Orta";
                if (bodyFat < 35) return "Yüksek";
                return "Çok Yüksek";
            }
        }
        return "Geçersiz veri";
    };

    const getLeanBodyMassStatus = (
        leanBodyMass: number,
        weight: number,
        gender?: string
    ) => {
        if (!leanBodyMass || !weight || !gender) return "";
        const bodyMassOran = (leanBodyMass / weight) * 100;

        if (gender === "Erkek") {
            if (bodyMassOran < 75) return "Düşük";
            if (bodyMassOran < 90) return "Normal";
            if (bodyMassOran < 100) return "Yüksek";
        } else if (gender === "Kadın") {
            if (bodyMassOran < 65) return "Düşük";
            if (bodyMassOran < 80) return "Normal";
            if (bodyMassOran < 100) return "Yüksek";
        }
        return "Geçersiz veri";
    };

    const getBodyWaterMassStatus = (bodyWaterMass: number, gender?: string) => {
        if (!bodyWaterMass || !gender) return "";
        if (gender === "Erkek") {
            if (bodyWaterMass < 50) return "Düşük";
            if (bodyWaterMass < 65) return "Normal";
            return "Yüksek";
        }
        if (gender === "Kadın") {
            if (bodyWaterMass < 45) return "Düşük";
            if (bodyWaterMass < 60) return "Normal";
            return "Yüksek";
        }
        return "Geçersiz veri";
    };

    const getMetabolicAgeStatus = (metabolicAge: number, age: number) => {
        if (!metabolicAge || !age) return "";
        if (metabolicAge < age) return "Metabolik yaş kronolojik yaştan genç";
        if (metabolicAge === age) return "Metabolik yaş kronolojik yaşla uyumlu";
        return "Metabolik yaş kronolojik yaştan büyük";
    };

    const getImpedanceStatus = (impedance: number, gender?: string) => {
        if (!impedance || !gender) return "";
        if (gender === "Erkek") {
            if (impedance < 300) return "Düşük - Daha fazla sıvı/kas oranı";
            if (impedance < 500) return "Normal";
            return "Yüksek - Daha fazla yağ/düşük kas oranı";
        }
        if (gender === "Kadın") {
            if (impedance < 450) return "Düşük - Daha fazla sıvı/kas oranı";
            if (impedance < 600) return "Normal";
            return "Yüksek - Daha fazla yağ/düşük kas oranı";
        }
        return "Geçersiz veri";
    };

    const getBellyHipRatio = (bel: number, kalca: number, gender?: string) => {
        if (!bel || !kalca || !gender) return "";
        const ratio = bel / kalca;
        const r = ratio.toFixed(2);

        if (gender === "Erkek") {
            if (ratio < 0.85) return "Mükemmel";
            if (ratio < 0.9) return "Düşük Risk " + r;
            if (ratio < 0.95) return "Orta Risk " + r;
            if (ratio <= 1.0) return "Yüksek Risk " + r;
            return "Çok Yüksek Risk " + r;
        }
        if (gender === "Kadın") {
            if (ratio < 0.75) return "Mükemmel";
            if (ratio < 0.8) return "Düşük Risk " + r;
            if (ratio < 0.85) return "Orta Risk " + r;
            if (ratio <= 0.9) return "Yüksek Risk " + r;
            return "Çok Yüksek Risk " + r;
        }

        return "Geçersiz veri";
    };

    const getCarvonenTargetHR = (restingHR: number, zone: number, age: number) => {
        if (!restingHR || !zone || !age) return "";
        const maxHR = 220 - age;
        const reserve = maxHR - restingHR;
        const target = restingHR + reserve * zone;
        return target.toFixed(0);
    };

    const getYMCAResult = (pulse: number, age: number, gender?: string) => {
        if (!pulse || !age || !gender) return "";
        if (gender === "Erkek") {
            if (age <= 25) {
                if (pulse <= 79) return "Mükemmel";
                if (pulse <= 89) return "İyi";
                if (pulse <= 100) return "Ortanın Üstü";
                if (pulse <= 105) return "Orta";
                if (pulse <= 112) return "Ortanın Altı";
                if (pulse <= 120) return "Kötü";
                return "Çok Kötü";
            }
        } else if (gender === "Kadın") {
            if (age <= 25) {
                if (pulse <= 81) return "Mükemmel";
                if (pulse <= 93) return "İyi";
                if (pulse <= 102) return "Ortanın Üstü";
                if (pulse <= 110) return "Orta";
                if (pulse <= 120) return "Ortanın Altı";
                if (pulse <= 131) return "Kötü";
                return "Çok Kötü";
            }
        }
        return "Geçersiz veri";
    };

    const getBruceTestVO2 = (time: number, gender?: string) => {
        if (!time || time < 0 || !gender) return "";
        if (gender === "Erkek") {
            const vo2 =
                14.8 - 1.379 * time + 0.451 * time * time - 0.012 * time * time * time;
            return vo2.toFixed(2);
        }
        if (gender === "Kadın") {
            const vo2 = 4.38 * time - 3.9;
            return vo2.toFixed(2);
        }
        return "";
    };

    const getVO2Status = (vo2: number, age: number, gender?: string) => {
        if (!vo2 || !age || !gender) return "";
        if (gender === "Erkek") {
            if (age >= 20 && age <= 29) {
                if (vo2 < 42) return "Zayıf";
                if (vo2 < 45) return "Ortalama Altı";
                if (vo2 < 51) return "Ortalama";
                if (vo2 < 55) return "Ortalama Üstü";
                return "Mükemmel";
            }
        } else if (gender === "Kadın") {
            if (age >= 20 && age <= 29) {
                if (vo2 < 35) return "Zayıf";
                if (vo2 < 39) return "Ortalama Altı";
                if (vo2 < 43) return "Ortalama";
                if (vo2 < 49) return "Ortalama Üstü";
                return "Mükemmel";
            }
        }
        return "Geçersiz veri";
    };

    const getSitAndReachStatus = (value: number, gender?: string) => {
        if (!gender) return "";
        if (gender === "Erkek") {
            if (value >= 27) return "Mükemmel";
            if (value >= 17) return "İyi";
            if (value >= 6) return "Ortanın Üstü";
            if (value >= 0) return "Orta";
            if (value >= -8) return "Ortanın Altı";
            if (value >= -20) return "Kötü";
            return "Çok Kötü";
        }
        if (gender === "Kadın") {
            if (value >= 30) return "Mükemmel";
            if (value >= 21) return "İyi";
            if (value >= 11) return "Ortanın Üstü";
            if (value >= 1) return "Orta";
            if (value >= -7) return "Ortanın Altı";
            if (value >= -15) return "Kötü";
            return "Çok Kötü";
        }
        return "Geçersiz veri";
    };

    const getMaxOfThree = (a?: string, b?: string, c?: string) => {
        const vals = [a, b, c]
            .map((v) => (v === "" || v == null ? NaN : Number(v)))
            .filter((v) => !isNaN(v));
        if (!vals.length) return null;
        return Math.max(...vals);
    };

    const getPushUpScore = (
        reps: number,
        age: number,
        gender?: string,
        isModified = false
    ) => {
        if (!reps || reps < 0 || !gender || !age) return "";

        if (gender === "Erkek") {
            if (!isModified) {
                if (age >= 20 && age <= 29) {
                    if (reps > 54) return "Mükemmel";
                    if (reps >= 45) return "Ortalama Üstü";
                    if (reps >= 35) return "Ortalama";
                    if (reps >= 20) return "Ortalama Altı";
                    return "Kötü";
                }
            }
        }

        if (gender === "Kadın") {
            if (isModified) {
                if (age >= 20 && age <= 29) {
                    if (reps > 48) return "Mükemmel";
                    if (reps >= 34) return "Ortalama Üstü";
                    if (reps >= 17) return "Ortalama";
                    if (reps >= 6) return "Ortalama Altı";
                    return "Kötü";
                }
            }
        }

        return "Geçersiz veri";
    };

    const getWallSitScore = (seconds: number, gender?: string) => {
        if (!seconds || seconds < 0 || !gender) return "";
        const time = Number(seconds);
        if (gender === "Erkek") {
            if (time > 102) return "Mükemmel";
            if (time >= 76) return "Ortalama Üstü";
            if (time >= 58) return "Ortalama";
            if (time >= 30) return "Ortalama Altı";
            return "Zayıf";
        }
        if (gender === "Kadın") {
            if (time > 60) return "Mükemmel";
            if (time >= 46) return "Ortalama Üstü";
            if (time >= 36) return "Ortalama";
            if (time >= 20) return "Ortalama Altı";
            return "Zayıf";
        }
        return "Geçersiz veri";
    };

    const getPlankScore = (seconds: number, gender?: string) => {
        if (!seconds || seconds < 0 || !gender) return "";
        const time = Number(seconds);
        if (gender === "Erkek") {
            if (time > 128) return "Mükemmel";
            if (time >= 106) return "Ortalama Üstü";
            if (time >= 77) return "Ortalama";
            return "Ortalama Altı";
        }
        if (gender === "Kadın") {
            if (time > 90) return "Mükemmel";
            if (time >= 71) return "Ortalama Üstü";
            if (time >= 41) return "Ortalama";
            return "Ortalama Altı";
        }
        return "Geçersiz veri";
    };

    const getMekikScore = (seconds: number, gender?: string) => {
        if (!seconds || seconds < 0 || !gender) return "";
        const time = Number(seconds);
        if (gender === "Erkek") {
            if (time > 41) return "Mükemmel";
            if (time >= 35) return "Ortalama Üstü";
            if (time >= 29) return "Ortalama";
            if (time >= 22) return "Ortalama Altı";
            return "Zayıf";
        }
        if (gender === "Kadın") {
            if (time > 25) return "Mükemmel";
            if (time >= 21) return "Ortalama Üstü";
            if (time >= 15) return "Ortalama";
            if (time >= 9) return "Ortalama Altı";
            return "Zayıf";
        }
        return "Geçersiz veri";
    };

    const handleSubmit = async () => {
        if (!id) {
            Alert.alert("Hata", "Öğrenci ID bulunamadı.");
            return;
        }

        try {
            setSubmitting(true);

            const age = getAge();
            const gender = student?.gender;

            const bmi = Number(formData.bodyMassIndex || 0);
            const bmr = Number(formData.basalMetabolism || 0);
            const bodyFat = Number(formData.bodyFat || 0);
            const weight = Number(formData.weight || 0);
            const leanBodyMass = Number(formData.leanBodyMass || 0);
            const bodyWater = Number(formData.bodyWaterMass || 0);
            const impedance = Number(formData.impedance || 0);
            const metabolicAge = Number(formData.metabolicAge || 0);
            const bel = Number(formData.bel || 0);
            const kalca = Number(formData.kalca || 0);

            const restHR = Number(formData.dinlenikNabiz || formData.restingHeartRate || 0);
            const carvonenZone = Number(formData.carvonenMultiplier || 0);
            const ymcaPulse = Number(formData.toparlanmaNabzi || 0);
            const bruceTime = Number(formData.testSuresi || 0);

            const sitBest = getMaxOfThree(
                formData.sitandreach1,
                formData.sitandreach2,
                formData.sitandreach3
            );

            const pushupReps = Number(formData.pushup || 0);
            const wallSitSec = Number(formData.wallsit || 0);
            const plankSec = Number(formData.plank || 0);
            const mekikSec = Number(formData.mekik || 0);

            const bruceVo2Str = bruceTime && gender ? getBruceTestVO2(bruceTime, gender) : "";
            const bruceVo2 = bruceVo2Str ? Number(bruceVo2Str) : 0;

            const analysis = {
                age,
                bmi,
                bmiStatus: bmi ? getBMIStatus(bmi) : "",
                bodyFat,
                bodyFatStatus: bodyFat ? getBodyFatStatus(bodyFat, age, gender) : "",
                basalMetabolism: bmr,
                basalMetabolismStatus: bmr ? getBasalMetabolismStatus(bmr, gender) : "",
                leanBodyMass,
                leanBodyMassStatus:
                    leanBodyMass && weight
                        ? getLeanBodyMassStatus(leanBodyMass, weight, gender)
                        : "",
                bodyWaterMass: bodyWater,
                bodyWaterMassStatus: bodyWater ? getBodyWaterMassStatus(bodyWater, gender) : "",
                impedance,
                impedanceStatus: impedance ? getImpedanceStatus(impedance, gender) : "",
                metabolicAge,
                metabolicAgeStatus:
                    metabolicAge && age ? getMetabolicAgeStatus(metabolicAge, age) : "",
                bellyHipRatioStatus:
                    bel && kalca && gender ? getBellyHipRatio(bel, kalca, gender) : "",

                carvonenTargetHR:
                    restHR && carvonenZone && age ? getCarvonenTargetHR(restHR, carvonenZone, age) : "",
                ymcaStatus:
                    ymcaPulse && age && gender ? getYMCAResult(ymcaPulse, age, gender) : "",

                bruceVO2Max: bruceVo2Str,
                vo2Status: bruceVo2 && age && gender ? getVO2Status(bruceVo2, age, gender) : "",

                sitAndReachBest: sitBest,
                sitAndReachStatus:
                    sitBest !== null && sitBest !== undefined && gender
                        ? getSitAndReachStatus(sitBest, gender)
                        : "",

                pushupStatus:
                    pushupReps && age && gender
                        ? getPushUpScore(pushupReps, age, gender, formData.modifiedpushup === "Evet")
                        : "",
                wallSitStatus: wallSitSec && gender ? getWallSitScore(wallSitSec, gender) : "",
                plankStatus: plankSec && gender ? getPlankScore(plankSec, gender) : "",
                mekikStatus: mekikSec && gender ? getMekikScore(mekikSec, gender) : "",
            };

            await addDoc(recordsColRef(auth.currentUser?.uid!), {
                studentId: id,
                ...formData,
                analysis,
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
                    <ActivityIndicator size="large" color={theme.colors.primary} />
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
                        <ArrowLeft size={18} color={theme.colors.text.primary} />
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
                                done && {
                                    backgroundColor: theme.colors.success,
                                    borderColor: theme.colors.success,
                                },
                                active &&
                                !done && {
                                    backgroundColor: theme.colors.accent,
                                    borderColor: theme.colors.accent,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.stepCircleText,
                                    (done || active) && { color: "#0f172a" },
                                ]}
                            >
                                {index + 1}
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.stepLabel,
                                (active || done) && { color: theme.colors.text.primary },
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
        placeholder?: string,
        hint?: boolean
    ) => (
        <View style={styles.field}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                {hint && showTips ? (
                    <HintImageButton
                        label="İpucu için tıklayın"
                        videoSource={require("@/assets/videos/belOlcum.mp4")}
                    />
                ) : null}
            </View>

            <TextInput
                placeholder={placeholder}
                placeholderTextColor={theme.colors.text.muted}
                value={formData[field] as string}
                onChangeText={(t) => handleChange(field, t)}
                style={styles.input}
                keyboardType="numeric"
            />
        </View>
    );

    const renderTextArea = (field: keyof FormData, label: string, placeholder?: string) => (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                placeholder={placeholder}
                placeholderTextColor={theme.colors.text.muted}
                value={formData[field] as string}
                onChangeText={(t) => handleChange(field, t)}
                style={[styles.input, styles.inputMultiline]}
                multiline
            />
        </View>
    );

    const renderRadioRow = (field: keyof FormData, label: string, options: string[]) => (
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
                                selected && {
                                    backgroundColor: theme.colors.accent,
                                    borderColor: theme.colors.accent,
                                },
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

    const renderCheckboxRow = (field: keyof FormData, label: string) => {
        const value = formData[field] as boolean;
        return (
            <TouchableOpacity style={styles.checkboxRow} onPress={() => handleChange(field, !value)}>
                <View
                    style={[
                        styles.checkboxBox,
                        value && {
                            backgroundColor: theme.colors.accent,
                            borderColor: theme.colors.accent,
                        },
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
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HandHeart size={18} color={theme.colors.accent} />
                                <Text style={styles.cardTitle}>Fiziksel Ölçümler (Tanita)</Text>
                            </View>

                            <InfoNote>
                                Bu bölümde yer alan tüm değerler Tanita vücut analiz cihazından alınan objektif
                                ölçümlerdir. Ölçümün doğru olması için danışanın aç karnına, benzer saatlerde ve
                                mümkünse aynı koşullarda ölçülmesi önerilir. Değerler zaman içindeki değişimle
                                birlikte değerlendirilmelidir.
                            </InfoNote>

                            {renderNumericInput("weight", "Kilo (kg)")}
                            {renderNumericInput("bodyMassIndex", "Vücut Kitle İndeksi (VKİ)")}
                            <InfoNote>
                                Bu değer doğrudan Tanita cihazında görünen BMI/VKİ değeridir. Manuel hesaplama
                                yapmanıza gerek yoktur.
                            </InfoNote>
                            {formData.bodyMassIndex ? (
                                <Text style={styles.infoText}>
                                    Durum: {getBMIStatus(Number(formData.bodyMassIndex || 0))}
                                </Text>
                            ) : null}

                            {renderNumericInput("basalMetabolism", "Bazal Metabolizma Hızı")}
                            {formData.basalMetabolism ? (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getBasalMetabolismStatus(Number(formData.basalMetabolism || 0), student?.gender)}
                                </Text>
                            ) : null}

                            {renderNumericInput("bodyFat", "Vücut Yağ Oranı (%)")}
                            {formData.bodyFat ? (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getBodyFatStatus(Number(formData.bodyFat || 0), getAge(), student?.gender)}
                                </Text>
                            ) : null}

                            {renderNumericInput("totalMuscleMass", "Toplam Kas Kütlesi (kg)")}

                            {renderNumericInput("leanBodyMass", "Yağsız Kütle (kg)")}
                            {formData.leanBodyMass ? (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getLeanBodyMassStatus(
                                        Number(formData.leanBodyMass || 0),
                                        Number(formData.weight || 0),
                                        student?.gender
                                    )}
                                </Text>
                            ) : null}

                            {renderNumericInput("bodyWaterMass", "Vücut Sıvı Oranı (%)")}
                            {formData.bodyWaterMass ? (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getBodyWaterMassStatus(Number(formData.bodyWaterMass || 0), student?.gender)}
                                </Text>
                            ) : null}

                            {renderNumericInput("impedance", "Empedans (Ω - Ohm)")}
                            {formData.impedance ? (
                                <Text style={styles.infoText}>
                                    Durum: {getImpedanceStatus(Number(formData.impedance || 0), student?.gender)}
                                </Text>
                            ) : null}

                            {renderNumericInput("metabolicAge", "Metabolik Yaş")}
                            {formData.metabolicAge ? (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getMetabolicAgeStatus(Number(formData.metabolicAge || 0), getAge())}
                                </Text>
                            ) : null}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <Ruler size={18} color={theme.colors.success} />
                                <Text style={styles.cardTitle}>Çevre Ölçümleri (Mezura)</Text>
                            </View>

                            {renderNumericInput("boyun", "Boyun", "Boyun Çevresi", true)}
                            {renderNumericInput("omuz", "Omuz", "Omuz Genişliği", true)}
                            {renderNumericInput("gogus", "Göğüs", "Göğüs Çevresi", true)}
                            {renderNumericInput("sagKol", "Sağ Kol", "Kol Çevresi", true)}
                            {renderNumericInput("solKol", "Sol Kol", "Kol Çevresi", true)}
                            {renderNumericInput("bel", "Bel", "Bel Çevresi", true)}
                            {renderNumericInput("kalca", "Kalça", "Kalça Çevresi", true)}

                            {formData.bel && formData.kalca ? (
                                <Text style={styles.infoText}>
                                    Bel/Kalça:{" "}
                                    {getBellyHipRatio(
                                        Number(formData.bel || 0),
                                        Number(formData.kalca || 0),
                                        student?.gender
                                    )}
                                </Text>
                            ) : null}

                            {renderNumericInput("sagBacak", "Sağ Bacak", "Bacak Çevresi", true)}
                            {renderNumericInput("solBacak", "Sol Bacak", "Bacak Çevresi", true)}
                            {renderNumericInput("sagKalf", "Sağ Kalf", "Kalf Çevresi", true)}
                            {renderNumericInput("solKalf", "Sol Kalf", "Kalf Çevresi", true)}
                            {renderTextArea("mezuraNote", "Mezura Notu")}
                        </View>
                    </>
                );

            case 1:
                return (
                    <>
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <SquareActivity size={18} color={theme.colors.warning} />
                                <Text style={styles.cardTitle}>Aerobik Uygunluk / Hedef KAH</Text>
                            </View>

                            <InfoNote>
                                Dinlenik nabız sabah uyanır uyanmaz, yataktan kalkmadan ölçülmelidir. Düzenli
                                egzersiz yapan bireylerde zamanla düşmesi beklenir ve kardiyovasküler uygunluğun
                                önemli bir göstergesidir.
                            </InfoNote>
                            {renderNumericInput("dinlenikNabiz", "Dinlenik Nabız")}

                            <InfoNote>
                                Carvonen yöntemi, dinlenik nabız ve yaşa göre hedef egzersiz nabzını hesaplamak
                                için kullanılır. Seçilen zone, egzersizin şiddetini belirler (yağ yakımı,
                                dayanıklılık, performans gibi).
                            </InfoNote>
                            {renderRadioRow("carvonenMultiplier", "Carvonen Egzersiz Şiddeti (Zone)", [
                                "0.55",
                                "0.65",
                                "0.75",
                                "0.85",
                                "0.95",
                            ])}

                            {formData.carvonenMultiplier ? (
                                <>
                                    <InfoNote>
                                        Hesaplanan hedef nabız, egzersiz sırasında ulaşılması önerilen kalp atım sayısını
                                        ifade eder.
                                    </InfoNote>
                                    <Text style={styles.infoText}>
                                        Hedef Nabız:{" "}
                                        {getCarvonenTargetHR(
                                            Number(formData.dinlenikNabiz || formData.restingHeartRate || 0),
                                            Number(formData.carvonenMultiplier || 0),
                                            getAge()
                                        )}
                                    </Text>
                                </>
                            ) : null}

                            <InfoNote>
                                YMCA 3 dk basamak testi sonrası ölçülen toparlanma nabzı, bireyin aerobik kapasitesi
                                ve kalbin egzersiz sonrası normale dönme hızını değerlendirmek için kullanılır.
                                {"\n"}
                                <Strong>Basamak bir:</Strong> 3 dakika boyunca dakikada 24 basamaklık tempoyla 30 cm
                                basamağa çık-in.{"\n"}
                                <Strong>Basamak iki:</Strong> Egzersizden 5 sn sonra 60 sn nabız say.{"\n"}
                                <Strong>Basamak üç:</Strong> Kategoriye yerleştir.{"\n"}
                                <Strong>Basamak dört:</Strong> Başlangıç programını seç.{"\n"}
                                <Strong>Basamak beş:</Strong> Max VO2 bulunur.
                            </InfoNote>
                            {renderNumericInput("toparlanmaNabzi", "YMCA 3 dk Basamak Testi – Toparlanma Nabzı")}

                            {formData.toparlanmaNabzi ? (
                                <>
                                    <InfoNote>
                                        Daha düşük toparlanma nabzı, daha iyi kardiyovasküler kondisyonu ifade eder.
                                    </InfoNote>
                                    <Text style={styles.infoText}>
                                        YMCA Sonuç:{" "}
                                        {getYMCAResult(Number(formData.toparlanmaNabzi || 0), getAge(), student?.gender)}
                                    </Text>
                                </>
                            ) : null}

                            <View style={[styles.field, { marginTop: 16 }]}>
                                <Text style={styles.label}>Bruce Testi - Süre (dk)</Text>

                                <InfoNote>
                                    Bruce testi maksimal bir egzersiz testidir. Koşu bandında her 3 dakikada bir hız
                                    ve eğim artırılır. Dayanabildiği toplam süre kaydedilir.
                                </InfoNote>

                                {showTips ? (
                                    <View style={styles.table}>
                                        <View style={[styles.tr, styles.thRow]}>
                                            <Text style={[styles.th, { flex: 1.1 }]}>Aşama</Text>
                                            <Text style={[styles.th, { flex: 1.2 }]}>Süre (dk)</Text>
                                            <Text style={[styles.th, { flex: 1.6 }]}>Hız</Text>
                                            <Text style={[styles.th, { flex: 1.2 }]}>Eğim</Text>
                                        </View>

                                        {[
                                            { stage: 1, min: 0, speed: "2.74", grade: "10%" },
                                            { stage: 2, min: 3, speed: "4.02", grade: "12%" },
                                            { stage: 3, min: 6, speed: "5.47", grade: "14%" },
                                            { stage: 4, min: 9, speed: "6.76", grade: "16%" },
                                            { stage: 5, min: 12, speed: "8.05", grade: "18%" },
                                            { stage: 6, min: 15, speed: "8.85", grade: "20%" },
                                            { stage: 7, min: 18, speed: "9.65", grade: "22%" },
                                            { stage: 8, min: 21, speed: "10.46", grade: "24%" },
                                            { stage: 9, min: 24, speed: "11.26", grade: "26%" },
                                            { stage: 10, min: 27, speed: "12.07", grade: "28%" },
                                        ].map((r) => (
                                            <View key={r.stage} style={styles.tr}>
                                                <Text style={[styles.td, { flex: 1.1 }]}>{r.stage}</Text>
                                                <Text style={[styles.td, { flex: 1.2 }]}>{r.min}</Text>
                                                <Text style={[styles.td, { flex: 1.6 }]}>{r.speed} km/sa</Text>
                                                <Text style={[styles.td, { flex: 1.2 }]}>{r.grade}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : null}

                                <InfoNote>Not: Koşu bandı “km/sa” ayarında olmalı; eğim % olarak girilir.</InfoNote>

                                <TextInput
                                    placeholder="Test süresi (dk)"
                                    placeholderTextColor={theme.colors.text.muted}
                                    value={formData.testSuresi}
                                    onChangeText={(t) => handleChange("testSuresi", t)}
                                    style={styles.input}
                                    keyboardType="numeric"
                                />

                                <Text style={styles.helpText}>
                                    Bruce testi protokolü: Koşu bandında her 3 dakikada bir hız ve eğim artar,
                                    dayanabildiği son süre kaydedilir.
                                </Text>

                                {formData.testSuresi ? (
                                    <>
                                        <InfoNote>
                                            VO₂max, vücudun maksimal oksijen kullanma kapasitesini ifade eder.
                                        </InfoNote>

                                        <Text style={styles.infoText}>
                                            VO₂max:{" "}
                                            {getBruceTestVO2(Number(formData.testSuresi || 0), student?.gender)} ml/kg/dk —{" "}
                                            {getVO2Status(
                                                Number(getBruceTestVO2(Number(formData.testSuresi || 0), student?.gender) || 0),
                                                getAge(),
                                                student?.gender
                                            )}
                                        </Text>
                                    </>
                                ) : null}
                            </View>
                        </View>
                    </>
                );

            case 2:
                return (
                    <>
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <PersonStanding size={18} color={theme.colors.premium} />
                                <Text style={styles.cardTitle}>Statik Postür Analizi</Text>
                            </View>

                            <InfoNote>
                                <Text>
                                    <Strong>Amaç:</Strong> Postür analizi ile kişinin duruşu değerlendirilir.{"\n\n"}
                                    <Strong>Uygulama:</Strong> Önden–yandan–arkadan gözlem yap.{"\n\n"}
                                    <Strong>İpucu:</Strong> Çıplak ayak, nötr duruş.
                                </Text>
                            </InfoNote>

                            <InfoNote>
                                <Text>
                                    <Strong>Ayak & Ayak Bileği:</Strong> Aşırı pronasyon/supinasyon vb.
                                </Text>
                            </InfoNote>
                            {renderTextArea("ayakveayakbilegionden", "Ayak & Ayak Bileği (Önden)")}
                            {renderTextArea("ayakveayakbilegiyandan", "Ayak & Ayak Bileği (Yandan)")}
                            {renderTextArea("ayakveayakbilegiarkadan", "Ayak & Ayak Bileği (Arkadan)")}

                            <InfoNote>
                                <Text>
                                    <Strong>Diz:</Strong> Valgus/varus vb.
                                </Text>
                            </InfoNote>
                            {renderTextArea("dizonden", "Diz (Önden)")}
                            {renderTextArea("dizyandan", "Diz (Yandan)")}
                            {renderTextArea("dizarkadan", "Diz (Arkadan)")}

                            <InfoNote>
                                <Text>
                                    <Strong>LPHK:</Strong> Pelvis tilt/lordoz vb.
                                </Text>
                            </InfoNote>
                            {renderTextArea("lphkonden", "Lumbo-Pelvic-Hip Kompleksi (Önden)")}
                            {renderTextArea("lphkyandan", "Lumbo-Pelvic-Hip Kompleksi (Yandan)")}
                            {renderTextArea("lphkarkadan", "Lumbo-Pelvic-Hip Kompleksi (Arkadan)")}

                            <InfoNote>
                                <Text>
                                    <Strong>Omuzlar:</Strong> Skapula/öne düşme vb.
                                </Text>
                            </InfoNote>
                            {renderTextArea("omuzlaronden", "Omuzlar (Önden)")}
                            {renderTextArea("omuzlaryandan", "Omuzlar (Yandan)")}
                            {renderTextArea("omuzlararkadan", "Omuzlar (Arkadan)")}

                            <InfoNote>
                                <Text>
                                    <Strong>Baş & Boyun:</Strong> Forward head vb.
                                </Text>
                            </InfoNote>
                            {renderTextArea("basboyunonden", "Baş & Boyun Omurları (Önden)")}
                            {renderTextArea("basboyunyandan", "Baş & Boyun Omurları (Yandan)")}
                            {renderTextArea("basboyunarkadan", "Baş & Boyun Omurları (Arkadan)")}

                            <InfoNote>
                                <Text>
                                    <Strong>Pronation Distortion Syndrome:</Strong> vb.
                                </Text>
                            </InfoNote>
                            {renderRadioRow("pronation", "Pronation Distortion Syndrome", ["Evet", "Hayır"])}

                            <InfoNote>
                                <Text>
                                    <Strong>Lower Crossed Syndrome:</Strong> vb.
                                </Text>
                            </InfoNote>
                            {renderRadioRow("lower", "Lower Crossed Syndrome", ["Evet", "Hayır"])}

                            <InfoNote>
                                <Text>
                                    <Strong>Upper Crossed Syndrome:</Strong> vb.
                                </Text>
                            </InfoNote>
                            {renderRadioRow("upper", "Upper Crossed Syndrome", ["Evet", "Hayır"])}

                            {renderTextArea("posturNotes", "Genel Not / Gözlem", "")}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HeartPulse size={18} color={theme.colors.accent} />
                                <Text style={styles.cardTitle}>Overhead Squat Testi</Text>
                            </View>

                            <InfoNote>
                                <Text>
                                    <Strong>Amaç:</Strong> Kompansasyonları gözlemek.
                                </Text>
                            </InfoNote>

                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Ağrı var mı?</Text>
                                    <Text style={styles.helpText}>Bel, diz, omuz gibi bölgelerde düzenli ağrı?</Text>
                                </View>
                                <Switch
                                    value={formData.hasPain}
                                    onValueChange={(v) => handleChange("hasPain", v)}
                                    trackColor={{
                                        false: theme.colors.surfaceSoft,
                                        true: theme.colors.primary,
                                    }}
                                />
                            </View>

                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Ameliyat geçmişi?</Text>
                                    <Text style={styles.helpText}>Son yıllarda ortopedik veya başka bir ameliyat.</Text>
                                </View>
                                <Switch
                                    value={formData.hadSurgery}
                                    onValueChange={(v) => handleChange("hadSurgery", v)}
                                    trackColor={{
                                        false: theme.colors.surfaceSoft,
                                        true: theme.colors.primary,
                                    }}
                                />
                            </View>

                            {renderTextArea("ohsNotes", "Overhead Squat Notları (Gözlemler)", "")}
                            {renderRadioRow("ohsFeetTurnOut", "Ayaklar dışa döner mi?", ["Evet", "Hayır"])}
                            {renderRadioRow("ohsKneesIn", "Dizler içe kaçar mı (valgus)?", ["Evet", "Hayır"])}
                            {renderRadioRow("ohsForwardLean", "Gövde aşırı öne düşer mi?", ["Evet", "Hayır"])}
                            {renderRadioRow("ohsLowBackArch", "Bel aşırı kavislenir mi?", ["Evet", "Hayır"])}
                            {renderRadioRow("ohsArmsFallForward", "Kollar öne düşer mi?", ["Evet", "Hayır"])}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <HeartPulse size={18} color={theme.colors.success} />
                                <Text style={styles.cardTitle}>Sit and Reach Testi</Text>
                            </View>

                            <InfoNote>
                                <Text>
                                    <Strong>Uygulama:</Strong> 3 deneme; en iyi değer alınır (cm).
                                </Text>
                            </InfoNote>

                            {renderNumericInput("sitandreach1", "1. Ölçüm (cm)")}
                            {renderNumericInput("sitandreach2", "2. Ölçüm (cm)")}
                            {renderNumericInput("sitandreach3", "3. Ölçüm (cm)")}

                            {formData.sitandreach1 && formData.sitandreach2 && formData.sitandreach3 ? (
                                <Text style={styles.infoText}>
                                    En İyi Değer: {getMaxOfThree(formData.sitandreach1, formData.sitandreach2, formData.sitandreach3)} | Durum:{" "}
                                    {getMaxOfThree(formData.sitandreach1, formData.sitandreach2, formData.sitandreach3) != null &&
                                        student?.gender
                                        ? getSitAndReachStatus(
                                            Number(
                                                getMaxOfThree(
                                                    formData.sitandreach1,
                                                    formData.sitandreach2,
                                                    formData.sitandreach3
                                                ) || 0
                                            ),
                                            student.gender
                                        )
                                        : ""}
                                </Text>
                            ) : null}

                            {renderTextArea("sitandreachnotes", "Hangi bölgelerde gerginlik hissedildi?", "")}
                        </View>
                    </>
                );
            case 3:
                return (
                    <>
                        {/* KUVVET TESTLERİ */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <BicepsFlexed size={18} color={theme.colors.warning} />
                                <Text style={[styles.cardTitle, { color: theme.colors.warning }]}>Kuvvet Testleri</Text>
                            </View>

                            {renderNumericInput("pushup", "1 dk'da yapılan push up sayısı")}
                            {renderRadioRow(
                                "modifiedpushup",
                                "Push up dizlerin üstünde mi?",
                                ["Evet", "Hayır"]
                            )}
                            {formData.pushup && (
                                <Text style={styles.infoText}>
                                    Push Up Skoru:{" "}
                                    {getPushUpScore(
                                        Number(formData.pushup || 0),
                                        getAge(),
                                        student?.gender,
                                        formData.modifiedpushup === "Evet"
                                    )}
                                </Text>)}

                            {renderNumericInput("wallsit", "Wall Sit – Maks Saniye")}
                            {formData.wallsit && (
                                <Text style={styles.infoText}>
                                    Wall Sit Skoru:{" "}
                                    {getWallSitScore(Number(formData.wallsit || 0), student?.gender)}
                                </Text>)}

                            {renderNumericInput("plank", "Plank – Maks Saniye")}
                            {formData.plank && (
                                <Text style={styles.infoText}>
                                    Plank Skoru:{" "}
                                    {getPlankScore(Number(formData.plank || 0), student?.gender)}
                                </Text>)}

                            {renderNumericInput("mekik", "1 dk Mekik – Maks Tekrar")}
                            {formData.mekik && (
                                <Text style={styles.infoText}>
                                    Mekik Skoru:{" "}
                                    {getMekikScore(Number(formData.mekik || 0), student?.gender)}
                                </Text>)}
                            {renderTextArea("kuvvetnotes", "Kuvvet Notları")}
                            {renderTextArea("note", "Kayıt Notları")}
                            <InfoNote>
                                Öğrenci bilgi ekranında gösterilir.
                            </InfoNote>
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
                                {/* İsim + Tip Chip */}
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                    <Text style={styles.studentName}>{student.name}</Text>

                                    <TouchableOpacity
                                        onPress={() => setShowTips((s) => !s)}
                                        activeOpacity={0.85}
                                        style={[
                                            styles.tipChip,
                                            showTips ? styles.tipChipOn : styles.tipChipOff,
                                        ]}
                                    >
                                        {showTips ? (
                                            <Eye size={14} color="#38bdf8" />
                                        ) : (
                                            <EyeOff size={14} color="#94a3b8" />
                                        )}
                                        <Text
                                            style={[
                                                styles.tipChipText,
                                                showTips ? { color: "#38bdf8" } : { color: "#94a3b8" },
                                            ]}
                                        >
                                            İpuçları {showTips ? "Açık" : "Kapalı"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

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
// ✅ put this near bottom (instead of const styles = StyleSheet.create)
const makeStyles = (theme: ThemeUI) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        center: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: theme.spacing.lg,
        },
        loadingText: {
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.xs + 4,
        },
        errorText: {
            color: theme.colors.danger,
            marginBottom: theme.spacing.xs + 4,
        },

        header: {
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.sm + 4,
            paddingBottom: theme.spacing.xs,
        },
        headerTopRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: theme.spacing.md - 2,
        },
        backButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        backButtonText: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.sm,
        },
        dateRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
        },
        dateText: {
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.xs,
        },

        studentRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.md,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.md,
            paddingLeft: theme.spacing.xl,
        },
        avatar: {
            width: 52,
            height: 52,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
            justifyContent: "center",
            alignItems: "center",
        },
        avatarText: {
            color: "#0f172a",
            fontSize: 20,
            fontWeight: "700",
        },
        studentName: {
            color: theme.colors.text.accent,
            fontSize: theme.fontSize.lg + 2,
            fontWeight: "700",
        },
        studentMetaRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.xs,
        },
        metaItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs - 2,
        },
        metaText: {
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.sm,
        },

        formWrapper: { flex: 1 },

        card: {
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.md,
            ...(theme.shadow?.soft ?? {}),
        },
        cardTitleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs + 2,
            marginBottom: theme.spacing.md - 4,
        },
        cardTitle: {
            color: theme.colors.accent,
            fontSize: theme.fontSize.lg + 1,
            fontWeight: "600",
        },

        field: { marginTop: theme.spacing.sm - 2 },

        labelRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.spacing.sm,
        },

        label: {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.lg,
            marginBottom: theme.spacing.xs,
            fontWeight: "800",
        },
        input: {
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs + 4,
            fontSize: theme.fontSize.md - 1,
            backgroundColor: theme.colors.surface,
            color: theme.colors.text.primary,
        },
        inputMultiline: {
            minHeight: 80,
            textAlignVertical: "top",
        },
        helpText: {
            color: theme.colors.text.muted,
            fontSize: theme.fontSize.xs,
            marginTop: theme.spacing.xs - 2,
        },

        strongText: {
            fontWeight: "800",
            color: theme.colors.text.primary,
        },

        switchRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: theme.spacing.sm,
            paddingVertical: theme.spacing.xs - 2,
            gap: theme.spacing.sm,
        },

        submitWrapper: {
            paddingHorizontal: theme.spacing.md + 2,
            paddingVertical: theme.spacing.sm,
            backgroundColor: theme.colors.background,
        },
        saveButton: {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radius.pill,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md - 2,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: theme.spacing.xs + 2,
            opacity: 0.95,
            marginLeft: "auto",
        },
        saveButtonText: {
            color: "#0f172a",
            fontSize: theme.fontSize.md,
            fontWeight: "700",
        },


        stepIndicatorWrapper: {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
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
            borderColor: theme.colors.border,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.colors.background,
        },
        stepCircleText: {
            color: theme.colors.text.primary,
            fontSize: 12,
            fontWeight: "600",
        },
        stepLabel: {
            marginTop: 4,
            fontSize: 10,
            color: theme.colors.text.muted,
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
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
        },
        radioPillText: {
            color: theme.colors.text.primary,
            fontSize: 12,
            fontWeight: "700",
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
            borderColor: theme.colors.border,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.colors.surface,
        },
        checkboxBoxText: {
            color: "#0f172a",
            fontSize: 12,
            fontWeight: "900",
        },
        checkboxLabel: {
            color: theme.colors.text.primary,
            fontSize: 12,
            fontWeight: "700",
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
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
        },
        navButtonText: {
            color: theme.colors.text.primary,
            fontSize: 13,
            fontWeight: "700",
        },
        navButtonPrimary: {
            borderRadius: 999,
            paddingVertical: 12,
            paddingHorizontal: 18,
            backgroundColor: theme.colors.success,
            marginLeft: "auto",
        },
        navButtonPrimaryText: {
            color: "#0f172a",
            fontSize: 13,
            fontWeight: "800",
        },

        infoText: {
            marginTop: 4,
            fontSize: 12,
            color: theme.colors.text.secondary,
        },
        infoLine: {
            flexDirection: "row",
            alignItems: "center",
            columnGap: 6,
            justifyContent: "flex-start",
        },
        infoNoteLabel: {
            fontSize: 11,
            color: theme.colors.text.accent,
            marginBottom: 2,
            fontWeight: "800",
        },
        infoNoteText: {
            fontSize: 11,
            color: theme.colors.text.secondary,
            lineHeight: 15,
        },

        hintButton: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
        },
        hintButtonText: {
            fontSize: 11,
            color: theme.colors.text.accent,
            fontWeight: "800",
        },

        modalBackdrop: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
        },
        modalContent: {
            width: "88%",
            maxHeight: "80%",
            backgroundColor: theme.colors.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 16,
            alignItems: "center",
        },
        hintVideo: {
            width: "100%",
            height: 260,
            marginBottom: 12,
        },
        modalCloseButton: {
            marginTop: 4,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: theme.colors.accent,
        },
        modalCloseText: {
            color: "#0f172a",
            fontSize: 13,
            fontWeight: "800",
        },

        tipChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
        },
        tipChipOn: {
            backgroundColor: "rgba(56,189,248,0.08)",
            borderColor: "rgba(56,189,248,0.35)",
        },
        tipChipOff: {
            backgroundColor: "rgba(148,163,184,0.06)",
            borderColor: "rgba(148,163,184,0.18)",
        },
        tipChipText: {
            fontSize: 12,
            fontWeight: "800",
        },

        noteFoot: {
            color: theme.colors.text.secondary,
            fontSize: 11,
            marginTop: 10,
            lineHeight: 15,
        },

        table: {
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "rgba(2,6,23,0.35)",
            marginBottom: 10,
        },
        tr: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderTopWidth: 1,
            borderTopColor: theme.colors.surfaceSoft,
        },
        thRow: {
            backgroundColor: "rgba(15,23,42,0.65)",
            borderTopWidth: 0,
        },
        th: {
            color: theme.colors.text.primary,
            fontSize: 12,
            fontWeight: "800",
        },
        td: {
            color: theme.colors.text.primary,
        },
    });

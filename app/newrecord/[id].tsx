import { recordsColRef, studentDocRef } from "@/services/firestorePaths";
import { ResizeMode, Video } from 'expo-av';
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
    Modal,
    Platform,
    Pressable,
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

    // component üstüne bir yere ekle
    const InfoNote = ({ children }: { children: React.ReactNode }) => (
        <View style={{ marginTop: 4 }}>
            <Text style={styles.infoNoteLabel}>İpucu:</Text>
            <Text style={styles.infoNoteText}>{children}</Text>
        </View>
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
                <TouchableOpacity
                    style={styles.hintButton}
                    onPress={() => setVisible(true)}
                >
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



    // Yaş hesaplama (doğum tarihinden, sadece yıl farkı)
    const getAge = () => {
        if (!student?.dateOfBirth) return 0;
        const dob = new Date(student.dateOfBirth);
        if (isNaN(dob.getTime())) return 0;
        const now = new Date();
        let a = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
            a--;
        }
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

    const getLeanBodyMassStatus = (leanBodyMass: number, weight: number, gender?: string) => {
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
        // Özet tablo – web projendeki mantığın kısaltılmış hali
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
                14.8 -
                1.379 * time +
                0.451 * time * time -
                0.012 * time * time * time;
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

    const getPushUpScore = (reps: number, age: number, gender?: string, isModified = false) => {
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

    const getRmSquatScore = (weight: number, reps: number) => {
        if (!weight || !reps) return "";
        if (weight > 150) return "Mükemmel";
        if (weight > 100) return "İyi";
        if (weight > 60) return "Orta";
        return "Geliştirilmeli";
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

            const restHR = Number(
                formData.dinlenikNabiz || formData.restingHeartRate || 0
            );
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
            const rmSquatWeight = Number(formData.rmsquatweight || 0);
            const rmSquatRep = Number(formData.rmsquatrep || 0);

            const bruceVo2Str =
                bruceTime && gender ? getBruceTestVO2(bruceTime, gender) : "";
            const bruceVo2 = bruceVo2Str ? Number(bruceVo2Str) : 0;

            const analysis = {
                age,
                bmi,
                bmiStatus: bmi ? getBMIStatus(bmi) : "",
                bodyFat,
                bodyFatStatus: bodyFat
                    ? getBodyFatStatus(bodyFat, age, gender)
                    : "",
                basalMetabolism: bmr,
                basalMetabolismStatus: bmr
                    ? getBasalMetabolismStatus(bmr, gender)
                    : "",
                leanBodyMass,
                leanBodyMassStatus:
                    leanBodyMass && weight
                        ? getLeanBodyMassStatus(leanBodyMass, weight, gender)
                        : "",
                bodyWaterMass: bodyWater,
                bodyWaterMassStatus: bodyWater
                    ? getBodyWaterMassStatus(bodyWater, gender)
                    : "",
                impedance,
                impedanceStatus: impedance
                    ? getImpedanceStatus(impedance, gender)
                    : "",
                metabolicAge,
                metabolicAgeStatus:
                    metabolicAge && age
                        ? getMetabolicAgeStatus(metabolicAge, age)
                        : "",
                bellyHipRatioStatus:
                    bel && kalca && gender
                        ? getBellyHipRatio(bel, kalca, gender)
                        : "",

                carvonenTargetHR:
                    restHR && carvonenZone && age
                        ? getCarvonenTargetHR(restHR, carvonenZone, age)
                        : "",
                ymcaStatus:
                    ymcaPulse && age && gender
                        ? getYMCAResult(ymcaPulse, age, gender)
                        : "",

                bruceVO2Max: bruceVo2Str,
                vo2Status:
                    bruceVo2 && age && gender
                        ? getVO2Status(bruceVo2, age, gender)
                        : "",

                sitAndReachBest: sitBest,
                sitAndReachStatus:
                    sitBest !== null && sitBest !== undefined && gender
                        ? getSitAndReachStatus(sitBest, gender)
                        : "",

                pushupStatus:
                    pushupReps && age && gender
                        ? getPushUpScore(
                            pushupReps,
                            age,
                            gender,
                            formData.modifiedpushup === "Evet"
                        )
                        : "",
                wallSitStatus:
                    wallSitSec && gender
                        ? getWallSitScore(wallSitSec, gender)
                        : "",
                plankStatus:
                    plankSec && gender ? getPlankScore(plankSec, gender) : "",
                mekikStatus:
                    mekikSec && gender ? getMekikScore(mekikSec, gender) : "",
                rmSquatStatus:
                    rmSquatWeight && rmSquatRep
                        ? getRmSquatScore(rmSquatWeight, rmSquatRep)
                        : "",
            };

            await addDoc(recordsColRef(), {
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
                            <InfoNote>
                                Bu değer doğrudan Tanita cihazında görünen BMI/VKİ değeridir.
                                Manuel hesaplama yapmana gerek yok.
                            </InfoNote>
                            {formData.bodyMassIndex && (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getBMIStatus(Number(formData.bodyMassIndex || 0))}
                                </Text>
                            )}

                            {renderNumericInput("basalMetabolism", "Bazal Metabolizma Hızı")}
                            {formData.basalMetabolism && (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getBasalMetabolismStatus(Number(formData.basalMetabolism || 0), student?.gender)}
                                </Text>
                            )}

                            {renderNumericInput("bodyFat", "Vücut Yağ Oranı (%)")}
                            {formData.bodyFat && (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getBodyFatStatus(
                                        Number(formData.bodyFat || 0),
                                        getAge(),
                                        student?.gender
                                    )}
                                </Text>)}

                            {renderNumericInput("totalMuscleMass", "Toplam Kas Kütlesi (kg)")}

                            {renderNumericInput("leanBodyMass", "Yağsız Kütle (kg)")}
                            {formData.leanBodyMass && (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getLeanBodyMassStatus(
                                        Number(formData.leanBodyMass || 0),
                                        Number(formData.weight || 0),
                                        student?.gender
                                    )}
                                </Text>)}

                            {renderNumericInput("bodyWaterMass", "Vücut Sıvı Oranı (%)")}
                            {formData.bodyWaterMass && (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getBodyWaterMassStatus(
                                        Number(formData.bodyWaterMass || 0),
                                        student?.gender
                                    )}
                                </Text>)}

                            {renderNumericInput("impedance", "Empedans (Ω - Ohm)")}
                            {formData.impedance && (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getImpedanceStatus(Number(formData.impedance || 0), student?.gender)}
                                </Text>)}

                            {renderNumericInput("metabolicAge", "Metabolik Yaş")}
                            {formData.metabolicAge && (
                                <Text style={styles.infoText}>
                                    Durum:{" "}
                                    {getMetabolicAgeStatus(
                                        Number(formData.metabolicAge || 0),
                                        getAge()
                                    )}
                                </Text>
                            )}
                        </View>

                        {/* ÇEVRE ÖLÇÜMLERİ */}
                        <View style={styles.card}>
                            <View style={styles.cardTitleRow}>
                                <Ruler size={18} color="#22c55e" />
                                <Text style={styles.cardTitle}>Çevre Ölçümleri (Mezura)</Text>
                            </View>

                            <HintImageButton
                                label="Bel & kalça ölçüm görselini göster"
                                videoSource={require("@/assets/videos/belOlcum.mp4")}
                            />
                            {renderNumericInput("boyun", "Boyun")}
                            {renderNumericInput("omuz", "Omuz")}
                            {renderNumericInput("gogus", "Göğüs")}
                            {renderNumericInput("sagKol", "Sağ Kol")}
                            {renderNumericInput("solKol", "Sol Kol")}
                            {renderNumericInput("bel", "Bel")}
                            {renderNumericInput("kalca", "Kalça")}
                            {formData.bel && formData.kalca && (
                                <Text style={styles.infoText}>
                                    Bel/Kalça:{" "}
                                    {getBellyHipRatio(
                                        Number(formData.bel || 0),
                                        Number(formData.kalca || 0),
                                        student?.gender
                                    )}
                                </Text>)}

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
                            {formData.carvonenMultiplier && (
                                <Text style={styles.infoText}>
                                    Hedef Nabız:{" "}
                                    {getCarvonenTargetHR(
                                        Number(formData.dinlenikNabiz || formData.restingHeartRate || 0),
                                        Number(formData.carvonenMultiplier || 0),
                                        getAge()
                                    )}
                                </Text>)}

                            {renderNumericInput(
                                "toparlanmaNabzi",
                                "YMCA 3 dk Basamak Testi – Toparlanma Nabzı"
                            )}
                            {formData.toparlanmaNabzi && (
                                <Text style={styles.infoText}>
                                    YMCA Sonuç:{" "}
                                    {getYMCAResult(
                                        Number(formData.toparlanmaNabzi || 0),
                                        getAge(),
                                        student?.gender
                                    )}
                                </Text>)}


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
                                {formData.testSuresi && (
                                    <Text style={styles.infoText}>
                                        VO₂max:{" "}
                                        {getBruceTestVO2(Number(formData.testSuresi || 0), student?.gender)}{" "}
                                        ml/kg/dk —{" "}
                                        {getVO2Status(
                                            Number(
                                                getBruceTestVO2(
                                                    Number(formData.testSuresi || 0),
                                                    student?.gender
                                                ) || 0
                                            ),
                                            getAge(),
                                            student?.gender
                                        )}
                                    </Text>)}

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

                            <Text style={styles.helpText}>
                                Üç deneme yap, en iyi değeri kullanıyoruz. Ölçümleri cm cinsinden gir.
                            </Text>

                            {renderNumericInput("sitandreach1", "1. Ölçüm (cm)")}
                            {renderNumericInput("sitandreach2", "2. Ölçüm (cm)")}
                            {renderNumericInput("sitandreach3", "3. Ölçüm (cm)")}
                            {formData.sitandreach1 && formData.sitandreach2 && formData.sitandreach3 && (
                                <Text style={styles.infoText}>
                                    En İyi Değer:{" "}
                                    {getMaxOfThree(
                                        formData.sitandreach1,
                                        formData.sitandreach2,
                                        formData.sitandreach3
                                    )}{" "}
                                    | Durum:{" "}
                                    {getMaxOfThree(
                                        formData.sitandreach1,
                                        formData.sitandreach2,
                                        formData.sitandreach3
                                    ) !== null &&
                                        getMaxOfThree(
                                            formData.sitandreach1,
                                            formData.sitandreach2,
                                            formData.sitandreach3
                                        ) !== undefined &&
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
                                </Text>)}
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

                            {renderNumericInput("rmsquatweight", "1 RM Squat – Kilo (5 ve katları)")}
                            {renderNumericInput("rmsquatrep", "1 RM Squat – Tekrar (2–10)")}
                            {formData.rmsquatweight && formData.rmsquatrep && (
                                <Text style={styles.infoText}>
                                    1RM Squat Skoru:{" "}
                                    {getRmSquatScore(
                                        Number(formData.rmsquatweight || 0),
                                        Number(formData.rmsquatrep || 0)
                                    )}
                                </Text>
                            )}
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
    infoText: {
        marginTop: 4,
        fontSize: 12,
        color: "#9ca3af",
    },
    infoLine: {
        flexDirection: "row",
        alignItems: "center",
        textAlign: "center",
        columnGap: 6,
        justifyContent: "flex-start",
    },
    infoNoteLabel: {
        fontSize: 11,
        color: "#38bdf8",
        marginBottom: 2,
    },
    infoNoteText: {
        fontSize: 11,
        color: "#9ca3af",
    },
    hintButton: {
        alignSelf: "flex-start",
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#1e293b",
        backgroundColor: "#020617",
    },
    hintButtonText: {
        fontSize: 11,
        color: "#e5e7eb",
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
        backgroundColor: "#020617",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1e293b",
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
        backgroundColor: "#38bdf8",
    },
    modalCloseText: {
        color: "#0f172a",
        fontSize: 13,
        fontWeight: "600",
    },

});

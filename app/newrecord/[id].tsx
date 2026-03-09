import { auth } from "@/services/firebase";
import { recordsColRef, studentDocRef } from "@/services/firestorePaths";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Image,
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

export default function NewRecordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);
  // ✅ theme
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [student, setStudent] = useState<Student | null>(null);
  const [showTips, setShowTips] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);

  const STEPS = [
    t("recordNew.steps.physical"),
    t("recordNew.steps.aerobic"),
    t("recordNew.steps.mobility"),
    t("recordNew.steps.strength"),
  ];
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
    setStep((prev) => {
      const next = Math.min(prev + 1, STEPS.length - 1);

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 0);

      return next;
    });
  };

  const handlePrevStep = () => {
    if (step === 0) {
      router.back();
      return;
    }

    setStep((prev) => {
      const next = prev - 1;

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 0);

      return next;
    });
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
        <Text style={styles.infoNoteLabel}>{t("recordNew.hint")}:</Text>
        <Text style={styles.infoNoteText}>{children}</Text>
      </View>
    ) : null;

  const Strong = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.strongText]}>{children}</Text>
  );

  const HintImageButton = ({
    label,
    imageSource,
  }: {
    label: string;
    imageSource: any;
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
              <Image
                source={imageSource}
                style={styles.hintImage}
                resizeMode="contain"
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
    if (gender === "M") {
      if (bmr < 1500) return "Düşük";
      if (bmr < 1900) return "Normal";
      return "Yüksek";
    }
    if (gender === "F") {
      if (bmr < 1200) return "Düşük";
      if (bmr < 1600) return "Normal";
      return "Yüksek";
    }
    return "";
  };

  const getBodyFatStatus = (bodyFat: number, age: number, gender?: string) => {
    if (!bodyFat || !age || !gender) return "";
    if (gender === "M") {
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
    } else if (gender === "F") {
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
    gender?: string,
  ) => {
    if (!leanBodyMass || !weight || !gender) return "";
    const bodyMassOran = (leanBodyMass / weight) * 100;

    if (gender === "M") {
      if (bodyMassOran < 75) return "Düşük";
      if (bodyMassOran < 90) return "Normal";
      if (bodyMassOran < 100) return "Yüksek";
    } else if (gender === "F") {
      if (bodyMassOran < 65) return "Düşük";
      if (bodyMassOran < 80) return "Normal";
      if (bodyMassOran < 100) return "Yüksek";
    }
    return "Geçersiz veri";
  };

  const getBodyWaterMassStatus = (bodyWaterMass: number, gender?: string) => {
    if (!bodyWaterMass || !gender) return "";
    if (gender === "M") {
      if (bodyWaterMass < 50) return "Düşük";
      if (bodyWaterMass < 65) return "Normal";
      return "Yüksek";
    }
    if (gender === "F") {
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
    if (gender === "M") {
      if (impedance < 300) return "Düşük - Daha fazla sıvı/kas oranı";
      if (impedance < 500) return "Normal";
      return "Yüksek - Daha fazla yağ/düşük kas oranı";
    }
    if (gender === "F") {
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

    if (gender === "M") {
      if (ratio < 0.85) return "Mükemmel";
      if (ratio < 0.9) return "Düşük Risk " + r;
      if (ratio < 0.95) return "Orta Risk " + r;
      if (ratio <= 1.0) return "Yüksek Risk " + r;
      return "Çok Yüksek Risk " + r;
    }
    if (gender === "F") {
      if (ratio < 0.75) return "Mükemmel";
      if (ratio < 0.8) return "Düşük Risk " + r;
      if (ratio < 0.85) return "Orta Risk " + r;
      if (ratio <= 0.9) return "Yüksek Risk " + r;
      return "Çok Yüksek Risk " + r;
    }

    return "Geçersiz veri";
  };

  const getCarvonenTargetHR = (
    restingHR: number,
    zone: number,
    age: number,
  ) => {
    if (!restingHR || !zone || !age) return "";
    const maxHR = 220 - age;
    const reserve = maxHR - restingHR;
    const target = restingHR + reserve * zone;
    return target.toFixed(0);
  };

  const getYMCAResult = (pulse: number, age: number, gender?: string) => {
    if (!pulse || !age || !gender) return "";
    if (gender === "M") {
      if (age <= 25) {
        if (pulse <= 79) return "Mükemmel";
        if (pulse <= 89) return "İyi";
        if (pulse <= 100) return "Ortanın Üstü";
        if (pulse <= 105) return "Orta";
        if (pulse <= 112) return "Ortanın Altı";
        if (pulse <= 120) return "Kötü";
        return "Çok Kötü";
      }
    } else if (gender === "F") {
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
    if (gender === "M") {
      const vo2 =
        14.8 - 1.379 * time + 0.451 * time * time - 0.012 * time * time * time;
      return vo2.toFixed(2);
    }
    if (gender === "F") {
      const vo2 = 4.38 * time - 3.9;
      return vo2.toFixed(2);
    }
    return "";
  };

  const getVO2Status = (vo2: number, age: number, gender?: string) => {
    if (!vo2 || !age || !gender) return "";
    if (gender === "M") {
      if (age >= 20 && age <= 29) {
        if (vo2 < 42) return "Zayıf";
        if (vo2 < 45) return "Ortalama Altı";
        if (vo2 < 51) return "Ortalama";
        if (vo2 < 55) return "Ortalama Üstü";
        return "Mükemmel";
      }
    } else if (gender === "F") {
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
    if (gender === "M") {
      if (value >= 27) return "Mükemmel";
      if (value >= 17) return "İyi";
      if (value >= 6) return "Ortanın Üstü";
      if (value >= 0) return "Orta";
      if (value >= -8) return "Ortanın Altı";
      if (value >= -20) return "Kötü";
      return "Çok Kötü";
    }
    if (gender === "F") {
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
    isModified = false,
  ) => {
    if (!reps || reps < 0 || !gender || !age) return "";

    if (gender === "M") {
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

    if (gender === "F") {
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
    if (gender === "M") {
      if (time > 102) return "Mükemmel";
      if (time >= 76) return "Ortalama Üstü";
      if (time >= 58) return "Ortalama";
      if (time >= 30) return "Ortalama Altı";
      return "Zayıf";
    }
    if (gender === "F") {
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
    if (gender === "M") {
      if (time > 128) return "Mükemmel";
      if (time >= 106) return "Ortalama Üstü";
      if (time >= 77) return "Ortalama";
      return "Ortalama Altı";
    }
    if (gender === "F") {
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
    if (gender === "M") {
      if (time > 41) return "Mükemmel";
      if (time >= 35) return "Ortalama Üstü";
      if (time >= 29) return "Ortalama";
      if (time >= 22) return "Ortalama Altı";
      return "Zayıf";
    }
    if (gender === "F") {
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
      Alert.alert("Hata", " " + t("recordNew.alert.noStudentId") + " ");
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
        formData.dinlenikNabiz || formData.restingHeartRate || 0,
      );
      const carvonenZone = Number(formData.carvonenMultiplier || 0);
      const ymcaPulse = Number(formData.toparlanmaNabzi || 0);
      const bruceTime = Number(formData.testSuresi || 0);

      const sitBest = getMaxOfThree(
        formData.sitandreach1,
        formData.sitandreach2,
        formData.sitandreach3,
      );

      const pushupReps = Number(formData.pushup || 0);
      const wallSitSec = Number(formData.wallsit || 0);
      const plankSec = Number(formData.plank || 0);
      const mekikSec = Number(formData.mekik || 0);

      const bruceVo2Str =
        bruceTime && gender ? getBruceTestVO2(bruceTime, gender) : "";
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
        bodyWaterMassStatus: bodyWater
          ? getBodyWaterMassStatus(bodyWater, gender)
          : "",
        impedance,
        impedanceStatus: impedance ? getImpedanceStatus(impedance, gender) : "",
        metabolicAge,
        metabolicAgeStatus:
          metabolicAge && age ? getMetabolicAgeStatus(metabolicAge, age) : "",
        bellyHipRatioStatus:
          bel && kalca && gender ? getBellyHipRatio(bel, kalca, gender) : "",

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
          bruceVo2 && age && gender ? getVO2Status(bruceVo2, age, gender) : "",

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
                formData.modifiedpushup === "Evet",
              )
            : "",
        wallSitStatus:
          wallSitSec && gender ? getWallSitScore(wallSitSec, gender) : "",
        plankStatus: plankSec && gender ? getPlankScore(plankSec, gender) : "",
        mekikStatus: mekikSec && gender ? getMekikScore(mekikSec, gender) : "",
      };

      await addDoc(recordsColRef(auth.currentUser?.uid!), {
        studentId: id,
        ...formData,
        analysis,
        createdAt: serverTimestamp(),
      });

      await updateDoc(studentDocRef(auth.currentUser?.uid!, id!), {
        lastRecordedAt: serverTimestamp(),
      });

      Alert.alert(t("recordNew.alert.okTitle"), t("recordNew.alert.saved"));
      router.back();
    } catch (err) {
      console.error("Kayıt hata:", err);
      Alert.alert("Hata", t("recordNew.alert.saveError"));
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
  const measurementHintImages: Partial<Record<keyof FormData, any>> = {
    boyun: require("@/assets/images/ölçüm/boyun.jpg"),
    omuz: require("@/assets/images/ölçüm/omuz.jpg"),
    gogus: require("@/assets/images/ölçüm/gogus.jpg"),
    sagKol: require("@/assets/images/ölçüm/kol.jpg"),
    solKol: require("@/assets/images/ölçüm/kol.jpg"),
    bel: require("@/assets/images/ölçüm/bel.jpg"),
    kalca: require("@/assets/images/ölçüm/kalça.jpg"),
    sagBacak: require("@/assets/images/ölçüm/bacak.jpg"),
    solBacak: require("@/assets/images/ölçüm/bacak.jpg"),
    sagKalf: require("@/assets/images/ölçüm/baldir.jpg"),
    solKalf: require("@/assets/images/ölçüm/baldir.jpg"),
  };
  const renderNumericInput = (
    field: keyof FormData,
    label: string,
    placeholder?: string,
    hint?: boolean,
  ) => {
    const hintImage = measurementHintImages[field];

    return (
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>

          {hint && showTips && hintImage ? (
            <HintImageButton
              label={t("recordNew.hint.tap")}
              imageSource={hintImage}
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
  };
  const renderTextArea = (
    field: keyof FormData,
    label: string,
    placeholder?: string,
  ) => (
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

  const renderRadioRow = (
    field: keyof FormData,
    label: string,
    options: string[],
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
                selected && {
                  backgroundColor: theme.colors.accent,
                  borderColor: theme.colors.accent,
                },
              ]}
              onPress={() => handleChange(field, opt)}
            >
              <Text
                style={[styles.radioPillText, selected && { color: "#0f172a" }]}
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
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => handleChange(field, !value)}
      >
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
                <Text style={styles.cardTitle}>
                  {t("recordNew.card.tanita.title")}
                </Text>
              </View>

              <InfoNote>{t("recordNew.card.tanita.tip")}</InfoNote>

              {renderNumericInput("weight", t("recordNew.field.weight"))}
              {renderNumericInput("bodyMassIndex", t("recordNew.field.bmi"))}

              <InfoNote>{t("recordNew.card.tanita.bmi.tip")}</InfoNote>

              {formData.bodyMassIndex ? (
                <Text style={styles.infoText}>
                  {t("recordNew.statusLabel")}{" "}
                  {getBMIStatus(Number(formData.bodyMassIndex || 0))}
                </Text>
              ) : null}

              {renderNumericInput("basalMetabolism", t("recordNew.field.bmr"))}
              {formData.basalMetabolism ? (
                <Text style={styles.infoText}>
                  {t("recordNew.statusLabel")}{" "}
                  {getBasalMetabolismStatus(
                    Number(formData.basalMetabolism || 0),
                    student?.gender,
                  )}
                </Text>
              ) : null}

              {renderNumericInput("bodyFat", t("recordNew.field.bodyFat"))}
              {formData.bodyFat ? (
                <Text style={styles.infoText}>
                  {t("recordNew.statusLabel")}{" "}
                  {getBodyFatStatus(
                    Number(formData.bodyFat || 0),
                    getAge(),
                    student?.gender,
                  )}
                </Text>
              ) : null}

              {renderNumericInput(
                "totalMuscleMass",
                t("recordNew.field.totalMuscle"),
              )}

              {renderNumericInput(
                "leanBodyMass",
                t("recordNew.field.leanBodyMass"),
              )}
              {formData.leanBodyMass ? (
                <Text style={styles.infoText}>
                  {t("recordNew.statusLabel")}{" "}
                  {getLeanBodyMassStatus(
                    Number(formData.leanBodyMass || 0),
                    Number(formData.weight || 0),
                    student?.gender,
                  )}
                </Text>
              ) : null}

              {renderNumericInput(
                "bodyWaterMass",
                t("recordNew.field.bodyWater"),
              )}
              {formData.bodyWaterMass ? (
                <Text style={styles.infoText}>
                  {t("recordNew.statusLabel")}{" "}
                  {getBodyWaterMassStatus(
                    Number(formData.bodyWaterMass || 0),
                    student?.gender,
                  )}
                </Text>
              ) : null}

              {renderNumericInput("impedance", t("recordNew.field.impedance"))}
              {formData.impedance ? (
                <Text style={styles.infoText}>
                  {t("recordNew.statusLabel")}{" "}
                  {getImpedanceStatus(
                    Number(formData.impedance || 0),
                    student?.gender,
                  )}
                </Text>
              ) : null}

              {renderNumericInput(
                "metabolicAge",
                t("recordNew.field.metabolicAge"),
              )}
              {formData.metabolicAge ? (
                <Text style={styles.infoText}>
                  {t("recordNew.statusLabel")}{" "}
                  {getMetabolicAgeStatus(
                    Number(formData.metabolicAge || 0),
                    getAge(),
                  )}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ruler size={18} color={theme.colors.success} />
                <Text style={styles.cardTitle}>
                  {t("recordNew.card.tape.title")}
                </Text>
              </View>

              {renderNumericInput(
                "boyun",
                t("recordNew.field.neck"),
                t("recordNew.placeholder.neck"),
                true,
              )}
              {renderNumericInput(
                "omuz",
                t("recordNew.field.shoulder"),
                t("recordNew.placeholder.shoulder"),
                true,
              )}
              {renderNumericInput(
                "gogus",
                t("recordNew.field.chest"),
                t("recordNew.placeholder.chest"),
                true,
              )}
              {renderNumericInput(
                "sagKol",
                t("recordNew.field.rightArm"),
                t("recordNew.placeholder.rightArm"),
                true,
              )}
              {renderNumericInput(
                "solKol",
                t("recordNew.field.leftArm"),
                t("recordNew.placeholder.leftArm"),
                true,
              )}
              {renderNumericInput(
                "bel",
                t("recordNew.field.waist"),
                t("recordNew.placeholder.waist"),
                true,
              )}
              {renderNumericInput(
                "kalca",
                t("recordNew.field.hip"),
                t("recordNew.placeholder.hip"),
                true,
              )}

              {formData.bel && formData.kalca ? (
                <Text style={styles.infoText}>
                  {t("recordNew.label.waistHip")}{" "}
                  {getBellyHipRatio(
                    Number(formData.bel || 0),
                    Number(formData.kalca || 0),
                    student?.gender,
                  )}
                </Text>
              ) : null}

              {renderNumericInput(
                "sagBacak",
                t("recordNew.field.rightLeg"),
                t("recordNew.placeholder.rightLeg"),
                true,
              )}
              {renderNumericInput(
                "solBacak",
                t("recordNew.field.leftLeg"),
                t("recordNew.placeholder.leftLeg"),
                true,
              )}
              {renderNumericInput(
                "sagKalf",
                t("recordNew.field.rightCalf"),
                t("recordNew.placeholder.rightCalf"),
                true,
              )}
              {renderNumericInput(
                "solKalf",
                t("recordNew.field.leftCalf"),
                t("recordNew.placeholder.leftCalf"),
                true,
              )}
              {renderTextArea("mezuraNote", t("recordNew.field.tapeNote"))}
            </View>
          </>
        );

      case 1:
        return (
          <>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <SquareActivity size={18} color={theme.colors.warning} />
                <Text style={styles.cardTitle}>
                  {t("recordNew.card.aerobic.title")}
                </Text>
              </View>

              <InfoNote>{t("recordNew.tip.restingHr")}</InfoNote>
              {renderNumericInput(
                "dinlenikNabiz",
                t("recordNew.field.restingHr"),
              )}

              <InfoNote>{t("recordNew.tip.carvonen")}</InfoNote>
              {renderRadioRow(
                "carvonenMultiplier",
                t("recordNew.field.carvonenZone"),
                ["0.55", "0.65", "0.75", "0.85", "0.95"],
              )}

              {formData.carvonenMultiplier ? (
                <>
                  <InfoNote>{t("recordNew.tip.targetHr")}</InfoNote>
                  <Text style={styles.infoText}>
                    {t("recordNew.label.targetHr")}{" "}
                    {getCarvonenTargetHR(
                      Number(
                        formData.dinlenikNabiz ||
                          formData.restingHeartRate ||
                          0,
                      ),
                      Number(formData.carvonenMultiplier || 0),
                      getAge(),
                    )}
                  </Text>
                </>
              ) : null}

              <InfoNote>
                <Text>
                  {t("recordNew.tip.ymca.longIntro")}
                  {"\n"}
                  <Strong>{t("recordNew.tip.ymca.step1Label")}</Strong>{" "}
                  {t("recordNew.tip.ymca.step1")}
                  {"\n"}
                  <Strong>{t("recordNew.tip.ymca.step2Label")}</Strong>{" "}
                  {t("recordNew.tip.ymca.step2")}
                  {"\n"}
                  <Strong>{t("recordNew.tip.ymca.step3Label")}</Strong>{" "}
                  {t("recordNew.tip.ymca.step3")}
                  {"\n"}
                  <Strong>{t("recordNew.tip.ymca.step4Label")}</Strong>{" "}
                  {t("recordNew.tip.ymca.step4")}
                  {"\n"}
                  <Strong>{t("recordNew.tip.ymca.step5Label")}</Strong>{" "}
                  {t("recordNew.tip.ymca.step5")}
                </Text>
              </InfoNote>

              {renderNumericInput(
                "toparlanmaNabzi",
                t("recordNew.field.ymcaPulse"),
              )}

              {formData.toparlanmaNabzi ? (
                <>
                  <InfoNote>{t("recordNew.tip.ymcaResult")}</InfoNote>
                  <Text style={styles.infoText}>
                    {t("recordNew.label.ymcaResult")}{" "}
                    {getYMCAResult(
                      Number(formData.toparlanmaNabzi || 0),
                      getAge(),
                      student?.gender,
                    )}
                  </Text>
                </>
              ) : null}

              <View style={[styles.field, { marginTop: 16 }]}>
                <Text style={styles.label}>
                  {t("recordNew.field.bruceTime")}
                </Text>

                <InfoNote>{t("recordNew.tip.bruceProtocol")}</InfoNote>

                {showTips ? (
                  <View style={styles.table}>
                    <View style={[styles.tr, styles.thRow]}>
                      <Text style={[styles.th, { flex: 1.1 }]}>
                        {t("recordNew.table.stage")}
                      </Text>
                      <Text style={[styles.th, { flex: 1.2 }]}>
                        {t("recordNew.table.duration")}
                      </Text>
                      <Text style={[styles.th, { flex: 1.6 }]}>
                        {t("recordNew.table.speed")}
                      </Text>
                      <Text style={[styles.th, { flex: 1.2 }]}>
                        {t("recordNew.table.incline")}
                      </Text>
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
                        <Text style={[styles.td, { flex: 1.1 }]}>
                          {r.stage}
                        </Text>
                        <Text style={[styles.td, { flex: 1.2 }]}>{r.min}</Text>
                        <Text style={[styles.td, { flex: 1.6 }]}>
                          {r.speed} {t("common.unit.kmh")}
                        </Text>
                        <Text style={[styles.td, { flex: 1.2 }]}>
                          {r.grade}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <InfoNote>{t("recordNew.tip.bruceNote")}</InfoNote>

                <TextInput
                  placeholder={t("recordNew.placeholder.bruceTime")}
                  placeholderTextColor={theme.colors.text.muted}
                  value={formData.testSuresi}
                  onChangeText={(tValue) => handleChange("testSuresi", tValue)}
                  style={styles.input}
                  keyboardType="numeric"
                />

                <Text style={styles.helpText}>{t("recordNew.help.bruce")}</Text>

                {formData.testSuresi ? (
                  <>
                    <InfoNote>{t("recordNew.tip.vo2max")}</InfoNote>

                    <Text style={styles.infoText}>
                      {t("recordNew.label.vo2max")}{" "}
                      {getBruceTestVO2(
                        Number(formData.testSuresi || 0),
                        student?.gender,
                      )}{" "}
                      {t("common.unit.vo2")} —{" "}
                      {getVO2Status(
                        Number(
                          getBruceTestVO2(
                            Number(formData.testSuresi || 0),
                            student?.gender,
                          ) || 0,
                        ),
                        getAge(),
                        student?.gender,
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
                <Text style={styles.cardTitle}>
                  {t("recordNew.card.posture.title")}
                </Text>
              </View>

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.info.goal")}</Strong>{" "}
                  {t("recordNew.tip.posture.goal")}
                  {"\n\n"}
                  <Strong>{t("recordNew.info.application")}</Strong>{" "}
                  {t("recordNew.tip.posture.application")}
                  {"\n\n"}
                  <Strong>{t("recordNew.info.hint")}</Strong>{" "}
                  {t("recordNew.tip.posture.hint")}
                </Text>
              </InfoNote>

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.tip.posture.ankleTitle")}</Strong>{" "}
                  {t("recordNew.tip.posture.ankleDesc")}
                </Text>
              </InfoNote>
              {renderTextArea(
                "ayakveayakbilegionden",
                t("recordNew.field.ankle.front"),
              )}
              {renderTextArea(
                "ayakveayakbilegiyandan",
                t("recordNew.field.ankle.side"),
              )}
              {renderTextArea(
                "ayakveayakbilegiarkadan",
                t("recordNew.field.ankle.back"),
              )}

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.tip.posture.kneeTitle")}</Strong>{" "}
                  {t("recordNew.tip.posture.kneeDesc")}
                </Text>
              </InfoNote>
              {renderTextArea("dizonden", t("recordNew.field.knee.front"))}
              {renderTextArea("dizyandan", t("recordNew.field.knee.side"))}
              {renderTextArea("dizarkadan", t("recordNew.field.knee.back"))}

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.tip.posture.lphkTitle")}</Strong>{" "}
                  {t("recordNew.tip.posture.lphkDesc")}
                </Text>
              </InfoNote>
              {renderTextArea("lphkonden", t("recordNew.field.lphk.front"))}
              {renderTextArea("lphkyandan", t("recordNew.field.lphk.side"))}
              {renderTextArea("lphkarkadan", t("recordNew.field.lphk.back"))}

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.tip.posture.shouldersTitle")}</Strong>{" "}
                  {t("recordNew.tip.posture.shouldersDesc")}
                </Text>
              </InfoNote>
              {renderTextArea(
                "omuzlaronden",
                t("recordNew.field.shoulders.front"),
              )}
              {renderTextArea(
                "omuzlaryandan",
                t("recordNew.field.shoulders.side"),
              )}
              {renderTextArea(
                "omuzlararkadan",
                t("recordNew.field.shoulders.back"),
              )}

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.tip.posture.headNeckTitle")}</Strong>{" "}
                  {t("recordNew.tip.posture.headNeckDesc")}
                </Text>
              </InfoNote>
              {renderTextArea(
                "basboyunonden",
                t("recordNew.field.headNeck.front"),
              )}
              {renderTextArea(
                "basboyunyandan",
                t("recordNew.field.headNeck.side"),
              )}
              {renderTextArea(
                "basboyunarkadan",
                t("recordNew.field.headNeck.back"),
              )}

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.field.pronation")}</Strong>{" "}
                  {t("recordNew.tip.posture.pronationDesc")}
                </Text>
              </InfoNote>
              {renderRadioRow("pronation", t("recordNew.field.pronation"), [
                t("recordNew.option.yes"),
                t("recordNew.option.no"),
              ])}

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.field.lowerCrossed")}</Strong>{" "}
                  {t("recordNew.tip.posture.lowerDesc")}
                </Text>
              </InfoNote>
              {renderRadioRow("lower", t("recordNew.field.lowerCrossed"), [
                t("recordNew.option.yes"),
                t("recordNew.option.no"),
              ])}

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.field.upperCrossed")}</Strong>{" "}
                  {t("recordNew.tip.posture.upperDesc")}
                </Text>
              </InfoNote>
              {renderRadioRow("upper", t("recordNew.field.upperCrossed"), [
                t("recordNew.option.yes"),
                t("recordNew.option.no"),
              ])}

              {renderTextArea(
                "posturNotes",
                t("recordNew.field.postureNotes"),
                "",
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <HeartPulse size={18} color={theme.colors.accent} />
                <Text style={styles.cardTitle}>
                  {t("recordNew.card.ohs.title")}
                </Text>
              </View>

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.info.goal")}</Strong>{" "}
                  {t("recordNew.tip.ohs.goal")}
                </Text>
              </InfoNote>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>
                    {t("recordNew.field.hasPain")}
                  </Text>
                  <Text style={styles.helpText}>
                    {t("recordNew.help.hasPain")}
                  </Text>
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
                  <Text style={styles.label}>
                    {t("recordNew.field.hadSurgery")}
                  </Text>
                  <Text style={styles.helpText}>
                    {t("recordNew.help.hadSurgery")}
                  </Text>
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

              {renderTextArea("ohsNotes", t("recordNew.field.ohsNotes"), "")}
              {renderRadioRow(
                "ohsFeetTurnOut",
                t("recordNew.field.ohsFeetTurnOut"),
                [t("recordNew.option.yes"), t("recordNew.option.no")],
              )}
              {renderRadioRow("ohsKneesIn", t("recordNew.field.ohsKneesIn"), [
                t("recordNew.option.yes"),
                t("recordNew.option.no"),
              ])}
              {renderRadioRow(
                "ohsForwardLean",
                t("recordNew.field.ohsForwardLean"),
                [t("recordNew.option.yes"), t("recordNew.option.no")],
              )}
              {renderRadioRow(
                "ohsLowBackArch",
                t("recordNew.field.ohsLowBackArch"),
                [t("recordNew.option.yes"), t("recordNew.option.no")],
              )}
              {renderRadioRow(
                "ohsArmsFallForward",
                t("recordNew.field.ohsArmsFallForward"),
                [t("recordNew.option.yes"), t("recordNew.option.no")],
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <HeartPulse size={18} color={theme.colors.success} />
                <Text style={styles.cardTitle}>
                  {t("recordNew.card.sitReach.title")}
                </Text>
              </View>

              <InfoNote>
                <Text>
                  <Strong>{t("recordNew.info.application")}</Strong>{" "}
                  {t("recordNew.tip.sitReach.application")}
                </Text>
              </InfoNote>

              {renderNumericInput(
                "sitandreach1",
                t("recordNew.field.sitReach1"),
              )}
              {renderNumericInput(
                "sitandreach2",
                t("recordNew.field.sitReach2"),
              )}
              {renderNumericInput(
                "sitandreach3",
                t("recordNew.field.sitReach3"),
              )}

              {formData.sitandreach1 &&
              formData.sitandreach2 &&
              formData.sitandreach3 ? (
                <Text style={styles.infoText}>
                  {t("recordNew.label.bestValue")}{" "}
                  {getMaxOfThree(
                    formData.sitandreach1,
                    formData.sitandreach2,
                    formData.sitandreach3,
                  )}{" "}
                  | {t("recordNew.statusLabel")}{" "}
                  {getMaxOfThree(
                    formData.sitandreach1,
                    formData.sitandreach2,
                    formData.sitandreach3,
                  ) != null && student?.gender
                    ? getSitAndReachStatus(
                        Number(
                          getMaxOfThree(
                            formData.sitandreach1,
                            formData.sitandreach2,
                            formData.sitandreach3,
                          ) || 0,
                        ),
                        student.gender,
                      )
                    : ""}
                </Text>
              ) : null}

              {renderTextArea(
                "sitandreachnotes",
                t("recordNew.field.sitReachNotes"),
                "",
              )}
            </View>
          </>
        );

      case 3:
        return (
          <>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <BicepsFlexed size={18} color={theme.colors.warning} />
                <Text
                  style={[styles.cardTitle, { color: theme.colors.warning }]}
                >
                  {t("recordNew.card.strength.title")}
                </Text>
              </View>

              {renderNumericInput("pushup", t("recordNew.field.pushup"))}
              {renderRadioRow(
                "modifiedpushup",
                t("recordNew.field.modifiedPushup"),
                [t("recordNew.option.yes"), t("recordNew.option.no")],
              )}

              {formData.pushup && (
                <Text style={styles.infoText}>
                  {t("recordNew.label.pushupScore")}{" "}
                  {getPushUpScore(
                    Number(formData.pushup || 0),
                    getAge(),
                    student?.gender,
                    formData.modifiedpushup === t("recordNew.option.yes"),
                  )}
                </Text>
              )}

              {renderNumericInput("wallsit", t("recordNew.field.wallSit"))}
              {formData.wallsit && (
                <Text style={styles.infoText}>
                  {t("recordNew.label.wallSitScore")}{" "}
                  {getWallSitScore(
                    Number(formData.wallsit || 0),
                    student?.gender,
                  )}
                </Text>
              )}

              {renderNumericInput("plank", t("recordNew.field.plank"))}
              {formData.plank && (
                <Text style={styles.infoText}>
                  {t("recordNew.label.plankScore")}{" "}
                  {getPlankScore(Number(formData.plank || 0), student?.gender)}
                </Text>
              )}

              {renderNumericInput("mekik", t("recordNew.field.situp"))}
              {formData.mekik && (
                <Text style={styles.infoText}>
                  {t("recordNew.label.situpScore")}{" "}
                  {getMekikScore(Number(formData.mekik || 0), student?.gender)}
                </Text>
              )}

              {renderTextArea(
                "kuvvetnotes",
                t("recordNew.field.strengthNotes"),
              )}
              {renderTextArea("note", t("recordNew.field.recordNotes"))}

              <InfoNote>{t("recordNew.tip.recordNotes")}</InfoNote>
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
            ref={scrollRef}
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
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
                      {showTips
                        ? t("recordNew.tips.on")
                        : t("recordNew.tips.off")}
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
                      <Text style={styles.metaText}>
                        {t(
                          `newstudent.gender.${student.gender === "F" ? "female" : "male"}`,
                        )}
                      </Text>
                    </View>
                  )}
                  {student.dateOfBirth && (
                    <View style={styles.metaItem}>
                      <Calendar size={14} color="#9ca3af" />
                      <Text style={styles.metaText}>
                        {new Date(student.dateOfBirth).toLocaleDateString(
                          "tr-TR",
                        )}
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
                <Text style={styles.navButtonText}>
                  {t("recordNew.nav.prev")}
                </Text>
              </TouchableOpacity>

              {!isLastStep ? (
                <TouchableOpacity
                  style={styles.navButtonPrimary}
                  onPress={handleNextStep}
                >
                  <Text style={styles.navButtonPrimaryText}>
                    {t("recordNew.nav.next")}
                  </Text>
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
                        {t("recordNew.submit")}
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
    hintImage: {
      width: "100%",
      height: 360,
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

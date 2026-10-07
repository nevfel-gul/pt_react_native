import { usePremium } from "@/constants/PremiumContext";
import { useRating } from "@/constants/RatingContext";
import {
    ACTIVITY_LEVELS,
    EXPERIENCE_LEVELS,
    PREGNANCY_STATUSES,
    SLEEP_LEVELS,
    STRESS_LEVELS,
    TRAINING_GOALS,
    normalizeGoals,
    parqYesCount,
} from "@/constants/studentForm";
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

import { track } from "@/services/analytics";
import { auth } from "@/services/firebase";
import { requestWidgetRefresh } from "@/services/widgetData";
import { studentsColRef } from "@/services/firestorePaths";

import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { calendarLangOf, pickerLocaleOf } from "@/constants/calendarLocale";
import { useLocalSearchParams, useRouter } from "expo-router";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { addDoc, doc, getCountFromServer, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { AlertTriangle, ArrowLeft, Calendar, Save, User as UserIcon } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
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

type Gender = "F" | "M" | "";
type Status = "Aktif" | "Pasif";
type Bool = boolean | null;

type FormState = {
    name: string;
    boy: string;
    dateOfBirth: string; // ISO: YYYY-MM-DD
    number: string;
    email: string;
    gender: Gender;
    assessmentDate: string;
    aktif: Status;

    emergencyContactName: string;
    emergencyContactPhone: string;

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

    /** PAR-Q'da "Evet" varsa: doktor onayı alındı mı, ne zaman. */
    medicalClearance: Bool;
    medicalClearanceDate: string;

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

    /** DSÖ önerisine göre haftalık aktivite (eski "30 dk veya az mı?" sorusunun yerine). */
    weeklyActivityLevel: string | null;
    experienceLevel: string | null;
    pregnancyStatus: string | null;
    smokes: Bool;
    sleepHours: string | null;
    stressLevel: number | null;
    nutritionNotes: string;

    plannedDaysPerWeek: number | null;
    jobDescription: string;

    jobRequiresLongSitting: Bool;
    jobRequiresRepetitiveMovement: Bool;
    jobRequiresHighHeels: Bool;
    jobCausesAnxiety: Bool;

    trainingGoals: string[];
    otherGoal: string;
};

type FormErrors = {
    name?: string;
    boy?: string;
    number?: string;
    emergencyContactPhone?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
};

const YeniOgrenciScreen = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const pickerLocale = pickerLocaleOf(calendarLangOf(i18n.language));
    const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
    const isEdit = mode === "edit" && !!id;

    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { studentLimit, isUnlimited, hasPremium, tier } = usePremium();

    const today = new Date().toISOString().split("T")[0];

    const [errors, setErrors] = useState<FormErrors>({});
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    // ✅ DOB picker state
    const [showDobPicker, setShowDobPicker] = useState(false);

    const { notifyPositiveMoment } = useRating();

    useEffect(() => {
        track("student_form_opened", { mode: isEdit ? "edit" : "new" });
    }, [isEdit]);

    const [form, setForm] = useState<FormState>({
        name: "",
        boy: "",
        dateOfBirth: "",
        number: "",
        email: "",
        gender: "",
        assessmentDate: today,
        aktif: "Aktif",

        emergencyContactName: "",
        emergencyContactPhone: "",

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

        medicalClearance: null,
        medicalClearanceDate: "",

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

        weeklyActivityLevel: null,
        experienceLevel: null,
        pregnancyStatus: null,
        smokes: null,
        sleepHours: null,
        stressLevel: null,
        nutritionNotes: "",

        plannedDaysPerWeek: null,
        jobDescription: "",

        jobRequiresLongSitting: null,
        jobRequiresRepetitiveMovement: null,
        jobRequiresHighHeels: null,
        jobCausesAnxiety: null,

        trainingGoals: [],
        otherGoal: "",
    });

    /* -------------------- helpers -------------------- */
    const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const normalizeTRPhone = (input: string) => {
        let p = (input || "").replace(/[^\d+]/g, "");
        if (p.startsWith("+90")) p = "0" + p.slice(3);
        if (p.startsWith("90") && p.length >= 12) p = "0" + p.slice(2);
        return p;
    };

    // Türkiye numarası (05xx…) ya da ülke koduyla uluslararası numara (+49…).
    const isValidPhone = (p: string) => /^05\d{9}$/.test(p) || /^\+\d{8,15}$/.test(p);

    const toISODate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const parseISODate = (iso?: string): Date | null => {
        if (!iso) return null;
        const parts = iso.split("-").map((x) => Number(x));
        if (parts.length !== 3) return null;
        const [y, m, d] = parts;
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };

    const formatDateTR = (iso?: string) => {
        const d = parseISODate(iso);
        if (!d) return "";
        return d.toLocaleDateString("tr-TR"); // 30.01.2000
    };

    const onDobChange = (event: DateTimePickerEvent, selected?: Date) => {
        // Android seçince kapanır; iOS'ta spinner açık kalabilir (istersen ayrıca "Tamam" ekleriz)
        if (Platform.OS !== "ios") setShowDobPicker(false);

        if (event.type === "dismissed") return;
        if (!selected) return;

        updateField("dateOfBirth", toISODate(selected));
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

    const validateForm = () => {
        const newErrors: FormErrors = {};

        if (!form.name?.trim()) newErrors.name = t("newstudent.validation.name_required");

        if (!form.boy) {
            newErrors.boy = t("newstudent.validation.height_required");
        } else if (isNaN(Number(form.boy)) || Number(form.boy) < 50) {
            newErrors.boy = t("newstudent.validation.height_invalid");
        }

        const phone = normalizeTRPhone(form.number);
        if (phone && !isValidPhone(phone)) newErrors.number = t("newstudent.validation.phone_invalid");

        const emergencyPhone = normalizeTRPhone(form.emergencyContactPhone);
        if (emergencyPhone && !isValidPhone(emergencyPhone)) {
            newErrors.emergencyContactPhone = t("newstudent.validation.phone_invalid");
        }

        const email = form.email?.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t("newstudent.validation.email_invalid");

        if (!form.dateOfBirth) newErrors.dateOfBirth = t("newstudent.validation.birth_date_required");
        if (!form.gender) newErrors.gender = t("newstudent.validation.gender_required");

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const goBackSmart = () => {
        if (router.canGoBack()) router.back();
        else router.replace("/(tabs)");
    };

    /* -------------------- effects -------------------- */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isEdit) return;
        if (!auth.currentUser?.uid) return;

        (async () => {
            try {
                setLoading(true);

                const ref = doc(studentsColRef(auth.currentUser!.uid), id!);
                const snap = await getDoc(ref);
                if (!snap.exists()) return;

                const d = snap.data() as any;

                setForm((prev) => ({
                    ...prev,
                    ...d,
                    trainingGoals: normalizeGoals(d.trainingGoals),
                    plannedDaysPerWeek: typeof d.plannedDaysPerWeek === "number" ? d.plannedDaysPerWeek : null,
                    assessmentDate: d.assessmentDate ?? prev.assessmentDate,
                    dateOfBirth: d.dateOfBirth ?? prev.dateOfBirth,
                }));
            } catch (e) {
                console.error("edit load error:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, [isEdit, id]);

    /* -------------------- submit -------------------- */
    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);

            // Yeni öğrenci eklenirken plan limitini kontrol et
            if (!isEdit && !isUnlimited) {
                const uid = auth.currentUser?.uid;
                if (uid) {
                    // Sayım için tüm öğrenci dokümanlarını indirmeye gerek yok.
                    const countSnap = await getCountFromServer(studentsColRef(uid));
                    const currentCount = countSnap.data().count;
                    const limit = studentLimit ?? 5; // fallback: ücretsiz plan limiti

                    if (currentCount >= limit) {
                        setSaving(false);
                        track("student_limit_hit", { tier, limit });
                        const tierLabel =
                            tier === 'free' ? t('plan.tier.free')
                                : tier === 'core' ? 'Core'
                                    : tier === 'pro' ? 'Pro'
                                        : 'Studio';
                        Alert.alert(
                            t('newstudent.limit.title'),
                            t('newstudent.limit.message', { plan: tierLabel, limit }),
                            [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                    text: t('newstudent.limit.upgrade'),
                                    onPress: () => router.push({ pathname: '/(tabs)/premium', params: { source: 'student_limit' } } as any),
                                },
                            ]
                        );
                        return;
                    }
                }
            }

            // Hamilelik sorusu sadece kadın danışanlarda anlamlı.
            const payload = {
                ...form,
                pregnancyStatus: form.gender === "F" ? form.pregnancyStatus : null,
                // PAR-Q'da "Evet" kalmadıysa onay alanı da anlamını yitirir.
                ...(parqYesCount(form) === 0 ? { medicalClearance: null, medicalClearanceDate: "" } : {}),
            };

            const analyticsProps = {
                parqYesCount: parqYesCount(form),
                goalsCount: form.trainingGoals.length,
                plannedDaysPerWeek: form.plannedDaysPerWeek,
                experienceLevel: form.experienceLevel,
                hasEmergencyContact: !!form.emergencyContactPhone.trim(),
            };

            if (isEdit) {
                await updateDoc(doc(studentsColRef(auth.currentUser?.uid!), id!), {
                    ...payload,
                    updatedAt: serverTimestamp(),
                });
                track("student_updated", analyticsProps);
            } else {
                await addDoc(studentsColRef(auth.currentUser?.uid!), {
                    ...payload,
                    ownerUid: auth.currentUser?.uid,
                    createdAt: serverTimestamp(),
                    followUpDays: 30,
                });
                track("student_created", analyticsProps);
                notifyPositiveMoment("student_created");
            }
            requestWidgetRefresh();

            Alert.alert(t("newstudent.alert.success.title"), t("newstudent.alert.success.message"), [
                { text: t("newstudent.alert.success.ok"), onPress: () => router.replace("/(tabs)") },
            ]);
        } catch (e) {
            console.error("student save error:", e);
            Alert.alert(t("newstudent.alert.error.title"), t("newstudent.alert.error.message"));
        } finally {
            setSaving(false);
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
                    {/* HEADER */}
                    <View style={styles.headerCard}>
                        <View style={styles.headerTopRow}>
                            <TouchableOpacity style={styles.backButton} onPress={goBackSmart}>
                                <ArrowLeft size={18} color={theme.colors.text.primary} />
                                <Text style={styles.backButtonText}>{t("newstudent.header.back")}</Text>
                            </TouchableOpacity>

                            <View style={styles.headerTitleRow}>
                                <View style={styles.iconCircle}>
                                    <UserIcon size={22} color={theme.colors.primary} />
                                </View>

                                <View>
                                    <Text style={styles.headerTitle}>
                                        {isEdit ? t("newstudent.header.title_edit") : t("newstudent.header.title_new")}
                                    </Text>

                                    <View style={styles.dateRow}>
                                        <Calendar size={14} color={theme.colors.text.muted} />
                                        <Text style={styles.dateText}>
                                            {t("newstudent.header.assessment_prefix")} {form.assessmentDate}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* FORM */}
                    <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                        {/* BÖLÜM 1 */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>{t("newstudent.section.personal_info")}</Text>

                            <FormInput
                                theme={theme}
                                styles={styles}
                                label={t("newstudent.label.full_name")}
                                placeholder={t("newstudent.placeholder.full_name")}
                                value={form.name}
                                onChangeText={(tx) => updateField("name", tx)}
                                error={errors.name}
                            />

                            <View style={styles.row}>
                                <View style={styles.rowItem}>
                                    <FormInput
                                        theme={theme}
                                        styles={styles}
                                        label={t("newstudent.label.height_cm")}
                                        placeholder={t("newstudent.placeholder.height_cm")}
                                        keyboardType="numeric"
                                        value={form.boy}
                                        onChangeText={(tx) => updateField("boy", tx)}
                                        error={errors.boy}
                                    />
                                </View>

                                <View style={styles.rowItem}>
                                    <FormInput
                                        theme={theme}
                                        styles={styles}
                                        label={t("newstudent.label.phone")}
                                        placeholder={t("newstudent.placeholder.phone")}
                                        keyboardType="phone-pad"
                                        value={form.number}
                                        onChangeText={(tx) => updateField("number", normalizeTRPhone(tx))}
                                        error={errors.number}
                                    />
                                </View>
                            </View>

                            <FormInput
                                theme={theme}
                                styles={styles}
                                label={t("newstudent.label.email")}
                                placeholder={t("newstudent.placeholder.email")}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={form.email}
                                onChangeText={(tx) => updateField("email", tx)}
                                error={errors.email}
                            />

                            <View style={styles.row}>
                                <View style={styles.rowItem}>
                                    <FormInput
                                        theme={theme}
                                        styles={styles}
                                        label={t("newstudent.label.emergency_name")}
                                        placeholder={t("newstudent.placeholder.emergency_name")}
                                        value={form.emergencyContactName}
                                        onChangeText={(tx) => updateField("emergencyContactName", tx)}
                                    />
                                </View>
                                <View style={styles.rowItem}>
                                    <FormInput
                                        theme={theme}
                                        styles={styles}
                                        label={t("newstudent.label.emergency_phone")}
                                        placeholder={t("newstudent.placeholder.phone")}
                                        keyboardType="phone-pad"
                                        value={form.emergencyContactPhone}
                                        onChangeText={(tx) => updateField("emergencyContactPhone", normalizeTRPhone(tx))}
                                        error={errors.emergencyContactPhone}
                                    />
                                </View>
                            </View>

                            {/* ✅ DOB PICKER (tek alan) */}
                            <View style={{ marginBottom: 14 }}>
                                <Text style={styles.label}>{t("newstudent.label.birth_date")}</Text>

                                <Pressable onPress={() => setShowDobPicker(true)}>
                                    <View pointerEvents="none">
                                        <TextInput
                                            value={formatDateTR(form.dateOfBirth)}
                                            placeholder={t("newstudent.placeholder.birth_date")}
                                            placeholderTextColor={theme.colors.text.muted}
                                            editable={false}
                                            style={styles.input}
                                        />
                                    </View>
                                </Pressable>
                                {showDobPicker && (
                                    <Modal
                                        transparent
                                        animationType="fade"
                                        visible={showDobPicker}
                                        onRequestClose={() => setShowDobPicker(false)} // Android back
                                    >
                                        {/* Dış boşluk: buraya basınca kapanacak */}
                                        <Pressable style={styles.pickerOverlay} onPress={() => setShowDobPicker(false)}>
                                            {/* İç içerik: buraya basınca kapanmasın */}
                                            <Pressable style={styles.pickerCard} onPress={() => { }}>
                                                <DateTimePicker
                                                    value={parseISODate(form.dateOfBirth) ?? new Date(2000, 0, 1)}
                                                    mode="date"
                                                    locale={pickerLocale}
                                                    display={Platform.OS === "ios" ? "spinner" : "default"}
                                                    textColor={theme.colors.text.primary}
                                                    themeVariant={theme.colors.background === "#020617" ? "dark" : "light"}
                                                    onChange={(event, selected) => {
                                                        // Android seçince kapat
                                                        if (Platform.OS !== "ios") setShowDobPicker(false);

                                                        if (event.type === "dismissed") return;
                                                        if (!selected) return;

                                                        updateField("dateOfBirth", toISODate(selected));
                                                    }}
                                                    maximumDate={new Date()}
                                                />

                                                {/* iOS'ta spinner açık kaldığı için bir kapatma butonu ekleyelim */}
                                                {Platform.OS === "ios" && (
                                                    <TouchableOpacity
                                                        style={[styles.saveButton, { marginTop: 10 }]}
                                                        onPress={() => setShowDobPicker(false)}
                                                    >
                                                        <Text style={styles.saveButtonText}>{t("common.done")}</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </Pressable>
                                        </Pressable>
                                    </Modal>
                                )}



                                {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
                            </View>

                            {/* Gender */}
                            <View style={styles.row}>
                                <View style={styles.rowItem}>
                                    <Text style={styles.label}>{t("newstudent.label.gender")}</Text>

                                    <View style={styles.chipRow}>
                                        <Chip
                                            theme={theme}
                                            styles={styles}
                                            label={t("newstudent.gender.female")}
                                            active={form.gender === "F"}
                                            onPress={() => updateField("gender", "F")}
                                        />
                                        <Chip
                                            theme={theme}
                                            styles={styles}
                                            label={t("newstudent.gender.male")}
                                            active={form.gender === "M"}
                                            onPress={() => updateField("gender", "M")}
                                        />
                                    </View>

                                    {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                                </View>
                            </View>

                            <Text style={styles.label}>{t("newstudent.label.status")}</Text>
                            <View style={styles.chipRow}>
                                <Chip theme={theme} styles={styles} label={t("newstudent.status.active")} active={form.aktif === "Aktif"} onPress={() => updateField("aktif", "Aktif")} />
                                <Chip theme={theme} styles={styles} label={t("newstudent.status.passive")} active={form.aktif === "Pasif"} onPress={() => updateField("aktif", "Pasif")} />
                            </View>
                        </View>

                        {/* BÖLÜM 2 - PAR-Q */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>{t("newstudent.section.parq")}</Text>

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.parq.q1")} value={form.doctorSaidHeartOrHypertension} onChange={(v) => updateField("doctorSaidHeartOrHypertension", v)} />
                            {form.doctorSaidHeartOrHypertension === true && (
                                <FormTextArea
                                    theme={theme}
                                    styles={styles}
                                    label={t("newstudent.label.explanation")}
                                    placeholder={t("newstudent.placeholder.explanation")}
                                    value={form.doctorSaidHeartOrHypertensionNote}
                                    onChangeText={(tx) => updateField("doctorSaidHeartOrHypertensionNote", tx)}
                                />
                            )}

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.parq.q2")} value={form.chestPainDuringActivityOrDaily} onChange={(v) => updateField("chestPainDuringActivityOrDaily", v)} />
                            {form.chestPainDuringActivityOrDaily === true && (
                                <FormTextArea
                                    theme={theme}
                                    styles={styles}
                                    label={t("newstudent.label.explanation")}
                                    placeholder={t("newstudent.placeholder.explanation")}
                                    value={form.chestPainDuringActivityOrDailyNote}
                                    onChangeText={(tx) => updateField("chestPainDuringActivityOrDailyNote", tx)}
                                />
                            )}

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.parq.q3")} value={form.dizzinessOrLostConsciousnessLast12Months} onChange={(v) => updateField("dizzinessOrLostConsciousnessLast12Months", v)} />
                            {form.dizzinessOrLostConsciousnessLast12Months === true && (
                                <FormTextArea
                                    theme={theme}
                                    styles={styles}
                                    label={t("newstudent.label.explanation")}
                                    placeholder={t("newstudent.placeholder.explanation")}
                                    value={form.dizzinessOrLostConsciousnessLast12MonthsNote}
                                    onChangeText={(tx) => updateField("dizzinessOrLostConsciousnessLast12MonthsNote", tx)}
                                />
                            )}

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.parq.q4")} value={form.diagnosedOtherChronicDisease} onChange={(v) => updateField("diagnosedOtherChronicDisease", v)} />
                            {form.diagnosedOtherChronicDisease === true && (
                                <FormTextArea
                                    theme={theme}
                                    styles={styles}
                                    label={t("newstudent.label.explanation")}
                                    placeholder={t("newstudent.placeholder.explanation")}
                                    value={form.diagnosedOtherChronicDiseaseNote}
                                    onChangeText={(tx) => updateField("diagnosedOtherChronicDiseaseNote", tx)}
                                />
                            )}

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.parq.q5")} value={form.usesMedicationForChronicDisease} onChange={(v) => updateField("usesMedicationForChronicDisease", v)} />
                            {form.usesMedicationForChronicDisease === true && (
                                <FormTextArea
                                    theme={theme}
                                    styles={styles}
                                    label={t("newstudent.label.explanation")}
                                    placeholder={t("newstudent.placeholder.explanation")}
                                    value={form.usesMedicationForChronicDiseaseNote}
                                    onChangeText={(tx) => updateField("usesMedicationForChronicDiseaseNote", tx)}
                                />
                            )}

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.parq.q6")} value={form.boneJointSoftTissueProblemWorseWithActivity} onChange={(v) => updateField("boneJointSoftTissueProblemWorseWithActivity", v)} />
                            {form.boneJointSoftTissueProblemWorseWithActivity === true && (
                                <FormTextArea
                                    theme={theme}
                                    styles={styles}
                                    label={t("newstudent.label.explanation")}
                                    placeholder={t("newstudent.placeholder.explanation")}
                                    value={form.boneJointSoftTissueProblemWorseWithActivityNote}
                                    onChangeText={(tx) => updateField("boneJointSoftTissueProblemWorseWithActivityNote", tx)}
                                />
                            )}

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.parq.q7")} value={form.doctorSaidOnlyUnderMedicalSupervision} onChange={(v) => updateField("doctorSaidOnlyUnderMedicalSupervision", v)} />
                            {form.doctorSaidOnlyUnderMedicalSupervision === true && (
                                <FormTextArea
                                    theme={theme}
                                    styles={styles}
                                    label={t("newstudent.label.explanation")}
                                    placeholder={t("newstudent.placeholder.explanation")}
                                    value={form.doctorSaidOnlyUnderMedicalSupervisionNote}
                                    onChangeText={(tx) => updateField("doctorSaidOnlyUnderMedicalSupervisionNote", tx)}
                                />
                            )}

                            {parqYesCount(form) > 0 && (
                                <View style={styles.warningBox}>
                                    <View style={styles.warningHeader}>
                                        <AlertTriangle size={18} color={theme.colors.warning} />
                                        <Text style={styles.warningTitle}>
                                            {t("newstudent.parq.warning.title", { count: parqYesCount(form) })}
                                        </Text>
                                    </View>
                                    <Text style={styles.warningText}>{t("newstudent.parq.warning.message")}</Text>

                                    <QuestionBool
                                        styles={styles}
                                        theme={theme}
                                        title={t("newstudent.parq.clearance.question")}
                                        value={form.medicalClearance}
                                        onChange={(v) => {
                                            updateField("medicalClearance", v);
                                            if (v === true && !form.medicalClearanceDate) updateField("medicalClearanceDate", today);
                                        }}
                                    />
                                    {form.medicalClearance === true && (
                                        <FormInput
                                            theme={theme}
                                            styles={styles}
                                            label={t("newstudent.parq.clearance.date")}
                                            placeholder={t("newstudent.placeholder.birth_date")}
                                            value={form.medicalClearanceDate}
                                            onChangeText={(tx) => updateField("medicalClearanceDate", tx)}
                                        />
                                    )}
                                </View>
                            )}
                        </View>

                        {/* BÖLÜM 3 - Kişisel Detaylar */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>{t("newstudent.section.personal_details")}</Text>

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.details.q1")} value={form.hadPainOrInjury} onChange={(v) => updateField("hadPainOrInjury", v)} />
                            {form.hadPainOrInjury === true && (
                                <FormTextArea theme={theme} styles={styles} label={t("newstudent.label.explanation")} placeholder={t("newstudent.placeholder.explanation")} value={form.hadPainOrInjuryNote} onChangeText={(tx) => updateField("hadPainOrInjuryNote", tx)} />
                            )}

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.details.q2")} value={form.hadSurgery} onChange={(v) => updateField("hadSurgery", v)} />
                            {form.hadSurgery === true && (
                                <FormTextArea theme={theme} styles={styles} label={t("newstudent.label.explanation")} placeholder={t("newstudent.placeholder.explanation")} value={form.hadSurgeryNote} onChangeText={(tx) => updateField("hadSurgeryNote", tx)} />
                            )}




                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.details.q6")} value={form.hasSportsHistoryOrCurrentlyDoingSport} onChange={(v) => updateField("hasSportsHistoryOrCurrentlyDoingSport", v)} />
                            {form.hasSportsHistoryOrCurrentlyDoingSport === true && (
                                <FormTextArea theme={theme} styles={styles} label={t("newstudent.label.explanation")} placeholder={t("newstudent.placeholder.explanation")} value={form.hasSportsHistoryOrCurrentlyDoingSportNote} onChangeText={(tx) => updateField("hasSportsHistoryOrCurrentlyDoingSportNote", tx)} />
                            )}

                            <Text style={styles.label}>{t("newstudent.label.weekly_activity")}</Text>
                            <View style={[styles.chipRow, { flexWrap: "wrap", marginBottom: 14 }]}>
                                {ACTIVITY_LEVELS.map((lvl) => (
                                    <Chip key={lvl} theme={theme} styles={styles} label={t(`newstudent.activity.${lvl}`)} active={form.weeklyActivityLevel === lvl} onPress={() => updateField("weeklyActivityLevel", lvl)} />
                                ))}
                            </View>

                            <Text style={styles.label}>{t("newstudent.label.experience")}</Text>
                            <View style={[styles.chipRow, { flexWrap: "wrap", marginBottom: 14 }]}>
                                {EXPERIENCE_LEVELS.map((lvl) => (
                                    <Chip key={lvl} theme={theme} styles={styles} label={t(`newstudent.experience.${lvl}`)} active={form.experienceLevel === lvl} onPress={() => updateField("experienceLevel", lvl)} />
                                ))}
                            </View>

                            {form.gender === "F" && (
                                <>
                                    <Text style={styles.label}>{t("newstudent.label.pregnancy")}</Text>
                                    <View style={[styles.chipRow, { flexWrap: "wrap", marginBottom: 14 }]}>
                                        {PREGNANCY_STATUSES.map((st) => (
                                            <Chip key={st} theme={theme} styles={styles} label={t(`newstudent.pregnancy.${st}`)} active={form.pregnancyStatus === st} onPress={() => updateField("pregnancyStatus", st)} />
                                        ))}
                                    </View>
                                </>
                            )}

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.details.smoking")} value={form.smokes} onChange={(v) => updateField("smokes", v)} />

                            <Text style={styles.label}>{t("newstudent.label.sleep")}</Text>
                            <View style={[styles.chipRow, { flexWrap: "wrap", marginBottom: 14 }]}>
                                {SLEEP_LEVELS.map((lvl) => (
                                    <Chip key={lvl} theme={theme} styles={styles} label={t(`newstudent.sleep.${lvl}`)} active={form.sleepHours === lvl} onPress={() => updateField("sleepHours", lvl)} />
                                ))}
                            </View>

                            <Text style={styles.label}>{t("newstudent.label.stress")}</Text>
                            <Text style={styles.helperText}>{t("newstudent.helper.stress_scale")}</Text>
                            <View style={[styles.chipRow, { flexWrap: "wrap", marginTop: 8, marginBottom: 14 }]}>
                                {STRESS_LEVELS.map((n) => (
                                    <Chip key={n} theme={theme} styles={styles} label={String(n)} active={form.stressLevel === n} onPress={() => updateField("stressLevel", n)} />
                                ))}
                            </View>

                            <FormTextArea theme={theme} styles={styles} label={t("newstudent.label.nutrition")} placeholder={t("newstudent.placeholder.nutrition")} value={form.nutritionNotes} onChangeText={(tx) => updateField("nutritionNotes", tx)} />

                            <Text style={styles.label}>{t("newstudent.label.planned_days")}</Text>
                            <View style={[styles.chipRow, { flexWrap: "wrap" }]}>
                                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                                    <Chip key={n} theme={theme} styles={styles} label={String(n)} active={form.plannedDaysPerWeek === n} onPress={() => updateField("plannedDaysPerWeek", n)} />
                                ))}
                            </View>

                            <FormTextArea theme={theme} styles={styles} label={t("newstudent.label.job_description")} placeholder={t("newstudent.placeholder.job_description")} value={form.jobDescription} onChangeText={(tx) => updateField("jobDescription", tx)} />

                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.details.q7")} value={form.jobRequiresLongSitting} onChange={(v) => updateField("jobRequiresLongSitting", v)} />
                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.details.q8")} value={form.jobRequiresRepetitiveMovement} onChange={(v) => updateField("jobRequiresRepetitiveMovement", v)} />
                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.details.q9")} value={form.jobRequiresHighHeels} onChange={(v) => updateField("jobRequiresHighHeels", v)} />
                            <QuestionBool styles={styles} theme={theme} title={t("newstudent.details.q10")} value={form.jobCausesAnxiety} onChange={(v) => updateField("jobCausesAnxiety", v)} />

                            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{t("newstudent.section.training_goal")}</Text>
                            <Text style={styles.helperText}>{t("newstudent.helper.multi_select")}</Text>

                            <View style={[styles.chipRow, { flexWrap: "wrap", marginTop: 8 }]}>
                                {TRAINING_GOALS.map((g) => (
                                    <Chip key={g.id} theme={theme} styles={styles} label={t(g.labelKey)} active={form.trainingGoals.includes(g.id)} onPress={() => toggleMulti("trainingGoals", g.id)} />
                                ))}
                            </View>

                            <FormTextArea theme={theme} styles={styles} label={t("newstudent.label.other_optional")} placeholder={t("newstudent.placeholder.other_optional")} value={form.otherGoal} onChangeText={(tx) => updateField("otherGoal", tx)} />
                        </View>
                    </ScrollView>

                    {/* BUTON */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving}>
                            <Save size={18} color={theme.colors.text.onAccent} />
                            <Text style={styles.saveButtonText}>
                                {saving ? t("newstudent.button.saving") : isEdit ? t("newstudent.button.update_student") : t("newstudent.button.save_student")}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

function FormInput({
    theme,
    styles,
    label,
    value,
    placeholder,
    onChangeText,
    keyboardType,
    autoCapitalize,
    error,
}: {
    theme: ThemeUI;
    styles: ReturnType<typeof createStyles>;
    label: string;
    value: string;
    placeholder?: string;
    onChangeText: (t: string) => void;
    keyboardType?: any;
    autoCapitalize?: any;
    error?: string;
}) {
    return (
        <View style={{ marginBottom: 14 }}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.text.muted}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                style={styles.input}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

function FormTextArea({
    theme,
    styles,
    label,
    value,
    placeholder,
    onChangeText,
}: {
    theme: ThemeUI;
    styles: ReturnType<typeof createStyles>;
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
                placeholderTextColor={theme.colors.text.muted}
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.textArea]}
            />
        </View>
    );
}

function Chip({
    theme,
    styles,
    label,
    active,
    onPress,
}: {
    theme: ThemeUI;
    styles: ReturnType<typeof createStyles>;
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
    theme,
    styles,
    title,
    value,
    onChange,
}: {
    theme: ThemeUI;
    styles: ReturnType<typeof createStyles>;
    title: string;
    value: Bool;
    onChange: (val: boolean) => void;
}) {
    const { t } = useTranslation();
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.questionTitle}>{title}</Text>

            <View style={styles.chipRow}>
                <Chip theme={theme} styles={styles} label={t("newstudent.answer.yes")} active={value === true} onPress={() => onChange(true)} />
                <Chip theme={theme} styles={styles} label={t("newstudent.answer.no")} active={value === false} onPress={() => onChange(false)} />
            </View>
        </View>
    );
}

const createStyles = (themeui: ThemeUI) =>
    StyleSheet.create({
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
            paddingHorizontal: themeui.spacing.sm,
            paddingVertical: themeui.spacing.xs,
            borderRadius: themeui.radius.pill,
            backgroundColor: themeui.colors.surface,
            borderWidth: 1,
            borderColor: themeui.colors.border,
        },
        backButtonText: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.sm, marginLeft: 6 },

        headerTitleRow: { flexDirection: "row", alignItems: "center", marginLeft: themeui.spacing.md },
        iconCircle: {
            width: 42,
            height: 42,
            borderRadius: themeui.radius.pill,
            backgroundColor: themeui.colors.surface,
            borderWidth: 1,
            borderColor: themeui.colors.border,
            justifyContent: "center",
            alignItems: "center",
            marginRight: themeui.spacing.md,
        },
        headerTitle: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.lg, fontWeight: "700" },
        dateRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
        dateText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.xs, marginLeft: themeui.spacing.xs },

        formScroll: { flex: 1 },
        pickerOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            paddingHorizontal: themeui.spacing.md,
        },
        pickerCard: {
            backgroundColor: themeui.colors.surface,
            borderRadius: themeui.radius.lg,
            borderWidth: 1,
            borderColor: themeui.colors.border,
            padding: themeui.spacing.md,
        },

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

        row: { flexDirection: "row", marginBottom: 4 },
        rowItem: { flex: 1 },
        chipRow: { flexDirection: "row", marginTop: themeui.spacing.xs, flexWrap: "wrap" },

        chip: {
            paddingHorizontal: themeui.spacing.sm,
            paddingVertical: 7,
            borderRadius: themeui.radius.pill,
            borderWidth: 1,
            borderColor: themeui.colors.border,
            backgroundColor: themeui.colors.surface,
            marginBottom: 6,
            marginRight: themeui.spacing.xs,
        },
        chipActive: {
            backgroundColor: themeui.colors.primary + "33",
            borderColor: themeui.colors.primary,
        },
        chipText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.sm },
        chipTextActive: { color: themeui.colors.primary, fontWeight: "600" },

        warningBox: {
            marginTop: 10,
            padding: 12,
            borderRadius: themeui.radius.lg,
            borderWidth: 1,
            borderColor: themeui.colors.warning,
            backgroundColor: themeui.colors.goldSoft,
        },
        warningHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
        warningTitle: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.md, fontWeight: "800", flex: 1 },
        warningText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.sm, lineHeight: 18, marginTop: 6, marginBottom: 6 },
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
        },
        saveButtonText: {
            color: themeui.colors.text.onAccent,
            fontSize: themeui.fontSize.md,
            fontWeight: "700",
            marginLeft: themeui.spacing.xs,
        },
        errorText: {
            marginTop: 4,
            fontSize: 12,
            color: themeui.colors.danger,
        },
    });

export default YeniOgrenciScreen;

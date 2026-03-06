import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { auth } from "@/services/firebase";
import {
    recordsColRef,
    studentDocRef,
    studentNotesColRef,
} from "@/services/firestorePaths";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    addDoc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    ArrowLeft,
    Calendar,
    ChevronDown,
    Edit,
    Eye,
    Mail,
    Phone,
    User,
} from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

type Bool = boolean | null;

type StudentProfile = {
  name: string;
  email?: string;
  number?: string;
  boy?: string;
  dateOfBirth?: string;
  gender?: string;
  aktif?: "Aktif" | "Pasif";
  assessmentDate?: string;
};

type StudentPARQ = {
  doctorSaidHeartOrHypertension?: Bool;
  doctorSaidHeartOrHypertensionNote?: string;
  // ...
};

type StudentWork = {
  jobDescription?: string;
  jobRequiresLongSitting?: Bool;
  // ...
};

type StudentGoals = {
  trainingGoals?: string[];
  otherGoal?: string;
  plannedDaysPerWeek?: number | null;
  followUpDays?: number;
  followUpDaysUpdatedAt?: any;
};

type Student = { id: string } & StudentProfile &
  StudentPARQ &
  StudentWork &
  StudentGoals & {
    ptNote?: string;
    ptNoteUpdatedAt?: any;
  };

type RecordItem = {
  id: string;
  studentId: string;
  createdAt?: any;
  note?: string;

  weight?: string;
  bodyFat?: string;
  bel?: string;
  kalca?: string;

  analysis?: any;
};
type StudentNote = {
  id: string;
  title?: string;
  text: string;
  createdAt?: any;
};

const formatDateTR = (iso?: string) => {
  if (!iso) return "-";
  const parts = iso.split("-").map((x) => Number(x));
  if (parts.length !== 3) return "-";
  const [y, m, d] = parts;
  if (!y || !m || !d) return "-";
  return new Date(y, m - 1, d).toLocaleDateString("tr-TR");
};

export default function StudentDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const listRef = useRef<FlatList<RecordItem>>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [testsOpen, setTestsOpen] = useState(false);
  const [range, setRange] = useState<"7g" | "30g" | "90g" | "all">("30g");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [ptNote, setPtNote] = useState("");
  const [ptNoteOpen, setPtNoteOpen] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const uid = auth.currentUser?.uid;
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const toggleNote = (noteId: string) => {
    setExpandedNoteId((cur) => (cur === noteId ? null : noteId));
  };

  const parqQuestions = useMemo(
    () => [
      {
        key: "doctorSaidHeartOrHypertension" as const,
        noteKey: "doctorSaidHeartOrHypertensionNote" as const,
        labelKey: "parq.q1",
      },
      {
        key: "chestPainDuringActivityOrDaily" as const,
        noteKey: "chestPainDuringActivityOrDailyNote" as const,
        labelKey: "parq.q2",
      },
      {
        key: "dizzinessOrLostConsciousnessLast12Months" as const,
        noteKey: "dizzinessOrLostConsciousnessLast12MonthsNote" as const,
        labelKey: "parq.q3",
      },
      {
        key: "diagnosedOtherChronicDisease" as const,
        noteKey: "diagnosedOtherChronicDiseaseNote" as const,
        labelKey: "parq.q4",
      },
      {
        key: "usesMedicationForChronicDisease" as const,
        noteKey: "usesMedicationForChronicDiseaseNote" as const,
        labelKey: "parq.q5",
      },
      {
        key: "boneJointSoftTissueProblemWorseWithActivity" as const,
        noteKey: "boneJointSoftTissueProblemWorseWithActivityNote" as const,
        labelKey: "parq.q6",
      },
      {
        key: "doctorSaidOnlyUnderMedicalSupervision" as const,
        noteKey: "doctorSaidOnlyUnderMedicalSupervisionNote" as const,
        labelKey: "parq.q7",
      },
    ],
    [],
  );

  const personalQuestions = useMemo(
    () => [
      {
        key: "hadPainOrInjury" as const,
        noteKey: "hadPainOrInjuryNote" as const,
        labelKey: "personal.q1",
      },
      {
        key: "hadSurgery" as const,
        noteKey: "hadSurgeryNote" as const,
        labelKey: "personal.q2",
      },
      {
        key: "diagnosedChronicDiseaseByDoctor" as const,
        noteKey: "diagnosedChronicDiseaseByDoctorNote" as const,
        labelKey: "personal.q3",
      },
      {
        key: "currentlyUsesMedications" as const,
        noteKey: "currentlyUsesMedicationsNote" as const,
        labelKey: "personal.q4",
      },
      {
        key: "weeklyPhysicalActivity30MinOrLess" as const,
        noteKey: "weeklyPhysicalActivity30MinOrLessNote" as const,
        labelKey: "personal.q5",
      },
      {
        key: "hasSportsHistoryOrCurrentlyDoingSport" as const,
        noteKey: "hasSportsHistoryOrCurrentlyDoingSportNote" as const,
        labelKey: "personal.q6",
      },
      { key: "jobRequiresLongSitting" as const, labelKey: "personal.q7" },
      {
        key: "jobRequiresRepetitiveMovement" as const,
        labelKey: "personal.q8",
      },
      { key: "jobRequiresHighHeels" as const, labelKey: "personal.q9" },
      { key: "jobCausesAnxiety" as const, labelKey: "personal.q10" },
    ],
    [],
  );

  useEffect(() => {
    if (!id) return;
    if (!id || !uid) return;

    const load = async () => {
      try {
        const ref = studentDocRef(uid!, id);

        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setStudent(null);
          return;
        }

        const d = snap.data() as any;

        setStudent({
          id: snap.id,
          ...d,
          aktif: d.aktif ?? "Aktif",
          trainingGoals: Array.isArray(d.trainingGoals) ? d.trainingGoals : [],
          followUpDays:
            typeof d.followUpDays === "number" ? d.followUpDays : 30,
        });

        setPtNote((d.ptNote as string) ?? "");
      } catch (err) {
        console.error(err);
        setStudent(null);
      } finally {
        setLoadingStudent(false);
      }
    };

    load();
  }, [id, uid]);

  useEffect(() => {
    if (!id) return;
    if (!id || !uid) return;

    const qy = query(
      recordsColRef(auth.currentUser?.uid!),
      where("studentId", "==", id),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        setRecords(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })),
        );
        setLoadingRecords(false);
      },
      (err) => {
        console.error(err);
        setLoadingRecords(false);
      },
    );

    return () => unsub();
  }, [id, uid]);
  useEffect(() => {
    if (!id) return;
    if (!id || !uid) return;

    const qy = query(studentNotesColRef(uid, id), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        setNotes(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })),
        );
        setLoadingNotes(false);
      },
      (err) => {
        console.error(err);
        setLoadingNotes(false);
      },
    );

    return () => unsub();
  }, [id, uid]);

  const goBack = () => router.replace("/(tabs)");

  const toggleAktif = async () => {
    if (!student) return;

    try {
      setToggling(true);
      const newStatus = student.aktif === "Aktif" ? "Pasif" : "Aktif";
      await updateDoc(studentDocRef(auth.currentUser?.uid!, student.id), {
        aktif: newStatus,
      });
      setStudent({ ...student, aktif: newStatus });
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  const setFollowUpDays = async (days: number) => {
    if (!student) return;

    try {
      setSavingFollowUp(true);

      await updateDoc(studentDocRef(auth.currentUser?.uid!, student.id), {
        followUpDays: days,
        followUpDaysUpdatedAt: serverTimestamp(),
      });

      setStudent({ ...student, followUpDays: days });
    } catch (err) {
      console.error("followUpDays save error:", err);
      Alert.alert(t("common.error"), t("studentDetail.followUp.saveError"));
    } finally {
      setSavingFollowUp(false);
    }
  };

  const addRecord = () => {
    if (!student) return;
    router.push({ pathname: "/newrecord/[id]", params: { id: student.id } });
  };
  const openNewNote = () => {
    setNewNoteText("");
    setNewNoteTitle("");
    setNoteModalOpen(true);
  };

  const saveNewNote = async () => {
    if (!id) return;
    const text = newNoteText.trim();
    if (!text) {
      Alert.alert(t("common.error"), "Not boş olamaz");
      return;
    }

    try {
      setSavingNote(true);

      const title = newNoteTitle.trim();
      await addDoc(studentNotesColRef(auth.currentUser?.uid!, id), {
        title: title.length ? title : null,
        text,
        createdAt: serverTimestamp(),
      });

      setNoteModalOpen(false);
      setNewNoteText("");
    } catch (e) {
      console.error("note save error", e);
      Alert.alert(t("common.error"), "Not kaydedilemedi");
    } finally {
      setSavingNote(false);
    }
  };

  const viewRecord = useCallback(
    (recordId: string) => {
      router.push({ pathname: "/record/[id]", params: { id: recordId } });
    },
    [router],
  );

  // ✅ EDIT artık newstudent ekranında
  const goEdit = () => {
    if (!student) return;
    router.push({
      pathname: "/newstudent",
      params: { id: student.id, mode: "edit" },
    });
  };

  const firstLetter = student?.name?.[0]?.toUpperCase() ?? "?";
  const renderRecordItem = useCallback(
    ({ item }: { item: RecordItem }) => {
      const dt = item.createdAt?.toDate ? item.createdAt.toDate() : null;
      const dateStr = dt
        ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}`
        : "-";

      return (
        <TouchableOpacity
          style={styles.recordCard}
          onPress={() => viewRecord(item.id)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.recordDate}>{dateStr}</Text>
            <Text style={styles.recordNote}>
              {item.note || t("studentDetail.records.noNote")}
            </Text>
          </View>
          <Eye size={18} color={theme.colors.text.primary} />
        </TouchableOpacity>
      );
    },
    [styles, theme.colors.text.primary, t, viewRecord],
  );

  const onTogglePtNote = useCallback(() => {
    setPtNoteOpen((prev) => {
      const next = !prev;

      if (next) {
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }

      return next;
    });
  }, []);

  const onFocusPtNote = useCallback(() => {
    setPtNoteOpen(true);
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 250);
  }, []);

  if (loadingStudent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>{t("studentDetail.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("studentDetail.notFound")}</Text>

          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <ArrowLeft size={18} color={theme.colors.text.primary} />
            <Text style={styles.backButtonText}>{t("studentDetail.back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={records}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View style={styles.headerTopRow}>
                  <TouchableOpacity style={styles.backButton} onPress={goBack}>
                    <ArrowLeft size={18} color={theme.colors.text.primary} />
                    <Text style={styles.backButtonText}>
                      {t("studentDetail.back")}
                    </Text>
                  </TouchableOpacity>

                  {/* ✅ EDIT BLOĞU sadeleşti */}
                  <View
                    style={[
                      styles.headerActions,
                      { justifyContent: "flex-end" },
                    ]}
                  >
                    <View style={{ flexDirection: "row" }}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={addRecord}
                        activeOpacity={0.85}
                      >
                        <Edit size={14} color={theme.colors.text.onAccent} />
                        <Text style={styles.editButtonText}>
                          {t("studentDetail.addRecord")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.editButton,
                          { marginLeft: theme.spacing.xs },
                        ]}
                        onPress={goEdit}
                        activeOpacity={0.85}
                      >
                        <Edit size={14} color={theme.colors.text.onAccent} />
                        <Text style={styles.editButtonText}>
                          {t("studentDetail.edit")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.studentRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{firstLetter}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{student.name}</Text>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={toggleAktif}
                      disabled={toggling}
                      style={[
                        styles.statusBadgeBtn,
                        student.aktif === "Aktif"
                          ? styles.statusActive
                          : styles.statusPassive,
                        toggling && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={
                          student.aktif === "Aktif"
                            ? styles.statusActiveText
                            : styles.statusPassiveText
                        }
                      >
                        {student.aktif === "Aktif"
                          ? t("studentDetail.student.active")
                          : t("studentDetail.student.passive")}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.metaLine}>
                      <Calendar size={14} color={theme.colors.text.muted} />
                      <Text style={styles.metaText}>
                        {t("studentDetail.student.assessmentDate")}{" "}
                        {formatDateTR(student.assessmentDate)}
                      </Text>
                    </View>

                    <View style={styles.followUpWrap}>
                      <Text style={styles.followUpLabel}>
                        {t("studentDetail.followUp.label")}
                      </Text>

                      <View style={styles.followUpPillsRow}>
                        {[7, 20, 30].map((d) => {
                          const active = (student.followUpDays ?? 30) === d;

                          return (
                            <TouchableOpacity
                              key={d}
                              activeOpacity={0.85}
                              disabled={savingFollowUp}
                              onPress={() => setFollowUpDays(d)}
                              style={[
                                styles.followUpPill,
                                active && styles.followUpPillActive,
                                savingFollowUp && { opacity: 0.7 },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.followUpPillText,
                                  active && styles.followUpPillTextActive,
                                ]}
                              >
                                {d === 7
                                  ? t("studentDetail.followUp.week1")
                                  : t("studentDetail.followUp.days", {
                                      count: d,
                                    })}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}

                        {savingFollowUp && (
                          <Text style={styles.followUpSavingText}>
                            {t("studentDetail.followUp.saving")}
                          </Text>
                        )}
                      </View>

                      <Text style={styles.followUpHint}>
                        {t("studentDetail.followUp.hint")}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* PERSONAL INFO (view-only) */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("studentDetail.section.personalInfo")}
                </Text>

                <>
                  <InfoRow
                    styles={styles}
                    label={t("studentDetail.label.email")}
                    value={student.email || "-"}
                    icon={<Mail size={16} color={theme.colors.primary} />}
                  />
                  <InfoRow
                    styles={styles}
                    label={t("studentDetail.label.phone")}
                    value={student.number || "-"}
                    icon={<Phone size={16} color={theme.colors.primary} />}
                  />
                  <InfoRow
                    styles={styles}
                    label={t("studentDetail.label.gender")}
                    value={student.gender || "-"}
                    icon={<User size={16} color={theme.colors.primary} />}
                  />
                  <InfoRow
                    styles={styles}
                    label={t("studentDetail.label.birthDate")}
                    value={formatDateTR(student.dateOfBirth)}
                    icon={<Calendar size={16} color={theme.colors.primary} />}
                  />
                  <InfoRow
                    styles={styles}
                    label={t("studentDetail.label.height")}
                    value={student.boy || "-"}
                    icon={<User size={16} color={theme.colors.primary} />}
                  />
                </>
              </View>
              <AnalyticsCard
                theme={theme}
                styles={styles}
                records={records}
                range={range}
                setRange={setRange}
                open={analyticsOpen}
                setOpen={setAnalyticsOpen}
              />
              <TestsCard
                theme={theme}
                styles={styles}
                records={records}
                open={testsOpen}
                setOpen={setTestsOpen}
              />

              {/* PARQ (view-only) */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("studentDetail.section.parq")}
                </Text>

                {parqQuestions.map((q, idx) => {
                  const answer = (student as any)[q.key] as Bool;
                  const note = q.noteKey
                    ? ((student as any)[q.noteKey] as string)
                    : "";
                  return (
                    <QAItem
                      key={q.key}
                      styles={styles}
                      index={idx + 1}
                      question={t(q.labelKey)}
                      answer={answer}
                      note={note}
                    />
                  );
                })}
              </View>

              {/* PERSONAL DETAILS (view-only) */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("studentDetail.section.personalDetails")}
                </Text>

                {personalQuestions.map((q, idx) => {
                  const answer = (student as any)[q.key] as Bool;
                  const note = (q as any).noteKey
                    ? ((student as any)[(q as any).noteKey] as string)
                    : "";
                  return (
                    <QAItem
                      key={q.key}
                      styles={styles}
                      index={idx + 1}
                      question={t((q as any).labelKey)}
                      answer={answer}
                      note={note}
                    />
                  );
                })}

                <InfoRow
                  styles={styles}
                  label={t("studentDetail.label.plannedDaysPerWeek")}
                  value={
                    student.plannedDaysPerWeek
                      ? String(student.plannedDaysPerWeek)
                      : "-"
                  }
                  icon={<Calendar size={16} color={theme.colors.primary} />}
                />

                <InfoRow
                  styles={styles}
                  label={t("studentDetail.label.job")}
                  value={student.jobDescription || "-"}
                  icon={<User size={16} color={theme.colors.primary} />}
                />

                <View style={{ marginTop: 12 }}>
                  <Text style={styles.subTitle}>
                    {t("studentDetail.label.trainingGoals")}
                  </Text>

                  <View style={styles.chipWrap}>
                    {student.trainingGoals && student.trainingGoals.length ? (
                      student.trainingGoals.map((g) => (
                        <Chip key={g} styles={styles} label={g} />
                      ))
                    ) : (
                      <Text style={styles.mutedText}>-</Text>
                    )}
                  </View>

                  {!!student.otherGoal?.trim() && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.miniLabel}>
                        {t("studentDetail.label.other")}
                      </Text>
                      <Text style={styles.noteText}>{student.otherGoal}</Text>
                    </View>
                  )}
                </View>
              </View>

              <CollapsibleCard
                theme={theme}
                styles={styles}
                title="Notlar"
                open={notesOpen}
                setOpen={(v) => {
                  setNotesOpen(v);
                  if (!v) setExpandedNoteId(null);
                }}
              >
                {/* + Yeni not */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openNewNote}
                  style={{
                    marginTop: theme.spacing.xs,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: theme.radius.md,
                    paddingVertical: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text.primary,
                      fontWeight: "900",
                    }}
                  >
                    + Yeni Not
                  </Text>
                </TouchableOpacity>

                {/* Liste */}
                {loadingNotes ? (
                  <View style={{ marginTop: theme.spacing.sm }}>
                    <ActivityIndicator color={theme.colors.accent} />
                  </View>
                ) : notes.length ? (
                  <View style={{ marginTop: theme.spacing.sm }}>
                    {notes.slice(0, 12).map((n) => {
                      const dt = n.createdAt?.toDate
                        ? n.createdAt.toDate()
                        : null;
                      const dateStr = dt
                        ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}`
                        : "-";

                      const raw = (n.text ?? "").trim();
                      const lines = raw
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean);
                      const title = (
                        (n.title ?? "").trim() ||
                        (lines[0] ?? "Not")
                      ).slice(0, 60);
                      const preview = lines.slice(1).join(" ").slice(0, 90);

                      return (
                        <View
                          key={n.id}
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: theme.colors.border,
                            paddingVertical: 10,
                          }}
                        >
                          {/* Üst satır (preview) */}
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => toggleNote(n.id)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  color: theme.colors.text.primary,
                                  fontWeight: "900",
                                }}
                              >
                                {title}
                              </Text>

                              <Text
                                style={{
                                  marginTop: 4,
                                  color: theme.colors.text.muted,
                                  fontSize: theme.fontSize.xs,
                                  fontWeight: "700",
                                }}
                              >
                                {dateStr}
                              </Text>

                              {!!preview && expandedNoteId !== n.id && (
                                <Text
                                  style={{
                                    marginTop: 6,
                                    color: theme.colors.text.secondary,
                                  }}
                                >
                                  {preview}…
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>

                          {/* ✅ Aşağı doğru açılan detay */}
                          {expandedNoteId === n.id && (
                            <View
                              style={{
                                marginTop: 10,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                backgroundColor: theme.colors.surfaceSoft,
                                borderRadius: theme.radius.md,
                                padding: theme.spacing.sm,
                              }}
                            >
                              <Text
                                style={{
                                  color: theme.colors.text.primary,
                                  lineHeight: 20,
                                  fontSize: theme.fontSize.sm,
                                }}
                              >
                                {n.text}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text
                    style={{
                      marginTop: theme.spacing.sm,
                      color: theme.colors.text.muted,
                    }}
                  >
                    Henüz not yok.
                  </Text>
                )}
              </CollapsibleCard>

              <Text style={styles.recordsTitle}>
                {t("studentDetail.section.records")}
              </Text>
            </View>
          }
          renderItem={renderRecordItem}
          ListEmptyComponent={
            !loadingRecords ? (
              <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                <View style={styles.card}>
                  <Text style={styles.emptyText}>
                    {t("studentDetail.records.empty")}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
        {noteModalOpen && (
          <Pressable
            onPress={() => setNoteModalOpen(false)}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
              justifyContent: "center",
              padding: theme.spacing.md,
            }}
          >
            {/* dışa basınca kapansın, içe basınca kapanmasın */}
            <Pressable onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
              >
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    ...(theme.shadow?.soft ?? {}),
                    maxHeight: "85%",
                    overflow: "hidden", // ✅ kritik: footer düzgün dursun
                  }}
                >
                  {/* ✅ içerik scroll */}
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                      padding: theme.spacing.md,
                      paddingBottom: theme.spacing.md + 80, // ✅ footer için boşluk
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text.primary,
                        fontWeight: "900",
                        fontSize: theme.fontSize.lg,
                      }}
                    >
                      Yeni Not
                    </Text>

                    <TextInput
                      value={newNoteTitle}
                      onChangeText={setNewNoteTitle}
                      placeholder="Not başlığı..."
                      placeholderTextColor={theme.colors.text.muted}
                      style={[
                        styles.editInput,
                        { marginTop: theme.spacing.sm },
                      ]}
                      returnKeyType="next"
                    />

                    <TextInput
                      value={newNoteText}
                      onChangeText={setNewNoteText}
                      placeholder="Notunu yaz..."
                      placeholderTextColor={theme.colors.text.muted}
                      multiline
                      textAlignVertical="top"
                      style={[
                        styles.ptNoteInput,
                        { marginTop: theme.spacing.sm, minHeight: 160 },
                      ]}
                    />
                  </ScrollView>

                  {/* ✅ STICKY FOOTER: butonlar her zaman görünür */}
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      padding: theme.spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => setNoteModalOpen(false)}
                        activeOpacity={0.85}
                        style={[
                          styles.cancelButton,
                          { flex: 1, alignItems: "center", marginLeft: 0 },
                        ]} // ✅ marginLeft sıfırla
                      >
                        <Text style={styles.cancelButtonText}>İptal</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={saveNewNote}
                        disabled={savingNote}
                        activeOpacity={0.85}
                        style={[
                          styles.saveButton,
                          {
                            flex: 1,
                            alignItems: "center",
                            opacity: savingNote ? 0.6 : 1,
                            marginLeft: 0,
                          },
                        ]} // ✅ marginLeft sıfırla
                      >
                        <Text style={styles.saveButtonText}>
                          {savingNote ? "Kaydediliyor..." : "Kaydet"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Pressable>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ----------------- UI PIECES ----------------- */

function InfoRow({
  styles,
  icon,
  label,
  value,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelRow}>
        {icon}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function QAItem({
  styles,
  index,
  question,
  answer,
  note,
}: {
  styles: ReturnType<typeof makeStyles>;
  index: number;
  question: string;
  answer: Bool;
  note?: string;
}) {
  const { t } = useTranslation();

  const val =
    answer === true
      ? t("recordNew.option.yes")
      : answer === false
        ? t("recordNew.option.no")
        : "-";

  const isYes = answer === true;

  return (
    <View style={styles.qaItem}>
      <View style={styles.qaTop}>
        <Text style={styles.qaQuestion}>
          {index}. {question}
        </Text>

        <View
          style={[
            styles.badge,
            isYes
              ? styles.badgeYes
              : answer === false
                ? styles.badgeNo
                : styles.badgeNA,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isYes
                ? styles.badgeTextYes
                : answer === false
                  ? styles.badgeTextNo
                  : styles.badgeTextNA,
            ]}
          >
            {val}
          </Text>
        </View>
      </View>

      {isYes && !!note?.trim() && (
        <View style={styles.noteBox}>
          <Text style={styles.miniLabel}>{t("common.description")}</Text>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      )}
    </View>
  );
}
type RangeKey = "7g" | "30g" | "90g" | "all";
type BucketMode = "day" | "week" | "month";

type ChartPoint = {
  key: string;
  label: string;
  fullLabel: string;
  count: number;
};

function num(v: any): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function getRecordDate(r: any): Date | null {
  const ts = r?.createdAt;
  return ts?.toDate ? ts.toDate() : null;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isoKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatShortDateTR(d: Date) {
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

function formatLongDateTR(d: Date) {
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function buildDailyPoints(records: any[], days: number): ChartPoint[] {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const map: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map[isoKey(d)] = 0;
  }

  records.forEach((r) => {
    const dt = getRecordDate(r);
    if (!dt) return;
    const key = isoKey(startOfDay(dt));
    if (key in map) map[key] += 1;
  });

  return Object.keys(map)
    .sort()
    .map((k, i) => {
      const [y, m, d] = k.split("-").map(Number);
      const date = new Date(y, m - 1, d);

      const label =
        days <= 7
          ? date.toLocaleDateString("tr-TR", { weekday: "short" })
          : i % 5 === 0 || i === days - 1
            ? formatShortDateTR(date)
            : "";

      return {
        key: k,
        label,
        fullLabel: formatLongDateTR(date),
        count: map[k],
      };
    });
}

function buildWeeklyPoints(records: any[], totalDays: number): ChartPoint[] {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - (totalDays - 1));

  const firstWeek = startOfWeek(start);
  const lastWeek = startOfWeek(end);

  const points: ChartPoint[] = [];
  const map: Record<string, number> = {};

  for (let d = new Date(firstWeek); d <= lastWeek; d.setDate(d.getDate() + 7)) {
    const ws = new Date(d);
    const we = new Date(d);
    we.setDate(ws.getDate() + 6);

    const key = isoKey(ws);
    map[key] = 0;

    points.push({
      key,
      label: formatShortDateTR(ws),
      fullLabel: `${formatLongDateTR(ws)} - ${formatLongDateTR(we)}`,
      count: 0,
    });
  }

  records.forEach((r) => {
    const dt = getRecordDate(r);
    if (!dt) return;
    if (dt < start || dt > end) return;
    const ws = startOfWeek(dt);
    const key = isoKey(ws);
    if (key in map) map[key] += 1;
  });

  return points.map((p) => ({ ...p, count: map[p.key] ?? 0 }));
}

function buildMonthlyPoints(records: any[]): ChartPoint[] {
  const dated = records.map((r) => getRecordDate(r)).filter(Boolean) as Date[];

  const today = startOfDay(new Date());
  const oldest = dated.length
    ? new Date(Math.min(...dated.map((d) => d.getTime())))
    : new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const start = startOfMonth(oldest);
  const end = startOfMonth(today);

  const points: ChartPoint[] = [];
  const map: Record<string, number> = {};

  for (
    let d = new Date(start);
    d <= end;
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  ) {
    const current = new Date(d);
    const key = monthKey(current);
    map[key] = 0;

    points.push({
      key,
      label: current.toLocaleDateString("tr-TR", { month: "short" }),
      fullLabel: current.toLocaleDateString("tr-TR", {
        month: "long",
        year: "numeric",
      }),
      count: 0,
    });
  }

  records.forEach((r) => {
    const dt = getRecordDate(r);
    if (!dt) return;
    const key = monthKey(dt);
    if (key in map) map[key] += 1;
  });

  return points.map((p) => ({ ...p, count: map[p.key] ?? 0 }));
}

function buildChartData(records: any[], range: RangeKey) {
  if (range === "7g") {
    const points = buildDailyPoints(records, 7);
    return { mode: "day" as BucketMode, title: "Son 7 gün", points };
  }

  if (range === "30g") {
    const points = buildDailyPoints(records, 30);
    return { mode: "day" as BucketMode, title: "Son 30 gün", points };
  }

  if (range === "90g") {
    const points = buildWeeklyPoints(records, 90);
    return { mode: "week" as BucketMode, title: "Son 90 gün", points };
  }

  const points = buildMonthlyPoints(records);
  return { mode: "month" as BucketMode, title: "Tüm zaman", points };
}
function getBucketKeyForDate(date: Date, mode: BucketMode) {
  if (mode === "day") return isoKey(startOfDay(date));
  if (mode === "week") return isoKey(startOfWeek(date));
  return monthKey(date);
}

function getMetricSnapshot(records: any[], key: string, suffix = "") {
  const values = records
    .map((r) => num(r?.[key]))
    .filter((v): v is number => v != null);

  const latest = values[0] ?? null;
  const previous = values[1] ?? null;

  let deltaText = "Önceki veri yok";
  if (latest != null && previous != null) {
    const diff = latest - previous;
    const sign = diff > 0 ? "+" : "";
    deltaText = `${sign}${diff.toFixed(1)}${suffix} önceki kayda göre`;
  }

  return {
    value: latest != null ? `${latest}${suffix}` : "-",
    deltaText,
  };
}

/* ---------- Collapsible shell ---------- */
function CollapsibleCard({
  theme,
  styles,
  title,
  open,
  setOpen,
  children,
}: {
  theme: ThemeUI;
  styles: ReturnType<typeof makeStyles>;
  title: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const h = useRef(new Animated.Value(open ? 1 : 0)).current;
  const r = useRef(new Animated.Value(open ? 1 : 0)).current;

  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(h, {
        toValue: open ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(r, {
        toValue: open ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [open]);

  const height = h.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, contentH)],
  });

  const rotate = r.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={18} color={theme.colors.text.muted} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={{ height, overflow: "hidden" }}>
        <View
          onLayout={(e) => {
            const next = Math.ceil(e.nativeEvent.layout.height);
            if (next !== contentH) setContentH(next);
          }}
          style={{ paddingTop: theme.spacing.xs }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

/* ---------- Small KPI ---------- */
function KPI({
  theme,
  label,
  value,
  subText,
}: {
  theme: ThemeUI;
  label: string;
  value: string;
  subText?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surfaceSoft,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        minHeight: 92,
      }}
    >
      <Text
        style={{
          color: theme.colors.text.muted,
          fontSize: theme.fontSize.xs,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          color: theme.colors.text.primary,
          fontSize: theme.fontSize.lg,
          fontWeight: "900",
          marginTop: 4,
        }}
      >
        {value}
      </Text>

      {!!subText && (
        <Text
          style={{
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.xs,
            marginTop: 6,
            lineHeight: 16,
            fontWeight: "700",
          }}
        >
          {subText}
        </Text>
      )}
    </View>
  );
}

/* ---------- Bars ---------- */
function DailyBarsPro({
  theme,
  points,
  mode,
  activeIndex,
  onChangeActiveIndex,
}: {
  theme: ThemeUI;
  points: ChartPoint[];
  mode: BucketMode;
  activeIndex: number;
  onChangeActiveIndex: (index: number) => void;
}) {
  const TOP_LABEL_SPACE = 28;
  const BAR_AREA_H = 170;
  const BOTTOM_LABEL_SPACE = 42;
  const CHART_H = TOP_LABEL_SPACE + BAR_AREA_H + BOTTOM_LABEL_SPACE;

  const animsRef = useRef<Animated.Value[]>([]);

  if (animsRef.current.length < points.length) {
    for (let i = animsRef.current.length; i < points.length; i++) {
      animsRef.current.push(new Animated.Value(0));
    }
  } else if (animsRef.current.length > points.length) {
    animsRef.current = animsRef.current.slice(0, points.length);
  }

  useEffect(() => {
    if (!points.length) return;

    const maxCount = Math.max(...points.map((p) => p.count), 1);

    const runs = points.map((p, i) =>
      Animated.spring(animsRef.current[i], {
        toValue: p.count / maxCount,
        speed: 18,
        bounciness: 6,
        useNativeDriver: false,
      }),
    );

    Animated.stagger(16, runs).start();
  }, [points.map((p) => `${p.key}-${p.count}`).join("|")]);

  if (!points.length) {
    return (
      <Text
        style={{
          marginTop: theme.spacing.sm,
          color: theme.colors.text.muted,
          fontSize: theme.fontSize.xs,
        }}
      >
        Grafik için veri yok.
      </Text>
    );
  }

  const safeActiveIndex = Math.min(Math.max(activeIndex, 0), points.length - 1);
  const active = points[safeActiveIndex] ?? null;

  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const midCount = Math.ceil(maxCount / 2);

  const chartTitle =
    mode === "day"
      ? "Günlük kayıt dağılımı"
      : mode === "week"
        ? "Haftalık kayıt dağılımı"
        : "Aylık kayıt dağılımı";

  const columnWidth = mode === "day" ? 44 : 58;

  const axisLabels = [String(maxCount), String(midCount), "0"];
  const yAxisWidth = Math.max(
    34,
    Math.min(64, Math.max(...axisLabels.map((s) => s.length)) * 8 + 12),
  );

  // ✅ grid ve eksen aynı referanstan hesaplansın
  const topLineY = TOP_LABEL_SPACE;
  const midLineY = TOP_LABEL_SPACE + BAR_AREA_H / 2;
  const bottomLineY = TOP_LABEL_SPACE + BAR_AREA_H;

  return (
    <View style={{ marginTop: theme.spacing.sm }}>
      <Text
        style={{
          color: theme.colors.text.primary,
          fontSize: theme.fontSize.sm,
          fontWeight: "900",
          marginBottom: 6,
        }}
      >
        {chartTitle}
      </Text>

      <Text
        style={{
          color: theme.colors.text.muted,
          fontSize: theme.fontSize.xs,
          lineHeight: 16,
          marginBottom: 10,
        }}
      >
        Çubuk yükseldikçe o dönemde girilen kayıt sayısı artar.
      </Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSoft,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row" }}>
          {/* Sol eksen */}
          <View
            style={{
              width: yAxisWidth,
              height: CHART_H,
              marginRight: 10,
              position: "relative",
            }}
          >
            <Text
              style={{
                position: "absolute",
                top: topLineY - 9,
                right: 0,
                color: theme.colors.text.muted,
                fontSize: 11,
                fontWeight: "900",
                lineHeight: 18,
              }}
            >
              {maxCount}
            </Text>

            <Text
              style={{
                position: "absolute",
                top: midLineY - 9,
                right: 0,
                color: theme.colors.text.muted,
                fontSize: 11,
                fontWeight: "900",
                lineHeight: 18,
              }}
            >
              {midCount}
            </Text>

            <Text
              style={{
                position: "absolute",
                top: bottomLineY - 9,
                right: 0,
                color: theme.colors.text.muted,
                fontSize: 11,
                fontWeight: "900",
                lineHeight: 18,
              }}
            >
              0
            </Text>
          </View>

          {/* Grafik alanı */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
          >
            <View
              style={{
                height: CHART_H,
                position: "relative",
              }}
            >
              {/* çizgiler */}
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: CHART_H,
                }}
              >
                {[topLineY, midLineY, bottomLineY].map((y, idx) => (
                  <View
                    key={idx}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: y,
                      height: 1,
                      backgroundColor: theme.colors.border,
                      opacity: idx === 0 ? 0.34 : 0.18,
                    }}
                  />
                ))}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  height: CHART_H,
                }}
              >
                {points.map((point, i) => {
                  const h = animsRef.current[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, BAR_AREA_H],
                  });

                  const isActive = i === safeActiveIndex;

                  return (
                    <Pressable
                      key={point.key}
                      onPress={() => onChangeActiveIndex(i)}
                      style={{
                        width: columnWidth,
                        height: CHART_H,
                        alignItems: "center",
                        justifyContent: "flex-start",
                        marginRight: 4,
                      }}
                    >
                      {/* üst sayı */}
                      <Text
                        numberOfLines={1}
                        style={{
                          height: TOP_LABEL_SPACE,
                          color: isActive
                            ? theme.colors.text.primary
                            : theme.colors.text.muted,
                          fontSize: 12,
                          fontWeight: "900",
                          textAlign: "center",
                          includeFontPadding: false,
                        }}
                      >
                        {point.count}
                      </Text>

                      {/* bar */}
                      <View
                        style={{
                          height: BAR_AREA_H,
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            width: mode === "day" ? 20 : 24,
                            height: BAR_AREA_H,
                            borderRadius: 999,
                            backgroundColor: isActive
                              ? "rgba(56,189,248,0.12)"
                              : "rgba(148,163,184,0.06)",
                            justifyContent: "flex-end",
                            overflow: "hidden",
                            borderWidth: isActive ? 1 : 0,
                            borderColor: isActive
                              ? "rgba(56,189,248,0.22)"
                              : "transparent",
                          }}
                        >
                          <Animated.View
                            style={{
                              height: h,
                              borderRadius: 999,
                              backgroundColor: isActive
                                ? theme.colors.accent
                                : "rgba(96,165,250,0.78)",
                            }}
                          />
                        </View>
                      </View>

                      {/* alt label */}
                      <Text
                        numberOfLines={2}
                        style={{
                          marginTop: 10,
                          minHeight: BOTTOM_LABEL_SPACE - 10,
                          textAlign: "center",
                          color: isActive
                            ? theme.colors.text.primary
                            : theme.colors.text.muted,
                          fontSize: 11,
                          fontWeight: isActive ? "900" : "700",
                          paddingHorizontal: 2,
                        }}
                      >
                        {point.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {!!active && (
          <View
            style={{
              marginTop: theme.spacing.sm,
              borderWidth: 1,
              borderColor: "rgba(56,189,248,0.18)",
              backgroundColor: "rgba(56,189,248,0.06)",
              borderRadius: theme.radius.md,
              paddingVertical: 10,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.sm,
                fontWeight: "800",
              }}
            >
              {active.fullLabel}
            </Text>

            <Text
              style={{
                color: theme.colors.accent,
                fontSize: theme.fontSize.sm,
                fontWeight: "900",
              }}
            >
              {active.count} kayıt
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
/* ---------- Analytics Card (Tanita+Mezura) ---------- */
function AnalyticsCard({
  theme,
  styles,
  records,
  range,
  setRange,
  open,
  setOpen,
}: {
  theme: ThemeUI;
  styles: ReturnType<typeof makeStyles>;
  records: any[];
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const summary = useMemo(() => {
    const chart = buildChartData(records, range);
    const points = chart.points;
    const counts = points.map((p) => p.count);
    const total = counts.reduce((a, b) => a + b, 0);
    const avg = points.length ? total / points.length : 0;

    const peak = points.reduce<ChartPoint | null>((acc, p) => {
      if (!acc || p.count > acc.count) return p;
      return acc;
    }, null);

    const safeSelectedIndex =
      points.length === 0
        ? 0
        : Math.min(Math.max(selectedIndex, 0), points.length - 1);

    const selectedPoint = points[safeSelectedIndex] ?? null;
    const selectedPointKey = selectedPoint?.key ?? null;

    const selectedPeriodRecords = selectedPointKey
      ? records
          .filter((r) => {
            const dt = getRecordDate(r);
            if (!dt) return false;
            return getBucketKeyForDate(dt, chart.mode) === selectedPointKey;
          })
          .sort((a, b) => {
            const da = getRecordDate(a)?.getTime() ?? 0;
            const db = getRecordDate(b)?.getTime() ?? 0;
            return db - da;
          })
      : [];

    const weight = getMetricSnapshot(records, "weight", " kg");
    const fat = getMetricSnapshot(records, "bodyFat", " %");
    const bel = getMetricSnapshot(records, "bel", " cm");
    const kalca = getMetricSnapshot(records, "kalca", " cm");

    return {
      chart,
      total,
      avg,
      peak,
      safeSelectedIndex,
      selectedPoint,
      selectedPeriodRecords,
      weight,
      fat,
      bel,
      kalca,
    };
  }, [records, range, selectedIndex]);

  useEffect(() => {
    const chart = buildChartData(records, range);
    const lastIndex = chart.points.length > 0 ? chart.points.length - 1 : 0;
    setSelectedIndex(lastIndex);
  }, [range, records.length]);

  const rangeItems: Array<{ key: RangeKey; label: string }> = [
    { key: "7g", label: "7 Gün" },
    { key: "30g", label: "30 Gün" },
    { key: "90g", label: "90 Gün" },
    { key: "all", label: "Tümü" },
  ];

  return (
    <CollapsibleCard
      theme={theme}
      styles={styles}
      title="Analitikler • Ölçümler"
      open={open}
      setOpen={setOpen}
    >
      <Text
        style={{
          color: theme.colors.text.secondary,
          fontSize: theme.fontSize.sm,
          lineHeight: 18,
          marginTop: 2,
        }}
      >
        Bu alan öğrencinin kayıt sıklığını ve son ölçüm değişimlerini daha açık
        gösterir.
      </Text>

      <View
        style={{
          flexDirection: "row",
          marginTop: theme.spacing.sm,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {rangeItems.map((item) => {
          const active = range === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              onPress={() => setRange(item.key)}
              style={[
                {
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 7,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceSoft,
                },
                active && {
                  borderColor: theme.colors.accent,
                  backgroundColor: "rgba(56,189,248,0.12)",
                },
              ]}
            >
              <Text
                style={{
                  color: active
                    ? theme.colors.accent
                    : theme.colors.text.secondary,
                  fontSize: theme.fontSize.xs,
                  fontWeight: "900",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={{
          marginTop: theme.spacing.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSoft,
          borderRadius: theme.radius.md,
          padding: theme.spacing.sm,
        }}
      >
        <Text
          style={{
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.sm,
            fontWeight: "900",
          }}
        >
          {summary.chart.title}
        </Text>

        <Text
          style={{
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.xs,
            lineHeight: 17,
            marginTop: 6,
          }}
        >
          Toplam kayıt:{" "}
          <Text style={{ color: theme.colors.text.primary, fontWeight: "900" }}>
            {summary.total}
          </Text>
          {"  •  "}
          Ortalama:{" "}
          <Text style={{ color: theme.colors.text.primary, fontWeight: "900" }}>
            {summary.avg.toFixed(1)}
          </Text>
          {"  •  "}
          En yoğun dönem:{" "}
          <Text style={{ color: theme.colors.text.primary, fontWeight: "900" }}>
            {summary.peak
              ? `${summary.peak.fullLabel} (${summary.peak.count})`
              : "-"}
          </Text>
        </Text>
      </View>

      <View
        style={{ flexDirection: "row", gap: 10, marginTop: theme.spacing.sm }}
      >
        <KPI
          theme={theme}
          label="Son Kilo"
          value={summary.weight.value}
          subText={summary.weight.deltaText}
        />
        <KPI
          theme={theme}
          label="Son Yağ Oranı"
          value={summary.fat.value}
          subText={summary.fat.deltaText}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <KPI
          theme={theme}
          label="Bel Çevresi"
          value={summary.bel.value}
          subText={summary.bel.deltaText}
        />
        <KPI
          theme={theme}
          label="Kalça Çevresi"
          value={summary.kalca.value}
          subText={summary.kalca.deltaText}
        />
      </View>

      <DailyBarsPro
        theme={theme}
        points={summary.chart.points}
        mode={summary.chart.mode}
        activeIndex={summary.safeSelectedIndex}
        onChangeActiveIndex={setSelectedIndex}
      />

      <View style={{ marginTop: theme.spacing.sm }}>
        <Text
          style={{
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.sm,
            fontWeight: "900",
          }}
        >
          Seçili dönemin kayıtları
        </Text>

        {summary.selectedPeriodRecords.length ? (
          summary.selectedPeriodRecords.map((r: any) => {
            const dt = getRecordDate(r);
            const ds = dt
              ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}`
              : "-";

            return (
              <View
                key={r.id}
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.text.muted,
                    fontSize: theme.fontSize.xs,
                  }}
                >
                  {ds}
                </Text>

                <Text
                  style={{
                    color: theme.colors.text.primary,
                    fontSize: theme.fontSize.sm,
                    marginTop: 2,
                  }}
                >
                  {r.note?.trim() ? r.note : "Not yok"}
                </Text>
              </View>
            );
          })
        ) : (
          <Text
            style={{
              marginTop: 6,
              color: theme.colors.text.muted,
            }}
          >
            Seçili dönemde kayıt yok.
          </Text>
        )}
      </View>
    </CollapsibleCard>
  );
}

/* ---------- Tests Card (analysis fields) ---------- */
function TestsCard({
  theme,
  styles,
  records,
  open,
  setOpen,
}: {
  theme: ThemeUI;
  styles: ReturnType<typeof makeStyles>;
  records: any[];
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setSelectedIndex(0);
    setPickerOpen(false);
  }, [records.length]);

  const safeSelectedIndex =
    records.length > 0
      ? Math.min(Math.max(selectedIndex, 0), records.length - 1)
      : 0;

  const selectedRecord = records?.[safeSelectedIndex] ?? null;
  const a = selectedRecord?.analysis ?? {};

  const selectedDt = getRecordDate(selectedRecord);
  const selectedDateLabel = selectedDt
    ? `${selectedDt.toLocaleDateString("tr-TR")} • ${selectedDt.toLocaleTimeString("tr-TR")}`
    : "-";

  const valueOrDash = (v: any) =>
    v === null || v === undefined || v === "" ? "-" : String(v);

  return (
    <CollapsibleCard
      theme={theme}
      styles={styles}
      title="Analitikler • Test Sonuçları"
      open={open}
      setOpen={(v) => {
        setOpen(v);
        if (!v) setPickerOpen(false);
      }}
    >
      <Text
        style={{
          color: theme.colors.text.secondary,
          fontSize: theme.fontSize.sm,
          lineHeight: 18,
          marginTop: 2,
        }}
      >
        Bu bölüm seçili kaydın analiz sonuçlarını gösterir. Varsayılan olarak
        son kayıt seçilir.
      </Text>

      {/* Seçili kayıt alanı */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setPickerOpen((prev) => !prev)}
        style={{
          marginTop: theme.spacing.sm,
          borderWidth: 1,
          borderColor: pickerOpen ? theme.colors.accent : theme.colors.border,
          backgroundColor: theme.colors.surfaceSoft,
          borderRadius: theme.radius.md,
          padding: theme.spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: theme.colors.text.muted,
                fontSize: theme.fontSize.xs,
                fontWeight: "800",
              }}
            >
              Seçili kayıt
            </Text>

            <Text
              style={{
                color: theme.colors.text.primary,
                fontSize: theme.fontSize.sm,
                fontWeight: "900",
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {selectedDateLabel}
            </Text>
          </View>

          <Animated.View
            style={{
              transform: [{ rotate: pickerOpen ? "180deg" : "0deg" }],
            }}
          >
            <ChevronDown size={18} color={theme.colors.text.muted} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Açılan kayıt listesi */}
      {pickerOpen && (
        <View
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            overflow: "hidden",
          }}
        >
          {records.length ? (
            records.slice(0, 12).map((r, i) => {
              const dt = getRecordDate(r);
              const ds = dt
                ? `${dt.toLocaleDateString("tr-TR")} • ${dt.toLocaleTimeString("tr-TR")}`
                : "-";

              const isActive = i === safeSelectedIndex;

              return (
                <TouchableOpacity
                  key={r.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedIndex(i);
                    setPickerOpen(false);
                  }}
                  style={{
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: theme.colors.border,
                    backgroundColor: isActive
                      ? "rgba(56,189,248,0.10)"
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: isActive
                        ? theme.colors.text.primary
                        : theme.colors.text.secondary,
                      fontSize: theme.fontSize.sm,
                      fontWeight: isActive ? "900" : "700",
                    }}
                  >
                    {i === 0 ? `Son kayıt • ${ds}` : ds}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={{ padding: theme.spacing.sm }}>
              <Text
                style={{
                  color: theme.colors.text.muted,
                  fontSize: theme.fontSize.sm,
                }}
              >
                Kayıt yok.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* KPI */}
      <View
        style={{ flexDirection: "row", gap: 10, marginTop: theme.spacing.sm }}
      >
        <KPI theme={theme} label="BMI" value={valueOrDash(a?.bmi)} />
        <KPI
          theme={theme}
          label="BMI Durumu"
          value={valueOrDash(a?.bmiStatus)}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <KPI theme={theme} label="VO₂max" value={valueOrDash(a?.bruceVO2Max)} />
        <KPI
          theme={theme}
          label="VO₂ Değerlendirme"
          value={valueOrDash(a?.vo2Status)}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <KPI theme={theme} label="YMCA" value={valueOrDash(a?.ymcaStatus)} />
        <KPI
          theme={theme}
          label="Sit&Reach"
          value={valueOrDash(a?.sitAndReachBest)}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <KPI
          theme={theme}
          label="Push-up"
          value={valueOrDash(a?.pushupStatus)}
        />
        <KPI theme={theme} label="Plank" value={valueOrDash(a?.plankStatus)} />
      </View>
    </CollapsibleCard>
  );
}
function Chip({
  styles,
  label,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

/* ----------------- STYLES ----------------- */
function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    container: { flex: 1, backgroundColor: theme.colors.background },

    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: {
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    errorText: { color: theme.colors.danger, marginBottom: theme.spacing.xs },

    /* HEADER */
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm + 4,
      paddingBottom: theme.spacing.xs,
    },
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm - 2,
    },
    statusBadgeBtn: {
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm - 2,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    backButton: {
      flexDirection: "row",
      alignItems: "center",
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
      marginLeft: theme.spacing.xs,
    },

    cancelButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginLeft: theme.spacing.xs,
    },
    cancelButtonText: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.xs,
      fontWeight: "800",
    },
    saveButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginLeft: theme.spacing.xs,
    },
    saveButtonText: {
      color: theme.colors.text.onAccent,
      fontSize: theme.fontSize.xs,
      fontWeight: "900",
    },

    editRow: { marginTop: theme.spacing.sm },
    editLabel: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      fontWeight: "700",
      marginBottom: 6,
    },
    editInput: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm - 2,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
    },

    headerActions: {
      flexDirection: "row",
      marginLeft: theme.spacing.xs,
      justifyContent: "flex-end",
      alignItems: "center",
      flex: 1,
    },

    toggleButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
      borderWidth: 1,
      opacity: 0.9,
    },
    toggleButtonPassive: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
      borderWidth: 1,
      opacity: 0.9,
    },

    toggleButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.text.onAccent,
    },
    editQWrap: { marginTop: theme.spacing.sm },
    editQTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      fontWeight: "800",
    },

    editQButtons: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
      flexWrap: "wrap",
    },
    editQBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
    },
    editQBtnActive: {
      borderColor: theme.colors.accent,
      backgroundColor: "rgba(56,189,248,0.12)",
    },
    editQBtnText: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.xs,
      fontWeight: "900",
    },
    editQBtnTextActive: { color: theme.colors.accent },

    editQNote: {
      marginTop: 10,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      padding: theme.spacing.sm,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      lineHeight: 18,
      minHeight: 70,
    },

    editButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm - 2,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.editButtonbackground,
      opacity: 0.9,
      marginLeft: theme.spacing.xs,
    },
    editButtonText: {
      color: theme.colors.text.onAccent,
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      marginLeft: theme.spacing.xs,
    },

    /* STUDENT HEADER CARD */
    studentRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.sm,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    avatarText: {
      color: theme.colors.text.onAccent,
      fontSize: 23,
      fontWeight: "800",
    },
    studentName: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.lg + 3,
      fontWeight: "700",
    },

    statusBadge: {
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm - 4,
      paddingVertical: theme.spacing.xs - 2,
      borderRadius: theme.radius.pill,
      alignSelf: "flex-start",
    },
    statusActive: { backgroundColor: theme.colors.successSoft },
    statusPassive: { backgroundColor: theme.colors.dangerSoft },
    statusActiveText: {
      color: theme.colors.success,
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
    },
    statusPassiveText: {
      color: theme.colors.danger,
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
    },

    metaLine: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.xs,
    },
    metaText: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      marginLeft: theme.spacing.xs,
    },

    /* CARDS */
    card: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...(theme.shadow?.soft ?? {}),
    },
    cardTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.lg - 1,
      fontWeight: "700",
      marginBottom: theme.spacing.sm - 4,
    },
    subTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md,
      fontWeight: "700",
    },
    mutedText: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.md,
      marginTop: theme.spacing.xs,
    },

    /* INFO ROW */
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm - 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoLabelRow: { flexDirection: "row", alignItems: "center" },
    infoLabel: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      marginLeft: theme.spacing.xs,
    },
    infoValue: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md - 1,
      maxWidth: "55%",
      textAlign: "right",
    },

    /* QA */
    qaItem: {
      paddingVertical: theme.spacing.sm - 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    qaTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    qaQuestion: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md - 1,
      fontWeight: "600",
      flex: 1,
      lineHeight: 18,
    },

    badge: {
      paddingHorizontal: theme.spacing.sm - 2,
      paddingVertical: theme.spacing.xs - 2,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      alignSelf: "flex-start",
      marginLeft: theme.spacing.md - 4,
    },
    badgeYes: {
      backgroundColor: theme.colors.successSoft,
      borderColor: "rgba(34,197,94,0.35)",
    },
    badgeNo: {
      backgroundColor: theme.colors.dangerSoft,
      borderColor: "rgba(248,113,113,0.35)",
    },
    badgeNA: {
      backgroundColor: "rgba(148,163,184,0.12)",
      borderColor: "rgba(148,163,184,0.25)",
    },
    badgeText: { fontSize: theme.fontSize.xs, fontWeight: "800" },
    badgeTextYes: { color: theme.colors.success },
    badgeTextNo: { color: theme.colors.danger },
    badgeTextNA: { color: theme.colors.text.secondary },

    noteBox: {
      marginTop: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
    },
    miniLabel: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.xs,
      marginBottom: 4,
    },
    noteText: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      lineHeight: 17,
    },

    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: theme.spacing.sm - 2,
    },
    chip: {
      paddingHorizontal: theme.spacing.sm - 2,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      marginRight: theme.spacing.xs + 2,
      marginBottom: theme.spacing.xs + 2,
    },
    chipText: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
    },

    /* RECORDS */
    recordsTitle: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs + 2,
      color: theme.colors.primary,
      fontSize: theme.fontSize.lg,
      fontWeight: "700",
    },
    recordCard: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm - 2,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ptNoteHint: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      marginBottom: theme.spacing.sm,
      lineHeight: 18,
    },

    ptNoteInput: {
      minHeight: 140,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
      padding: theme.spacing.sm,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
      lineHeight: 18,
    },

    ptNoteSaveBtn: {
      marginTop: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    ptNoteSaveText: {
      color: theme.colors.text.onAccent,
      fontSize: theme.fontSize.md,
      fontWeight: "800",
    },

    recordDate: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md - 1,
      fontWeight: "600",
    },
    recordNote: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      marginTop: 2,
    },
    emptyText: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.md - 1,
    },

    /* ✅ ADDED (sadece yeni eklenenler) */
    listContent: {
      paddingBottom: 180,
    },
    ptNoteHeaderPress: {
      paddingVertical: 2,
    },
    ptNotePreview: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      lineHeight: 18,
      marginTop: 2,
    },
    recordNotePress: {
      marginTop: 2,
    },
    listFooterSpace: {
      height: 40,
    },
    followUpWrap: {
      marginTop: theme.spacing.sm,
    },

    followUpLabel: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      fontWeight: "700",
    },

    followUpPillsRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: theme.spacing.xs,
    },

    followUpPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceSoft,
    },

    followUpPillActive: {
      borderColor: theme.colors.accent,
      backgroundColor: "rgba(56,189,248,0.12)",
    },

    followUpPillText: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.xs,
      fontWeight: "800",
    },

    followUpPillTextActive: {
      color: theme.colors.accent,
    },

    followUpSavingText: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      fontWeight: "700",
      marginLeft: 4,
    },

    followUpHint: {
      marginTop: 6,
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      lineHeight: 16,
    },
  });
}

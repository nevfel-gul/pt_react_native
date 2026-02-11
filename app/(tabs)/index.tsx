import { auth } from "@/services/firebase";
import { recordsColRef, studentsColRef } from "@/services/firestorePaths";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clipboard,
  Eye,
  Phone,
  Plus,
  Search,
  Users,
  XIcon,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ NEW THEME
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

// ✅ AI UI COMPONENT
import AiStudentSearchUI from "@/components/AiStudentSearchUI";

/* -------------------- TYPES -------------------- */
type Student = {
  id: string;
  name: string;
  email: string;
  number: string;
  aktif: "Aktif" | "Pasif";
  assessmentDate: string;
  followUpDays?: number;
};

type RecordDoc = {
  id: string;
  studentId?: string;

  createdAt?: Timestamp | Date | number | string;
  date?: Timestamp | Date | number | string;
  createdAtMs?: number;
};

/* -------------------- HELPERS (same logic as calendar) -------------------- */
function toDateSafe(v: any): Date | null {
  if (!v) return null;

  // Firestore Timestamp
  if (typeof v === "object" && typeof v.toDate === "function") {
    try {
      return v.toDate();
    } catch { }
  }

  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function daysDiff(a: Date, b: Date): number {
  // a - b in days
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  return Math.round((A - B) / (1000 * 60 * 60 * 24));
}

/* -------------------- SCREEN -------------------- */
export default function KayitlarScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const functions = getFunctions(undefined, "europe-west1");
  const tabBarH = useBottomTabBarHeight();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme, mode), [theme, mode]);

  // ✅ AI state (listeyi ETKİLEMEZ; sadece chat içinde gösterilecek)
  const [aiMode, setAiMode] = useState(false);
  const [aiReason, setAiReason] = useState("");
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiIds, setAiIds] = useState<Set<string> | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const safeSearch = searchTerm ?? "";
  const searchAnim = useRef(new Animated.Value(0)).current;

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<RecordDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterDurum, setFilterDurum] = useState<"" | "Aktif" | "Pasif">("");

  const totalCount = students.length;
  const activeCount = students.filter((s) => s.aktif === "Aktif").length;
  const passiveCount = students.filter((s) => s.aktif === "Pasif").length;

  const [notifOpen, setNotifOpen] = useState(false);

  const openAnimatedSearch = () => {
    setSearchActive(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const closeAnimatedSearch = () => {
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setSearchActive(false);
      setSearchTerm("");

      // AI state reset
      setAiIds(null);
      setAiMode(false);
      setAiReason("");
    });
  };

  const iconsOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // ✅ ANA LİSTE FİLTRESİ (AI YOK!)
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(safeSearch.toLowerCase()) ||
        student.email.toLowerCase().includes(safeSearch.toLowerCase());

      const matchesDurum = !filterDurum || student.aktif === filterDurum;

      return matchesSearch && matchesDurum;
    });
  }, [students, safeSearch, filterDurum]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const qStudents = query(studentsColRef(uid), orderBy("createdAt", "desc"));
    const unsubStudents = onSnapshot(
      qStudents,
      (snapshot) => {
        const list: Student[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            name: data.name ?? "",
            email: data.email ?? "",
            number: data.number ?? "",
            aktif: (data.aktif as "Aktif" | "Pasif") ?? "Aktif",
            assessmentDate: data.assessmentDate ?? new Date().toISOString(),
            followUpDays: typeof data.followUpDays === "number" ? data.followUpDays : 30,
          };
        });

        setStudents(list);
      },
      (error) => {
        console.error("students dinlenirken hata:", error);
      }
    );

    const qRecords = query(recordsColRef(uid), orderBy("createdAt", "desc"));
    const unsubRecords = onSnapshot(
      qRecords,
      (snapshot) => {
        const list: RecordDoc[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        }));

        setRecords(list);
        setLoading(false);
      },
      (error) => {
        console.error("records dinlenirken hata:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubStudents();
      unsubRecords();
    };
  }, []);

  // ✅ studentId -> lastRecordDate
  const lastRecordByStudent = useMemo(() => {
    const map = new Map<string, Date>();

    for (const r of records) {
      const sid = r.studentId;
      if (!sid) continue;

      const d =
        toDateSafe(r.createdAt) ??
        toDateSafe(r.date) ??
        (typeof r.createdAtMs === "number" ? toDateSafe(r.createdAtMs) : null);

      if (!d) continue;

      const prev = map.get(sid);
      if (!prev || d.getTime() > prev.getTime()) map.set(sid, d);
    }

    return map;
  }, [records]);

  // ✅ aiIds -> öğrenci listesi (SADECE chat içinde göstermek için)
  const aiMatchedStudents = useMemo(() => {
    if (!aiIds) return [];
    return students.filter((s) => aiIds.has(s.id));
  }, [aiIds, students]);

  async function runAiSearch(overrideQuery?: string) {
    const q = (overrideQuery ?? searchTerm ?? "").trim();
    if (!q) return;

    try {
      setAiSearchLoading(true);

      const payload = students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        aktif: s.aktif,
        lastRecordAtMs: lastRecordByStudent.get(s.id)?.getTime() ?? null,
      }));

      const fn = httpsCallable<
        {
          queryText: string;
          locale?: "tr" | "en";
          students: Array<{
            id: string;
            name: string;
            email?: string;
            aktif?: "Aktif" | "Pasif";
            lastRecordAtMs?: number | null;
          }>;
        },
        { ids: string[]; reason?: string }
      >(getFunctions(undefined, "europe-west1"), "aiStudentSearch");

      const res = await fn({
        queryText: q,
        locale: i18n.language?.startsWith("en") ? "en" : "tr",
        students: payload,
      });

      const idsArr = Array.isArray(res.data?.ids) ? res.data.ids : [];
      const reason = typeof res.data?.reason === "string" ? res.data.reason : "";

      setAiIds(new Set(idsArr));
      setAiReason(reason);
      setAiMode(true); // sadece UI/chat bilgisi
    } catch (e: any) {
      const message = e?.message || "Unknown error";
      const details = e?.details || null;
      const traceId = details?.traceId ? String(details.traceId) : "";

      const uiMsg = typeof details?.message === "string" && details.message ? details.message : message;

      setAiReason(`AI hata: ${uiMsg}${traceId ? ` (traceId: ${traceId})` : ""}`);
      setAiMode(false);
      setAiIds(null);
    } finally {
      setAiSearchLoading(false);
    }
  }

  const dateLocale = i18n.language?.startsWith("en") ? "en-US" : "tr-TR";

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: theme.colors.text.secondary }}>{t("students.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleViewDetails = (studentId: string) => {
    router.push({ pathname: "/student/[id]", params: { id: studentId } });
  };

  const handleAddStudent = () => {
    router.replace("/newstudent");
  };

  async function sendTestCampaign() {
    const fn = httpsCallable(functions, "campaignPush");

    await fn({
      title: "Kampanya 🎉",
      body: "Premium %20 indirim başladı!",
    });

    console.log("Push gönderildi");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {searchActive && (
        <TouchableWithoutFeedback onPress={closeAnimatedSearch}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "transparent",
              zIndex: 1,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <View style={styles.headerTopRow}>
            <Animated.View
              style={[styles.leftHeaderArea, { opacity: iconsOpacity }]}
              pointerEvents={searchActive ? "none" : "auto"}
            >
              <Text style={styles.logoText}>{t("brand.name")}</Text>
            </Animated.View>

            <View style={styles.rightHeaderArea}>
              <Animated.View style={{ opacity: iconsOpacity }}>
                <TouchableOpacity
                  onPress={() => setNotifOpen(!notifOpen)}
                  style={styles.titleIconWrapper}
                  disabled={searchActive}
                >
                  <Bell size={22} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </Animated.View>

              {!searchActive && (
                <TouchableOpacity
                  onPress={openAnimatedSearch}
                  style={{
                    backgroundColor: theme.colors.surfaceSoft,
                    height: 40,
                    width: 40,
                    alignItems: "center",
                    borderRadius: theme.radius.pill,
                    justifyContent: "center",
                    marginLeft: 6,
                  }}
                >
                  <Search size={22} color={theme.colors.text.primary} />
                </TouchableOpacity>
              )}

              <Animated.View style={{ opacity: iconsOpacity }}>
                <TouchableOpacity
                  style={styles.titleIconWrapper}
                  activeOpacity={0.7}
                  onPress={() => router.push("/profile")}
                  disabled={searchActive}
                >
                  <Users size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>

        {searchActive && (
          <Animated.View
            style={{
              position: "absolute",
              left: 22,
              right: 22,
              top: 0,
              height: 48,
              backgroundColor: theme.colors.surfaceSoft,
              borderRadius: theme.radius.pill,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.black,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 999,
              opacity: searchAnim,
            }}
          >
            <TouchableOpacity onPress={closeAnimatedSearch} style={{ marginRight: 8 }}>
              <ArrowLeft size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>

            <TextInput
              placeholder={t("search.student.placeholder")}
              placeholderTextColor={theme.colors.text.muted}
              value={searchTerm}
              onChangeText={(txt) => {
                setSearchTerm(txt);

                // kullanıcı yeni arama yazınca AI state'i temizle (listeyi etkilemiyor ama chat için mantıklı)
                if (aiMode) {
                  setAiMode(false);
                  setAiIds(null);
                  setAiReason("");
                }
              }}
              style={{
                flex: 1,
                color: theme.colors.text.primary,
                fontSize: 16,
                fontWeight: "600",
                paddingVertical: 10,
              }}
            />

            {/* ✅ AI UI: sonuçlar SADECE modal chat içinde gösterilecek */}
            <AiStudentSearchUI
              theme={theme}
              searchTerm={searchTerm}
              aiMode={aiMode}
              aiReason={aiReason}
              aiSearchLoading={aiSearchLoading}
              runAiSearch={runAiSearch}
              searchActive={searchActive}
              autoSendSearchTerm={false}
              results={aiMatchedStudents}
              onOpenStudent={(id) => handleViewDetails(id)}

            />

            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchTerm("");
                  setAiIds(null);
                  setAiMode(false);
                  setAiReason("");
                }}
                style={{ marginLeft: 8 }}
              >
                <XIcon size={18} color={theme.colors.text.muted} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        <View style={styles.listWrapper}>
          <View style={styles.filterBoxRow}>
            <TouchableOpacity
              onPress={() => setFilterDurum("")}
              style={[
                styles.filterBox,
                { backgroundColor: theme.colors.filterAll },
                filterDurum === "" && styles.filterBoxActiveALL,
              ]}
            >
              <Text style={[styles.filterBoxNumber, filterDurum === "" && styles.filterBoxNumberActive]}>
                {totalCount}
              </Text>
              <Text style={[styles.filterBoxText, filterDurum === "" && styles.filterBoxTextActive]}>
                {t("filter.all")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterDurum("Aktif")}
              style={[
                styles.filterBox,
                { backgroundColor: theme.colors.filterActive },
                filterDurum === "Aktif" && styles.filterBoxActiveA,
              ]}
            >
              <Text style={[styles.filterBoxNumber, filterDurum === "Aktif" && styles.filterBoxNumberActive]}>
                {activeCount}
              </Text>
              <Text style={[styles.filterBoxText, filterDurum === "Aktif" && styles.filterBoxTextActive]}>
                {t("status.active")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterDurum("Pasif")}
              style={[
                styles.filterBox,
                { backgroundColor: theme.colors.filterPassive },
                filterDurum === "Pasif" && styles.filterBoxActiveP,
              ]}
            >
              <Text style={[styles.filterBoxNumber, filterDurum === "Pasif" && styles.filterBoxNumberActive]}>
                {passiveCount}
              </Text>
              <Text style={[styles.filterBoxText, filterDurum === "Pasif" && styles.filterBoxTextActive]}>
                {t("status.passive")}
              </Text>
            </TouchableOpacity>
          </View>

          {filteredStudents.length > 0 ? (
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const today = startOfDay(new Date());
                const last = lastRecordByStudent.get(item.id) ?? null;

                let recordTextColor = theme.colors.success;

                if (!last) {
                  recordTextColor = theme.colors.text.muted;
                } else {
                  const period = typeof item.followUpDays === "number" ? item.followUpDays : 30;
                  const dueDate = addDays(startOfDay(last), period);
                  const diff = daysDiff(today, dueDate);
                  if (diff > 0) {
                    recordTextColor = theme.colors.danger;
                  }
                }

                return (
                  <TouchableOpacity style={styles.card} onPress={() => handleViewDetails(item.id)}>
                    <View style={styles.cardLeft}>
                      <View style={styles.nameRow}>
                        <Text style={styles.cardName} numberOfLines={1}>
                          {item.name}
                        </Text>

                        <Clipboard style={styles.recordIcon} size={14} color={recordTextColor} />
                      </View>

                      <View style={styles.cardRow}>
                        <Phone size={16} color={theme.colors.text.muted} />
                        <Text style={styles.cardRowText}>{item.number}</Text>
                      </View>

                      <View style={styles.cardRow}>
                        <Calendar size={16} color={theme.colors.text.muted} />
                        <Text style={styles.cardRowText}>
                          {new Date(item.assessmentDate).toLocaleDateString(dateLocale)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardRight}>
                      <View style={styles.statusRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            item.aktif === "Aktif" ? styles.statusBadgeActive : styles.statusBadgeInactive,
                          ]}
                        >
                          <Text style={item.aktif === "Aktif" ? styles.statusTextActive : styles.statusTextInactive}>
                            {item.aktif === "Aktif" ? t("status.active") : t("status.passive")}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailPill}>
                        <Eye size={16} color={theme.colors.text.primary} />
                        <Text style={styles.detailPillText}>{t("detail")}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{t("empty.title")}</Text>
              <Text style={styles.emptySubtitle}>{t("empty.subtitle")}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.fab, { bottom: tabBarH - 12 }]} onPress={handleAddStudent}>
          <Plus size={24} color={theme.colors.surfaceDark} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab2, { bottom: tabBarH - 12 }]} onPress={sendTestCampaign}>
          <Plus size={24} color={theme.colors.surfaceDark} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeUI, mode: "light" | "dark") {
  const isLight = mode === "light";
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    headerWrapper: {
      position: "relative",
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xs + 2,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },

    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },

    titleIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    listWrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      paddingTop: theme.spacing.xs,
    },

    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 80,
      paddingTop: theme.spacing.sm,
    },

    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg - 4,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      ...theme.shadow.soft,
    },

    cardLeft: { flex: 1 },

    cardName: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
      flexShrink: 1,
    },

    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: 3,
    },

    cardRowText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.text.secondary,
    },

    cardRight: {
      alignItems: "flex-end",
      justifyContent: "space-between",
    },

    statusBadge: {
      paddingHorizontal: theme.spacing.sm - 4,
      paddingVertical: theme.spacing.xs - 2,
      borderRadius: theme.radius.pill,
    },
    statusBadgeActive: { backgroundColor: theme.colors.successSoft },
    statusBadgeInactive: { backgroundColor: theme.colors.dangerSoft },

    statusTextActive: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.success,
    },
    statusTextInactive: {
      fontSize: theme.fontSize.xs,
      fontWeight: "600",
      color: theme.colors.danger,
    },

    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    detailPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    detailPillText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.text.primary,
      fontWeight: "500",
    },

    emptyState: {
      alignItems: "center",
      marginTop: 40,
    },
    emptyTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: "600",
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: theme.fontSize.md - 1,
      color: theme.colors.text.secondary,
      textAlign: "center",
      paddingHorizontal: theme.spacing.lg,
    },

    fab: {
      position: "absolute",
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.black,
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },
    fab2: {
      position: "absolute",
      right: 120,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.black,
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },

    filterBoxRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md - 2,
      marginTop: theme.spacing.xs,
    },

    filterBox: {
      flex: 1,
      marginHorizontal: 4,
      height: 92,
      borderRadius: theme.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    filterBoxActiveALL: {
      shadowRadius: 16,
      elevation: 10,
      shadowOffset: { width: 0, height: 0 },
      shadowColor: isLight ? "rgba(0,0,0,0.65)" : theme.colors.info,
      shadowOpacity: isLight ? 0.55 : 0.8,
    },

    filterBoxActiveA: {
      shadowColor: theme.colors.success,
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 10,
    },

    filterBoxActiveP: {
      shadowColor: theme.colors.danger,
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 10,
    },

    filterBoxText: {
      fontSize: theme.fontSize.sm,
      fontWeight: "600",
      color: theme.colors.text.emphasis,
    },
    filterBoxTextActive: {
      fontSize: theme.fontSize.lg - 2,
      fontWeight: "700",
      color: theme.colors.text.emphasis,
    },
    filterBoxNumber: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.text.emphasis,
      marginBottom: 4,
    },
    filterBoxNumberActive: {
      fontSize: 32,
      fontWeight: "700",
      color: theme.colors.text.emphasis,
      marginBottom: 4,
    },

    logoText: {
      fontSize: theme.fontSize.lg,
      fontWeight: "800",
      color: theme.colors.primary,
    },

    leftHeaderArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md - 4,
    },
    rightHeaderArea: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: theme.spacing.xs,
      flex: 1,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    recordIcon: {
      marginLeft: 5,
    },
  });
}

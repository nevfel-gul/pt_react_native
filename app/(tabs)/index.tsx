// ❌ kaldır: import { themeui } from "@/constants/themeui";
import { auth } from "@/services/firebase";
import { recordsColRef, studentsColRef } from "@/services/firestorePaths";
import { useRouter } from "expo-router";
import { onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Eye,
  Phone,
  Plus,
  Search,
  Sparkles,
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

// ✅ NEW
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

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

  // ✅ theme
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

  const overlayOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

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
    });
  };

  const iconsOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

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
            followUpDays: typeof data.followUpDays === "number" ? data.followUpDays : 30, // ✅
          };

        });

        setStudents(list);
        // loading burada bitmesin; records da gelsin
      },
      (error) => {
        console.error("students dinlenirken hata:", error);
      }
    );

    // ✅ records dinle (takvim mantığı için)
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {searchActive && (
        <TouchableWithoutFeedback onPress={closeAnimatedSearch}>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.colors.black,
              opacity: overlayOpacity,
              zIndex: 998,
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

              {searchActive && (
                <Animated.View
                  style={{
                    position: "absolute",
                    left: 10,
                    right: 10,
                    top: 0,
                    height: 48,
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 12,
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
                    <ArrowLeft size={20} color={theme.colors.text.primary} />
                  </TouchableOpacity>

                  <TextInput
                    placeholder={t("search.student.placeholder")}
                    placeholderTextColor={theme.colors.text.muted}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    autoFocus
                    style={{
                      flex: 1,
                      color: theme.colors.text.primary,
                      fontSize: 15,
                      fontWeight: "500",
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => console.log("AI butonu tıklandı")}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.colors.premium,
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: 8,
                    }}
                  >
                    <Sparkles size={18} color="#fff" />
                  </TouchableOpacity>

                  {searchTerm.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchTerm("")} style={{ marginLeft: 8 }}>
                      <XIcon size={18} color={theme.colors.text.muted} />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}
            </View>
          </View>
        </View>

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

                // ✅ küçük yazı (arkası yok) + renk
                let recordText = "Kayıt ekle";
                let recordTextColor = theme.colors.success;

                if (!last) {
                  recordText = "Kayıt yok";
                  recordTextColor = theme.colors.text.muted;
                } else {
                  const period = typeof item.followUpDays === "number" ? item.followUpDays : 30;
                  const dueDate = addDays(startOfDay(last), period);
                  const diff = daysDiff(today, dueDate); // today - dueDate
                  if (diff > 0) {
                    recordText = "Kayıt ekle";
                    recordTextColor = theme.colors.danger;
                  }
                }

                return (
                  <TouchableOpacity style={styles.card} onPress={() => handleViewDetails(item.id)}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.cardName}>{item.name}</Text>

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

                        {/* ✅ küçük, silik, arkası yok (status yanında) */}
                        <Text style={[styles.recordHint, { color: recordTextColor }]} numberOfLines={1}>
                          {recordText}
                        </Text>
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

        <TouchableOpacity style={styles.fab} onPress={handleAddStudent}>
          <Plus size={24} color={theme.colors.surfaceDark} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.surfaceDark,
    },

    headerWrapper: {
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

    // ✅ NEW: status yanında küçük yazı
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    recordHint: {
      fontSize: 11,
      fontWeight: "700",
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
      shadowColor: theme.colors.info,
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 10,
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
  });
}

// ❌ kaldır: import { themeui } from "@/constants/themeui";
import { auth } from "@/services/firebase";
import { studentsColRef } from "@/services/firestorePaths";
import { useRouter } from "expo-router";
import { onSnapshot, orderBy, query } from "firebase/firestore";
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

type Student = {
  id: string;
  name: string;
  email: string;
  number: string;
  aktif: "Aktif" | "Pasif"; // DB değeri TR kalsın; UI text'i t() ile çevriliyor
  assessmentDate: string;
};

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
    const q = query(
      studentsColRef(auth.currentUser?.uid!),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
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
          };
        });

        setStudents(list);
        setLoading(false);
      },
      (error) => {
        console.error("students dinlenirken hata:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const dateLocale = i18n.language?.startsWith("en") ? "en-US" : "tr-TR";

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ color: theme.colors.text.secondary }}>
            {t("students.loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleViewDetails = (studentId: string) => {
    router.push({
      pathname: "/student/[id]",
      params: { id: studentId },
    });
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
                  <TouchableOpacity
                    onPress={closeAnimatedSearch}
                    style={{ marginRight: 8 }}
                  >
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
                    onPress={() => {
                      console.log("AI butonu tıklandı");
                    }}
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
                    <TouchableOpacity
                      onPress={() => setSearchTerm("")}
                      style={{ marginLeft: 8 }}
                    >
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
              <Text
                style={[
                  styles.filterBoxNumber,
                  filterDurum === "" && styles.filterBoxNumberActive,
                ]}
              >
                {totalCount}
              </Text>
              <Text
                style={[
                  styles.filterBoxText,
                  filterDurum === "" && styles.filterBoxTextActive,
                ]}
              >
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
              <Text
                style={[
                  styles.filterBoxNumber,
                  filterDurum === "Aktif" && styles.filterBoxNumberActive,
                ]}
              >
                {activeCount}
              </Text>
              <Text
                style={[
                  styles.filterBoxText,
                  filterDurum === "Aktif" && styles.filterBoxTextActive,
                ]}
              >
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
              <Text
                style={[
                  styles.filterBoxNumber,
                  filterDurum === "Pasif" && styles.filterBoxNumberActive,
                ]}
              >
                {passiveCount}
              </Text>
              <Text
                style={[
                  styles.filterBoxText,
                  filterDurum === "Pasif" && styles.filterBoxTextActive,
                ]}
              >
                {t("status.passive")}
              </Text>
            </TouchableOpacity>
          </View>

          {filteredStudents.length > 0 ? (
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => handleViewDetails(item.id)}
                >
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardName}>{item.name}</Text>

                    <View style={styles.cardRow}>
                      <Phone size={16} color={theme.colors.text.muted} />
                      <Text style={styles.cardRowText}>{item.number}</Text>
                    </View>

                    <View style={styles.cardRow}>
                      <Calendar size={16} color={theme.colors.text.muted} />
                      <Text style={styles.cardRowText}>
                        {new Date(item.assessmentDate).toLocaleDateString(
                          dateLocale
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        item.aktif === "Aktif"
                          ? styles.statusBadgeActive
                          : styles.statusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={
                          item.aktif === "Aktif"
                            ? styles.statusTextActive
                            : styles.statusTextInactive
                        }
                      >
                        {item.aktif === "Aktif"
                          ? t("status.active")
                          : t("status.passive")}
                      </Text>
                    </View>

                    <View style={styles.detailPill}>
                      <Eye size={16} color={theme.colors.text.primary} />
                      <Text style={styles.detailPillText}>{t("detail")}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
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
  )
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

    detailPill: {
      marginTop: theme.spacing.sm,
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
      color: theme.colors.text.primary,
    },
    filterBoxTextActive: {
      fontSize: theme.fontSize.lg - 2,
      fontWeight: "700",
      color: theme.colors.text.primary,
    },
    filterBoxNumber: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    filterBoxNumberActive: {
      fontSize: 32,
      fontWeight: "700",
      color: theme.colors.text.primary,
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

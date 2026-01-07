import { themeui } from "@/constants/themeui";
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

type Student = {
  id: string;
  name: string;
  email: string;
  number: string;
  aktif: "Aktif" | "Pasif";
  assessmentDate: string;
};

export default function KayitlarScreen() {
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
  const router = useRouter();

  // Logo ve diğer iconlar için opacity animasyonu
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
    const q = query(studentsColRef(auth.currentUser?.uid!), orderBy("createdAt", "desc"));

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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ color: "#e5e7eb" }}>Öğrenciler yükleniyor...</Text>
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
      {/* TÜM EKRANI KAPLAYAN OVERLAY - Search açıkken her yere tıklayınca kapansın */}
      {searchActive && (
        <TouchableWithoutFeedback onPress={closeAnimatedSearch}>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "black",
              opacity: overlayOpacity,
              zIndex: 998,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      <View style={styles.container}>
        <View style={styles.headerWrapper}>
          <View style={styles.headerTopRow}>
            {/* LEFT : LOGO - Animasyonlu opacity */}
            <Animated.View
              style={[styles.leftHeaderArea, { opacity: iconsOpacity }]}
              pointerEvents={searchActive ? "none" : "auto"}
            >
              <Text style={styles.logoText}>ATHLETRACK</Text>
            </Animated.View>

            <View style={styles.rightHeaderArea}>
              {/* NOTIFICATION - Animasyonlu opacity */}
              <Animated.View style={{ opacity: iconsOpacity }}>
                <TouchableOpacity
                  onPress={() => setNotifOpen(!notifOpen)}
                  style={styles.titleIconWrapper}
                  disabled={searchActive}
                >
                  <Bell size={22} color="#f1f5f9" />
                </TouchableOpacity>
              </Animated.View>

              {/* SEARCH - Sadece ikonu burada */}
              {!searchActive && (
                <TouchableOpacity
                  onPress={openAnimatedSearch}
                  style={{
                    backgroundColor: "#1e293b",
                    height: 40,
                    width: 40,
                    alignItems: "center",
                    borderRadius: 99,
                    justifyContent: "center",
                    marginLeft: 6,
                  }}
                >
                  <Search size={22} color="#f1f5f9" />
                </TouchableOpacity>
              )}

              {/* PROFILE - Animasyonlu opacity */}
              <Animated.View style={{ opacity: iconsOpacity }}>
                <TouchableOpacity
                  style={styles.titleIconWrapper}
                  activeOpacity={0.7}
                  onPress={() => router.push("/profile")}
                  disabled={searchActive}
                >
                  <Users size={24} color="#60a5fa" />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* SEARCH BAR - headerTopRow'un içinde ama dışarıda (absolute) */}
            {searchActive && (
              <Animated.View
                style={{
                  position: "absolute",
                  left: 10,
                  right: 10,
                  top: 0,
                  height: 48,
                  backgroundColor: "#1e293b",
                  borderRadius: 99,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#475569",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                  zIndex: 999,
                  opacity: searchAnim,
                }}
              >
                {/* Geri Butonu */}
                <TouchableOpacity
                  onPress={closeAnimatedSearch}
                  style={{ marginRight: 8 }}
                >
                  <ArrowLeft size={20} color="#f1f5f9" />
                </TouchableOpacity>

                {/* TextInput */}
                <TextInput
                  placeholder="Öğrenci ara..."
                  placeholderTextColor="#94a3b8"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoFocus
                  style={{
                    flex: 1,
                    color: "#f1f5f9",
                    fontSize: 15,
                    fontWeight: "500",
                  }}
                />

                {/* AI Butonu - SAĞ TARAF */}
                <TouchableOpacity
                  onPress={() => {
                    // not: AI fonks buraa eklencek
                    console.log("AI butonu tıklandı");
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 99,
                    backgroundColor: "#7c3aed",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <Sparkles size={18} color="#fff" />
                </TouchableOpacity>

                {/* Temizle butonu - Sağda AI butonundan önce */}
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchTerm("")}
                    style={{ marginLeft: 8 }}
                  >
                    <XIcon size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}
          </View>
        </View>

        {/* LİSTE */}
        <View style={styles.listWrapper}>
          {/* FİLTRELER */}
          <View style={styles.filterBoxRow}>
            <TouchableOpacity
              onPress={() => setFilterDurum("")}
              style={[
                styles.filterBox,
                {
                  backgroundColor: "#0f172a",
                },
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
                Tümü
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterDurum("Aktif")}
              style={[
                styles.filterBox,
                {
                  backgroundColor: "#3a8b55",
                },
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
                Aktif
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterDurum("Pasif")}
              style={[
                styles.filterBox,
                {
                  backgroundColor: "#993131",
                },
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
                Pasif
              </Text>
            </TouchableOpacity>
          </View>

          {/* LİSTE */}
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
                      <Phone size={16} color="#9ca3af" />
                      <Text style={styles.cardRowText}>{item.number}</Text>
                    </View>

                    <View style={styles.cardRow}>
                      <Calendar size={16} color="#9ca3af" />
                      <Text style={styles.cardRowText}>
                        {new Date(item.assessmentDate).toLocaleDateString(
                          "tr-TR"
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
                        {item.aktif}
                      </Text>
                    </View>

                    <View style={styles.detailPill}>
                      <Eye size={16} color="#e5e7eb" />
                      <Text style={styles.detailPillText}>Detay</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Sonuç yok</Text>
              <Text style={styles.emptySubtitle}>
                Arama kriterlerine uygun öğrenci bulunamadı.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.fab} onPress={handleAddStudent}>
          <Plus size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeui.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: "#0A0F1A",
  },

  headerWrapper: {
    paddingHorizontal: themeui.spacing.lg,
    paddingTop: themeui.spacing.xs + 2,
    paddingBottom: themeui.spacing.sm,
    backgroundColor: themeui.colors.background,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: themeui.spacing.md,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  titleIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: themeui.spacing.sm,
    borderWidth: 1,
    borderColor: themeui.colors.border,
  },

  title: {
    fontSize: themeui.fontSize.title,
    fontWeight: "700",
    color: themeui.colors.text.primary,
  },

  subtitle: {
    fontSize: themeui.fontSize.sm,
    color: themeui.colors.text.secondary,
    marginTop: 2,
  },

  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -9,
    zIndex: 1,
  },

  searchInput: {
    backgroundColor: themeui.colors.background,
    borderWidth: 1,
    borderColor: themeui.colors.border,
    borderRadius: themeui.radius.pill,
    paddingVertical: themeui.spacing.sm - 2,
    paddingHorizontal: 40,
    fontSize: themeui.fontSize.md,
    color: themeui.colors.text.primary,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.xs,
    marginTop: 4,
    marginBottom: themeui.spacing.sm,
  },

  filterChip: {
    paddingHorizontal: themeui.spacing.md - 4,
    paddingVertical: themeui.spacing.xs,
    borderRadius: themeui.radius.pill,
    borderWidth: 1,
    borderColor: themeui.colors.border,
    backgroundColor: themeui.colors.background,
  },
  filterChipActive: {
    backgroundColor: themeui.colors.primary,
    borderColor: themeui.colors.primary,
  },

  filterChipText: {
    fontSize: themeui.fontSize.sm,
    color: themeui.colors.text.secondary,
  },
  filterChipTextActive: {
    color: themeui.colors.text.primary,
    fontWeight: "600",
  },

  statsRow: {
    flexDirection: "row",
    gap: themeui.spacing.sm,
    marginTop: 4,
  },

  statCard: {
    flex: 1,
    backgroundColor: themeui.colors.background,
    borderRadius: themeui.radius.lg,
    paddingVertical: themeui.spacing.sm,
    paddingHorizontal: themeui.spacing.sm,
    borderWidth: 1,
    borderColor: themeui.colors.border,
  },

  statValue: {
    fontSize: themeui.fontSize.xl,
    fontWeight: "700",
    color: themeui.colors.text.primary,
  },

  statLabel: {
    fontSize: themeui.fontSize.xs,
    color: themeui.colors.text.muted,
    marginTop: 2,
  },

  listWrapper: {
    flex: 1,
    backgroundColor: themeui.colors.background,
    borderTopLeftRadius: themeui.radius.xl,
    borderTopRightRadius: themeui.radius.xl,
    paddingTop: themeui.spacing.xs,
  },

  listContent: {
    paddingHorizontal: themeui.spacing.md,
    paddingBottom: 80,
    paddingTop: themeui.spacing.sm,
  },

  card: {
    backgroundColor: themeui.colors.surface,
    borderRadius: themeui.radius.lg,
    paddingVertical: themeui.spacing.sm + 2,
    paddingHorizontal: themeui.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: themeui.spacing.lg - 4,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: themeui.spacing.sm,
    ...themeui.shadow.soft,
  },

  cardLeft: { flex: 1 },

  cardName: {
    fontSize: themeui.fontSize.lg,
    fontWeight: "600",
    color: themeui.colors.text.primary,
    marginBottom: themeui.spacing.xs,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.xs,
    marginBottom: 3,
  },

  cardRowText: {
    fontSize: themeui.fontSize.md,
    color: themeui.colors.text.secondary,
  },

  cardRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  statusBadge: {
    paddingHorizontal: themeui.spacing.sm - 4,
    paddingVertical: themeui.spacing.xs - 2,
    borderRadius: themeui.radius.pill,
  },
  statusBadgeActive: { backgroundColor: themeui.colors.successSoft },
  statusBadgeInactive: { backgroundColor: themeui.colors.dangerSoft },

  statusTextActive: {
    fontSize: themeui.fontSize.xs,
    fontWeight: "600",
    color: themeui.colors.success,
  },
  statusTextInactive: {
    fontSize: themeui.fontSize.xs,
    fontWeight: "600",
    color: themeui.colors.danger,
  },

  detailPill: {
    marginTop: themeui.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.xs,
    paddingHorizontal: themeui.spacing.sm,
    paddingVertical: themeui.spacing.xs,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.background,
    borderWidth: 1,
    borderColor: themeui.colors.border,
  },
  detailPillText: {
    fontSize: themeui.fontSize.sm,
    color: themeui.colors.text.primary,
    fontWeight: "500",
  },

  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: themeui.fontSize.lg,
    fontWeight: "600",
    color: themeui.colors.text.primary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: themeui.fontSize.md - 1,
    color: themeui.colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: themeui.spacing.lg,
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },

  searchPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: themeui.colors.surface,
    paddingTop: 60,
    paddingHorizontal: themeui.spacing.md,
    paddingBottom: themeui.spacing.lg - 4,
    zIndex: 999,
    borderBottomWidth: 1,
    borderBottomColor: themeui.colors.border,
  },

  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.md,
  },

  filterBoxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: themeui.spacing.md,
    marginBottom: themeui.spacing.md - 2,
    marginTop: themeui.spacing.xs,
  },

  filterBox: {
    flex: 1,
    marginHorizontal: 4,
    height: 92,
    borderRadius: themeui.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#0A0F1A",
  },

  filterBoxActiveALL: {
    shadowColor: "#3B82F6",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },

  filterBoxActiveA: {
    shadowColor: "#82cd00",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },

  filterBoxActiveP: {
    shadowColor: "#cd6118ff",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 10,
  },

  filterBoxText: {
    fontSize: themeui.fontSize.sm,
    fontWeight: "600",
    color: "#EDEDED",
  },
  filterBoxTextActive: {
    fontSize: themeui.fontSize.lg - 2,
    fontWeight: "700",
    color: "#EDEDED",
  },
  filterBoxNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#EDEDED",
    marginBottom: 4,
  },
  filterBoxNumberActive: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  notifPanel: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "rgba(30,30,30,0.95)",
    borderRadius: themeui.radius.lg,
    paddingHorizontal: themeui.spacing.sm,
    paddingVertical: themeui.spacing.xs,
    width: 200,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 999,
  },

  notifItem: {
    paddingVertical: themeui.spacing.sm - 2,
  },

  logoText: {
    fontSize: themeui.fontSize.lg,
    fontWeight: "800",
    color: themeui.colors.primary,

  },

  notifText: {
    color: "#fff",
    fontSize: themeui.fontSize.lg - 2,
    fontWeight: "500",
  },

  leftHeaderArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.md - 4,
  },
  rightHeaderArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: themeui.spacing.xs,
    flex: 1,
  },
});
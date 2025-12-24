import { studentsColRef } from "@/services/firestorePaths";
import { useRouter } from "expo-router";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import {
  Bell,
  Calendar,
  Eye,
  Phone,
  Plus,
  Search,
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
  const searchWidth = useRef(new Animated.Value(0)).current;
  const [searchActive, setSearchActive] = useState(false);
  const safeSearch = searchTerm ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDurum, setFilterDurum] = useState<"" | "Aktif" | "Pasif">("");
  const totalCount = students.length;
  const activeCount = students.filter((s) => s.aktif === "Aktif").length;
  const passiveCount = students.filter((s) => s.aktif === "Pasif").length;
  const [notifOpen, setNotifOpen] = useState(false);

  const router = useRouter();

  const openAnimatedSearch = () => {
    setSearchActive(true);
    Animated.timing(searchWidth, {
      toValue: 200,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const closeAnimatedSearch = () => {
    Animated.timing(searchWidth, {
      toValue: 40,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      setSearchActive(false);
      setSearchTerm("");
    });
  };

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
    const q = query(studentsColRef(), orderBy("createdAt", "desc"));

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
      <View style={styles.container}>
        <View style={styles.headerWrapper}>
  <View style={styles.headerTopRow}>

    {/* LEFT : LOGO */}
    <View style={styles.leftHeaderArea}>
      <Text style={styles.logoText}>ATHLETRACK</Text>
    </View>

    <View style={styles.rightHeaderArea}>
      {/* NOTIFICATION */}
      <TouchableOpacity
        onPress={() => setNotifOpen(!notifOpen)}
        style={styles.titleIconWrapper}
      >
        <Bell size={22} color="#f1f5f9" />
      </TouchableOpacity>

      {/* SEARCH */}
      {!searchActive && (
        <TouchableOpacity
          onPress={openAnimatedSearch}
          style={{
            backgroundColor: "#1e293b",
            height: 40,
            paddingHorizontal: 10,
            alignItems: "center",
            borderRadius: 99,
            justifyContent: "center",
          }}
        >
          <Search size={22} color="#f1f5f9" />
        </TouchableOpacity>
      )}

      {searchActive && (
        <Animated.View
          style={{
            width: searchWidth,
            height: 40,
            backgroundColor: "#1e293b",
            borderRadius: 99,
            paddingHorizontal: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextInput
            placeholder="Ara..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{
              color: "#f1f5f9",
              flex: 1,
            }}
            autoFocus
          />

          <TouchableOpacity onPress={closeAnimatedSearch}>
            <XIcon size={18} color="#f1f5f9" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* PROFILE */}
      <TouchableOpacity
        style={styles.titleIconWrapper}
        activeOpacity={0.7}
        onPress={() => router.push("/profile")}
      >
        <Users size={24} color="#60a5fa" />
      </TouchableOpacity>
    </View>
          </View>
        </View>

        {/* LİSTE */}
        <TouchableWithoutFeedback onPress={closeAnimatedSearch}>
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
        </TouchableWithoutFeedback>

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
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    backgroundColor: "#0A0F1A",
  },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8, // daha sıkı
    paddingBottom: 10,
    backgroundColor: "#020617",
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0b1120",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
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
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 40,
    fontSize: 14,
    color: "#e5e7eb",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
  },
  filterChipActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  filterChipText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  filterChipTextActive: {
    color: "#f9fafb",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#020617",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  listWrapper: {
    flex: 1,
    backgroundColor: "#020617",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    paddingTop: 12,

  },
  card: {
    backgroundColor: "#0f172a", // premium surface
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 16, // daha fazla spacing
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  cardLeft: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f9fafb",
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  cardRowText: {
    fontSize: 14,
    color: "#cbd5e1",
  },

  cardRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeActive: {
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  statusBadgeInactive: {
    backgroundColor: "rgba(248,113,113,0.18)",
  },
  statusTextActive: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
  },
  statusTextInactive: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EF4444",
  },
  detailPill: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  detailPillText: {
    fontSize: 12,
    color: "#e5e7eb",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#38bdf8",
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
    backgroundColor: "#0f172a",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    zIndex: 999,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },

  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterBoxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
    marginTop: 6,
  },

  filterBox: {
    flex: 1,
    marginHorizontal: 4,
    height: 92,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#0A0F1A",
  },

  filterBoxActiveALL: {
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    zIndex: -5,
    elevation: 10,
  },
  filterBoxActiveA: {
    shadowColor: "#82cd00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    zIndex: -5,
    elevation: 10,
  },
    filterBoxActiveP: {
    shadowColor: "#cd6118ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    zIndex: -5,
    elevation: 10,
  },

  filterBoxText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EDEDED",
  },

  filterBoxTextActive: {
    fontSize: 16,
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
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: 200,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 999,
  },

  notifItem: {
    paddingVertical: 10,
  },
logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#60a5fa",
  },
  notifText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  leftHeaderArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  rightHeaderArea: {
    width: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  
});

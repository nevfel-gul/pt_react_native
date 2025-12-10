import { auth } from "@/services/firebase";
import { signOut } from "@firebase/auth";
import { useRouter } from "expo-router";
import { Calendar, Eye, Phone, Plus, Search, Users } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Student = {
  id: string;
  name: string;
  email: string;
  number: string;
  aktif: "Aktif" | "Pasif";
  assessmentDate: string;
};

// Dummy veri (şimdilik)
const DUMMY_STUDENTS: Student[] = [
  {
    id: "1",
    name: "Ayşe Yılmaz",
    email: "ayse@example.com",
    number: "0555 111 22 33",
    aktif: "Aktif",
    assessmentDate: "2025-12-01T10:00:00.000Z",
  },
  {
    id: "2",
    name: "Mehmet Demir",
    email: "mehmet@example.com",
    number: "0555 222 33 44",
    aktif: "Pasif",
    assessmentDate: "2025-11-20T12:00:00.000Z",
  },
  {
    id: "3",
    name: "Zehra Kaya",
    email: "zehra@example.com",
    number: "0555 333 44 55",
    aktif: "Aktif",
    assessmentDate: "2025-10-15T09:30:00.000Z",
  },
];

export default function KayitlarScreen() {
  const [students] = useState<Student[]>(DUMMY_STUDENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDurum, setFilterDurum] = useState<"" | "Aktif" | "Pasif">("");

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.aktif === "Aktif").length;
  const pasifStudents = totalStudents - activeStudents;
  const router = useRouter();
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDurum = !filterDurum || student.aktif === filterDurum;

      return matchesSearch && matchesDurum;
    });
  }, [students, searchTerm, filterDurum]);

  const handleViewDetails = (studentId: string) => {
    console.log("Detay tıklandı:", studentId);
    // buraya navigation / router bağlayabilirsin
  };

  const handleAddStudent = () => {
    console.log("Yeni öğrenci ekle tıklandı");
    // navigation / router
  };

  const handleSignout = async () => {
    console.log("Çıkış yap tıklandı");


    await signOut(auth);
    router.replace("/login");
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Üst bölüm (header + filtre + istatistik) */}
        <View style={styles.headerWrapper}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <View style={styles.titleIconWrapper}>
                  <Users size={24} color="#60a5fa" />
                </View>
                <View>
                  <Text style={styles.title}>Öğrenci Kayıtları</Text>
                  <Text style={styles.subtitle}>
                    Kayıtlarını yönettiğin panel.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.exitButton} onPress={handleSignout}>
              <Text style={styles.exitButtonText}>Çıkış</Text>
            </TouchableOpacity>
          </View>

          {/* Arama */}
          <View style={styles.searchContainer}>
            <Search size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              placeholder="Ad, soyad veya email ara..."
              placeholderTextColor="#64748b"
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
            />
          </View>

          {/* Filtre chip'leri */}
          <View style={styles.filterRow}>
            <FilterChip
              label="Tümü"
              active={filterDurum === ""}
              onPress={() => setFilterDurum("")}
            />
            <FilterChip
              label="Aktif"
              active={filterDurum === "Aktif"}
              onPress={() => setFilterDurum("Aktif")}
            />
            <FilterChip
              label="Pasif"
              active={filterDurum === "Pasif"}
              onPress={() => setFilterDurum("Pasif")}
            />
          </View>

          {/* İstatistik kartları */}
          <View style={styles.statsRow}>
            <StatCard label="Toplam" value={totalStudents} color="#38bdf8" />
            <StatCard label="Aktif" value={activeStudents} color="#22c55e" />
            <StatCard label="Pasif" value={pasifStudents} color="#a855f7" />
          </View>
        </View>

        {/* Liste alanı */}
        <View style={styles.listWrapper}>
          {filteredStudents.length > 0 ? (
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.8}
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

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab} onPress={handleAddStudent}>
          <Plus size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterChip,
        active && styles.filterChipActive,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
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
  exitButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#dc2626",
    marginLeft: 12,
  },
  exitButtonText: {
    color: "#f9fafb",
    fontSize: 13,
    fontWeight: "600",
  },
  searchContainer: {
    marginTop: 4,
    marginBottom: 10,
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
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 10,
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
    fontSize: 13,
    color: "#9ca3af",
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
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  statusBadgeInactive: {
    backgroundColor: "rgba(248,113,113,0.15)",
  },
  statusTextActive: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4ade80",
  },
  statusTextInactive: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fca5a5",
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
});

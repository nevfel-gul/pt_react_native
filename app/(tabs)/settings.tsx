import { themeui } from "@/constants/themeui";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  Bell,
  ChevronRight,
  Globe,
  Info,
  LogOut,
  Moon,
  Palette,
  Shield,
  Smartphone
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../services/firebase";

type TabKey = "preferences" | "security";

export default function SettingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("preferences");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [saveLogin, setSaveLogin] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const handleBack = () => router.back();


  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  // -------------------------
  // TABS
  // -------------------------
  const renderTabButton = (key: TabKey, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === key;
    return (
      <TouchableOpacity
        onPress={() => setActiveTab(key)}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
      >
        <View style={styles.tabIcon}>{icon}</View>
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // -------------------------
  // SECTION TITLE
  // -------------------------
  const Section = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );

  // -------------------------
  // SETTING ROW
  // -------------------------
  const SettingRow = ({
    label,
    subtitle,
    right,
    onPress,
    isLast,
    showChevron = false,
  }: {
    label: string;
    subtitle?: string;
    right?: React.ReactNode;
    onPress?: () => void;
    isLast?: boolean;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.settingRow, isLast && styles.settingRowLast]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>

      {right}

      {showChevron ? (
        <ChevronRight size={16} color="#64748b" style={{ marginLeft: 6 }} />
      ) : null}
    </TouchableOpacity>
  );


  // -------------------------
  // PREFERENCES TAB
  // -------------------------
  const renderPreferencesTab = () => (
    <>
      <Section title="Tercihler" icon={<Palette size={18} color="#a78bfa" />} />

      <View style={styles.card}>
        <SettingRow
          label="Karanlık Tema"
          subtitle="Gece modunu aç/kapat"
          right={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#1e293b", true: "#1d4ed8" }}
              thumbColor={darkMode ? "#02268a" : "#e5e7eb"}
            />
          }
        />
        <SettingRow
          label="Dil"
          subtitle="Uygulama dili"
          right={<Text style={styles.settingValueText}>Türkçe</Text>}
          onPress={() => { }}
        />

        <SettingRow
          label="Bölge"
          subtitle="Tarih & saat formatı"
          right={<Text style={styles.settingValueText}>Türkiye</Text>}
          isLast={true}
        />
      </View>

      <Section title="Bildirimler" icon={<Bell size={18} color="#facc15" />} />

      <View style={styles.card}>
        <SettingRow
          label="Push Bildirimleri"
          subtitle="Seans hatırlatmaları, yeni mesajlar"
          right={
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: "#1e293b", true: "#1d4ed8" }}
              thumbColor={pushEnabled ? "#02268a" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label="E-posta Bildirimleri"
          subtitle="Haftalık özet raporlar"
          right={
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: "#1e293b", true: "#1d4ed8" }}
              thumbColor={emailEnabled ? "#02268a" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label="Titreşim & Haptik"
          subtitle="Dokunsal geri bildirim"
          right={
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: "#1e293b", true: "#1d4ed8" }}
              thumbColor={hapticEnabled ? "#02268a" : "#e5e7eb"}
            />
          }
          isLast={true}
        />
      </View>

      <Section title="Uygulama" icon={<Smartphone size={18} color="#38bdf8" />} />

      <View style={styles.card}>
        <SettingRow
          label="Takvim Görünümü"
          subtitle="Varsayılan görünüm"
          right={<Text style={styles.settingValueText}>Haftalık</Text>}
        />

        <SettingRow
          label="Saat Formatı"
          subtitle="12/24 saat"
          right={<Text style={styles.settingValueText}>24 saat</Text>}
        />

        <SettingRow
          label="Önbelleği Temizle"
          subtitle="Geçici verileri sil"
          right={<Text style={styles.badgeMuted}>Temizle</Text>}
          isLast={true}
        />
      </View>
    </>
  );

  // -------------------------
  // SECURITY TAB
  // -------------------------
  const renderSecurityTab = () => (
    <>
      <Section title="Güvenlik" icon={<Shield size={18} color="#f97316" />} />

      <View style={styles.card}>
        <SettingRow
          label="Oturumu Hatırla"
          subtitle="Bu cihazda girişimi kaydet"
          right={
            <Switch
              value={saveLogin}
              onValueChange={setSaveLogin}
              trackColor={{ false: "#1e293b", true: "#1d4ed8" }}
              thumbColor={saveLogin ? "#02268a" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label="İki Aşamalı Doğrulama"
          subtitle="Ek güvenlik katmanı"
          right={
            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              trackColor={{ false: "#1e293b", true: "#1d4ed8" }}
              thumbColor={twoFactor ? "#02268a" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label="Şifre Değiştir"
          subtitle="Giriş şifreni güncelle"
          right={<Text style={styles.badgeMuted}>Değiştir</Text>}
          isLast={true}

        />
      </View>

      <Section title="Hesap" icon={<Globe size={18} color="#22c55e" />} />

      <View style={styles.card}>
        <SettingRow
          label="Giriş Yapılan Cihazlar"
          subtitle="Aktif oturumlar"
          right={<Text style={styles.settingValueText}>3 cihaz</Text>}
        />

        <SettingRow
          label="Veri Dışa Aktarma"
          subtitle="Öğrenci kayıtlarını indir"
          right={<Text style={styles.badgeMuted}>JSON</Text>}
        />

        <SettingRow
          label="Hesabı Sil"
          subtitle="Geri alınamaz işlem"
          right={<Text style={[styles.badgeMuted, { color: "#f97316" }]}>Sil</Text>}
          isLast={true}
        />
      </View>

      <View style={styles.card}>
        <Section title="Uygulama Hakkında" icon={<Info size={18} color="#6b7280" />} />

        <SettingRow label="Sürüm" right={<Text style={styles.settingValueText}>v0.0.0</Text>} />
        <SettingRow label="Lisans" right={<Text style={styles.settingValueText}>PT Lab</Text>} />
        <SettingRow label="Gizlilik Politikası" right={<Text style={styles.badgeMuted}>Aç</Text>} isLast={true} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => { handleLogout(); }}>
        <LogOut size={18} color="#fca5a5" />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "preferences":
        return renderPreferencesTab();
      case "security":
        return renderSecurityTab();
    }
  };

  // -------------------------
  // UI ROOT
  // -------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Ayarlar</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* TABS */}
          <View style={styles.tabsRow}>
            {renderTabButton("preferences", "Tercihler", <Moon size={16} color="#bfdbfe" />)}
            {renderTabButton("security", "Güvenlik", <Shield size={16} color="#bfdbfe" />)}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {renderActiveTab()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// -------------------------
// STYLES
// -------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeui.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: themeui.colors.background,
  },

  /* HEADER */
  header: {
    paddingHorizontal: themeui.spacing.md,
    paddingTop: themeui.spacing.sm + 4,
    paddingBottom: themeui.spacing.sm - 4,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: themeui.spacing.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.xs,
    paddingHorizontal: themeui.spacing.sm,
    paddingVertical: themeui.spacing.xs,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.surface,
    borderWidth: 1,
    borderColor: themeui.colors.border,
  },
  backButtonText: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.sm,
  },
  headerTitle: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.lg + 2,
    fontWeight: "700",
  },

  /* TABS */
  tabsRow: {
    flexDirection: "row",
    backgroundColor: themeui.colors.surface,
    borderRadius: themeui.radius.pill,
    borderWidth: 1,
    borderColor: themeui.colors.border,
    padding: themeui.spacing.xs - 2,
    gap: themeui.spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: themeui.spacing.xs,
    borderRadius: themeui.radius.pill,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: themeui.spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: "rgba(96,165,250,0.25)",
    borderWidth: 1,
    borderColor: themeui.colors.primary,
  },
  tabIcon: { marginTop: 1 },
  tabText: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.sm,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#bfdbfe",
    textDecorationColor: themeui.colors.success,
    textDecorationStyle: "solid",
  },

  /* CARDS */
  card: {
    marginHorizontal: themeui.spacing.md,
    marginBottom: themeui.spacing.sm,
    backgroundColor: themeui.colors.surface,
    borderRadius: themeui.radius.lg,
    borderWidth: 1,
    borderColor: themeui.colors.border,
    padding: themeui.spacing.md,
    ...themeui.shadow.soft,
  },

  sectionHeader: {
    marginHorizontal: themeui.spacing.md,
    marginTop: themeui.spacing.sm,
    marginBottom: themeui.spacing.xs,
  },
  sectionTitle: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.md,
    fontWeight: "600",
  },

  /* PROFILE */
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: themeui.spacing.md,
    marginBottom: themeui.spacing.sm,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: themeui.colors.surface,
    fontSize: 22,
    fontWeight: "800",
  },
  profileName: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.lg + 2,
    fontWeight: "700",
  },
  profileEmail: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.sm,
  },
  profileTag: {
    color: themeui.colors.primary,
    fontSize: themeui.fontSize.xs,
    marginTop: 2,
  },

  profileMetaRow: {
    flexDirection: "row",
    marginTop: themeui.spacing.xs,
    justifyContent: "space-between",
  },
  profileMetaItem: {
    flex: 1,
    alignItems: "center",
  },
  profileMetaLabel: {
    color: themeui.colors.text.muted,
    fontSize: themeui.fontSize.xs,
  },
  profileMetaValue: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.md - 1,
    fontWeight: "600",
    marginTop: 2,
  },

  /* SETTING ROW */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: themeui.spacing.sm - 2,
    borderBottomWidth: 1,
    borderBottomColor: themeui.colors.border,
    gap: themeui.spacing.xs,
  },
  settingLabel: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.md - 1,
    fontWeight: "500",
  },
  settingSubtitle: {
    color: themeui.colors.text.muted,
    fontSize: themeui.fontSize.xs,
    marginTop: 2,
  },
  settingValueText: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.sm,
    fontWeight: "500",
  },

  /* BADGE */
  badgeMuted: {
    paddingHorizontal: themeui.spacing.sm - 2,
    paddingVertical: themeui.spacing.xs - 2,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.surface,
    borderWidth: 1,
    borderColor: themeui.colors.border,
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.xs,
  },

  /* LOGOUT */
  logoutButton: {
    marginHorizontal: themeui.spacing.md,
    marginTop: themeui.spacing.md,
    paddingVertical: themeui.spacing.sm,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.dangerSoft,
    borderWidth: 1,
    borderColor: themeui.colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: themeui.spacing.sm - 2,
  },
  logoutText: {
    color: themeui.colors.danger,
    fontSize: themeui.fontSize.md,
    fontWeight: "700",
  },

  settingRowLast: {
    borderBottomWidth: 0,
    paddingBottom: themeui.spacing.xs,
  },
});

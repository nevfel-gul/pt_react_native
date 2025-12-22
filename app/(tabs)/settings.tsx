import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  ArrowLeft,
  Bell,
  Globe,
  Info,
  LogOut,
  Moon,
  Palette,
  Shield,
  Smartphone,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../services/firebase";

type TabKey = "profile" | "preferences" | "security";

export default function SettingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

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
  }: {
    label: string;
    subtitle?: string;
    right?: React.ReactNode;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      style={styles.settingRow}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );

  // -------------------------
  // TAB SCREENS
  // -------------------------
  const renderProfileTab = () => (
    <>
      <Section title="Profil" icon={<User size={18} color="#60a5fa" />} />

      {/* PROFILE CARD */}
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>Y</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Yağmur Öztürk</Text>
            <Text style={styles.profileEmail}>yagmur.ozturk@example.com</Text>
            <Text style={styles.profileTag}>
              PT • Reformer Pilates • Online Coaching
            </Text>
          </View>
        </View>

        <View style={styles.profileMetaRow}>
          <View style={styles.profileMetaItem}>
            <Text style={styles.profileMetaLabel}>Üyelik</Text>
            <Text style={styles.profileMetaValue}>Pro</Text>
          </View>
          <View style={styles.profileMetaItem}>
            <Text style={styles.profileMetaLabel}>Müşteri</Text>
            <Text style={styles.profileMetaValue}>32 aktif</Text>
          </View>
          <View style={styles.profileMetaItem}>
            <Text style={styles.profileMetaLabel}>Kayıt</Text>
            <Text style={styles.profileMetaValue}>2024</Text>
          </View>
        </View>
      </View>

      {/* USER INFO SETTINGS */}
      <View style={styles.card}>
        <SettingRow
          label="İsim"
          subtitle="Uygulamada gözükecek adın"
          right={<Text style={styles.settingValueText}>Yağmur Öztürk</Text>}
        />
        <SettingRow
          label="Kullanıcı Adı"
          subtitle="Profil linkinde kullanılacak"
          right={<Text style={styles.settingValueText}>@pt.yagmur</Text>}
        />
        <SettingRow
          label="E-posta"
          subtitle="Giriş ve bildirimler için"
          right={<Text style={styles.settingValueText}>yagmur.ozturk@example.com</Text>}
        />
        <SettingRow
          label="Telefon"
          subtitle="Müşteri iletişimi için"
          right={<Text style={styles.settingValueText}>+90 5xx xxx xx xx</Text>}
        />
      </View>

      {/* BIO */}
      <View style={styles.card}>
        <SettingRow
          label="Biyografi"
          subtitle="Kendini kısaca tanıt"
          right={<Text style={styles.badgeMuted}>Düzenle</Text>}
        />
        <SettingRow
          label="Uzmanlık Alanların"
          subtitle="Reformer, Fonksiyonel Antrenman..."
          right={<Text style={styles.badgeMuted}>Düzenle</Text>}
        />
        <SettingRow
          label="İşletme Adı"
          subtitle="Müşterilerin göreceği marka"
          right={<Text style={styles.settingValueText}>PT Lab</Text>}
        />
      </View>
    </>
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
        />

        <SettingRow
          label="Bölge"
          subtitle="Tarih & saat formatı"
          right={<Text style={styles.settingValueText}>Türkiye</Text>}
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
        />
      </View>

      <View style={styles.card}>
        <Section title="Uygulama Hakkında" icon={<Info size={18} color="#6b7280" />} />

        <SettingRow label="Sürüm" right={<Text style={styles.settingValueText}>v0.0.0</Text>} />
        <SettingRow label="Lisans" right={<Text style={styles.settingValueText}>PT Lab</Text>} />
        <SettingRow label="Gizlilik Politikası" right={<Text style={styles.badgeMuted}>Aç</Text>} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => { handleLogout(); }}>
        <LogOut size={18} color="#fca5a5" />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "profile":
        return renderProfileTab();
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
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={18} color="#f1f5f9" />
              <Text style={styles.backButtonText}>Geri</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Ayarlar</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* TABS */}
          <View style={styles.tabsRow}>
            {renderTabButton("profile", "Profil", <User size={16} color="#bfdbfe" />)}
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
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },

  /* HEADER */
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  backButtonText: {
    color: "#f1f5f9",
    fontSize: 13,
  },
  headerTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },

  /* TABS */
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 4,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "rgba(96,165,250,0.25)",
    borderWidth: 1,
    borderColor: "#60a5fa",
  },
  tabIcon: {
    marginTop: 1,
  },
  tabText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#bfdbfe",
  textDecorationLine: "underline",
    textDecorationColor: "#22C55E",
    textDecorationStyle: "solid",


  },

  /* CARDS */
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 16,
  },

  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "600",
  },

  /* PROFILE */
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#60a5fa",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
  },
  profileName: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    color: "#94a3b8",
    fontSize: 12,
  },
  profileTag: {
    color: "#60a5fa",
    fontSize: 11,
    marginTop: 2,
  },

  profileMetaRow: {
    flexDirection: "row",
    marginTop: 8,
    justifyContent: "space-between",
  },
  profileMetaItem: {
    flex: 1,
    alignItems: "center",
  },
  profileMetaLabel: {
    color: "#64748b",
    fontSize: 11,
  },
  profileMetaValue: {
    color: "#f1f5f9",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },

  /* SETTING ROW */
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    gap: 8,
  },
  settingLabel: {
    color: "#f1f5f9",
    fontSize: 13,
    fontWeight: "500",
  },
  settingSubtitle: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  settingValueText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
  },

  /* BADGE */
  badgeMuted: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    color: "#f1f5f9",
    fontSize: 11,
  },

  /* LOGOUT */
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "rgba(127,29,29,0.35)",
    borderWidth: 1,
    borderColor: "#7f1d1d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logoutText: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "700",
  },
});

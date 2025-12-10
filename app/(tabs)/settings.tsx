// app/(tabs)/settings.tsx

import { useRouter } from "expo-router";
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

type TabKey = "profile" | "preferences" | "security";

export default function SettingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Tamamen KOLPA state'ler 😄
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [saveLogin, setSaveLogin] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const renderTabButton = (key: TabKey, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === key;
    return (
      <TouchableOpacity
        onPress={() => setActiveTab(key)}
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
      >
        <View style={styles.tabIcon}>{icon}</View>
        <Text
          style={[
            styles.tabText,
            isActive && styles.tabTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const Section = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );

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
        {subtitle ? (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </TouchableOpacity>
  );

  const renderProfileTab = () => (
    <>
      <Section
        title="Profil"
        icon={<User size={18} color="#60a5fa" />}
      />

      {/* Profil kartı - full kolpa */}
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>Y</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Yağmur Öztürk</Text>
            <Text style={styles.profileEmail}>yagmur.ozturk@example.com</Text>
            <Text style={styles.profileTag}>PT • Reformer Pilates • Online Coaching</Text>
          </View>
        </View>

        <View style={styles.profileMetaRow}>
          <View style={styles.profileMetaItem}>
            <Text style={styles.profileMetaLabel}>Üyelik</Text>
            <Text style={styles.profileMetaValue}>Pro (kolpa)</Text>
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

      <View style={styles.card}>
        <SettingRow
          label="Biyografi"
          subtitle="Kendini kısaca tanıt (ör: Uzman Reformer Pilates eğitmeni...)"
          right={<Text style={styles.badgeMuted}>Düzenle</Text>}
        />
        <SettingRow
          label="Uzmanlık Alanların"
          subtitle="Reformer, Fonksiyonel antrenman, Postür analizi..."
          right={<Text style={styles.badgeMuted}>Düzenle</Text>}
        />
        <SettingRow
          label="İşletme Adı"
          subtitle="Müşterilerin göreceği marka ismi"
          right={<Text style={styles.settingValueText}>PT Lab (kolpa)</Text>}
        />
      </View>
    </>
  );

  const renderPreferencesTab = () => (
    <>
      <Section
        title="Tercihler"
        icon={<Palette size={18} color="#a78bfa" />}
      />

      <View style={styles.card}>
        <SettingRow
          label="Karanlık Tema"
          subtitle="Gece modunu aç/kapat"
          right={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              thumbColor={darkMode ? "#02268a" : "#e5e7eb"}
              trackColor={{ false: "#e5e7eb", true: "#1d4ed8" }}
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
          subtitle="Haftanın ilk günü, tarih formatı vb."
          right={<Text style={styles.settingValueText}>Türkiye</Text>}
        />
      </View>

      <Section
        title="Bildirimler"
        icon={<Bell size={18} color="#facc15" />}
      />

      <View style={styles.card}>
        <SettingRow
          label="Push Bildirimleri"
          subtitle="Seans hatırlatmaları, yeni mesajlar"
          right={
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              thumbColor={pushEnabled ? "#02268a" : "#e5e7eb"}
              trackColor={{ false: "#e5e7eb", true: "#1d4ed8" }}

            />
          }
        />
        <SettingRow
          label="E-posta Bildirimleri"
          subtitle="Özet raporlar, haftalık istatistikler"
          right={
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              thumbColor={emailEnabled ? "#02268a" : "#e5e7eb"}
              trackColor={{ false: "#e5e7eb", true: "#1d4ed8" }}

            />
          }
        />
        <SettingRow
          label="Titreşim & Haptik"
          subtitle="Buton ve etkileşim geri bildirimi"
          right={
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              thumbColor={hapticEnabled ? "#02268a" : "#e5e7eb"}
              trackColor={{ false: "#e5e7eb", true: "#1d4ed8" }}

            />
          }
        />
      </View>

      <Section
        title="Uygulama"
        icon={<Smartphone size={18} color="#38bdf8" />}
      />

      <View style={styles.card}>
        <SettingRow
          label="Takvim Görünümü"
          subtitle="Varsayılan görünüm"
          right={<Text style={styles.settingValueText}>Haftalık</Text>}
        />
        <SettingRow
          label="Saat Formatı"
          subtitle="12 / 24 saat"
          right={<Text style={styles.settingValueText}>24 saat</Text>}
        />
        <SettingRow
          label="Önbelleği Temizle"
          subtitle="Geçici verileri sil (kolpa)"
          right={<Text style={styles.badgeMuted}>Temizle</Text>}
        />
      </View>
    </>
  );

  const renderSecurityTab = () => (
    <>
      <Section
        title="Güvenlik"
        icon={<Shield size={18} color="#f97316" />}
      />

      <View style={styles.card}>
        <SettingRow
          label="Oturumu Hatırla"
          subtitle="Bu cihazda girişimi kaydet"
          right={
            <Switch
              value={saveLogin}
              onValueChange={setSaveLogin}
              thumbColor={saveLogin ? "#02268a" : "#e5e7eb"}
              trackColor={{ false: "#e5e7eb", true: "#1d4ed8" }}

            />
          }
        />
        <SettingRow
          label="İki Aşamalı Doğrulama"
          subtitle="Ek güvenlik katmanı (kolpa)"
          right={
            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              thumbColor={twoFactor ? "#02268a" : "#e5e7eb"}
              trackColor={{ false: "#e5e7eb", true: "#1d4ed8" }}
            />
          }
        />
        <SettingRow
          label="Şifreyi Değiştir"
          subtitle="Giriş şifreni güncelle"
          right={<Text style={styles.badgeMuted}>Değiştir</Text>}
        />
      </View>

      <Section
        title="Hesap"
        icon={<Globe size={18} color="#22c55e" />}
      />

      <View style={styles.card}>
        <SettingRow
          label="Giriş Yapılan Cihazlar"
          subtitle="Aktif oturumları görüntüle (kolpa)"
          right={<Text style={styles.settingValueText}>3 cihaz</Text>}
        />
        <SettingRow
          label="Veri Dışa Aktarma"
          subtitle="Öğrenci kayıtlarını indir (kolpa)"
          right={<Text style={styles.badgeMuted}>JSON</Text>}
        />
        <SettingRow
          label="Hesabı Sil"
          subtitle="Geri alınamaz bir işlemdir (ama şu an full kolpa)"
          right={<Text style={[styles.badgeMuted, { color: "#f97316" }]}>Sil</Text>}
        />
      </View>

      <View style={styles.card}>
        <Section
          title="Uygulama Hakkında"
          icon={<Info size={18} color="#6b7280" />}
        />
        <SettingRow
          label="Sürüm"
          right={<Text style={styles.settingValueText}>v0.0.0-kolpa</Text>}
        />
        <SettingRow
          label="Lisans"
          right={<Text style={styles.settingValueText}>PT Lab Internal</Text>}
        />
        <SettingRow
          label="Gizlilik Politikası"
          right={<Text style={styles.badgeMuted}>Görüntüle</Text>}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <LogOut size={18} color="#fecaca" />
        <Text style={styles.logoutText}>Çıkış Yap (kolpa)</Text>
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
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={18} color="#e5e7eb" />
              <Text style={styles.backButtonText}>Geri</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ayarlar</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* İç sekmeler (Profil / Tercihler / Güvenlik) */}
          <View style={styles.tabsRow}>
            {renderTabButton("profile", "Profil", <User size={16} color="#e5e7eb" />)}
            {renderTabButton("preferences", "Tercihler", <Moon size={16} color="#e5e7eb" />)}
            {renderTabButton("security", "Güvenlik", <Shield size={16} color="#e5e7eb" />)}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {renderActiveTab()}
        </ScrollView>
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
    backgroundColor: "#020617",
  },
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  backButtonText: {
    color: "#e5e7eb",
    fontSize: 13,
  },
  headerTitle: {
    color: "#f9fafb",
    fontSize: 18,
    fontWeight: "700",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#020617",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "#1d4ed8",
  },
  tabIcon: {
    marginTop: 1,
  },
  tabText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#f9fafb",
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#020617",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 14,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#f9fafb",
    fontSize: 22,
    fontWeight: "700",
  },
  profileName: {
    color: "#f9fafb",
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    color: "#9ca3af",
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
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    gap: 8,
  },
  settingLabel: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "500",
  },
  settingSubtitle: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  settingValueText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "500",
  },
  badgeMuted: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
    color: "#e5e7eb",
    fontSize: 11,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#7f1d1d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(127,29,29,0.3)",
  },
  logoutText: {
    color: "#fecaca",
    fontSize: 13,
    fontWeight: "600",
  },
});

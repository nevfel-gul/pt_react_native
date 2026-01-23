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
  Smartphone,
} from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
      <Section
        title={t("settings.section.preferences")}
        icon={<Palette size={18} color="#a78bfa" />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.preference.darkTheme")}
          subtitle={t("settings.preference.darkTheme.sub")}
          right={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#1e293b", true: "#60a5fa" }}
              thumbColor={darkMode ? "#e5e7eb" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label={t("settings.preference.language")}
          subtitle={t("settings.preference.language.sub")}
          right={
            <Text style={styles.settingValueText}>{t("settings.value.turkish")}</Text>
          }
          onPress={() => { }}
        />

        <SettingRow
          label={t("settings.preference.region")}
          subtitle={t("settings.preference.region.sub")}
          right={<Text style={styles.settingValueText}>{t("settings.value.turkey")}</Text>}
          isLast={true}
        />
      </View>

      <Section
        title={t("settings.section.notifications")}
        icon={<Bell size={18} color="#facc15" />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.notifications.push")}
          subtitle={t("settings.notifications.push.sub")}
          right={
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: "#1e293b", true: "#60a5fa" }}
              thumbColor={pushEnabled ? "#e5e7eb" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label={t("settings.notifications.email")}
          subtitle={t("settings.notifications.email.sub")}
          right={
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: "#1e293b", true: "#60a5fa" }}
              thumbColor={emailEnabled ? "#e5e7eb" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label={t("settings.notifications.haptic")}
          subtitle={t("settings.notifications.haptic.sub")}
          right={
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: "#1e293b", true: "#60a5fa" }}
              thumbColor={hapticEnabled ? "#e5e7eb" : "#e5e7eb"}
            />
          }
          isLast={true}
        />
      </View>

      <Section
        title={t("settings.section.app")}
        icon={<Smartphone size={18} color="#38bdf8" />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.app.calendarView")}
          subtitle={t("settings.app.calendarView.sub")}
          right={<Text style={styles.settingValueText}>{t("settings.value.weekly")}</Text>}
        />

        <SettingRow
          label={t("settings.app.timeFormat")}
          subtitle={t("settings.app.timeFormat.sub")}
          right={<Text style={styles.settingValueText}>{t("settings.value.24h")}</Text>}
        />

        <SettingRow
          label={t("settings.app.clearCache")}
          subtitle={t("settings.app.clearCache.sub")}
          right={<Text style={styles.badgeMuted}>{t("settings.action.delete")}</Text>}
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
      <Section title={t("settings.section.security")} icon={<Shield size={18} color="#f97316" />} />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.security.rememberSession")}
          subtitle={t("settings.security.rememberSession.sub")}
          right={
            <Switch
              value={saveLogin}
              onValueChange={setSaveLogin}
              trackColor={{ false: "#1e293b", true: "#60a5fa" }}
              thumbColor={saveLogin ? "#e5e7eb" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label={t("settings.security.twoFactor")}
          subtitle={t("settings.security.twoFactor.sub")}
          right={
            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              trackColor={{ false: "#1e293b", true: "#60a5fa" }}
              thumbColor={twoFactor ? "#e5e7eb" : "#e5e7eb"}
            />
          }
        />

        <SettingRow
          label={t("settings.security.changePassword")}
          subtitle={t("settings.security.changePassword.sub")}
          right={<Text style={styles.badgeMuted}>{t("settings.security.change")}</Text>}
          isLast={true}
        />
      </View>

      <Section title={t("settings.section.account")} icon={<Globe size={18} color="#22c55e" />} />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.account.loggedInDevices")}
          subtitle={t("settings.account.loggedInDevices.sub")}
          right={<Text style={styles.settingValueText}>3 {t("settings.account.loggedInDevices.sub")}</Text>}
        />

        <SettingRow
          label={t("settings.account.exportData")}
          subtitle={t("settings.account.exportData.sub")}
          right={<Text style={styles.badgeMuted}>JSON</Text>}
        />

        <SettingRow
          label={t("settings.account.deleteAccount")}
          subtitle={t("settings.account.deleteAccount.sub")}
          right={
            <Text style={[styles.badgeMuted, { color: themeui.colors.danger }]}>
              {t("settings.action.delete")}
            </Text>
          }
          isLast={true}
        />
      </View>

      <Section
        title={t("settings.section.about")}
        icon={<Info size={18} color={themeui.colors.text.secondary} />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.about.version")}
          right={<Text style={styles.settingValueText}>v0.0.0</Text>}
        />

        <SettingRow
          label={t("settings.about.license")}
          right={<Text style={styles.settingValueText}>PT Lab</Text>}
        />

        <SettingRow
          label={t("settings.about.privacyPolicy")}
          right={<Text style={styles.badgeMuted}>{t("settings.action.open")}</Text>}
          isLast={true}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => { handleLogout(); }}>
        <LogOut size={18} color="#fca5a5" />
        <Text style={styles.logoutText}>{t("settings.logout")}</Text>
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
            <Text style={styles.headerTitle}>{t("settings.title")}</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* TABS */}
          <View style={styles.tabsRow}>
            {renderTabButton("preferences", t("settings.tab.preferences"), <Moon size={16} color="#bfdbfe" />)}
            {renderTabButton("security", t("settings.tab.security"), <Shield size={16} color="#bfdbfe" />)}
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

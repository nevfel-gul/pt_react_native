// ❌ kaldır: import { themeui } from "@/constants/themeui";
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
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../services/firebase";

// ✅ NEW THEME
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

type TabKey = "preferences" | "security";

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // ✅ theme
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
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
        <ChevronRight size={16} color={theme.colors.text.muted} style={{ marginLeft: 6 }} />
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
        icon={<Palette size={18} color={theme.colors.premium} />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.preference.darkTheme")}
          subtitle={t("settings.preference.darkTheme.sub")}
          right={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.text.primary}
            />
          }
        />

        <SettingRow
          label={t("settings.preference.language")}
          subtitle={t("settings.preference.language.sub")}
          right={<Text style={styles.settingValueText}>{t("settings.value.turkish")}</Text>}
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
        icon={<Bell size={18} color={theme.colors.gold} />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.notifications.push")}
          subtitle={t("settings.notifications.push.sub")}
          right={
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.text.primary}
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
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.text.primary}
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
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.text.primary}
            />
          }
          isLast={true}
        />
      </View>

      <Section
        title={t("settings.section.app")}
        icon={<Smartphone size={18} color={theme.colors.accent} />}
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
      <Section
        title={t("settings.section.security")}
        icon={<Shield size={18} color={theme.colors.warning} />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.security.rememberSession")}
          subtitle={t("settings.security.rememberSession.sub")}
          right={
            <Switch
              value={saveLogin}
              onValueChange={setSaveLogin}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.text.primary}
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
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.text.primary}
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

      <Section
        title={t("settings.section.account")}
        icon={<Globe size={18} color={theme.colors.success} />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.account.loggedInDevices")}
          subtitle={t("settings.account.loggedInDevices.sub")}
          right={
            <Text style={styles.settingValueText}>
              3 {t("settings.account.loggedInDevices.sub")}
            </Text>
          }
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
            <Text style={[styles.badgeMuted, { color: theme.colors.danger }]}>
              {t("settings.action.delete")}
            </Text>
          }
          isLast={true}
        />
      </View>

      <Section
        title={t("settings.section.about")}
        icon={<Info size={18} color={theme.colors.text.secondary} />}
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
function makeStyles(theme: ThemeUI) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    /* HEADER */
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm + 4,
      paddingBottom: theme.spacing.sm - 4,
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    backButtonText: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.sm,
    },
    headerTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.lg + 2,
      fontWeight: "700",
    },

    /* TABS */
    tabsRow: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xs - 2,
      gap: theme.spacing.xs,
    },
    tabButton: {
      flex: 1,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    tabButtonActive: {
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    tabIcon: { marginTop: 1 },
    tabText: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      fontWeight: "500",
    },
    tabTextActive: {
      color: theme.colors.text.primary,
      textDecorationColor: theme.colors.success,
      textDecorationStyle: "solid",
    },

    /* CARDS */
    card: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadow.soft,
    },

    sectionHeader: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    sectionTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md,
      fontWeight: "600",
    },

    /* PROFILE */
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: theme.colors.surface,
      fontSize: 22,
      fontWeight: "800",
    },
    profileName: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.lg + 2,
      fontWeight: "700",
    },
    profileEmail: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
    },
    profileTag: {
      color: theme.colors.primary,
      fontSize: theme.fontSize.xs,
      marginTop: 2,
    },

    profileMetaRow: {
      flexDirection: "row",
      marginTop: theme.spacing.xs,
      justifyContent: "space-between",
    },
    profileMetaItem: {
      flex: 1,
      alignItems: "center",
    },
    profileMetaLabel: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
    },
    profileMetaValue: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md - 1,
      fontWeight: "600",
      marginTop: 2,
    },

    /* SETTING ROW */
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm - 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.xs,
    },
    settingLabel: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md - 1,
      fontWeight: "500",
    },
    settingSubtitle: {
      color: theme.colors.text.muted,
      fontSize: theme.fontSize.xs,
      marginTop: 2,
    },
    settingValueText: {
      color: theme.colors.text.secondary,
      fontSize: theme.fontSize.sm,
      fontWeight: "500",
    },

    /* BADGE */
    badgeMuted: {
      paddingHorizontal: theme.spacing.sm - 2,
      paddingVertical: theme.spacing.xs - 2,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.xs,
    },

    /* LOGOUT */
    logoutButton: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.dangerSoft,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm - 2,
    },
    logoutText: {
      color: theme.colors.danger,
      fontSize: theme.fontSize.md,
      fontWeight: "700",
    },

    settingRowLast: {
      borderBottomWidth: 0,
      paddingBottom: theme.spacing.xs,
    },
  });
}

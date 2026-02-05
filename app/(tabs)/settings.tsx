import { setAppLanguage } from "@/services/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import {
  Bell,
  ChevronRight,
  Info,
  LogOut,
  Moon,
  Palette,
  Shield,
  Smartphone,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  InteractionManager,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../services/firebase";

// ✅ THEME
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";

type TabKey = "preferences" | "security";

// ✅ STORAGE KEY
const STORAGE_SETTINGS_KEY = "settings_v1";

// ✅ privacy policy url (bunu değiştir)
const PRIVACY_POLICY_URL = "https://example.com/privacy";

type StoredSettings = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  hapticEnabled: boolean;

  saveLogin: boolean;
  twoFactor: boolean;
};

const DEFAULT_SETTINGS: StoredSettings = {
  pushEnabled: true,
  emailEnabled: false,
  hapticEnabled: true,

  saveLogin: true,
  twoFactor: false,
};

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const { theme, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<TabKey>("preferences");

  const [settingsReady, setSettingsReady] = useState(false);

  // ✅ toggles
  const [pushEnabled, setPushEnabled] = useState(DEFAULT_SETTINGS.pushEnabled);
  const [emailEnabled, setEmailEnabled] = useState(DEFAULT_SETTINGS.emailEnabled);
  const [hapticEnabled, setHapticEnabled] = useState(DEFAULT_SETTINGS.hapticEnabled);

  const [saveLogin, setSaveLogin] = useState(DEFAULT_SETTINGS.saveLogin);
  const [twoFactor, setTwoFactor] = useState(DEFAULT_SETTINGS.twoFactor);

  // ✅ Switch renkleri
  const switchTrackFalse = theme.colors.border;
  const switchTrackTrue = theme.colors.primary;
  const switchThumb = mode === "dark" ? "#ffffff" : "#0f172a";
  const switchIOSBg = theme.colors.border;

  // ✅ theme switch local (takılma fix)
  const [themeSwitch, setThemeSwitch] = useState(mode === "dark");
  useEffect(() => setThemeSwitch(mode === "dark"), [mode]);

  // ✅ load settings
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_SETTINGS_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<StoredSettings>) : null;
        const next: StoredSettings = { ...DEFAULT_SETTINGS, ...(parsed ?? {}) };

        if (!mounted) return;

        setPushEnabled(!!next.pushEnabled);
        setEmailEnabled(!!next.emailEnabled);
        setHapticEnabled(!!next.hapticEnabled);

        setSaveLogin(!!next.saveLogin);
        setTwoFactor(!!next.twoFactor);
      } catch {
        // ignore
      } finally {
        if (mounted) setSettingsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const persistSettings = async (patch: Partial<StoredSettings>) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_SETTINGS_KEY);
      const current = raw ? (JSON.parse(raw) as Partial<StoredSettings>) : {};
      const merged: StoredSettings = { ...DEFAULT_SETTINGS, ...current, ...patch };
      await AsyncStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const handleChangePassword = async () => {
    const email = auth.currentUser?.email;
    if (!email) {
      Alert.alert(t("login.error.prefix") || "Hata", t("settings.security.noEmail") || "E-posta bulunamadı.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        t("settings.security.changePassword") || "Şifre Değiştir",
        (t("settings.security.resetSent") || "Şifre sıfırlama maili gönderildi: ") + email
      );
    } catch (err: any) {
      Alert.alert(t("login.error.prefix") || "Hata", err?.message ?? "Unknown error");
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      const can = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (!can) {
        Alert.alert(t("settings.about.privacyPolicy") || "Privacy Policy", "Link açılamıyor.");
        return;
      }
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(t("settings.about.privacyPolicy") || "Privacy Policy", "Link açılamıyor.");
    }
  };

  // -------------------------
  // TAB BUTTON
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
  // SECTION
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
  // ROW
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
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
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
        {/* ✅ THEME */}
        <SettingRow
          label={t("settings.preference.darkTheme")}
          subtitle={t("settings.preference.darkTheme.sub")}
          right={
            <Switch
              value={themeSwitch}
              onValueChange={(v) => {
                setThemeSwitch(v);
                InteractionManager.runAfterInteractions(() => {
                  setMode(v ? "dark" : "light");
                });
              }}
              trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
              thumbColor={themeSwitch ? "#ffffff" : "#0f172a"}
              ios_backgroundColor={switchIOSBg}
            />
          }
        />

        {/* ✅ LANGUAGE */}
        <SettingRow
          label={t("settings.preference.language")}
          subtitle={t("settings.preference.language.sub")}
          right={
            <Text style={styles.settingValueText}>
              {i18n.language === "tr" ? "Türkçe 🇹🇷" : "English 🇺🇸"}
            </Text>
          }
          onPress={() => {
            const next = i18n.language === "tr" ? "en" : "tr";
            setAppLanguage(next);
          }}
          showChevron
        />

        <SettingRow
          label={t("settings.preference.region")}
          subtitle={t("settings.preference.region.sub")}
          right={<Text style={styles.settingValueText}>{t("settings.value.turkey")}</Text>}
          isLast
        />
      </View>

      {/* NOTIFICATIONS */}
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
              onValueChange={(v) => {
                setPushEnabled(v);
                if (settingsReady) persistSettings({ pushEnabled: v });
              }}
              trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
              thumbColor={switchThumb}
              ios_backgroundColor={switchIOSBg}
            />
          }
        />

        <SettingRow
          label={t("settings.notifications.email")}
          subtitle={t("settings.notifications.email.sub")}
          right={
            <Switch
              value={emailEnabled}
              onValueChange={(v) => {
                setEmailEnabled(v);
                if (settingsReady) persistSettings({ emailEnabled: v });
              }}
              trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
              thumbColor={switchThumb}
              ios_backgroundColor={switchIOSBg}
            />
          }
        />

        <SettingRow
          label={t("settings.notifications.haptic")}
          subtitle={t("settings.notifications.haptic.sub")}
          right={
            <Switch
              value={hapticEnabled}
              onValueChange={(v) => {
                setHapticEnabled(v);
                if (settingsReady) persistSettings({ hapticEnabled: v });
              }}
              trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
              thumbColor={switchThumb}
              ios_backgroundColor={switchIOSBg}
            />
          }
          isLast
        />
      </View>

      {/* APP */}
      <Section
        title={t("settings.section.app")}
        icon={<Smartphone size={18} color={theme.colors.accent} />}
      />

      <View style={styles.card}>
        <SettingRow
          label={t("settings.about.privacyPolicy")}
          right={<Text style={styles.badgeMuted}>{t("settings.action.open")}</Text>}
          onPress={handleOpenPrivacyPolicy}
          isLast
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
              onValueChange={(v) => {
                setSaveLogin(v);
                if (settingsReady) persistSettings({ saveLogin: v });
              }}
              trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
              thumbColor={switchThumb}
              ios_backgroundColor={switchIOSBg}
            />
          }
        />

        <SettingRow
          label={t("settings.security.twoFactor")}
          subtitle={t("settings.security.twoFactor.sub")}
          right={
            <Switch
              value={twoFactor}
              onValueChange={(v) => {
                setTwoFactor(v);
                if (settingsReady) persistSettings({ twoFactor: v });
              }}
              trackColor={{ false: switchTrackFalse, true: switchTrackTrue }}
              thumbColor={switchThumb}
              ios_backgroundColor={switchIOSBg}
            />
          }
        />

        <SettingRow
          label={t("settings.security.changePassword")}
          subtitle={t("settings.security.changePassword.sub")}
          right={<Text style={styles.badgeMuted}>{t("settings.security.change")}</Text>}
          onPress={handleChangePassword}
          isLast
        />
      </View>

      {/* ABOUT */}
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
          onPress={handleOpenPrivacyPolicy}
          isLast
        />
      </View>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>{t("settings.title")}</Text>
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
    headerTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.lg + 2,
      fontWeight: "700",
    },

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
      fontWeight: "700",
    },

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

    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm - 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.xs,
    },
    settingRowLast: {
      borderBottomWidth: 0,
      paddingBottom: theme.spacing.xs,
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
  });
}

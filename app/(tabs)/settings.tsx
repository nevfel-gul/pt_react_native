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
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const STORAGE_SETTINGS_KEY = "settings_v1";
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

// ✅ CUSTOM SWITCH COMPONENT - Her switch tamamen izole
const CustomSwitch = ({
  id,
  value,
  onToggle,
  trackColorActive,
  trackColorInactive,
  thumbColorActive,
  thumbColorInactive,
}: {
  id: string;
  value: boolean;
  onToggle: (newValue: boolean) => void;
  trackColorActive: string;
  trackColorInactive: string;
  thumbColorActive: string;
  thumbColorInactive: string;
}) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (newVal: boolean) => {
      setInternalValue(newVal);
      onToggle(newVal);
    },
    [onToggle]
  );

  return (
    <Switch
      key={`switch-${id}-${internalValue ? "on" : "off"}`}
      value={internalValue}
      onValueChange={handleChange}
      trackColor={{ false: trackColorInactive, true: trackColorActive }}
      thumbColor={internalValue ? thumbColorActive : thumbColorInactive}
      ios_backgroundColor={trackColorInactive}
    />
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme, mode, setMode } = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>("preferences");
  const [settingsReady, setSettingsReady] = useState(false);

  // ✅ STATE - Her toggle için ayrı state
  const [isDarkMode, setIsDarkMode] = useState(mode === "dark");
  const [isPushEnabled, setIsPushEnabled] = useState(DEFAULT_SETTINGS.pushEnabled);
  const [isEmailEnabled, setIsEmailEnabled] = useState(DEFAULT_SETTINGS.emailEnabled);
  const [isHapticEnabled, setIsHapticEnabled] = useState(DEFAULT_SETTINGS.hapticEnabled);
  const [isSaveLoginEnabled, setIsSaveLoginEnabled] = useState(DEFAULT_SETTINGS.saveLogin);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(DEFAULT_SETTINGS.twoFactor);

  // ✅ COLORS - Memoized
  const colors = useMemo(
    () => ({
      trackActive: theme.colors.primary,
      trackInactive: theme.colors.border,
      thumbActive: "#ffffff",
      thumbInactive: "#0f172a",
    }),
    [theme.colors.primary, theme.colors.border]
  );

  const styles = useMemo(() => makeStyles(theme), [theme]);

  // ✅ THEME SYNC
  useEffect(() => {
    setIsDarkMode(mode === "dark");
  }, [mode]);

  // ✅ LOAD SETTINGS
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_SETTINGS_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<StoredSettings>) : null;
        const settings: StoredSettings = { ...DEFAULT_SETTINGS, ...(parsed ?? {}) };

        if (!mounted) return;

        setIsPushEnabled(settings.pushEnabled);
        setIsEmailEnabled(settings.emailEnabled);
        setIsHapticEnabled(settings.hapticEnabled);
        setIsSaveLoginEnabled(settings.saveLogin);
        setIsTwoFactorEnabled(settings.twoFactor);
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

  // ✅ PERSIST HELPER
  const persistSettings = useCallback(async (patch: Partial<StoredSettings>) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_SETTINGS_KEY);
      const current = raw ? (JSON.parse(raw) as Partial<StoredSettings>) : {};
      const merged: StoredSettings = { ...DEFAULT_SETTINGS, ...current, ...patch };
      await AsyncStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }, []);

  // ✅ HANDLERS
  const handleThemeToggle = useCallback(
    (newValue: boolean) => {
      setIsDarkMode(newValue);
      InteractionManager.runAfterInteractions(() => {
        setMode(newValue ? "dark" : "light");
      });
    },
    [setMode]
  );

  const handlePushToggle = useCallback(
    (newValue: boolean) => {
      setIsPushEnabled(newValue);
      if (settingsReady) persistSettings({ pushEnabled: newValue });
    },
    [settingsReady, persistSettings]
  );

  const handleEmailToggle = useCallback(
    (newValue: boolean) => {
      setIsEmailEnabled(newValue);
      if (settingsReady) persistSettings({ emailEnabled: newValue });
    },
    [settingsReady, persistSettings]
  );

  const handleHapticToggle = useCallback(
    (newValue: boolean) => {
      setIsHapticEnabled(newValue);
      if (settingsReady) persistSettings({ hapticEnabled: newValue });
    },
    [settingsReady, persistSettings]
  );

  const handleSaveLoginToggle = useCallback(
    (newValue: boolean) => {
      setIsSaveLoginEnabled(newValue);
      if (settingsReady) persistSettings({ saveLogin: newValue });
    },
    [settingsReady, persistSettings]
  );

  const handleTwoFactorToggle = useCallback(
    (newValue: boolean) => {
      setIsTwoFactorEnabled(newValue);
      if (settingsReady) persistSettings({ twoFactor: newValue });
    },
    [settingsReady, persistSettings]
  );

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    router.replace("/login");
  }, [router]);

  const handleChangePassword = useCallback(async () => {
    const email = auth.currentUser?.email;
    if (!email) {
      Alert.alert(
        t("login.error.prefix") || "Hata",
        t("settings.security.noEmail") || "E-posta bulunamadı."
      );
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
  }, [t]);

  const handleOpenPrivacyPolicy = useCallback(async () => {
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
  }, [t]);

  const handleLanguagePress = useCallback(() => {
    const next = i18n.language === "tr" ? "en" : "tr";
    setAppLanguage(next);
  }, [i18n.language]);

  // ✅ TAB BUTTON
  const TabButton = useCallback(
    ({ tabKey, label, icon }: { tabKey: TabKey; label: string; icon: React.ReactNode }) => {
      const isActive = activeTab === tabKey;
      return (
        <TouchableOpacity
          onPress={() => setActiveTab(tabKey)}
          style={[styles.tabButton, isActive && styles.tabButtonActive]}
        >
          <View style={styles.tabIcon}>{icon}</View>
          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
        </TouchableOpacity>
      );
    },
    [activeTab, styles]
  );

  // ✅ SECTION HEADER
  const SectionHeader = useCallback(
    ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>
    ),
    [styles]
  );

  // ✅ SETTING ROW
  const SettingRow = useCallback(
    ({
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
    ),
    [styles, theme.colors.text.muted]
  );

  // ✅ PREFERENCES TAB
  const PreferencesTab = useMemo(
    () => (
      <>
        <SectionHeader
          title={t("settings.section.preferences")}
          icon={<Palette size={18} color={theme.colors.premium} />}
        />

        <View style={styles.card}>
          <SettingRow
            label={t("settings.preference.darkTheme")}
            subtitle={t("settings.preference.darkTheme.sub")}
            right={
              <CustomSwitch
                id="theme"
                value={isDarkMode}
                onToggle={handleThemeToggle}
                trackColorActive={colors.trackActive}
                trackColorInactive={colors.trackInactive}
                thumbColorActive={colors.thumbActive}
                thumbColorInactive={colors.thumbInactive}
              />
            }
          />

          <SettingRow
            label={t("settings.preference.language")}
            subtitle={t("settings.preference.language.sub")}
            right={
              <Text style={styles.settingValueText}>
                {i18n.language === "tr" ? "Türkçe 🇹🇷" : "English 🇺🇸"}
              </Text>
            }
            onPress={handleLanguagePress}
            showChevron
          />

          <SettingRow
            label={t("settings.preference.region")}
            subtitle={t("settings.preference.region.sub")}
            right={<Text style={styles.settingValueText}>{t("settings.value.turkey")}</Text>}
            isLast
          />
        </View>

        <SectionHeader
          title={t("settings.section.notifications")}
          icon={<Bell size={18} color={theme.colors.gold} />}
        />

        <View style={styles.card}>
          <SettingRow
            label={t("settings.notifications.push")}
            subtitle={t("settings.notifications.push.sub")}
            right={
              <CustomSwitch
                id="push"
                value={isPushEnabled}
                onToggle={handlePushToggle}
                trackColorActive={colors.trackActive}
                trackColorInactive={colors.trackInactive}
                thumbColorActive={colors.thumbActive}
                thumbColorInactive={colors.thumbInactive}
              />
            }
          />

          <SettingRow
            label={t("settings.notifications.email")}
            subtitle={t("settings.notifications.email.sub")}
            right={
              <CustomSwitch
                id="email"
                value={isEmailEnabled}
                onToggle={handleEmailToggle}
                trackColorActive={colors.trackActive}
                trackColorInactive={colors.trackInactive}
                thumbColorActive={colors.thumbActive}
                thumbColorInactive={colors.thumbInactive}
              />
            }
          />

          <SettingRow
            label={t("settings.notifications.haptic")}
            subtitle={t("settings.notifications.haptic.sub")}
            right={
              <CustomSwitch
                id="haptic"
                value={isHapticEnabled}
                onToggle={handleHapticToggle}
                trackColorActive={colors.trackActive}
                trackColorInactive={colors.trackInactive}
                thumbColorActive={colors.thumbActive}
                thumbColorInactive={colors.thumbInactive}
              />
            }
            isLast
          />
        </View>

        <SectionHeader
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
    ),
    [
      t,
      theme.colors,
      styles,
      isDarkMode,
      isPushEnabled,
      isEmailEnabled,
      isHapticEnabled,
      i18n.language,
      colors,
      handleThemeToggle,
      handlePushToggle,
      handleEmailToggle,
      handleHapticToggle,
      handleLanguagePress,
      handleOpenPrivacyPolicy,
      SectionHeader,
      SettingRow,
    ]
  );

  // ✅ SECURITY TAB
  const SecurityTab = useMemo(
    () => (
      <>
        <SectionHeader
          title={t("settings.section.security")}
          icon={<Shield size={18} color={theme.colors.warning} />}
        />

        <View style={styles.card}>
          <SettingRow
            label={t("settings.security.rememberSession")}
            subtitle={t("settings.security.rememberSession.sub")}
            right={
              <CustomSwitch
                id="savelogin"
                value={isSaveLoginEnabled}
                onToggle={handleSaveLoginToggle}
                trackColorActive={colors.trackActive}
                trackColorInactive={colors.trackInactive}
                thumbColorActive={colors.thumbActive}
                thumbColorInactive={colors.thumbInactive}
              />
            }
          />

          <SettingRow
            label={t("settings.security.twoFactor")}
            subtitle={t("settings.security.twoFactor.sub")}
            right={
              <CustomSwitch
                id="twofactor"
                value={isTwoFactorEnabled}
                onToggle={handleTwoFactorToggle}
                trackColorActive={colors.trackActive}
                trackColorInactive={colors.trackInactive}
                thumbColorActive={colors.thumbActive}
                thumbColorInactive={colors.thumbInactive}
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

        <SectionHeader
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={18} color="#fca5a5" />
          <Text style={styles.logoutText}>{t("settings.logout")}</Text>
        </TouchableOpacity>
      </>
    ),
    [
      t,
      theme.colors,
      styles,
      isSaveLoginEnabled,
      isTwoFactorEnabled,
      colors,
      handleSaveLoginToggle,
      handleTwoFactorToggle,
      handleChangePassword,
      handleOpenPrivacyPolicy,
      handleLogout,
      SectionHeader,
      SettingRow,
    ]
  );

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
            <TabButton
              tabKey="preferences"
              label={t("settings.tab.preferences")}
              icon={<Moon size={16} color="#bfdbfe" />}
            />
            <TabButton
              tabKey="security"
              label={t("settings.tab.security")}
              icon={<Shield size={16} color="#bfdbfe" />}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {activeTab === "preferences" ? PreferencesTab : SecurityTab}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ✅ STYLES
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
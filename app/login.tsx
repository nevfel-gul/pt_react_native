import LanguagePicker from "@/components/LanguagePicker";
import { SocialSignIn } from "@/components/social-sign-in";
import { normalizeLanguage, sitePathLanguage } from "@/constants/languages";
import { deviceUnitSystem } from "@/constants/UnitsContext";
import { PASSWORD_RE, passwordChecks, registerEmailAccount } from "@/services/account-security";
import { track } from "@/services/analytics";
import { setAppLanguage } from "@/services/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Check, Eye, EyeOff, Lock, Mail, Moon, Sun, User, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ThemeMode, ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { auth } from "../services/firebase";

const STORAGE_EMAIL_KEY = "auth_remember_email";
const STORAGE_REMEMBER_KEY = "auth_remember_enabled";
const STORAGE_LANG_KEY = "app_lang";

// Firebase'in ham İngilizce hata metinleri ("Firebase: Error (auth/invalid-credential).")
// yerine kullanıcının dilinde anlaşılır bir mesaj.
function authErrorKey(code?: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "login.error.invalid_credentials";
    case "auth/invalid-email":
      return "login.error.invalid_email";
    case "functions/already-exists":
    case "auth/email-already-in-use":
      return "login.error.email_in_use";
    case "auth/weak-password":
      return "login.error.password_too_short";
    case "functions/resource-exhausted":
    case "auth/too-many-requests":
      return "login.error.too_many_requests";
    case "auth/network-request-failed":
      return "login.error.network";
    case "auth/user-disabled":
      return "login.error.user_disabled";
    default:
      return "login.error.generic";
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme, mode, toggleTheme } = useTheme();

  const styles = useMemo(() => createStyles(theme, mode), [theme, mode]);

  // ✅ DİNAMİK LEGAL LİNKLER - dile göre otomatik değişir
  const legalLinks = useMemo(() => {
    const l = sitePathLanguage(normalizeLanguage(i18n.language));
    return {
      terms: `https://www.athletrackai.com/${l}/terms-of-service`,
      privacy: `https://www.athletrackai.com/${l}/privacy-policy`,
      kvkk: `https://www.athletrackai.com/${l}/privacy-policy`,
      consent: `https://www.athletrackai.com/${l}/privacy-policy`,
      cookie: `https://www.athletrackai.com/${l}/cookie-policy`,
    };
  }, [i18n.language]);

  const [isLoginMode, setIsLoginMode] = useState(true);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [acceptMainLegal, setAcceptMainLegal] = useState(false);
  const [acceptKvkkConsent, setAcceptKvkkConsent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const enabled = await AsyncStorage.getItem(STORAGE_REMEMBER_KEY);
        const savedEmail = await AsyncStorage.getItem(STORAGE_EMAIL_KEY);
        const isEnabled = enabled === "1";
        setRememberMe(isEnabled);
        if (isEnabled && savedEmail) setEmail(savedEmail);

        // Eski sürüm giriş ekranında seçilen dili ayrı bir anahtara yazıyordu
        // ("app_lang"); uygulama ise "app_language" okuyor. Bir kez taşı.
        const savedLang = await AsyncStorage.getItem(STORAGE_LANG_KEY);
        if (savedLang) {
          await AsyncStorage.removeItem(STORAGE_LANG_KEY);
          if (normalizeLanguage(savedLang) !== normalizeLanguage(i18n.language)) {
            await setAppLanguage(normalizeLanguage(savedLang));
          }
        }
      } catch {
        // sessiz
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistRemember = async (nextRemember: boolean, nextEmail: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_REMEMBER_KEY, nextRemember ? "1" : "0");
      if (nextRemember) await AsyncStorage.setItem(STORAGE_EMAIL_KEY, nextEmail ?? "");
      else await AsyncStorage.removeItem(STORAGE_EMAIL_KEY);
    } catch { }
  };


  const onToggleRemember = async () => {
    const next = !rememberMe;
    setRememberMe(next);
    await persistRemember(next, email);
  };

  const onChangeEmail = async (v: string) => {
    setEmail(v);
    if (rememberMe) await persistRemember(true, v);
  };

  const [langOpen, setLangOpen] = useState(false);
  const toggleLang = () => setLangOpen(true);

  const openLegalLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t("common.error"), t("settings.error.linkFailed"));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("common.error"), t("settings.error.linkFailed"));
    }
  };

  const handleForgotPassword = () => {
    router.push({ pathname: "/forgot-password", params: { email: email.trim() } });
  };

  const handleSubmit = async () => {
    if (loading) return;
    const fillAllMsg = t("login.validation.fill_all");

    if (!email.trim() || !password || (!isLoginMode && (!name.trim() || !username.trim()))) {
      Alert.alert(t("login.error.prefix"), fillAllMsg);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert(t("login.error.prefix"), t("login.error.invalid_email"));
      return;
    }
    if (!isLoginMode) {
      if (!password2) {
        Alert.alert(t("login.error.prefix"), fillAllMsg);
        return;
      }
      if (password !== password2) {
        Alert.alert(t("login.error.prefix"), t("login.error.passwords_mismatch"));
        return;
      }
      if (!PASSWORD_RE.test(password)) {
        Alert.alert(t("login.error.prefix"), t("password.requirements"));
        return;
      }
      if (!acceptMainLegal || !acceptKvkkConsent) {
        Alert.alert(t("login.error.prefix"), t("login.error.legal_required"));
        return;
      }
    }

    try {
      setLoading(true);

      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        track("login_completed", { method: "email" });
      } else {
        const cleanName = name.trim();
        const cleanUsername = username.trim().toLowerCase();

        await registerEmailAccount({
          email: email.trim(), password, name: cleanName, username: cleanUsername,
          language: normalizeLanguage(i18n.language), units: deviceUnitSystem(), acceptLegal: true,
        });
        await signInWithEmailAndPassword(auth, email.trim(), password);
        track("signup_completed", { method: "email" });
      }

      await persistRemember(rememberMe, email.trim());
      if (!isLoginMode) router.replace("/verify-email");
      else router.replace("/(tabs)");
    } catch (err: any) {
      track(isLoginMode ? "login_failed" : "signup_failed", { code: err?.code ?? "unknown" });
      Alert.alert(t("login.error.prefix"), t(authErrorKey(err?.code)));
    } finally {
      setLoading(false);
    }
  };

  const headerTitle = isLoginMode ? t("login.header.welcome_back") : t("login.header.join_us");
  const headerSub = isLoginMode ? t("login.header.sub_continue") : t("login.header.sub_start");
  const checks = passwordChecks(password);
  const metCount = Object.values(checks).filter(Boolean).length;

  return (
    <View style={styles.root}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
      <LinearGradient
        colors={
          mode === "dark"
            ? ["#060A12", "#070D18", "#050914"]
            : [
              theme.colors.background ?? "#F8FAFC",
              theme.colors.surfaceSoft ?? "#EEF2FF",
              theme.colors.surface ?? "#E2E8F0",
            ]
        }
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.topBar}>
              <Text style={styles.logoText}>ATHLETRACK</Text>

              <View style={styles.headerActions}>
                <Pressable onPress={toggleTheme} accessibilityRole="switch"
                  accessibilityLabel={t("settings.preference.darkTheme")}
                  accessibilityHint={t("settings.preference.darkTheme.sub")}
                  accessibilityState={{ checked: mode === "dark" }}
                  style={({ pressed }) => [styles.themeBtn, pressed && { opacity: 0.65 }]}>
                  {mode === "dark"
                    ? <Sun size={18} color={theme.colors.text.primary} strokeWidth={1.8} />
                    : <Moon size={18} color={theme.colors.text.primary} strokeWidth={1.8} />}
                </Pressable>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={toggleLang}
                  style={styles.langBtn}
                >
                  <Text style={styles.langText}>
                    {normalizeLanguage(i18n.language).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.centerWrap}>
              <View style={styles.iconCircle}>
                <Image
                  source={require("../assets/images/icon.png")}
                  style={styles.appIcon}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.title}>{headerTitle}</Text>
              <Text style={styles.subtitle}>{headerSub}</Text>

              <View style={styles.card}>
                {!isLoginMode && (
                  <View style={styles.inputRow}>
                    <User size={18} color={styles.inputPh.color as any} />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder={t("login.placeholder.full_name")}
                      placeholderTextColor={styles.inputPh.color as any}
                      autoCapitalize="words"
                      style={styles.input}
                    />
                  </View>
                )}

                {!isLoginMode && (
                  <View style={styles.inputRow}>
                    <User size={18} color={styles.inputPh.color as any} />
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder={t("login.placeholder.username")}
                      placeholderTextColor={styles.inputPh.color as any}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                  </View>
                )}

                <View style={styles.inputRow}>
                  <Mail size={18} color={styles.inputPh.color as any} />
                  <TextInput
                    value={email}
                    onChangeText={onChangeEmail}
                    placeholder={t("login.placeholder.email")}
                    placeholderTextColor={styles.inputPh.color as any}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputRow}>
                  <Lock size={18} color={styles.inputPh.color as any} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t("login.placeholder.password")}
                    placeholderTextColor={styles.inputPh.color as any}
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType={isLoginMode ? "password" : "newPassword"}
                    autoComplete={isLoginMode ? "current-password" : "new-password"}
                    style={styles.input}
                  />
                  <Pressable onPress={() => setIsPasswordVisible((v) => !v)} hitSlop={10}>
                    {isPasswordVisible ? (
                      <EyeOff size={18} color={styles.inputPh.color as any} />
                    ) : (
                      <Eye size={18} color={styles.inputPh.color as any} />
                    )}
                  </Pressable>
                </View>

                {!isLoginMode && <View style={styles.passwordGuide}>
                  <View style={styles.passwordGuideHeader}>
                    <Text style={styles.passwordGuideTitle}>{t("password.title")}</Text>
                    <Text style={styles.passwordCount}>{metCount}/{Object.keys(checks).length}</Text>
                  </View>
                  <View style={styles.passwordProgress} accessible={false}>
                    {Object.keys(checks).map((key, index) => <View key={key} style={[
                      styles.passwordProgressSegment,
                      index < metCount && { backgroundColor: theme.colors.success },
                    ]} />)}
                  </View>
                  {Object.entries(checks).map(([key, met]) => {
                    const color = met ? theme.colors.success : password ? theme.colors.danger : theme.colors.text.secondary;
                    return <View key={key} style={styles.passwordRule} accessible
                      accessibilityLabel={`${t(`password.${key}`)}, ${t(met ? "password.met" : "password.unmet")}`}>
                      <View style={[styles.passwordRuleIcon, { backgroundColor: met ? theme.colors.successSoft : password ? theme.colors.dangerSoft : theme.colors.surfaceSoft }]}>
                        {met ? <Check size={12} color={color} strokeWidth={3} /> : <X size={12} color={color} strokeWidth={2.5} />}
                      </View>
                      <Text style={[styles.passwordRuleText, { color }]}>{t(`password.${key}`)}</Text>
                    </View>;
                  })}
                </View>}

                {!isLoginMode && (
                  <View style={styles.inputRow}>
                    <Lock size={18} color={styles.inputPh.color as any} />
                    <TextInput
                      value={password2}
                      onChangeText={setPassword2}
                      placeholder={t("login.placeholder.password_again")}
                      placeholderTextColor={styles.inputPh.color as any}
                      secureTextEntry={!isPasswordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      style={styles.input}
                    />
                  </View>
                )}

                <View style={styles.row}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onToggleRemember}
                    style={styles.rememberWrap}
                  >
                    <View style={[styles.switchBase, rememberMe && styles.switchOn]}>
                      <View style={[styles.knob, rememberMe && styles.knobOn]} />
                    </View>
                    <Text style={styles.rememberText}>{t("login.remember_me")}</Text>
                  </TouchableOpacity>

                  {isLoginMode ? (
                    <TouchableOpacity activeOpacity={0.8} onPress={handleForgotPassword} disabled={loading}>
                      <Text style={styles.forgot}>{t("login.forgot_password")}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 1 }} />
                  )}
                </View>

                {!isLoginMode && (
                  <View style={styles.legalWrap}>
                    <View style={styles.legalRow}>
                      <Checkbox
                        value={acceptMainLegal}
                        onValueChange={setAcceptMainLegal}
                        color={acceptMainLegal ? theme.colors.primary : undefined}
                        style={styles.checkbox}
                      />
                      <Text style={styles.legalText}>
                        <Text>{t("login.legal.accept_prefix")}</Text>
                        <Text style={styles.legalLink} onPress={() => openLegalLink(legalLinks.terms)}>
                          {t("login.legal.terms")}
                        </Text>
                        <Text>{t("login.legal.and")}</Text>
                        <Text style={styles.legalLink} onPress={() => openLegalLink(legalLinks.privacy)}>
                          {t("login.legal.privacy")}
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.legalRow}>
                      <Checkbox
                        value={acceptKvkkConsent}
                        onValueChange={setAcceptKvkkConsent}
                        color={acceptKvkkConsent ? theme.colors.primary : undefined}
                        style={styles.checkbox}
                      />
                      <Text style={styles.legalText}>
                        <Text>{t("login.legal.read_prefix")}</Text>
                        <Text style={styles.legalLink} onPress={() => openLegalLink(legalLinks.kvkk)}>
                          {t("login.legal.kvkk")}
                        </Text>
                        <Text>{", "}</Text>
                        <Text style={styles.legalLink} onPress={() => openLegalLink(legalLinks.consent)}>
                          {t("login.legal.consent")}
                        </Text>
                        <Text>{t("login.legal.and")}</Text>
                        <Text style={styles.legalLink} onPress={() => openLegalLink(legalLinks.cookie)}>
                          {t("login.legal.cookie")}
                        </Text>
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleSubmit}
                  disabled={loading}
                  style={[styles.buttonOuter, loading && { opacity: 0.75 }]}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.primary ?? "#4D8DFF",
                      theme.colors.info ?? "#60A5FA",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    {loading ? (
                      <ActivityIndicator />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>
                          {isLoginMode ? t("login.button.sign_in") : t("login.button.sign_up")}
                        </Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <SocialSignIn onBusyChange={setLoading} busy={loading}
                  isRegistration={!isLoginMode}
                  legalAccepted={!isLoginMode && acceptMainLegal && acceptKvkkConsent}
                  onRegistrationRequired={() => setIsLoginMode(false)} />
              </View>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>
                  {isLoginMode ? t("login.toggle.no_account") : t("login.toggle.already_here")}
                </Text>
                <TouchableOpacity activeOpacity={0.85} disabled={loading} onPress={() => setIsLoginMode((v) => !v)}>
                  <Text style={styles.bottomLink}>
                    {isLoginMode ? t("login.toggle.sign_up") : t("login.toggle.sign_in")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(theme: ThemeUI, mode: ThemeMode) {
  const isDark = mode === "dark";
  const link = theme.colors.primary ?? "#4D8DFF";

  const cardBg = isDark ? "rgba(17,24,39,0.72)" : "rgba(255,255,255,0.82)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";

  const inputBg = isDark ? "rgba(8,12,20,0.75)" : "rgba(241,245,249,0.95)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";

  const textPrimary = isDark
    ? "#FFFFFF"
    : (theme.colors.text?.primary ?? "#0F172A");
  const textMuted = isDark
    ? "rgba(148,163,184,1)"
    : (theme.colors.text?.secondary ?? "rgba(15,23,42,0.55)");

  return StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 28 },
    topBar: {
      paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56,
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    themeBtn: {
      width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
      borderWidth: 1, borderColor: cardBorder,
    },
    langBtn: {
      minWidth: 44, minHeight: 44, paddingHorizontal: 12, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
      borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
    },
    langText: { color: textPrimary, fontWeight: "600", fontSize: 12 },
    centerWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingTop: 12 },
    iconCircle: {
      alignSelf: "center", width: 76, height: 76, borderRadius: 22,
      backgroundColor: isDark ? "rgba(77,141,255,0.10)" : "rgba(77,141,255,0.08)",
      borderWidth: 1, borderColor: isDark ? "rgba(77,141,255,0.22)" : "rgba(77,141,255,0.18)",
      alignItems: "center", justifyContent: "center", marginBottom: 16, overflow: "hidden",
    },
    appIcon: { width: 56, height: 56, borderRadius: 15 },
    title: { textAlign: "center", color: textPrimary, fontSize: 30, fontWeight: "700", letterSpacing: -0.65 },
    logoText: { fontSize: theme.fontSize.lg, fontWeight: "800", color: theme.colors.primary, flexShrink: 1, marginRight: 12 },
    subtitle: { textAlign: "center", marginTop: 8, marginBottom: 24, color: textMuted, fontSize: 14, lineHeight: 21, fontWeight: "400", paddingHorizontal: 8 },
    card: {
      backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, borderRadius: 22, padding: 18,
      borderCurve: "continuous", boxShadow: isDark ? "0 12px 32px rgba(0,0,0,0.20)" : "0 8px 28px rgba(15,23,42,0.06)",
    },
    inputRow: {
      flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14,
      height: 52, borderRadius: 12, backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, marginBottom: 12,
    },
    input: { flex: 1, color: textPrimary, fontSize: 15, fontWeight: "400" },
    inputPh: { color: isDark ? "rgba(148,163,184,0.85)" : "rgba(100,116,139,0.85)" },
    passwordGuide: { gap: 9, padding: 14, marginBottom: 14, borderRadius: 14, backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder },
    passwordGuideHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
    passwordGuideTitle: { flex: 1, color: textPrimary, fontSize: 12, fontWeight: "700" },
    passwordCount: { color: textMuted, fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] },
    passwordProgress: { flexDirection: "row", gap: 4, marginBottom: 3 },
    passwordProgressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: theme.colors.border },
    passwordRule: { flexDirection: "row", alignItems: "center", gap: 8 },
    passwordRuleIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    passwordRuleText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 14, gap: 12 },
    rememberWrap: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
    rememberText: { color: textMuted, fontSize: 12, fontWeight: "500", flexShrink: 1 },
    switchBase: {
      width: 46, height: 24, borderRadius: 999,
      backgroundColor: isDark ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.10)",
      borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)", padding: 2, justifyContent: "center",
    },
    switchOn: {
      backgroundColor: isDark ? "rgba(77,141,255,0.28)" : "rgba(77,141,255,0.25)",
      borderColor: isDark ? "rgba(77,141,255,0.40)" : "rgba(77,141,255,0.35)",
    },
    knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF", transform: [{ translateX: 0 }] },
    knobOn: { transform: [{ translateX: 22 }], backgroundColor: "#FFFFFF" },
    forgot: { color: link, fontSize: 12, fontWeight: "600" },
    legalWrap: { marginTop: 2, marginBottom: 16, gap: 10 },
    legalRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    checkbox: { marginTop: 2 },
    legalText: { flex: 1, color: textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
    legalLink: { color: link, fontWeight: "900", textDecorationLine: "underline" },
    buttonOuter: { height: 52, borderRadius: 12, overflow: "hidden" },
    button: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    buttonText: { color: "#07101D", fontSize: 16, fontWeight: "700" },
    buttonArrow: { color: "#07101D", fontSize: 18, fontWeight: "600", marginTop: -1 },
    bottomRow: { marginTop: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, flexWrap: "wrap", paddingHorizontal: 8 },
    bottomText: { color: textMuted, fontSize: 13, fontWeight: "400", textAlign: "center" },
    bottomLink: { color: link, fontSize: 13, fontWeight: "600" },
  });
}

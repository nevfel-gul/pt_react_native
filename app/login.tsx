import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react-native";
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
import { db } from "../services/firebase";

import type { ThemeMode, ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { auth } from "../services/firebase";

const STORAGE_EMAIL_KEY = "auth_remember_email";
const STORAGE_REMEMBER_KEY = "auth_remember_enabled";
const STORAGE_LANG_KEY = "app_lang";

// burayı sonra gerçek linklerinle değiştir
const LEGAL_LINKS = {
  terms: "https://example.com/kullanici-sozlesmesi",
  privacy: "https://example.com/gizlilik-politikasi",
  kvkk: "https://example.com/kvkk-aydinlatma-metni",
  consent: "https://example.com/acik-riza-metni",
};

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();

  const styles = useMemo(() => createStyles(theme, mode), [theme, mode]);

  const [isLoginMode, setIsLoginMode] = useState(true);

  // inputs
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // register legal checkboxes
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

        const savedLang = await AsyncStorage.getItem(STORAGE_LANG_KEY);
        if (savedLang && savedLang !== i18n.language) {
          await i18n.changeLanguage(savedLang);
        }
      } catch {
        // sessiz
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistRemember = async (nextRemember: boolean, nextEmail: string) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_REMEMBER_KEY,
        nextRemember ? "1" : "0",
      );
      if (nextRemember)
        await AsyncStorage.setItem(STORAGE_EMAIL_KEY, nextEmail ?? "");
      else await AsyncStorage.removeItem(STORAGE_EMAIL_KEY);
    } catch {}
  };

  const persistLang = async (lang: "tr" | "en") => {
    try {
      await AsyncStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch {}
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

  const toggleLang = async () => {
    const next = (i18n.language || "tr").startsWith("tr") ? "en" : "tr";
    await i18n.changeLanguage(next);
    await persistLang(next);
  };

  const openLegalLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Hata", "Link açılamadı.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Hata", "Link açılamadı.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t("login.error.prefix"), t("login.validation.fill_all"));
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(t("login.error.prefix"), "Reset maili gönderildi.");
    } catch (err: any) {
      Alert.alert(t("login.error.prefix"), err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const fillAllMsg = t("login.validation.fill_all");

    if (!email || !password || (!isLoginMode && (!name || !username))) {
      Alert.alert(t("login.error.prefix"), fillAllMsg);
      return;
    }

    if (!isLoginMode) {
      if (!password2) {
        Alert.alert(t("login.error.prefix"), fillAllMsg);
        return;
      }
      if (password !== password2) {
        Alert.alert(t("login.error.prefix"), "Şifreler aynı değil.");
        return;
      }
      if (password.length < 6) {
        Alert.alert(t("login.error.prefix"), "Şifre en az 6 karakter olmalı.");
        return;
      }

      if (!acceptMainLegal || !acceptKvkkConsent) {
        Alert.alert(
          t("login.error.prefix"),
          "Devam etmek için gerekli yasal onayları vermelisin.",
        );
        return;
      }
    }

    try {
      setLoading(true);

      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cleanName = name.trim();
        const cleanUsername = username.trim().toLowerCase();

        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(cred.user, { displayName: cleanName });

        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          email: email.trim().toLowerCase(),
          displayName: cleanName,
          username: cleanUsername,
          pushEnabled: true,
          legalApprovals: {
            terms: acceptMainLegal,
            privacy: acceptMainLegal,
            kvkk: acceptKvkkConsent,
            explicitConsent: acceptKvkkConsent,
          },
          createdAt: serverTimestamp(),
        });
      }

      await persistRemember(rememberMe, email.trim());
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert(t("login.error.prefix"), err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const headerTitle = isLoginMode
    ? t("login.header.welcome_back")
    : t("login.header.join_us");
  const headerSub = isLoginMode
    ? t("login.header.sub_continue")
    : t("login.header.sub_start");

  return (
    <View style={styles.root}>
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

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={toggleLang}
                style={styles.langBtn}
              >
                <Text style={styles.langText}>
                  {(i18n.language || "tr").startsWith("tr") ? "TR" : "EN"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.centerWrap}>
              {/* icon */}
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
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => setIsPasswordVisible((v) => !v)}
                    hitSlop={10}
                  >
                    {isPasswordVisible ? (
                      <EyeOff size={18} color={styles.inputPh.color as any} />
                    ) : (
                      <Eye size={18} color={styles.inputPh.color as any} />
                    )}
                  </Pressable>
                </View>

                {!isLoginMode && (
                  <View style={styles.inputRow}>
                    <Lock size={18} color={styles.inputPh.color as any} />
                    <TextInput
                      value={password2}
                      onChangeText={setPassword2}
                      placeholder={t("login.placeholder.password_again")}
                      placeholderTextColor={styles.inputPh.color as any}
                      secureTextEntry={!isPasswordVisible}
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
                    <View
                      style={[styles.switchBase, rememberMe && styles.switchOn]}
                    >
                      <View
                        style={[styles.knob, rememberMe && styles.knobOn]}
                      />
                    </View>
                    <Text style={styles.rememberText}>
                      {t("login.remember_me")}
                    </Text>
                  </TouchableOpacity>

                  {isLoginMode ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleForgotPassword}
                      disabled={loading}
                    >
                      <Text style={styles.forgot}>
                        {t("login.forgot_password")}
                      </Text>
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
                        color={
                          acceptMainLegal ? theme.colors.primary : undefined
                        }
                        style={styles.checkbox}
                      />
                      <Text style={styles.legalText}>
                        <Text>Kabul ediyorum: </Text>
                        <Text
                          style={styles.legalLink}
                          onPress={() => openLegalLink(LEGAL_LINKS.terms)}
                        >
                          Kullanıcı Sözleşmesi
                        </Text>
                        <Text> ve </Text>
                        <Text
                          style={styles.legalLink}
                          onPress={() => openLegalLink(LEGAL_LINKS.privacy)}
                        >
                          Gizlilik Politikası
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.legalRow}>
                      <Checkbox
                        value={acceptKvkkConsent}
                        onValueChange={setAcceptKvkkConsent}
                        color={
                          acceptKvkkConsent ? theme.colors.primary : undefined
                        }
                        style={styles.checkbox}
                      />
                      <Text style={styles.legalText}>
                        <Text>Okudum ve onaylıyorum: </Text>
                        <Text
                          style={styles.legalLink}
                          onPress={() => openLegalLink(LEGAL_LINKS.kvkk)}
                        >
                          KVKK Aydınlatma Metni
                        </Text>
                        <Text> ve </Text>
                        <Text
                          style={styles.legalLink}
                          onPress={() => openLegalLink(LEGAL_LINKS.consent)}
                        >
                          Açık Rıza Metni
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
                          {isLoginMode
                            ? t("login.button.sign_in")
                            : t("login.button.sign_up")}
                        </Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>
                  {isLoginMode
                    ? t("login.toggle.no_account")
                    : t("login.toggle.already_here")}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setIsLoginMode((v) => !v)}
                >
                  <Text style={styles.bottomLink}>
                    {isLoginMode
                      ? t("login.toggle.sign_up")
                      : t("login.toggle.sign_in")}
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

    scrollContent: {
      flexGrow: 1,
      paddingBottom: 28,
    },

    topBar: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 56,
    },

    langBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(15,23,42,0.06)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
    },
    langText: {
      color: isDark ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.75)",
      fontWeight: "900",
      fontSize: 12,
    },

    centerWrap: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: 18,
    },

    iconCircle: {
      alignSelf: "center",
      width: 88,
      height: 88,
      borderRadius: 24,
      backgroundColor: isDark
        ? "rgba(77,141,255,0.10)"
        : "rgba(77,141,255,0.08)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(77,141,255,0.22)" : "rgba(77,141,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      overflow: "hidden",
    },
    appIcon: {
      width: 62,
      height: 62,
      borderRadius: 16,
    },

    title: {
      textAlign: "center",
      color: textPrimary,
      fontSize: 34,
      fontWeight: "900",
      letterSpacing: -0.9,
    },
    logoText: {
      fontSize: theme.fontSize.lg,
      fontWeight: "800",
      color: theme.colors.primary,
      flexShrink: 1,
      marginRight: 12,
    },
    subtitle: {
      textAlign: "center",
      marginTop: 6,
      marginBottom: 22,
      color: textMuted,
      fontSize: 14,
      fontWeight: "600",
      paddingHorizontal: 8,
    },

    card: {
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 26,
      padding: 18,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.38 : 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
    },

    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      height: 54,
      borderRadius: 16,
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: inputBorder,
      marginBottom: 12,
    },
    input: {
      flex: 1,
      color: textPrimary,
      fontSize: 15.5,
      fontWeight: "700",
    },
    inputPh: {
      color: isDark ? "rgba(148,163,184,0.85)" : "rgba(100,116,139,0.85)",
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
      marginBottom: 14,
      gap: 12,
    },

    rememberWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexShrink: 1,
    },
    rememberText: {
      color: isDark ? "rgba(148,163,184,1)" : "rgba(15,23,42,0.55)",
      fontSize: 13,
      fontWeight: "700",
      flexShrink: 1,
    },

    switchBase: {
      width: 46,
      height: 24,
      borderRadius: 999,
      backgroundColor: isDark
        ? "rgba(148,163,184,0.16)"
        : "rgba(15,23,42,0.10)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
      padding: 2,
      justifyContent: "center",
    },
    switchOn: {
      backgroundColor: isDark
        ? "rgba(77,141,255,0.28)"
        : "rgba(77,141,255,0.25)",
      borderColor: isDark ? "rgba(77,141,255,0.40)" : "rgba(77,141,255,0.35)",
    },
    knob: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FFFFFF",
      transform: [{ translateX: 0 }],
    },
    knobOn: {
      transform: [{ translateX: 22 }],
      backgroundColor: "#FFFFFF",
    },

    forgot: {
      color: link,
      fontSize: 13,
      fontWeight: "900",
    },

    legalWrap: {
      marginTop: 2,
      marginBottom: 16,
      gap: 10,
    },
    legalRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    checkbox: {
      marginTop: 2,
    },
    legalText: {
      flex: 1,
      color: textMuted,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "600",
    },
    legalLink: {
      color: link,
      fontWeight: "900",
      textDecorationLine: "underline",
    },

    buttonOuter: {
      height: 56,
      borderRadius: 16,
      overflow: "hidden",
    },
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    buttonText: {
      color: "#07101D",
      fontSize: 16.5,
      fontWeight: "900",
    },
    buttonArrow: {
      color: "#07101D",
      fontSize: 18,
      fontWeight: "900",
      marginTop: -1,
    },

    bottomRow: {
      marginTop: 18,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      paddingHorizontal: 8,
    },
    bottomText: {
      color: isDark ? "rgba(148,163,184,1)" : "rgba(15,23,42,0.55)",
      fontSize: 13.5,
      fontWeight: "700",
      textAlign: "center",
    },
    bottomLink: {
      color: link,
      fontSize: 13.5,
      fontWeight: "900",
    },
  });
}

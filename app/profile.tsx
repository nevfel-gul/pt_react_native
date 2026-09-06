import { useRouter } from "expo-router";
import { ArrowLeft, Check, Edit3, Trash2, User, X } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TIER_STUDENT_LIMITS, usePremium } from "@/constants/PremiumContext";
import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { studentsColRef } from "@/services/firestorePaths";

import {
  deleteUser,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../services/firebase"; // ✅ sende db export olmalı

type ProfileState = {
  name: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  skills: string;
  business: string;
};

const emptyProfile: ProfileState = {
  name: "",
  username: "",
  email: "",
  phone: "",
  bio: "",
  skills: "",
  business: "",
};

// input klavyeden ne kadar yukarida dursun?
const KEYBOARD_GAP = 130;

const sanitizePhone = (v: string) => {
  const digits = (v ?? "").replace(/\D/g, "");
  return digits.length > 11 ? digits.slice(0, 11) : digits;
};

// ⚠️ Bu iki bileşen daha önce ProfileScreen'in İÇİNDE tanımlıydı. Her render'da
// yeni bir fonksiyon kimliği oluştuğu için React tüm satırları unmount/remount
// ediyordu: kaydederken klavye kapanıyor, input odağı ve yerel metin kayboluyordu.
// Modül seviyesine alındı, ihtiyaç duydukları her şey prop olarak geçiyor.
const Section = ({
  title,
  icon,
  styles,
}: {
  title: string;
  icon?: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) => (
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
  fieldKey,
  value,
  isLast,
  placeholder,
  isEditing,
  onStartEdit,
  onSave,
  onScrollToInput,
  theme,
  styles,
  editLabel,
  saving,
}: {
  label: string;
  subtitle?: string;
  fieldKey: keyof ProfileState;
  value: string;
  isLast?: boolean;
  placeholder?: string;
  isEditing: boolean;
  onStartEdit: (key: keyof ProfileState) => void;
  onSave: (key: keyof ProfileState, next: string) => void;
  onScrollToInput: (input: TextInput | null) => void;
  theme: ThemeUI;
  styles: ReturnType<typeof createStyles>;
  editLabel: string;
  saving: boolean;
}) => {
  const [localValue, setLocalValue] = React.useState(value);
  const inputRef = React.useRef<TextInput>(null);
  const isPhone = fieldKey === "phone";

  React.useEffect(() => {
    if (isEditing) {
      setLocalValue(value);
      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
        onScrollToInput(inputRef.current);
      });
    }
    // onScrollToInput parent'ta useCallback ile sabit
  }, [isEditing, value, onScrollToInput]);

  return (
    <View style={[styles.settingRow, isLast && styles.settingRowLast]}>
      <View style={styles.leftCol}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.rightCol}>
        {!isEditing ? (
          <>
            <Text style={styles.settingValueText} numberOfLines={1}>
              {value || editLabel}
            </Text>
            <TouchableOpacity onPress={() => onStartEdit(fieldKey)}>
              <Edit3 size={16} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inlineEditor}>
              <TextInput
                ref={inputRef}
                value={localValue}
                onChangeText={(v) =>
                  setLocalValue(isPhone ? sanitizePhone(v) : v)
                }
                placeholder={placeholder}
                placeholderTextColor={theme.colors.text.muted}
                style={styles.inlineEditorInput}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => {
                  if (!saving) onSave(fieldKey, localValue);
                }}
                autoCapitalize={
                  fieldKey === "username" || isPhone ? "none" : "sentences"
                }
                autoCorrect={fieldKey !== "username"}
                keyboardType={isPhone ? "number-pad" : "default"}
                maxLength={isPhone ? 11 : undefined}
              />
            </View>

            {/* ✅ X: basınca yazıyı SİL */}
            <TouchableOpacity
              onPress={() => setLocalValue("")}
              activeOpacity={0.75}
              style={[styles.actionBtn, styles.actionBtnGhost]}
              hitSlop={10}
            >
              <X size={16} color={theme.colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onSave(fieldKey, localValue)}
              activeOpacity={0.75}
              disabled={saving}
              style={[
                styles.actionBtn,
                styles.actionBtnPrimary,
                saving && { opacity: 0.6 },
              ]}
              hitSlop={10}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Check size={16} color={theme.colors.surface} />
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const scrollRef = React.useRef<ScrollView>(null);

  const { theme } = useTheme();
  const { t } = useTranslation();
  const { tier, hasPremium, isUnlimited } = usePremium();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [profile, setProfile] = React.useState<ProfileState>(emptyProfile);
  const [editKey, setEditKey] = React.useState<keyof ProfileState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deletingAccount, setDeletingAccount] = React.useState(false);

  // ✅ Profil kartındaki gerçek veriler
  const [studentCount, setStudentCount] = React.useState<number | null>(null);
  const [memberSince, setMemberSince] = React.useState<string | null>(null);

  const startEdit = React.useCallback((key: keyof ProfileState) => {
    // ✅ email'i şimdilik kilitli (reauth gerekir)
    if (key === "email") {
      Alert.alert(
        t("profile.alert.info"),
        t("profile.alert.emailLocked"),
      );
      return;
    }
    setEditKey(key);
  }, [t]);

  // ✅ focus olunca input'u klavyenin üstüne al
  const scrollToKeyboard = React.useCallback((input: TextInput | null) => {
    if (!input) return;
    const node = findNodeHandle(input);
    if (!node) return;
    const responder = scrollRef.current?.getScrollResponder?.();
    responder?.scrollResponderScrollNativeHandleToKeyboard(
      node,
      KEYBOARD_GAP,
      true,
    );
  }, []);

  // ✅ Auth + Firestore'dan profili otomatik doldur
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);

        if (!user) {
          setProfile(emptyProfile);
          setStudentCount(null);
          setMemberSince(null);
          return;
        }

        const uid = user.uid;
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);

        const authName = user.displayName ?? "";
        const authEmail = user.email ?? "";

        if (!snap.exists()) {
          const base: ProfileState = {
            ...emptyProfile,
            name: authName,
            email: authEmail,
          };

          await setDoc(
            userRef,
            {
              uid,
              email: authEmail?.toLowerCase?.() ?? "",
              displayName: authName,
              username: "",
              phone: "",
              bio: "",
              skills: "",
              business: "",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );

          setProfile(base);
          setStudentCount(0);
          setMemberSince(String(new Date().getFullYear()));
          return;
        }

        const data = snap.data() as any;

        const rawUsername = (data?.username ?? "").toString().trim();
        const uiUsername =
          rawUsername.length > 0
            ? rawUsername.startsWith("@")
              ? rawUsername
              : `@${rawUsername}`
            : "";

        setProfile({
          name: (data?.displayName ?? authName ?? "").toString(),
          username: uiUsername,
          email: (data?.email ?? authEmail ?? "").toString(),
          phone: (data?.phone ?? "").toString(),
          bio: (data?.bio ?? "").toString(),
          skills: (data?.skills ?? "").toString(),
          business: (data?.business ?? "").toString(),
        });

        // ⚠️ Kartaki "32 aktif" ve "2024" değerleri sabit yazılmıştı; herkese
        // aynı sahte rakamlar gösteriliyordu. Artık gerçek veriden geliyor.
        const createdAt =
          data?.createdAt?.toDate?.() ??
          (user.metadata?.creationTime
            ? new Date(user.metadata.creationTime)
            : null);
        setMemberSince(createdAt ? String(createdAt.getFullYear()) : null);

        try {
          const countSnap = await getCountFromServer(studentsColRef(uid));
          setStudentCount(countSnap.data().count);
        } catch {
          setStudentCount(null);
        }
      } catch (e: any) {
        Alert.alert(t("recordNew.alert.errorTitle"), e?.message ?? t("profile.alert.fetchError"));
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [t]);

  const handleDeleteAccount = () => {
    Alert.alert(
      t("profile.alert.deleteTitle"),
      t("profile.alert.deleteMessage"),
      [
        {
          text: t("profile.alert.cancel"),
          style: "cancel",
        },
        {
          text: t("profile.alert.confirmDelete"),
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) {
              Alert.alert(t("recordNew.alert.errorTitle"), t("profile.alert.noUser"));
              return;
            }

            try {
              setDeletingAccount(true);

              const uid = user.uid;
              const userRef = doc(db, "users", uid);

              // 1) Firestore kullanıcı dokümanını sil
              await deleteDoc(userRef);

              // 2) Firebase Auth hesabını sil
              await deleteUser(user);

              // 3) Güvenli olması için local oturumu da kapat
              try {
                await signOut(auth);
              } catch {
                // deleteUser sonrası token zaten düşebilir, sessiz geç
              }

              Alert.alert(t("profile.alert.deletedTitle"), t("profile.alert.deletedMessage"));
            } catch (e: any) {
              // Eğer Auth silme başarısız olduysa kullanıcıyı oturumdan çıkar
              // ama kullanıcıya gerçek nedeni açık göster
              try {
                await signOut(auth);
              } catch { }

              if (e?.code === "auth/requires-recent-login") {
                Alert.alert(
                  t("profile.alert.reAuthTitle"),
                  t("profile.alert.reAuthMessage"),
                );
              } else {
                Alert.alert(t("recordNew.alert.errorTitle"), e?.message ?? t("profile.alert.deleteFailedMessage"));
              }
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  // ⚠️ Bu üç değer ("Pro", "32 aktif", "2024") ve alttaki tagline koda sabit
  // yazılmıştı: ücretsiz kullanıcı da kendini Pro, hiç öğrencisi olmayan da
  // 32 müşterili görüyordu. Hepsi artık gerçek veriden türetiliyor.
  const membershipLabel = React.useMemo(() => {
    if (!hasPremium) return t("plan.tier.free");
    if (isUnlimited || tier === "studio") return "Studio";
    return tier === "core" ? "Core" : "Pro";
  }, [hasPremium, isUnlimited, tier, t]);

  const customersLabel = React.useMemo(() => {
    if (studentCount === null) return "—";
    const limit = TIER_STUDENT_LIMITS[tier];
    return limit === null
      ? t("profile.meta.customers_count", { count: studentCount })
      : `${studentCount} / ${limit}`;
  }, [studentCount, tier, t]);

  // Kullanıcının kendi girdiği uzmanlık / işletme bilgisinden kurulur.
  const tagline = React.useMemo(() => {
    const parts = [
      profile.username || null,
      profile.business.trim() || null,
      profile.skills.trim() || null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" • ") : t("profile.card.tagline_empty");
  }, [profile.username, profile.business, profile.skills, t]);

  const saveField = React.useCallback(
    async (fieldKey: keyof ProfileState, rawValue: string) => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);

      let next = (rawValue ?? "").toString().trim();
      if (fieldKey === "phone") next = sanitizePhone(next);

      if (fieldKey === "username") {
        next = next.replace(/^@+/, "").trim().toLowerCase();
        setProfile((p) => ({ ...p, username: next ? `@${next}` : "" }));
      } else {
        setProfile((p) => ({ ...p, [fieldKey]: next }));
      }

      try {
        // ⚠️ Eskiden setLoading(true) çağrılıyordu; o state tam ekran spinner'ı
        // kontrol ediyor ve kayıt sırasında ekranı boşaltabiliyordu.
        setSaving(true);

        const patch: any = { updatedAt: serverTimestamp() };

        if (fieldKey === "name") {
          patch.displayName = next;
          await updateProfile(user, { displayName: next });
        } else if (fieldKey === "username") {
          patch.username = next; // @siz
        } else if (fieldKey === "email") {
          patch.email = next.toLowerCase();
        } else {
          patch[fieldKey] = next;
        }

        await updateDoc(userRef, patch);
        setEditKey(null);
      } catch (e: any) {
        Alert.alert(
          t("recordNew.alert.errorTitle"),
          e?.message ?? t("profile.alert.saveError"),
        );
      } finally {
        setSaving(false);
      }
    },
    [t],
  );

  if (loading && !profile.email && !profile.name) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <ActivityIndicator />
          <Text
            style={{
              marginTop: 10,
              color: theme.colors.text.secondary,
              fontWeight: "600",
            }}
          >
            {t("profile.loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={18} color={theme.colors.text.primary} />
                <Text style={styles.backButtonText}>{t("profile.back")}</Text>
              </TouchableOpacity>

              <Text style={styles.headerTitle}>{t("profile.title")}</Text>
              <View style={{ width: 60 }} />
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              paddingBottom: editKey ? 260 : theme.spacing.xl,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          >
            <Section
              title={t("profile.section.profile")}
              icon={<User size={18} color={theme.colors.primary} />}
              styles={styles}
            />

            {/* PROFILE CARD */}
            <View style={styles.card}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.name?.trim()?.[0]?.toUpperCase() ?? "A"}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{profile.name || "—"}</Text>
                  <Text style={styles.profileEmail}>
                    {profile.email || "—"}
                  </Text>
                  <Text style={styles.profileTag}>{tagline}</Text>
                </View>
              </View>

              <View style={styles.profileMetaRow}>
                <View style={styles.profileMetaItem}>
                  <Text style={styles.profileMetaLabel}>{t("profile.meta.membership")}</Text>
                  <Text style={styles.profileMetaValue}>{membershipLabel}</Text>
                </View>
                <View style={styles.profileMetaItem}>
                  <Text style={styles.profileMetaLabel}>{t("profile.meta.customers")}</Text>
                  <Text style={styles.profileMetaValue}>{customersLabel}</Text>
                </View>
                <View style={styles.profileMetaItem}>
                  <Text style={styles.profileMetaLabel}>{t("profile.meta.registered")}</Text>
                  <Text style={styles.profileMetaValue}>{memberSince ?? "—"}</Text>
                </View>
              </View>
            </View>

            {/* USER INFO */}
            <Section title={t("profile.section.user_info")} styles={styles} />
            <View style={styles.card}>
              <SettingRow
                label={t("profile.field.name.label")}
                subtitle={t("profile.field.name.subtitle")}
                fieldKey="name"
                isEditing={editKey === "name"}
                onStartEdit={startEdit}
                onSave={saveField}
                onScrollToInput={scrollToKeyboard}
                theme={theme}
                styles={styles}
                editLabel={t("profile.value.edit")}
                saving={saving}
                value={profile.name}
                placeholder={t("profile.field.name.placeholder")}
              />
              <SettingRow
                label={t("profile.field.username.label")}
                subtitle={t("profile.field.username.subtitle")}
                fieldKey="username"
                isEditing={editKey === "username"}
                onStartEdit={startEdit}
                onSave={saveField}
                onScrollToInput={scrollToKeyboard}
                theme={theme}
                styles={styles}
                editLabel={t("profile.value.edit")}
                saving={saving}
                value={profile.username}
                placeholder={t("profile.field.username.placeholder")}
              />
              <SettingRow
                label={t("profile.field.email.label")}
                subtitle={t("profile.field.email.subtitle")}
                fieldKey="email"
                isEditing={editKey === "email"}
                onStartEdit={startEdit}
                onSave={saveField}
                onScrollToInput={scrollToKeyboard}
                theme={theme}
                styles={styles}
                editLabel={t("profile.value.edit")}
                saving={saving}
                value={profile.email}
                placeholder={t("profile.field.email.placeholder")}
              />
              <SettingRow
                label={t("profile.field.phone.label")}
                subtitle={t("profile.field.phone.subtitle")}
                fieldKey="phone"
                isEditing={editKey === "phone"}
                onStartEdit={startEdit}
                onSave={saveField}
                onScrollToInput={scrollToKeyboard}
                theme={theme}
                styles={styles}
                editLabel={t("profile.value.edit")}
                saving={saving}
                value={profile.phone}
                placeholder={t("profile.field.phone.placeholder")}
                isLast
              />
            </View>

            {/* BIO */}
            <Section title={t("profile.section.bio")} styles={styles} />
            <View style={styles.card}>
              <SettingRow
                label={t("profile.field.bio.label")}
                subtitle={t("profile.field.bio.subtitle")}
                fieldKey="bio"
                isEditing={editKey === "bio"}
                onStartEdit={startEdit}
                onSave={saveField}
                onScrollToInput={scrollToKeyboard}
                theme={theme}
                styles={styles}
                editLabel={t("profile.value.edit")}
                saving={saving}
                value={profile.bio}
                placeholder={t("profile.field.bio.placeholder")}
              />
              <SettingRow
                label={t("profile.field.skills.label")}
                subtitle={t("profile.field.skills.subtitle")}
                fieldKey="skills"
                isEditing={editKey === "skills"}
                onStartEdit={startEdit}
                onSave={saveField}
                onScrollToInput={scrollToKeyboard}
                theme={theme}
                styles={styles}
                editLabel={t("profile.value.edit")}
                saving={saving}
                value={profile.skills}
                placeholder={t("profile.field.skills.placeholder")}
              />
              <SettingRow
                label={t("profile.field.business.label")}
                subtitle={t("profile.field.business.subtitle")}
                fieldKey="business"
                isEditing={editKey === "business"}
                onStartEdit={startEdit}
                onSave={saveField}
                onScrollToInput={scrollToKeyboard}
                theme={theme}
                styles={styles}
                editLabel={t("profile.value.edit")}
                saving={saving}
                value={profile.business}
                placeholder={t("profile.field.business.placeholder")}
                isLast
              />
            </View>

            {/* HESAP SİLME */}
            <View style={styles.card}>
              <Text style={styles.dangerTitle}>{t("profile.section.deleteAccount")}</Text>
              <Text style={styles.dangerSubtitle}>
                {t("profile.section.deleteAccount.desc")}
              </Text>

              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  deletingAccount && { opacity: 0.7 },
                ]}
                onPress={handleDeleteAccount}
                activeOpacity={0.85}
                disabled={deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <>
                    <Trash2 size={18} color={theme.colors.surface} />
                    <Text style={styles.deleteButtonText}>{t("profile.deleteButton")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (themeui: ThemeUI) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: themeui.colors.background },
    container: { flex: 1, backgroundColor: themeui.colors.background },

    header: {
      paddingHorizontal: themeui.spacing.md,
      paddingTop: themeui.spacing.sm + 4,
      paddingBottom: themeui.spacing.xs + 4,
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: themeui.spacing.sm - 4,
    },

    backButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
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
      fontSize: themeui.fontSize.xl,
      fontWeight: "700",
    },

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
      fontSize: themeui.fontSize.xl,
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
    profileMetaItem: { flex: 1, alignItems: "center" },
    profileMetaLabel: {
      color: themeui.colors.text.muted,
      fontSize: themeui.fontSize.xs,
    },
    profileMetaValue: {
      color: themeui.colors.text.primary,
      fontSize: themeui.fontSize.sm,
      fontWeight: "600",
      marginTop: 2,
    },

    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: themeui.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: themeui.colors.border,
      gap: themeui.spacing.xs,
    },
    settingRowLast: {
      borderBottomWidth: 0,
      paddingBottom: themeui.spacing.xs,
    },

    leftCol: { flex: 1, paddingRight: 10 },

    rightCol: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    settingLabel: {
      color: themeui.colors.text.primary,
      fontSize: themeui.fontSize.sm,
      fontWeight: "500",
    },
    settingSubtitle: {
      color: themeui.colors.text.muted,
      fontSize: themeui.fontSize.xs,
      marginTop: 2,
    },
    settingValueText: {
      maxWidth: 170,
      color: themeui.colors.text.secondary,
      fontSize: themeui.fontSize.sm,
      fontWeight: "500",
    },

    inlineEditor: {
      width: 160,
      height: 32,
      backgroundColor: themeui.colors.surface,
      borderRadius: themeui.radius.md,
      borderWidth: 1,
      borderColor: themeui.colors.border,
      paddingHorizontal: 10,
      justifyContent: "center",
    },
    inlineEditorInput: {
      height: 32,
      paddingVertical: 0,
      color: themeui.colors.text.primary,
      fontSize: themeui.fontSize.sm,
      minWidth: 0,
      flexShrink: 1,
    },

    actionBtn: {
      width: 28,
      height: 28,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: themeui.colors.border,
    },
    actionBtnGhost: {
      backgroundColor: themeui.colors.surface,
    },
    actionBtnPrimary: {
      backgroundColor: themeui.colors.primary,
      borderColor: themeui.colors.primary,
    },

    dangerTitle: {
      color: themeui.colors.text.primary,
      fontSize: themeui.fontSize.md,
      fontWeight: "700",
      marginBottom: 6,
    },
    dangerSubtitle: {
      color: themeui.colors.text.secondary,
      fontSize: themeui.fontSize.sm,
      lineHeight: 20,
      marginBottom: themeui.spacing.md,
    },
    deleteButton: {
      height: 46,
      borderRadius: themeui.radius.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      backgroundColor: "#D92D20",
    },
    deleteButtonText: {
      color: themeui.colors.surface,
      fontSize: themeui.fontSize.sm,
      fontWeight: "700",
    },
  });

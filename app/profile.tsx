import { themeui } from "@/constants/themeui";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Edit3, User, X } from "lucide-react-native";
import React from "react";
import {
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

type ProfileState = {
  name: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  skills: string;
  business: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const scrollRef = React.useRef<ScrollView>(null);

  const [profile, setProfile] = React.useState<ProfileState>({
    name: "Yağmur Koca",
    username: "@pt.yagmur",
    email: "yagmur.koca@example.com",
    phone: "+90 5xx xxx xx xx",
    bio: "",
    skills: "",
    business: "PT Lab",
  });

  const [editKey, setEditKey] = React.useState<keyof ProfileState | null>(null);
  const [tempValue, setTempValue] = React.useState("");

  // ✅ input klavyeden ne kadar yukarıda dursun?
  const KEYBOARD_GAP = 130;

  const startEdit = (key: keyof ProfileState) => {
    setEditKey(key);
    setTempValue(profile[key] ?? "");
  };

  // ✅ focus olunca input'u klavyenin üstüne al
  const scrollToKeyboard = (input: TextInput | null) => {
    if (!input) return;
    const node = findNodeHandle(input);
    if (!node) return;
    const responder = scrollRef.current?.getScrollResponder?.();
    responder?.scrollResponderScrollNativeHandleToKeyboard(node, KEYBOARD_GAP, true);
  };

  const Section = ({
    title,
    icon,
  }: {
    title: string;
    icon?: React.ReactNode;
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
  }: {
    label: string;
    subtitle?: string;
    fieldKey: keyof ProfileState;
    value: string;
    isLast?: boolean;
    placeholder?: string;
  }) => {
    const isEditing = editKey === fieldKey;
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
      if (isEditing) setLocalValue(value);
    }, [isEditing]);

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
                {value || "Düzenle"}
              </Text>
              <TouchableOpacity onPress={() => startEdit(fieldKey)}>
                <Edit3 size={16} color={themeui.colors.text.secondary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inlineEditor}>
                <TextInput
                  value={localValue}
                  onChangeText={setLocalValue}
                  placeholder={placeholder}
                  placeholderTextColor={themeui.colors.text.muted}
                  style={styles.inlineEditorInput}
                  returnKeyType="done"
                  blurOnSubmit
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  setEditKey(null);
                }}
                activeOpacity={0.75}
                style={[styles.actionBtn, styles.actionBtnGhost]}
                hitSlop={10}
              >
                <X size={16} color={themeui.colors.text.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setProfile((p) => ({ ...p, [fieldKey]: localValue }));
                  setEditKey(null);
                }}
                activeOpacity={0.75}
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                hitSlop={10}
              >
                <Check size={16} color={themeui.colors.surface} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: themeui.colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <ArrowLeft size={18} color={themeui.colors.text.primary} />
                <Text style={styles.backButtonText}>Geri</Text>
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Profil</Text>
              <View style={{ width: 60 }} />
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              paddingBottom: editKey ? 260 : themeui.spacing.xl,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          >
            <Section title="Profil" icon={<User size={18} color={themeui.colors.primary} />} />

            {/* PROFILE CARD */}
            <View style={styles.card}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.name?.trim()?.[0]?.toUpperCase() ?? "Y"}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  <Text style={styles.profileEmail}>{profile.email}</Text>
                  <Text style={styles.profileTag}>PT • Reformer Pilates • Online Coaching</Text>
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

            {/* USER INFO */}
            <View style={styles.card}>
              <SettingRow
                label="İsim"
                subtitle="Uygulamada gözükecek adın"
                fieldKey="name"
                value={profile.name}
                placeholder="Örn: Yağmur Koca"
              />
              <SettingRow
                label="Kullanıcı Adı"
                subtitle="Profil linkinde kullanılacak"
                fieldKey="username"
                value={profile.username}
                placeholder="Örn: @pt.yagmur"
              />
              <SettingRow
                label="E-posta"
                subtitle="Giriş ve bildirimler için"
                fieldKey="email"
                value={profile.email}
                placeholder="Örn: mail@domain.com"
              />
              <SettingRow
                label="Telefon"
                subtitle="Müşteri iletişimi için"
                fieldKey="phone"
                value={profile.phone}
                placeholder="Örn: +90 5xx xxx xx xx"
                isLast
              />
            </View>

            {/* BIO */}
            <View style={styles.card}>
              <SettingRow
                label="Biyografi"
                subtitle="Kendini kısaca tanıt"
                fieldKey="bio"
                value={profile.bio}
                placeholder="Örn: 8 yıllık PT, reformer ve online koçluk..."
              />
              <SettingRow
                label="Uzmanlık Alanların"
                subtitle="Reformer, Fonksiyonel Antrenman..."
                fieldKey="skills"
                value={profile.skills}
                placeholder="Örn: Reformer, Fonksiyonel, Mobilite..."
              />
              <SettingRow
                label="İşletme Adı"
                subtitle="Müşterilerin göreceği marka"
                fieldKey="business"
                value={profile.business}
                placeholder="Örn: PT Lab"
                isLast
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
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
  avatarText: { color: themeui.colors.surface, fontSize: 22, fontWeight: "800" },
  profileName: {
    color: themeui.colors.text.primary,
    fontSize: themeui.fontSize.xl,
    fontWeight: "700",
  },
  profileEmail: {
    color: themeui.colors.text.secondary,
    fontSize: themeui.fontSize.sm,
  },
  profileTag: { color: themeui.colors.primary, fontSize: themeui.fontSize.xs, marginTop: 2 },

  profileMetaRow: {
    flexDirection: "row",
    marginTop: themeui.spacing.xs,
    justifyContent: "space-between",
  },
  profileMetaItem: { flex: 1, alignItems: "center" },
  profileMetaLabel: { color: themeui.colors.text.muted, fontSize: themeui.fontSize.xs },
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

  chev: {
    width: 28,
    height: 28,
    borderRadius: themeui.radius.pill,
    backgroundColor: themeui.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: themeui.colors.border,
    alignItems: "center",
    justifyContent: "center",
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
});

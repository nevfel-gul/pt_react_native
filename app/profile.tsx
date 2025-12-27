import { themeui } from "@/constants/themeui";
import { useRouter } from "expo-router";
import { ArrowLeft, Edit3, User } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
    const router = useRouter();

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
        value,
        onPress,
        isLast,
    }: {
        label: string;
        subtitle?: string;
        value?: string;
        onPress?: () => void;
        isLast?: boolean;
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

            {value ? <Text style={styles.settingValueText}>{value}</Text> : null}

            <View style={styles.chev}>
                <Edit3 size={16} color="#94a3b8" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <ArrowLeft size={18} color="#f1f5f9" />
                            <Text style={styles.backButtonText}>Geri</Text>
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>Profil</Text>
                        <View style={{ width: 60 }} />
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
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
                            value="Yağmur Öztürk"
                            onPress={() => { }}
                        />
                        <SettingRow
                            label="Kullanıcı Adı"
                            subtitle="Profil linkinde kullanılacak"
                            value="@pt.yagmur"
                            onPress={() => { }}
                        />
                        <SettingRow
                            label="E-posta"
                            subtitle="Giriş ve bildirimler için"
                            value="yagmur.ozturk@example.com"
                            onPress={() => { }}
                        />
                        <SettingRow
                            label="Telefon"
                            subtitle="Müşteri iletişimi için"
                            value="+90 5xx xxx xx xx"
                            onPress={() => { }}
                            isLast
                        />
                    </View>

                    {/* BIO */}
                    <View style={styles.card}>
                        <SettingRow label="Biyografi" subtitle="Kendini kısaca tanıt" value="Düzenle" onPress={() => { }} />
                        <SettingRow
                            label="Uzmanlık Alanların"
                            subtitle="Reformer, Fonksiyonel Antrenman..."
                            value="Düzenle"
                            onPress={() => { }}
                        />
                        <SettingRow
                            label="İşletme Adı"
                            subtitle="Müşterilerin göreceği marka"
                            value="PT Lab"
                            onPress={() => { }}
                            isLast
                        />
                    </View>
                </ScrollView>
            </View>
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
    backButtonText: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.sm },
    headerTitle: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.xl, fontWeight: "700" },

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
    sectionTitle: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.md, fontWeight: "600" },

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
    profileName: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.xl, fontWeight: "700" },
    profileEmail: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.sm },
    profileTag: { color: themeui.colors.primary, fontSize: themeui.fontSize.xs, marginTop: 2 },

    profileMetaRow: { flexDirection: "row", marginTop: themeui.spacing.xs, justifyContent: "space-between" },
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
    settingLabel: { color: themeui.colors.text.primary, fontSize: themeui.fontSize.sm, fontWeight: "500" },
    settingSubtitle: { color: themeui.colors.text.muted, fontSize: themeui.fontSize.xs, marginTop: 2 },
    settingValueText: { color: themeui.colors.text.secondary, fontSize: themeui.fontSize.sm, fontWeight: "500" },

    chev: {
        width: 28,
        height: 28,
        borderRadius: themeui.radius.pill,
        backgroundColor: themeui.colors.surfaceSoft,
        borderWidth: 1,
        borderColor: themeui.colors.border,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: themeui.spacing.xs,
    },
});


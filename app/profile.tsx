import { useRouter } from "expo-router";
import { ArrowLeft, Edit3, User } from "lucide-react-native";
import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#020617" },
    container: { flex: 1, backgroundColor: "#020617" },

    header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#1e293b",
    },
    backButtonText: { color: "#f1f5f9", fontSize: 13 },
    headerTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: "700" },

    card: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: "#0f172a",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#1e293b",
        padding: 16,
    },

    sectionHeader: { marginHorizontal: 16, marginTop: 10, marginBottom: 6 },
    sectionTitle: { color: "#f1f5f9", fontSize: 14, fontWeight: "600" },

    profileRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
    avatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "#60a5fa",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { color: "#0f172a", fontSize: 22, fontWeight: "800" },
    profileName: { color: "#f1f5f9", fontSize: 18, fontWeight: "700" },
    profileEmail: { color: "#94a3b8", fontSize: 12 },
    profileTag: { color: "#60a5fa", fontSize: 11, marginTop: 2 },

    profileMetaRow: { flexDirection: "row", marginTop: 8, justifyContent: "space-between" },
    profileMetaItem: { flex: 1, alignItems: "center" },
    profileMetaLabel: { color: "#64748b", fontSize: 11 },
    profileMetaValue: { color: "#f1f5f9", fontSize: 13, fontWeight: "600", marginTop: 2 },

    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#1e293b",
        gap: 8,
    },
    settingRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 4,
    },
    settingLabel: { color: "#f1f5f9", fontSize: 13, fontWeight: "500" },
    settingSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
    settingValueText: { color: "#94a3b8", fontSize: 12, fontWeight: "500" },
    chev: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#0b1220",
        borderWidth: 1,
        borderColor: "#1e293b",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
});

import { themeui } from "@/constants/themeui";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "firebase/auth";
import { ArrowRight, Dna, Eye, EyeOff, Lock, Mail, User } from "lucide-react-native";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { auth } from "../services/firebase";

export default function Login() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!email || !password || (!isLoginMode && !name)) {
            alert("Lütfen tüm alanları doldur cano.");
            return;
        }

        try {
            setLoading(true);
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Kayıt olurken ismi profil verisine ekliyoruz
                await updateProfile(userCredential.user, { displayName: name });
            }
            router.replace("/(tabs)");
        } catch (error: any) {
            console.error("Auth hatası:", error.message);
            alert(`Hata: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Üst Kısım / Logo */}
                <View style={styles.headerArea}>
                    <View style={styles.logoCircle}>
                        <Dna size={40} color={themeui.colors.primary} />
                    </View>
                    <Text style={styles.welcomeText}>
                        {isLoginMode ? "Tekrar Hoş Geldin" : "Aramıza Katıl"}
                    </Text>
                    <Text style={styles.subText}>
                        {isLoginMode ? "Verilerini yönetmeye devam et" : "Sporcularını analiz etmeye başla"}
                    </Text>
                </View>

                {/* Form Kartı */}
                <View style={styles.formCard}>
                    {!isLoginMode && (
                        <View style={styles.inputWrapper}>
                            <User size={20} color="#64748b" style={styles.inputIcon} />
                            <TextInput
                                placeholder="Adın Soyadın"
                                value={name}
                                onChangeText={setName}
                                style={styles.input}
                                placeholderTextColor="#64748b"
                            />
                        </View>
                    )}

                    <View style={styles.inputWrapper}>
                        <Mail size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                            placeholder="E-posta Adresin"
                            value={email}
                            onChangeText={setEmail}
                            style={styles.input}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Lock size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                            placeholder="Şifren"
                            placeholderTextColor="#64748b"
                            secureTextEntry={!isPasswordVisible}
                            value={password}
                            onChangeText={setPassword}
                            style={[styles.input, { flex: 1 }]}
                        />
                        <TouchableOpacity
                            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                            style={styles.eyeIcon}
                        >
                            {isPasswordVisible ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.rememberMe}>
                            <Switch
                                value={rememberMe}
                                onValueChange={setRememberMe}
                                trackColor={{ false: "#1e293b", true: themeui.colors.primary }}
                                thumbColor="#f8fafc"
                            />
                            <Text style={styles.rememberText}>Beni hatırla</Text>
                        </View>
                        {isLoginMode && (
                            <TouchableOpacity>
                                <Text style={styles.forgotText}>Şifremi Unuttum</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={[themeui.colors.primary, "#3b82f6"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buttonGradient}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? "İşlem yapılıyor..." : (isLoginMode ? "Giriş Yap" : "Kayıt Ol")}
                            </Text>
                            <ArrowRight size={20} color="#0f172a" strokeWidth={3} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Alt Mod Değiştirme */}
                <TouchableOpacity
                    onPress={() => setIsLoginMode(!isLoginMode)}
                    style={styles.toggleMode}
                >
                    <Text style={styles.toggleText}>
                        {isLoginMode
                            ? "Henüz hesabın yok mu? "
                            : "Zaten buralarda mısın? "}
                        <Text style={styles.toggleTextHighlight}>
                            {isLoginMode ? "Kayıt Ol" : "Giriş Yap"}
                        </Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0A0F1A", // Uygulamanın ana karanlık teması
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
    },
    headerArea: {
        alignItems: "center",
        marginBottom: 40,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(56, 189, 248, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "rgba(56, 189, 248, 0.2)",
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: "900",
        color: "#fff",
        letterSpacing: -1,
    },
    subText: {
        fontSize: 16,
        color: "#94a3b8",
        marginTop: 8,
    },
    formCard: {
        backgroundColor: "#111827",
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "#1f2937",
        ...themeui.shadow.soft,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#0A0F1A",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#1e293b",
        marginBottom: 16,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        color: "#fff",
        fontSize: 16,
    },
    eyeIcon: {
        padding: 8,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        marginTop: 4,
    },
    rememberMe: {
        flexDirection: "row",
        alignItems: "center",
    },
    rememberText: {
        color: "#94a3b8",
        marginLeft: 8,
        fontSize: 14,
    },
    forgotText: {
        color: themeui.colors.primary,
        fontSize: 14,
        fontWeight: "600",
    },
    button: {
        height: 56,
        borderRadius: 16,
        overflow: "hidden",
    },
    buttonGradient: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    buttonText: {
        color: "#0f172a",
        fontWeight: "800",
        fontSize: 18,
    },
    toggleMode: {
        marginTop: 32,
        alignItems: "center",
    },
    toggleText: {
        color: "#94a3b8",
        fontSize: 15,
    },
    toggleTextHighlight: {
        color: themeui.colors.primary,
        fontWeight: "700",
    },
});
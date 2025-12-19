import { useRouter } from "expo-router";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "firebase/auth";
import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../services/firebase";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [rememberMe, setRememberMe] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        try {
            const persistence = rememberMe
                ? browserLocalPersistence
                : browserSessionPersistence;

            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }

            router.replace("/(tabs)/kolpa");
        } catch (error: any) {
            console.error("Auth hatası:", error.message);
            alert(`Bir hata oluştu: ${error.message}`);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>
                    {isLoginMode ? "Giriş Yap" : "Hesap Oluştur"}
                </Text>

                <TextInput
                    placeholder="ornek@mail.com"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    placeholderTextColor={"slategray"}
                />

                <View style={styles.passwordContainer}>
                    <TextInput
                        placeholder="••••••••"
                        placeholderTextColor={"slategray"}
                        secureTextEntry={!isPasswordVisible}
                        value={password}
                        onChangeText={setPassword}
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    />
                    <TouchableOpacity
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={styles.iconButton}
                    >
                        {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </TouchableOpacity>
                </View>

                <View style={styles.rememberMe}>
                    <Switch
                        value={rememberMe}
                        onValueChange={setRememberMe}
                        trackColor={{ false: "#334155", true: "#6366f1" }}
                        thumbColor="#f8fafc"
                        ios_backgroundColor="#334155"
                    />

                    <Text style={{ marginLeft: 8 }}>Beni hatırla</Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                    <Text style={styles.buttonText}>
                        {isLoginMode ? "Giriş Yap" : "Kayıt Ol"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setIsLoginMode(!isLoginMode)}
                    style={{ marginTop: 12 }}
                >
                    <Text style={{ color: "#4f46e5" }}>
                        {isLoginMode
                            ? "Hesabın yok mu? Kayıt Ol"
                            : "Zaten hesabın var mı? Giriş Yap"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#4f46e5",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        width: "90%",
        maxWidth: 400,
        elevation: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
        color: "#333",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 15,
        color: "#333",
    },
    button: {
        backgroundColor: "#4f46e5",
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        textAlign: "center",
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 15,
    },
    iconButton: {
        marginLeft: 8,
        padding: 8,
    },
    rememberMe: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 15,
    },
});

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { auth } from "@/services/firebase";
import { initI18n } from "@/services/i18n";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

// ✅ SENİN THEME PROVIDER
import { ThemeProvider as AppThemeProvider, useTheme } from "@/constants/usetheme";
import { db } from "@/services/firebase";
import { registerForPushNotificationsAsync } from "@/services/registerForPush";
import * as Notifications from "expo-notifications";
import { doc, getDoc, setDoc } from "firebase/firestore";

// 🔔 FOREGROUND BİLDİRİM HANDLER
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  anchor: "/",
};

function AppNav() {
  const { mode } = useTheme(); // ✅ artık cihaz değil, app theme
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function setupPush() {
      if (!user) return;

      try {
        // 🔎 Önce user doc’u çek
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        const pushEnabled = snap.data()?.pushEnabled ?? false;

        if (!pushEnabled) {
          console.log("Push disabled → token alınmadı");
          return;
        }

        const token = await registerForPushNotificationsAsync();
        if (!token) return;

        await setDoc(
          userRef,
          {
            pushToken: token,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        console.log("Push token kaydedildi");
      } catch (err) {
        console.log("Push setup error:", err);
      }
    }

    setupPush();
  }, [user]);


  useEffect(() => {
    if (!loading && !user) {
      router.replace("/landing");
    }
  }, [loading, user, router]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await initI18n();
        if (mounted) setI18nReady(true);
      } catch (e) {
        console.log("i18n init error:", e);
        if (mounted) setI18nReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 10 }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!i18nReady) return null;

  return (
    <ThemeProvider value={mode === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ title: "Login", headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="student/[id]" options={{ title: "Öğrenci", headerShown: false }} />
        <Stack.Screen name="newrecord/[id]" options={{ title: "Yeni Kayıt", headerShown: false }} />
        <Stack.Screen name="record/[id]" options={{ title: "Kayıt", headerShown: false }} />
        <Stack.Screen name="newstudent" options={{ title: "Yeni Öğrenci", headerShown: false }} />
        <Stack.Screen name="landing" options={{ title: "Hoşgeldiniz", headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // ✅ önce app theme hydrate olsun diye en dıştan sardırıyoruz
  return (
    <AppThemeProvider>
      <AppNav />
    </AppThemeProvider>
  );
}

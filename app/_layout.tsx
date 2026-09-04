import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { auth } from "@/services/firebase";
import { initI18n } from "@/services/i18n";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Platform, Text, View } from "react-native";

// ✅ SENİN THEME PROVIDER
import { ThemeProvider as AppThemeProvider, useTheme } from "@/constants/usetheme";
import { PremiumProvider } from "@/constants/PremiumContext";
import { db } from "@/services/firebase";
import {
  ensureAndroidChannelAsync,
  registerForPushNotificationsAsync,
} from "@/services/registerForPush";
import * as Notifications from "expo-notifications";
import { doc, getDoc, setDoc } from "firebase/firestore";

// 🔔 FOREGROUND BİLDİRİM HANDLER
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 🔗 Bildirime tıklandığında gidilecek ekran
function routeForNotification(data: any): string | null {
  const studentId = typeof data?.studentId === "string" ? data.studentId : null;
  if (studentId) return `/student/${studentId}`;

  switch (data?.screen) {
    case "analytics":
      return "/(tabs)/analiz";
    case "premium":
      return "/(tabs)/premium";
    default:
      return null;
  }
}

export const unstable_settings = {
  anchor: "/",
};

function AppNav() {
  const { mode } = useTheme(); // ✅ artık cihaz değil, app theme
  const router = useRouter();
  const { t } = useTranslation();

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
    let cancelled = false;

    async function setupPush() {
      // Android kanalı kullanıcıdan bağımsız, açılışta bir kez kurulur.
      try {
        await ensureAndroidChannelAsync();
      } catch (err) {
        console.warn("Push channel error:", err);
      }

      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        // Kayıt sırasında pushEnabled true yazılır; alan yoksa da açık kabul et.
        const pushEnabled = snap.data()?.pushEnabled ?? true;
        if (!pushEnabled) return;

        const result = await registerForPushNotificationsAsync();
        if (cancelled || result.status !== "granted") return;

        // Token değişmediyse gereksiz yazma yapma.
        if (snap.data()?.pushToken === result.token) return;

        await setDoc(
          userRef,
          {
            pushToken: result.token,
            pushPlatform: Platform.OS,
            pushTokenUpdatedAt: new Date(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Push setup error:", err);
      }
    }

    setupPush();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // 🔔 Bildirime tıklama → ilgili ekrana git (uygulama kapalıyken de çalışır)
  useEffect(() => {
    if (!user) return;

    const go = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data;
      const route = routeForNotification(data);
      if (route) router.push(route as any);
    };

    // Uygulama bildirime tıklanarak açıldıysa
    Notifications.getLastNotificationResponseAsync().then(go).catch(() => {});

    const subscription =
      Notifications.addNotificationResponseReceivedListener(go);

    return () => subscription.remove();
  }, [user, router]);


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
        <Stack.Screen name="student/[id]" options={{ title: t("screen.student"), headerShown: false }} />
        <Stack.Screen name="newrecord/[id]" options={{ title: t("screen.newRecord"), headerShown: false }} />
        <Stack.Screen name="record/[id]" options={{ title: t("screen.record"), headerShown: false }} />
        <Stack.Screen name="newstudent" options={{ title: t("screen.newStudent"), headerShown: false }} />
        <Stack.Screen name="landing" options={{ title: t("screen.welcome"), headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // ✅ önce app theme hydrate olsun diye en dıştan sardırıyoruz
  return (
    <AppThemeProvider>
      <PremiumProvider>
        <AppNav />
      </PremiumProvider>
    </AppThemeProvider>
  );
}

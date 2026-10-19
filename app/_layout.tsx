import { maybePromptForPush } from "@/services/push-permission";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { auth, db } from "@/services/firebase";
import { initI18n, syncUserLanguage } from "@/services/i18n";
import { onIdTokenChanged, User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { CONTENT_MAX_WIDTH, useIsTablet } from "@/constants/layout";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, AppState, Platform, Text, View } from "react-native";

// ✅ SENİN THEME PROVIDER
import { ThemeProvider as AppThemeProvider, useTheme } from "@/constants/usetheme";
import { PremiumProvider } from "@/constants/PremiumContext";
import { PromoProvider } from "@/constants/PromoContext";
import { PopupProvider } from "@/constants/PopupContext";
import { RatingProvider } from "@/constants/RatingContext";
import { UnitsProvider } from "@/constants/UnitsContext";
import PromoPopup from "@/components/PromoPopup";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import WidgetSync from "@/components/WidgetSync";
import ForceUpdateGate from "@/components/ForceUpdateGate";
import AppLockGate from "@/components/AppLockGate";
import { identifyUser, resetAnalytics, setUserProperties, track } from "@/services/analytics";
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
  const { mode, theme } = useTheme(); // ✅ artık cihaz değil, app theme
  const isTablet = useIsTablet();
  // Navigasyon arka planı uygulamanınkiyle aynı olsun: iPad'de ortalanan
  // içeriğin iki yanında beyaz/siyah şerit kalmasın.
  const navTheme = useMemo(() => {
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: theme.colors.background } };
  }, [mode, theme.colors.background]);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    let prevUid: string | null = null;
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setCheckingAccess(true);
      try {
        const result = await firebaseUser?.getIdTokenResult();
        if (auth.currentUser?.uid !== firebaseUser?.uid) return;
        setRequiresVerification(result?.claims.email_verification_required === true && result?.claims.email_verified !== true);
        setUser(firebaseUser);
        setLoading(false);
      } catch {
        // Keep access closed until the token can be read; never assume verified.
        setUser(firebaseUser);
        setRequiresVerification(!!firebaseUser);
        setLoading(false);
      } finally { setCheckingAccess(false); }

      // Analitik kimliği: sadece uid — e-posta/ad gönderilmez.
      if (firebaseUser) {
        identifyUser(firebaseUser.uid);
      } else if (prevUid) {
        resetAnalytics();
      }
      prevUid = firebaseUser?.uid ?? null;
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (i18n.language) setUserProperties({ appLanguage: i18n.language });
  }, [i18n.language]);

  // Sunucudaki bildirim / e-posta / AI dili için dili hesaba yaz. Dil servisi
  // yüklenmeden yazılırsa yanlış (varsayılan) dil kaydedilirdi.
  useEffect(() => {
    if (user && !requiresVerification && i18nReady) syncUserLanguage();
  }, [user, requiresVerification, i18nReady]);

  useEffect(() => {
    let cancelled = false;

    async function setupPush() {
      // Android kanalı kullanıcıdan bağımsız, açılışta bir kez kurulur.
      try {
        await ensureAndroidChannelAsync();
      } catch (err) {
        console.warn("Push channel error:", err);
      }

      if (!user || requiresVerification) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        // Kayıt sırasında pushEnabled true yazılır; alan yoksa da açık kabul et.
        const pushEnabled = snap.data()?.pushEnabled ?? true;
        if (!pushEnabled) return;

        const result = await registerForPushNotificationsAsync(false);
        track("push_permission_result", { status: result.status });
        if (cancelled || auth.currentUser?.uid !== user.uid || result.status !== "granted") return;

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
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void setupPush(); });

    return () => {
      subscription.remove();
      cancelled = true;
    };
  }, [user, requiresVerification]);

  // 🔔 Bildirime tıklama → ilgili ekrana git (uygulama kapalıyken de çalışır)
  useEffect(() => {
    if (!user || requiresVerification) return;

    const go = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data;
      track("push_opened", {
        type: typeof data?.type === "string" ? data.type : typeof data?.screen === "string" ? data.screen : null,
      });
      const route = routeForNotification(data);
      if (route) router.push(route as any);
    };

    // Uygulama bildirime tıklanarak açıldıysa
    Notifications.getLastNotificationResponseAsync().then(go).catch(() => {});

    const subscription =
      Notifications.addNotificationResponseReceivedListener(go);

    return () => subscription.remove();
  }, [user, requiresVerification, router]);


  useEffect(() => {
    if (loading || checkingAccess) return;
    const page = segments[0] as string;
    if (!user && !['landing', 'login', 'forgot-password'].includes(page)) router.replace('/landing');
    else if (user && requiresVerification && page !== 'verify-email') router.replace('/verify-email');
  }, [loading, checkingAccess, user, requiresVerification, segments, router]);

  useEffect(() => {
    if (!user || requiresVerification) return;
    const recordActivity = () => {
      if (AppState.currentState !== 'active') return;
      void setDoc(doc(db, 'users', user.uid), { lastActiveAt: new Date() }, { merge: true }).catch(() => {});
      if (pathname === '/') void maybePromptForPush();
    };
    recordActivity();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') recordActivity(); });
    return () => sub.remove();
  }, [user, requiresVerification, pathname]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await initI18n();
        if (mounted) setI18nReady(true);
      } catch {
        if (mounted) setI18nReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || checkingAccess) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ marginTop: 10 }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!i18nReady) return null;

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={
          isTablet
            ? { contentStyle: { width: "100%", maxWidth: CONTENT_MAX_WIDTH, alignSelf: "center", backgroundColor: theme.colors.background } }
            : undefined
        }
      >
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Login", headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="student/[id]" options={{ title: t("screen.student"), headerShown: false }} />
        <Stack.Screen name="newrecord/[id]" options={{ title: t("screen.newRecord"), headerShown: false }} />
        <Stack.Screen name="record/[id]" options={{ title: t("screen.record"), headerShown: false }} />
        <Stack.Screen name="newstudent" options={{ title: t("screen.newStudent"), headerShown: false }} />
        <Stack.Screen name="landing" options={{ title: t("screen.welcome"), headerShown: false }} />
      </Stack>
      {/* Kupon popup'ı — kullanıcı hangi ekranda olursa olsun çıkabilsin diye
          navigasyonun dışında, en üstte duruyor. */}
      {user && !requiresVerification ? <PromoPopup /> : null}
      {user && !requiresVerification ? <AnnouncementPopup /> : null}
      {!requiresVerification ? <WidgetSync /> : null}
      <AppLockGate active={!!user} />
      <ForceUpdateGate />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // ✅ önce app theme hydrate olsun diye en dıştan sardırıyoruz
  return (
    <AppThemeProvider>
      <PremiumProvider>
        <PromoProvider>
          <PopupProvider>
            <RatingProvider>
              <UnitsProvider>
                <AppNav />
              </UnitsProvider>
            </RatingProvider>
          </PopupProvider>
        </PromoProvider>
      </PremiumProvider>
    </AppThemeProvider>
  );
}

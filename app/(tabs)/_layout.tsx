import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import PremiumStarIcon from "@/constants/PremiumStarIcon";
import { useTheme } from "@/constants/usetheme";
import { auth } from "@/services/firebase";
import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const hasPremium = false;
  const router = useRouter();
  const [authReady, setAuthReady] = React.useState(false);
  const [isAuthed, setIsAuthed] = React.useState<boolean>(!!auth.currentUser);
  const { t } = useTranslation();

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setIsAuthed(!!u);
      setAuthReady(true);
      if (!u) router.replace("/login");
    });
    return unsub;
  }, [router]);

  if (!authReady) return null;
  if (!isAuthed) return null;

  const premiumHref = hasPremium ? undefined : "/premium";

  const glow = {
    backgroundColor: mode === "light" ? "rgba(56,189,248,0.12)" : "rgba(56,189,248,0.10)",
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 10,
  } as const;

  const iconWrap = {
    padding: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  } as const;

  // ✅ Tab bar ölçüsü (şişmesin)
  const TAB_BASE = 60; // ikon+label gövdesi
  const TAB_HEIGHT = TAB_BASE + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.text.muted,

        // ✅ en kritik: tab bar şişmesin, ekstra katman oluşturmasın
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,

          height: TAB_HEIGHT,
          paddingBottom: Math.max(insets.bottom - 2, 8),
          paddingTop: 6,

          backgroundColor: "transparent", // ✅ background'u aşağıda çiziyoruz
          borderTopWidth: 0,              // ✅ ayrı çizgi/katman olmasın
          elevation: 0,                   // ✅ android shadow kapalı (istersen açarız)
        },

        // ✅ tab bar arkaplanı: tek katman (kalın şerit hissi çoğu zaman burada bitiyor)
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === "ios" ? 35 : 0}
            tint={mode === "dark" ? "dark" : "light"}
            style={{
              flex: 1,
              backgroundColor:
                mode === "dark"
                  ? "rgba(6,10,18,0.88)"
                  : "rgba(248,250,252,0.92)",
            }}
          />
        ),

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginBottom: Platform.OS === "ios" ? 2 : 0,
        },

        tabBarButton: HapticTab,
      }}
      initialRouteName="index"
    >
      {/* 1) DASHBOARD */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.dashboard"),
          tabBarIcon: ({ color, focused }) => (
            <View style={[iconWrap, focused && glow]}>
              <IconSymbol size={28} name="house.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* 2) TAKVİM */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("tabs.calendar"),
          tabBarIcon: ({ color, focused }) => (
            <View style={[iconWrap, focused && glow]}>
              <IconSymbol size={26} name="calendar" color={color} />
            </View>
          ),
        }}
      />

      {/* 3) ANALİZ */}
      <Tabs.Screen
        name="analiz"
        options={{
          title: t("tabs.analiz"),
          tabBarIcon: ({ color, focused }) => (
            <View style={[iconWrap, focused && glow]}>
              <IconSymbol size={28} name="chart.bar.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* 4) AYARLAR */}
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color, focused }) => (
            <View style={[iconWrap, focused && glow]}>
              <IconSymbol size={28} name="gearshape.fill" color={color} />
            </View>
          ),
        }}
      />

      {/* 5) PREMIUM */}
      <Tabs.Screen
        name="premium"
        options={{
          title: t("tabs.premium"),
          href: premiumHref,

          tabBarLabel: ({ focused }) => (
            <View>
              <Text
                style={{
                  color: theme.colors.gold,
                  fontWeight: "700",
                  fontSize: 9,
                  opacity: focused ? 1 : 0.75,
                }}
              >
                {t("tabs.premium")}
              </Text>
            </View>
          ),

          tabBarIcon: ({ focused }) => <PremiumStarIcon focused={focused} theme={theme} size={28} />,
        }}
      />
    </Tabs>
  );
}

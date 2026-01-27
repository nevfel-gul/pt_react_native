import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/constants/usetheme";
import { auth } from "@/services/firebase";
import { Tabs, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";


export default function TabLayout() {
  const { theme, mode } = useTheme();
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
    backgroundColor:
      mode === "light" ? "rgba(56,189,248,0.12)" : "rgba(56,189,248,0.10)",
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          paddingTop: 10,
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

      {/* 2) TAKVİM  (dosya adın takvim.tsx olmalı) */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("tabs.calendar"),
          tabBarIcon: ({ color, focused }) => (
            <View style={[iconWrap, focused && glow]}>
              <IconSymbol size={26} name={focused ? "calendar" : "calendar"} color={color} />
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
          tabBarIcon: ({ color, focused }) => (
            <View style={[iconWrap, focused && glow]}>
              <IconSymbol size={28} name="crown.fill" color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

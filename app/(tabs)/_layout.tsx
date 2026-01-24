import AnimatedStar from "@/components/AnimatedStar";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { auth } from "@/services/firebase";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

export default function TabLayout() {
  const colorScheme = useColorScheme();
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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#020617",
          borderTopColor: "#1e293b",
          paddingTop: 10,
        },
        tabBarButton: HapticTab,
      }}
      initialRouteName="index"
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.dashboard"),
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                {
                  padding: 8,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                },
                focused && {
                  backgroundColor: "rgba(56,189,248,0.10)",
                  shadowColor: "#38bdf8",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  elevation: 6,
                },
              ]}
            >
              <IconSymbol size={28} name="house.fill" color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="kolpa"
        options={{
          title: t("tabs.kolpa"),
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                {
                  padding: 8,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                },
                focused && {
                  backgroundColor: "rgba(56,189,248,0.10)",
                  shadowColor: "#38bdf8",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                  elevation: 6,
                },
              ]}
            >
              <IconSymbol size={26} name="paperplane.fill" color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                {
                  padding: 8,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                },
                focused && {
                  backgroundColor: "rgba(56,189,248,0.10)",
                  shadowColor: "#38bdf8",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                  elevation: 10,
                },
              ]}
            >
              <IconSymbol size={28} name="gearshape.fill" color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="premium"
        options={{
          title: t("tabs.premium"),
          tabBarIcon: ({ focused }) => <AnimatedStar focused={focused} />,
          href: premiumHref,
        }}
      />
    </Tabs>
  );
}

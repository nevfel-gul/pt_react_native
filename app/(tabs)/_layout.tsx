import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const hasPremium = true;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#020617",
          borderTopColor: "#1e293b",
        },
        tabBarButton: HapticTab,
      }}
      initialRouteName="index"

    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
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
                  backgroundColor: "rgba(56,189,248,0.10)", // glow
                  shadowColor: "#38bdf8",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  elevation: 6, // android
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
          title: "Kolpa",
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
                  backgroundColor: "rgba(56,189,248,0.10)", // glow
                  shadowColor: "#38bdf8",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                  elevation: 6, // android
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
          title: "Settings",
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
                  backgroundColor: "rgba(56,189,248,0.10)", // glow
                  shadowColor: "#38bdf8",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 6,
                  elevation: 10, // Android
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
          title: "Premium Al",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="star.fill" color={color} />
          ),
          href: hasPremium ? null : "/premium",
        }}
      />

    </Tabs>
  );
}

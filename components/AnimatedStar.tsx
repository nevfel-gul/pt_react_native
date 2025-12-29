import { IconSymbol } from "@/components/ui/icon-symbol";
import { themeui } from "@/constants/themeui";
import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export default function AnimatedStar({ focused }: { focused: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.7)).current;

  const rotate = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0.6,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: focused ? 1.3 : 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(scale, {
        toValue: focused ? 1.1 : 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(rotate, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-15deg", "15deg"], 
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale }, { rotate: spin }],
        shadowColor: themeui.colors.gold,
        shadowOpacity: glow,
        shadowRadius: focused ? 15 : 8,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <IconSymbol name="star.fill" size={30} color={themeui.colors.gold} />
    </Animated.View>
  );
}

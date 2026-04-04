import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getThemeUI } from "./themeui";
import type { ThemeMode, ThemeUI } from "./types";

interface ThemeContextType {
  mode: ThemeMode;
  theme: ThemeUI;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "app-theme-mode";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  // ✅ ilk açılışta kaydı oku
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "dark" || saved === "light") {
          setModeState(saved);
        }
      } catch (e) {
        console.warn("Theme mode load error:", e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const theme = useMemo(() => getThemeUI(mode), [mode]);

  // ✅ mode değişince kaydet
  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, mode);
      } catch (e) {
        console.warn("Theme mode save error:", e);
      }
    })();
  }, [mode, hydrated]);

  const toggleTheme = () => setModeState((p) => (p === "dark" ? "light" : "dark"));
  const setMode = (newMode: ThemeMode) => setModeState(newMode);

  return (
    <ThemeContext.Provider value={{ mode, theme, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};

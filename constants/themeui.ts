import type { ThemeMode, ThemeUI } from "./types";

export const darkTheme: ThemeUI = {
  colors: {
    background: "#020617",
    surface: "#0f172a",
    surfaceSoft: "#1e293b",
    surfaceDark: "#0A0F1A",
    surfaceHover: "#122031",
    surfaceElevated: "rgba(30,41,59,0.65)",

    text: {
      primary: "rgb(241, 245, 249)",
      secondary: "#94a3b8",
      muted: "#64748b",
      accent: "#38bdf8",
      lightAccent: "#79c6e7ff",
      onAccent: "#0f172a"
    },
    logoText: "hsla(198, 93%, 70%, 1.00)",
    primary: "#60a5fa",
    accent: "#38bdf8",
    editButtonbackground: "#38bdf8",
    success: "#22c55e",
    successSoft: "rgba(34,197,94,0.15)",
    danger: "#ef4444",
    dangerSoft: "rgba(248,113,113,0.15)",

    border: "#1e293b",
    black: "#000000",
    premium: "#7c3aed",
    premiumSoft: "rgba(124,58,237,0.15)",

    gold: "#facc15",
    goldSoft: "rgba(250,204,21,0.15)",

    info: "#3b82f6",
    warning: "#f59e0b",

    filterAll: "#0A0F1A",
    filterActive: "#3a8b55",
    filterPassive: "#993131",

    overlay: "rgba(0,0,0,0.55)",
    white: ""
  },

  radius: { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 },
  spacing: { xs: 6, sm: 10, md: 16, lg: 20, xl: 28 },
  fontSize: { xs: 11, sm: 12, md: 14, lg: 16, xl: 18, title: 20 },
  white: "#ffffff",
  shadow: {
    soft: { shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
    strong: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },

  },
};

export const nightTheme: ThemeUI = {
  ...darkTheme,
  colors: {
    ...darkTheme.colors,
    gold: "#fbbf24",
    goldSoft: "rgba(251,191,36,0.18)",

    background: "#f8fafc",
    surface: "#ffffff",
    surfaceSoft: "#f1f5f9",
    surfaceDark: "#e2e8f0",
    surfaceHover: "#e9eff7",
    surfaceElevated: "rgba(15, 23, 42, 0.06)",

    text: {
      primary: "#0f172a",
      secondary: "#334155",
      muted: "#64748b",
      accent: "#0284c7",
      lightAccent: "#38bdf8",
      onAccent: "#ffffff"
    },
    white: "#ffffff",
    logoText: "#0f172a",
    border: "#e2e8f0",
    overlay: "rgba(2, 6, 23, 0.45)",

    filterAll: "#e2e8f0",
    filterActive: "#16a34a",
    filterPassive: "#dc2626",
  },

  shadow: {
    soft: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
    strong: { shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 10, elevation: 6 },
  },
};

export function getThemeUI(mode: ThemeMode): ThemeUI {
  return mode === "dark" ? darkTheme : nightTheme;
}

/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "TodayWidget",
  displayName: "AthleTrack",
  bundleIdentifier: ".widget",
  // containerBackground ve modern WidgetKit API'leri için. Daha eski iOS'ta
  // uygulama çalışmaya devam eder, sadece widget listede görünmez.
  deploymentTarget: "17.0",
  icon: "../../assets/images/icon.png",
  // Anahtarlar light / dark olmalı (color / darkColor DEĞİL): yanlış anahtarla
  // colorset'ler boş üretiliyor ve widget'taki tüm yazılar görünmez oluyordu.
  colors: {
    $accent: { light: "#0284c7", dark: "#38bdf8" },
    $widgetBackground: { light: "#ffffff", dark: "#0f172a" },
    textPrimary: { light: "#0f172a", dark: "#f1f5f9" },
    textMuted: { light: "#64748b", dark: "#94a3b8" },
    danger: { light: "#dc2626", dark: "#ef4444" },
    warning: { light: "#d97706", dark: "#f59e0b" },
    chip: { light: "#f1f5f9", dark: "#1e293b" },
  },
  entitlements: {
    // Uygulamayla aynı App Group — snapshot buradan okunur (services/widgetData.ts).
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});

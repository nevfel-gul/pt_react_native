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
  colors: {
    $accent: { color: "#0284c7", darkColor: "#38bdf8" },
    $widgetBackground: { color: "#ffffff", darkColor: "#0f172a" },
    textPrimary: { color: "#0f172a", darkColor: "#f1f5f9" },
    textMuted: { color: "#64748b", darkColor: "#94a3b8" },
    danger: { color: "#dc2626", darkColor: "#ef4444" },
    warning: { color: "#d97706", darkColor: "#f59e0b" },
    chip: { color: "#f1f5f9", darkColor: "#1e293b" },
  },
  entitlements: {
    // Uygulamayla aynı App Group — snapshot buradan okunur (services/widgetData.ts).
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});

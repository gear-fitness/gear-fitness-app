import { useColorScheme } from "react-native";

export function useThemeColors() {
  const isDark = useColorScheme() === "dark";

  return {
    isDark,
    bg: isDark ? "#000" : "#fff",
    surface: isDark ? "#1C1C1E" : "#F2F2F7",
    text: isDark ? "#fff" : "#000",
    inputText: isDark ? "#fff" : "#000",
    secondary: isDark ? "#999" : "#666",
    border: isDark ? "#3A3A3C" : "#D1D1D6",
    separator: isDark ? "#2C2C2E" : "#E5E5EA",
    inputBg: isDark ? "#1C1C1E" : "#F2F2F7",
    cardBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    pill: isDark ? "#3A3A3C" : "#E5E5EA",
    pillText: isDark ? "#ccc" : "#555",
    pillActive: "#007AFF",
    pillActiveText: "#fff",
    selected: isDark ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.1)",
    selectedBorder: "#007AFF",
    handle: isDark ? "#555" : "#C7C7CC",
    dashedBorder: isDark ? "#333" : "#C7C7CC",
    positionBg: isDark ? "#3A3A3C" : "#E5E5EA",
    tint: "#007AFF",
    danger: "#FF3B30",
    // Onboarding-specific tokens
    accent: isDark ? "#fff" : "#000",
    accentText: isDark ? "#000" : "#fff",
    unitToggleBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
    unitBtnActiveBg: isDark ? "#2C2C2E" : "#fff",
    photoBg: isDark ? "#3A3A3C" : "#E5E5EA",
    trackBg: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
  };
}

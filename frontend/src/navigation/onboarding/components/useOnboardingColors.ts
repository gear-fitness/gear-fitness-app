import { useThemeColors } from "../../../hooks/useThemeColors";

export function useOnboardingColors() {
  const c = useThemeColors();
  return {
    ...c,
    screenBg: c.isDark ? c.bg : c.surface,
    cardBg: c.isDark ? c.surface : c.bg,
    inputText: c.inputText,
  };
}

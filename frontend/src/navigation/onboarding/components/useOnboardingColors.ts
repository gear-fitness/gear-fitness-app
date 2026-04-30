import { useThemeColors } from "../../../hooks/useThemeColors";

export function useOnboardingColors() {
  const c = useThemeColors();
  return {
    ...c,
    screenBg: c.appBg,
  };
}

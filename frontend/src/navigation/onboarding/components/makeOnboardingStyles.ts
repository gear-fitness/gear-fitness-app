import { StyleSheet } from "react-native";
import { useThemeColors } from "../../../hooks/useThemeColors";

type ThemeColors = ReturnType<typeof useThemeColors>;

export function makeOnboardingStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1 },
    body: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 22,
    },
    heading: {
      fontSize: 32,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -1,
      lineHeight: 36,
      marginBottom: 5,
    },
    subheading: {
      fontSize: 14,
      color: c.secondary,
      lineHeight: 21,
      marginBottom: 24,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 44,
      paddingTop: 10,
    },
    continueBtn: {
      height: 60,
      borderRadius: 999,
      backgroundColor: c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    continueBtnDisabled: {
      opacity: 0.4,
    },
    continueBtnText: {
      fontSize: 17,
      fontWeight: "700",
      color: c.accentText,
      letterSpacing: -0.2,
    },
  });
}

import { useColorScheme } from "react-native";

/**
 * Colour tokens for the DM screens.
 *
 * These mirror the palette `Profile.tsx` defines inline — the app's established
 * language — so messages don't drift from the rest of the app.
 *
 * Why this exists rather than react-navigation's `useTheme().colors`: that
 * palette has no muted-text token, so muted copy ends up using `colors.border`
 * (a heavy divider grey), which reads washed out and is semantically wrong. The
 * app's own convention is rgba text at 0.5 / 0.35.
 *
 * Bubbles deliberately do NOT use `surface`: a #fff bubble on the #fafafa page
 * has almost no edge, and #141414 on #0a0a0a is worse. Incoming bubbles get
 * their own slightly-lifted greys; outgoing bubbles invert to the app's
 * monochrome primary.
 */
export type DmTheme = {
  isDark: boolean;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  bubbleIn: string;
  bubbleInText: string;
  bubbleOut: string;
  bubbleOutText: string;
  danger: string;
};

const LIGHT: DmTheme = {
  isDark: false,
  bg: "#fafafa",
  surface: "#ffffff",
  text: "#000000",
  textMuted: "rgba(0,0,0,0.5)",
  textFaint: "rgba(0,0,0,0.35)",
  border: "rgba(0,0,0,0.08)",
  bubbleIn: "#ececec",
  bubbleInText: "#000000",
  bubbleOut: "#000000",
  bubbleOutText: "#ffffff",
  danger: "#e5484d",
};

const DARK: DmTheme = {
  isDark: true,
  bg: "#0a0a0a",
  surface: "#141414",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.55)",
  textFaint: "rgba(255,255,255,0.4)",
  border: "rgba(255,255,255,0.08)",
  bubbleIn: "#232323",
  bubbleInText: "#ffffff",
  bubbleOut: "#ffffff",
  bubbleOutText: "#000000",
  danger: "#e5484d",
};

export function useDmTheme(): DmTheme {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}

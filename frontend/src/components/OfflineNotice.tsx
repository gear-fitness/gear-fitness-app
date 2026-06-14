import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useThemeColors";

interface Props {
  /**
   * Short instruction shown beneath the wifi-off symbol. Defaults to a generic
   * "go back online" message.
   */
  message?: string;
  /**
   * Optional headline rendered above the message — bolder than the message
   * itself. Defaults to "You're offline".
   */
  title?: string;
}

const DEFAULT_TITLE = "You're offline";
const DEFAULT_MESSAGE = "Go back online to continue.";

/**
 * Centered no-wifi icon with a short instruction. Rendered as a placeholder
 * for screens whose content can't be shown without network access (settings
 * edits, user posts list, etc.).
 */
export function OfflineNotice({
  message = DEFAULT_MESSAGE,
  title = DEFAULT_TITLE,
}: Props) {
  const { isDark, textFaint } = useThemeColors();
  // Bespoke empty-state opacity ramp; only the message matches a shared token.
  const iconColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
  const titleColor = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";
  const messageColor = textFaint;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="wifi" size={96} color={iconColor} />
        <View
          style={[styles.slash, { backgroundColor: iconColor }]}
          pointerEvents="none"
        />
      </View>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      <Text style={[styles.message, { color: messageColor }]}>{message}</Text>
    </View>
  );
}

const ICON_SIZE = 96;
const SLASH_WIDTH = 110;
const SLASH_HEIGHT = 5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  slash: {
    position: "absolute",
    width: SLASH_WIDTH,
    height: SLASH_HEIGHT,
    borderRadius: SLASH_HEIGHT / 2,
    transform: [{ rotate: "-45deg" }],
  },
  title: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});

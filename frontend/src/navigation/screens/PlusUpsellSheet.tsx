import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { useThemeColors } from "../../hooks/useThemeColors";

const PLUS_ACCENT = "#4F6BF6";

/**
 * Lightweight bottom-sheet upsell for Gear Plus, shown as a transparentModal.
 * A dimmed backdrop (tap to dismiss) with a card anchored to the bottom of the
 * screen. Any gated surface can trigger it via
 * `navigation.navigate("PlusUpsell", { feature: "..." })`.
 */
export function PlusUpsellSheet() {
  const navigation = useNavigation() as any;
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const feature = (route.params as { feature?: string } | undefined)?.feature;
  const body =
    feature ??
    "Get more routines, full exercise history, all charts, and streak restores.";

  const dismiss = () => navigation.goBack();
  const upgrade = () => navigation.replace("Paywall");

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={dismiss} />
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            paddingBottom: 20 + insets.bottom,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <SymbolView
            name="sparkle"
            size={34}
            tintColor={PLUS_ACCENT}
            resizeMode="scaleAspectFit"
            style={styles.icon}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Unlock with Plus
        </Text>
        <Text style={[styles.body, { color: colors.secondary }]}>{body}</Text>

        <Pressable
          onPress={upgrade}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: PLUS_ACCENT },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>Upgrade to Plus</Text>
        </Pressable>

        <Pressable onPress={dismiss} style={styles.secondaryBtn}>
          <Text style={[styles.secondaryBtnText, { color: colors.secondary }]}>
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  icon: {
    width: 34,
    height: 34,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.8,
  },
});

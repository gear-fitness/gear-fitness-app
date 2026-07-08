import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { Text } from "../../components/Text";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { useThemeColors } from "../../hooks/useThemeColors";

const PLUS_ACCENT = "#4F6BF6";
const OFFSCREEN = Dimensions.get("window").height;

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

  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 2,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateClose = (after: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: OFFSCREEN,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => after());
  };

  const dismiss = () => animateClose(() => navigation.goBack());
  const upgrade = () => navigation.replace("Paywall");

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            paddingBottom: 20 + insets.bottom,
            transform: [{ translateY }],
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
      </Animated.View>
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
    backgroundColor: "#000",
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

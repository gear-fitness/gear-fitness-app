import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { Text } from "../../components/Text";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { captureRef } from "react-native-view-shot";

import { getWorkoutDetails, deleteWorkout } from "../../api/workoutService";
import type { WorkoutDetail } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import {
  ShareWorkoutCard,
  type ShareCardTheme,
} from "../../components/ShareWorkoutCard";
import { Checkerboard } from "../../components/Checkerboard";
import { resolveBodyVariant } from "../../utils/muscleActivations";

type RootStackParamList = {
  ShareWorkout: {
    workoutId: string;
    ownerUserId?: string;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, "ShareWorkout">;

const THEMES: ShareCardTheme[] = ["transparent", "dark", "light"];

export function ShareWorkout({ route }: Props) {
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDarkScreen = scheme === "dark";
  const { workoutId, ownerUserId } = route.params;
  const { user } = useAuth();

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState<null | "save" | "copy" | "share">(null);

  const cardRefs = useRef<Array<View | null>>([]);
  const scrollWidth = useRef(0);

  const isOwn = ownerUserId === undefined || ownerUserId === user?.userId;
  const bodyVariant = isOwn ? resolveBodyVariant(user?.gender) : "male";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getWorkoutDetails(workoutId);
        if (!cancelled) setWorkout(data);
      } catch (e) {
        if (!cancelled) {
          Alert.alert("Couldn't load workout", "Try again in a moment.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  // Clamp card height so the modal header and action bar don't overlap it.
  // Reserve: header (~64) + dots row (~36) + actions bar (~140) + slack (~80).
  const maxCardHeight = screenHeight - 320;
  const idealWidth = Math.min(320, screenWidth - 80);
  const idealHeight = Math.round((idealWidth * 16) / 9);
  const cardHeight = Math.min(idealHeight, maxCardHeight);
  const cardWidth = Math.round((cardHeight * 9) / 16);

  const screenTheme = useMemo(
    () =>
      isDarkScreen
        ? {
            bg: "#0f0f0f",
            surface: "#1a1a1a",
            text: "#fff",
            muted: "rgba(255,255,255,0.5)",
            divider: "rgba(255,255,255,0.08)",
            actionBg: "rgba(255,255,255,0.1)",
            actionFg: "#fff",
            dotInactive: "rgba(255,255,255,0.25)",
            dotActive: "#ff4d2e",
          }
        : {
            bg: "#f5f5f5",
            surface: "#ffffff",
            text: "#000",
            muted: "rgba(0,0,0,0.5)",
            divider: "rgba(0,0,0,0.08)",
            actionBg: "#e6e6e6",
            actionFg: "#000",
            dotInactive: "rgba(0,0,0,0.2)",
            dotActive: "#ff4d2e",
          },
    [isDarkScreen],
  );

  async function captureActiveCard(
    result: "tmpfile" | "base64",
  ): Promise<string> {
    const node = cardRefs.current[activeIndex];
    if (!node) throw new Error("card not mounted");
    return captureRef(node, { format: "png", quality: 1, result });
  }

  async function onSave() {
    if (busy) return;
    setBusy("save");
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow photo library access in Settings to save share cards.",
        );
        return;
      }
      const uri = await captureActiveCard("tmpfile");
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved", "Image saved to your photo library.");
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function onCopy() {
    if (busy) return;
    setBusy("copy");
    try {
      const base64 = await captureActiveCard("base64");
      await Clipboard.setImageAsync(base64);
      Alert.alert("Copied", "Image copied to clipboard.");
    } catch (e: any) {
      Alert.alert("Couldn't copy", e?.message ?? "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function onShare() {
    if (busy) return;
    setBusy("share");
    try {
      const uri = await captureActiveCard("tmpfile");
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Share not available",
          "Sharing isn't supported on this device.",
        );
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share workout",
      });
    } catch (e: any) {
      Alert.alert("Couldn't share", e?.message ?? "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  function onDelete() {
    if (!isOwn) return;
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWorkout(workoutId);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert("Couldn't delete", e?.message ?? "Unknown error");
            }
          },
        },
      ],
    );
  }

  function onPageScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const w = scrollWidth.current;
    if (w <= 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / w);
    if (idx !== activeIndex && idx >= 0 && idx < THEMES.length) {
      setActiveIndex(idx);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: screenTheme.bg }]}>
      {loading || !workout ? (
        <View style={styles.center}>
          <ActivityIndicator color={screenTheme.text} />
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onPageScroll}
            onLayout={(e) => {
              scrollWidth.current = e.nativeEvent.layout.width;
            }}
            contentContainerStyle={styles.pagerContent}
            style={styles.pager}
          >
            {THEMES.map((theme, i) => (
              <View key={theme} style={[styles.page, { width: screenWidth }]}>
                <View
                  style={[
                    styles.cardOuter,
                    { width: cardWidth, height: cardHeight },
                  ]}
                >
                  {theme === "transparent" && (
                    <>
                      <View
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      >
                        <Checkerboard
                          width={cardWidth}
                          height={cardHeight}
                          cellSize={24}
                          light={isDarkScreen ? "#4a4a4a" : "#ffffff"}
                          dark={isDarkScreen ? "#2a2a2a" : "#cccccc"}
                        />
                      </View>
                      {/* Dark overlay so card content remains legible against
                          the checkerboard. Preview-only — sits outside the
                          captureRef target, so the captured PNG keeps a
                          truly transparent background. */}
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          { backgroundColor: "rgba(0,0,0,0.6)" },
                        ]}
                        pointerEvents="none"
                      />
                    </>
                  )}
                  <ShareWorkoutCard
                    ref={(node) => {
                      cardRefs.current[i] = node;
                    }}
                    durationMin={workout.durationMin}
                    exerciseCount={workout.exercises.length}
                    exercises={workout.exercises}
                    bodyVariant={bodyVariant}
                    theme={theme}
                    width={cardWidth}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dotsRow}>
            {THEMES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === activeIndex
                        ? screenTheme.dotActive
                        : screenTheme.dotInactive,
                  },
                ]}
              />
            ))}
          </View>

          <View
            style={[styles.actionsBar, { borderTopColor: screenTheme.divider }]}
          >
            <Text style={[styles.actionsLabel, { color: screenTheme.text }]}>
              Share to
            </Text>
            <View style={styles.actionsRow}>
              <ActionButton
                label="Save"
                icon="arrow-down"
                onPress={onSave}
                busy={busy === "save"}
                theme={screenTheme}
              />
              <ActionButton
                label="Share"
                icon="arrow-up"
                onPress={onShare}
                busy={busy === "share"}
                theme={screenTheme}
              />
              <ActionButton
                label="Copy"
                icon="copy"
                onPress={onCopy}
                busy={busy === "copy"}
                theme={screenTheme}
              />
            </View>
            {isOwn && (
              <TouchableOpacity
                onPress={onDelete}
                activeOpacity={0.7}
                style={[
                  styles.deleteBtn,
                  { borderTopColor: screenTheme.divider },
                ]}
                accessibilityLabel="Delete workout"
              >
                <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                <Text style={styles.deleteText}>Delete workout</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  busy,
  theme,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  busy: boolean;
  theme: {
    actionBg: string;
    actionFg: string;
    text: string;
  };
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={busy}
      style={styles.actionItem}
    >
      <View style={[styles.actionCircle, { backgroundColor: theme.actionBg }]}>
        {busy ? (
          <ActivityIndicator color={theme.actionFg} size="small" />
        ) : (
          <Ionicons name={icon} size={20} color={theme.actionFg} />
        )}
      </View>
      <Text style={[styles.actionLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pager: {
    flexGrow: 0,
  },
  pagerContent: {
    alignItems: "center",
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  cardOuter: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsBar: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
  },
  actionItem: {
    alignItems: "center",
    gap: 6,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  deleteBtn: {
    marginTop: 18,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteText: {
    color: "#e74c3c",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});

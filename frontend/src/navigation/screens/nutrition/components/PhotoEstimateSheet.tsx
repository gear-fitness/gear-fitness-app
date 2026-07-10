import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../../../components/Text";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import { BottomSheet } from "../../../../components/BottomSheet";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useNutrition } from "../../../../context/NutritionContext";
import {
  AiPhotoEstimate,
  aiPhotoEstimate,
  logFood,
} from "../../../../api/nutritionService";

// Photo food logging sheet. Flow: compose (thumbnail + optional caption for
// context) -> analyzing (AI vision estimate) -> results (per-item review,
// "Log all") or error (retry returns to compose with the caption kept).
// Logging failures stay on the results phase: already-saved items are marked
// "Logged" and the retry logs only the remainder, never re-analyzing.
// Entries are logged as quick-add snapshots with sourceType "PHOTO", which
// the journal materializes into lines (and its AI reaper never touches).

type Phase = "compose" | "analyzing" | "results" | "error";

const round = (n: number) => Math.round(n);

export function PhotoEstimateSheet({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}) {
  const t = useThemeColors();
  const { selectedDate, refresh } = useNutrition();

  const [phase, setPhase] = useState<Phase>("compose");
  const [caption, setCaption] = useState("");
  const [estimate, setEstimate] = useState<AiPhotoEstimate | null>(null);
  const [removed, setRemoved] = useState<Record<number, boolean>>({});
  // Items (by estimate index) already persisted by a previous logAll attempt
  // this session, so a partial-failure retry only logs the remainder.
  const [logged, setLogged] = useState<Record<number, boolean>>({});
  const [errorText, setErrorText] = useState("");
  const [logging, setLogging] = useState(false);

  // Ref mirrors of removed/logged. logAll's skip check reads these instead of
  // the state objects captured when the batch started, so a removal made while
  // an earlier item is in flight still skips the removed item.
  const removedRef = useRef<Record<number, boolean>>({});
  const loggedRef = useRef<Record<number, boolean>>({});
  const updateRemoved = (next: Record<number, boolean>) => {
    removedRef.current = next;
    setRemoved(next);
  };
  const updateLogged = (next: Record<number, boolean>) => {
    loggedRef.current = next;
    setLogged(next);
  };

  // True once any logFood succeeded this session. Closing the sheet after a
  // partial failure (or mid-batch) still refreshes the journal so entries
  // that persisted server-side show up without waiting for a tab refocus.
  const hasLoggedThisSessionRef = useRef(false);

  // Monotonic session id. Every open/close/new-photo (and every fresh analyze)
  // starts a new session; async work captures the id and bails out of state
  // updates if the session has moved on, so a stale AI response for photo A
  // can never surface under photo B.
  const sessionRef = useRef(0);

  // The BottomSheet contract: content must survive until the close animation
  // finishes, so hold the last non-null uri rather than rendering from the
  // (possibly already cleared) prop.
  const lastUriRef = useRef<string | null>(null);
  if (uri) lastUriRef.current = uri;
  const photoUri = uri ?? lastUriRef.current;

  // Fresh session every time the sheet opens for a new photo. The id bump is
  // unconditional so closing the sheet also invalidates in-flight work.
  useEffect(() => {
    sessionRef.current += 1;
    if (visible) {
      setPhase("compose");
      setCaption("");
      setEstimate(null);
      updateRemoved({});
      updateLogged({});
      setErrorText("");
      setLogging(false);
      hasLoggedThisSessionRef.current = false;
    } else if (hasLoggedThisSessionRef.current) {
      // The sheet closed with entries persisted this session (partial-failure
      // dismiss, or a close during a batch). Best-effort journal refresh;
      // refs only, no sheet state updates after close.
      hasLoggedThisSessionRef.current = false;
      refresh().catch(() => {});
    }
  }, [visible, uri]);

  // Gentle pulse on the analyzing label, same feel as the journal's
  // thinking states.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== "analyzing") {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  const analyze = async () => {
    if (!photoUri) return;
    // New attempt = new session; any older in-flight analyze becomes stale.
    const session = ++sessionRef.current;
    setPhase("analyzing");
    try {
      // ~1024px JPEG keeps the base64 payload in the low hundreds of KB.
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1024 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );
      // Bail before the paid AI call if the sheet closed or the photo changed.
      if (sessionRef.current !== session) return;
      if (!manipulated.base64) throw new Error("no base64");
      const result = await aiPhotoEstimate({
        imageBase64: manipulated.base64,
        mimeType: "image/jpeg",
        note: caption.trim() || undefined,
      });
      if (sessionRef.current !== session) return;
      if (result.noFood || result.foods.length === 0) {
        setErrorText(
          "No food detected in this photo. Try a clearer shot, or add a caption describing what you ate.",
        );
        setPhase("error");
        return;
      }
      setEstimate(result);
      updateRemoved({});
      updateLogged({});
      setErrorText("");
      setPhase("results");
    } catch (err: any) {
      if (sessionRef.current !== session) return;
      const status = err?.response?.status;
      if (status === 503) {
        setErrorText(
          "You've reached today's photo logging limit. It resets tomorrow.",
        );
      } else if (status === 403) {
        setErrorText("Photo logging requires Gear Plus.");
      } else {
        setErrorText(
          "Couldn't analyze the photo. Check your connection and try again.",
        );
      }
      setPhase("error");
    }
  };

  // Kept and not yet persisted; a partial-failure retry only logs these.
  const pendingFoods =
    estimate?.foods.filter((_, index) => !removed[index] && !logged[index]) ??
    [];

  const totalCalories = pendingFoods.reduce(
    (sum, f) => sum + (f.calories ?? 0),
    0,
  );

  const logAll = async () => {
    if (logging || pendingFoods.length === 0 || !estimate) return;
    const session = sessionRef.current;
    setLogging(true);
    setErrorText("");
    let anyLogged = estimate.foods.some((_, index) => loggedRef.current[index]);
    try {
      for (let index = 0; index < estimate.foods.length; index++) {
        // Read the ref mirrors, not the state captured at press time, so a
        // removal made while an earlier item was in flight is honored here.
        if (removedRef.current[index] || loggedRef.current[index]) continue;
        const food = estimate.foods[index];
        await logFood({
          date: selectedDate,
          quantity: 1,
          unit: "SERVING",
          description: food.description,
          calories: food.calories,
          proteinG: food.proteinG,
          carbsG: food.carbsG,
          fatG: food.fatG,
          sourceType: "PHOTO",
        });
        // The entry above persisted server-side regardless of what happens
        // next in this closure.
        hasLoggedThisSessionRef.current = true;
        // Stop touching state (and stop logging more) if the session ended,
        // but refresh so the just-persisted entry reaches the journal.
        if (sessionRef.current !== session) {
          hasLoggedThisSessionRef.current = false;
          refresh().catch(() => {});
          return;
        }
        anyLogged = true;
        updateLogged({ ...loggedRef.current, [index]: true });
      }
    } catch (err) {
      console.error("Failed to log photo foods:", err);
      if (sessionRef.current !== session) return;
      // Stay on the results phase so the retry logs only the remainder
      // instead of re-analyzing and duplicating what already saved.
      setErrorText(
        anyLogged
          ? "Some items could not be logged. Tap the button to retry the rest."
          : "Couldn't save the entries. Please try again.",
      );
      setLogging(false);
      return;
    }
    // One refresh after the batch instead of per-entry context churn. A
    // refresh failure shouldn't strand the user: everything is persisted,
    // so close anyway and let the journal catch up on its next load. This
    // refresh covers the whole session, so clear the flag first; the close
    // handler must not fire a second one.
    hasLoggedThisSessionRef.current = false;
    await refresh().catch(() => {});
    if (sessionRef.current !== session) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      keyboardDismiss
      bodyDrag={false}
    >
      <View style={styles.body}>
        {phase === "compose" && (
          <>
            <Text style={[styles.title, { color: t.text }]}>Log by photo</Text>
            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                style={styles.thumb}
                resizeMode="cover"
              />
            )}
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add context (optional): brands, ingredients, size"
              placeholderTextColor={t.secondary}
              maxLength={200}
              returnKeyType="done"
              accessibilityLabel="Photo caption"
              style={[
                styles.captionInput,
                { color: t.text, borderColor: t.border },
              ]}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: t.accent }]}
              onPress={analyze}
            >
              <Ionicons name="sparkles" size={16} color={t.accentText} />
              <Text style={[styles.primaryBtnText, { color: t.accentText }]}>
                Analyze photo
              </Text>
            </TouchableOpacity>
          </>
        )}

        {phase === "analyzing" && (
          <>
            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                style={styles.thumb}
                resizeMode="cover"
              />
            )}
            <Animated.View style={[styles.analyzingRow, { opacity: pulse }]}>
              <ActivityIndicator size="small" color={t.tint} />
              <Text style={[styles.analyzingText, { color: t.text }]}>
                Analyzing photo
              </Text>
            </Animated.View>
            <Text style={[styles.analyzingHint, { color: t.secondary }]}>
              Spotting foods and estimating portions
            </Text>
          </>
        )}

        {phase === "results" && estimate && (
          <>
            <Text style={[styles.title, { color: t.text }]}>
              Here's what we found
            </Text>
            <ScrollView
              style={styles.resultsList}
              contentContainerStyle={{ gap: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {estimate.foods.map((food, index) => {
                if (removed[index]) return null;
                const isLogged = !!logged[index];
                return (
                  <View
                    key={`${index}-${food.description}`}
                    style={[
                      styles.resultRow,
                      { backgroundColor: t.surface, borderColor: t.cardBorder },
                      isLogged && { opacity: 0.55 },
                    ]}
                  >
                    <View style={styles.resultInfo}>
                      <Text
                        style={[styles.resultName, { color: t.text }]}
                        numberOfLines={2}
                      >
                        {food.description}
                      </Text>
                      <Text
                        style={[styles.resultMacros, { color: t.secondary }]}
                      >
                        {round(food.calories)} cal · P {round(food.proteinG)}g ·
                        C {round(food.carbsG)}g · F {round(food.fatG)}g
                      </Text>
                    </View>
                    {isLogged ? (
                      <View
                        style={styles.loggedTag}
                        accessibilityLabel={`${food.description} logged`}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={t.secondary}
                        />
                        <Text
                          style={[styles.loggedTagText, { color: t.secondary }]}
                        >
                          Logged
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        accessibilityLabel={`Remove ${food.description}`}
                        hitSlop={8}
                        disabled={logging}
                        style={logging && { opacity: 0.5 }}
                        onPress={() =>
                          updateRemoved({
                            ...removedRef.current,
                            [index]: true,
                          })
                        }
                      >
                        <Ionicons
                          name="close-circle"
                          size={22}
                          color={t.secondary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {!!estimate.reasoning && (
                <Text style={[styles.reasoning, { color: t.secondary }]}>
                  {estimate.reasoning}
                  {estimate.confidence != null
                    ? ` (${estimate.confidence}% confident)`
                    : ""}
                </Text>
              )}
            </ScrollView>

            {!!errorText && (
              <Text style={[styles.resultsError, { color: t.danger }]}>
                {errorText}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: t.accent },
                (logging || pendingFoods.length === 0) && { opacity: 0.5 },
              ]}
              disabled={logging || pendingFoods.length === 0}
              onPress={logAll}
            >
              {logging ? (
                <ActivityIndicator size="small" color={t.accentText} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: t.accentText }]}>
                  Log {pendingFoods.length}{" "}
                  {pendingFoods.length === 1 ? "item" : "items"} ·{" "}
                  {round(totalCalories)} cal
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {phase === "error" && (
          <>
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={t.secondary}
              style={{ alignSelf: "center" }}
            />
            <Text style={[styles.errorText, { color: t.text }]}>
              {errorText}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: t.accent }]}
              onPress={() => setPhase("compose")}
            >
              <Text style={[styles.primaryBtnText, { color: t.accentText }]}>
                Try again
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  thumb: {
    width: 120,
    height: 120,
    borderRadius: 16,
    alignSelf: "center",
  },
  captionInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 24,
    paddingVertical: 15,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  analyzingText: { fontSize: 16, fontWeight: "600" },
  analyzingHint: { fontSize: 13, textAlign: "center", marginBottom: 6 },
  resultsList: { maxHeight: 320 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  resultInfo: { flex: 1, paddingRight: 10 },
  resultName: { fontSize: 15, fontWeight: "600" },
  resultMacros: { fontSize: 13, marginTop: 3 },
  loggedTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  loggedTagText: { fontSize: 13, fontWeight: "600" },
  resultsError: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  reasoning: { fontSize: 13, lineHeight: 18, marginTop: 6 },
  errorText: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});

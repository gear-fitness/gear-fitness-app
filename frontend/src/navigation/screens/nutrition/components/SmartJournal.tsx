import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "../../../../hooks/useThemeColors";

/**
 * The "Smart journal" page of the calorie tracker — one open notepad per day,
 * iOS Notes style: a single freeform text area, nothing else. Later this text
 * will feed AI-assisted food entry; for now it's just a place to type.
 *
 * Text lives client-side in AsyncStorage as a date -> text map, scoped per day
 * like the rest of the tracker (mirrors NutritionContext's per-day metadata).
 *
 * Editing is gated behind an explicit tap: when idle we render the text as a
 * tappable preview, and only mount the focused TextInput once tapped. This is
 * what keeps a horizontal pager swipe from being mistaken for a tap and
 * popping the keyboard — a swipe cancels the child press, so it never enters
 * edit mode; only a deliberate tap does.
 */
const STORAGE_KEY = "nutrition.smartJournal";

type NotesByDate = Record<string, string>;

export function SmartJournal({ selectedDate }: { selectedDate: string }) {
  const t = useThemeColors();
  const [notesByDate, setNotesByDate] = useState<NotesByDate>({});
  const [editing, setEditing] = useState(false);

  // Load the whole map once on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setNotesByDate(parsed);
      } catch (err) {
        console.error("Failed to load smart journal:", err);
      }
    })();
  }, []);

  // Leave edit mode when the day changes so switching dates never keeps a
  // stale keyboard open over the new day's text.
  useEffect(() => {
    setEditing(false);
  }, [selectedDate]);

  // Write-through update for the selected day's text.
  const setText = useCallback(
    (text: string) => {
      setNotesByDate((prev) => {
        const next = { ...prev, [selectedDate]: text };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((err) =>
          console.error("Failed to save smart journal:", err),
        );
        return next;
      });
    },
    [selectedDate],
  );

  const text = notesByDate[selectedDate] ?? "";

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {editing ? (
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={() => setEditing(false)}
          autoFocus
          placeholder="Start writing…"
          placeholderTextColor={t.secondary}
          multiline
          style={[styles.input, { color: t.text }]}
        />
      ) : (
        <Pressable style={styles.pressArea} onPress={() => setEditing(true)}>
          <Text style={[styles.input, { color: text ? t.text : t.secondary }]}>
            {text || "Start writing…"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120,
  },
  pressArea: { flexGrow: 1 },
  input: {
    flexGrow: 1,
    fontSize: 17,
    lineHeight: 24,
    padding: 0,
    textAlignVertical: "top",
  },
});

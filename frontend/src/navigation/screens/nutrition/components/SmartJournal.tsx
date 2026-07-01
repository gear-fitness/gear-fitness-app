import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useTier } from "../../../../hooks/useTier";
import { useNutrition } from "../../../../context/NutritionContext";
import { aiLogFood } from "../../../../api/nutritionService";

/**
 * The "Smart journal" page of the calorie tracker.
 *
 * For non-ULTRA users it's a plain per-day notepad (iOS Notes style): one open
 * freeform text area, stored client-side in AsyncStorage as a date -> text map.
 *
 * For ULTRA users it becomes an AI food logger: each line the user submits is
 * parsed by the backend (Perplexity Sonar), logged as real food_log_entry rows,
 * and annotated inline with its calorie total. The durable record lives in the
 * backend (and shows up in the progress card via NutritionContext.refresh); the
 * calorie annotation here is ephemeral UX feedback.
 */
const STORAGE_KEY = "nutrition.smartJournal";
const AI_STORAGE_KEY = "nutrition.aiJournal";

type NotesByDate = Record<string, string>;

type LineStatus = "pending" | "logged" | "error";

interface JournalLine {
  id: string;
  text: string;
  status: LineStatus;
  calories?: number;
  sourceUrl?: string;
}

type LinesByDate = Record<string, JournalLine[]>;

export function SmartJournal({ selectedDate }: { selectedDate: string }) {
  const { atLeast } = useTier();
  if (atLeast("ULTRA")) {
    return <AiJournal selectedDate={selectedDate} />;
  }
  return <PlainJournal selectedDate={selectedDate} />;
}

/* ------------------------------------------------------------------ plain */

function PlainJournal({ selectedDate }: { selectedDate: string }) {
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

/* --------------------------------------------------------------------- ai */

function AiJournal({ selectedDate }: { selectedDate: string }) {
  const t = useThemeColors();
  const { refresh } = useNutrition();
  const [linesByDate, setLinesByDate] = useState<LinesByDate>({});
  const [draft, setDraft] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Load the whole map once on mount. Any lines left "pending" from a previous
  // session (app closed mid-request) are dropped — their durable state, if the
  // request had completed, lives in the backend day summary regardless.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AI_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setLinesByDate(parsed);
      } catch (err) {
        console.error("Failed to load AI journal:", err);
      }
    })();
  }, []);

  // Persist only settled lines (pending ones are transient in-flight state).
  const persist = useCallback((map: LinesByDate) => {
    const settled: LinesByDate = {};
    for (const [date, lines] of Object.entries(map)) {
      const keep = lines.filter((l) => l.status !== "pending");
      if (keep.length) settled[date] = keep;
    }
    AsyncStorage.setItem(AI_STORAGE_KEY, JSON.stringify(settled)).catch((err) =>
      console.error("Failed to save AI journal:", err),
    );
  }, []);

  const updateLine = useCallback(
    (date: string, id: string, patch: Partial<JournalLine>) => {
      setLinesByDate((prev) => {
        const lines = prev[date] ?? [];
        const next = {
          ...prev,
          [date]: lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const submit = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const date = selectedDate;
    setLinesByDate((prev) => ({
      ...prev,
      [date]: [...(prev[date] ?? []), { id, text, status: "pending" }],
    }));

    try {
      const res = await aiLogFood({ text, date });
      const calories = res.entries.reduce(
        (sum, e) => sum + (e.calories ?? 0),
        0,
      );
      const sourceUrl = res.sourceUrls?.[0];
      updateLine(date, id, { status: "logged", calories, sourceUrl });
      // Reflect the new entries in the progress card + manual-entry cards.
      refresh();
    } catch (err) {
      console.error("AI food log failed:", err);
      updateLine(date, id, { status: "error" });
    }
  }, [draft, selectedDate, updateLine, refresh]);

  const lines = linesByDate[selectedDate] ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {lines.map((line) => (
        <View key={line.id} style={styles.lineRow}>
          <Text style={[styles.lineText, { color: t.text }]}>{line.text}</Text>
          <LineAnnotation line={line} />
        </View>
      ))}

      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={submit}
        blurOnSubmit={false}
        returnKeyType="done"
        placeholder={
          lines.length ? "Add another food…" : "e.g. 2 eggs and oatmeal"
        }
        placeholderTextColor={t.secondary}
        style={[styles.lineInput, { color: t.text }]}
      />
    </ScrollView>
  );
}

function LineAnnotation({ line }: { line: JournalLine }) {
  const t = useThemeColors();
  if (line.status === "pending") {
    return <ActivityIndicator size="small" color={t.secondary} />;
  }
  if (line.status === "error") {
    return <Text style={[styles.annotation, { color: t.danger }]}>failed</Text>;
  }
  return (
    <Text style={[styles.annotation, { color: t.secondary }]}>
      {Math.round(line.calories ?? 0)} cal
    </Text>
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
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 12,
  },
  lineText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  annotation: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  lineInput: {
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: 8,
    padding: 0,
  },
});

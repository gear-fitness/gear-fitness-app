import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputSelectionChangeEventData,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useTier } from "../../../../hooks/useTier";
import { useNutrition } from "../../../../context/NutritionContext";
import { aiLogFood } from "../../../../api/nutritionService";
import { FoodLogEntry } from "../../../../api/types";
import { isNetworkError } from "../../../../utils/network";
import { AiLineDetail, NutritionDetailSheet } from "./NutritionDetailSheet";
import { EditEntrySheet } from "./EditEntrySheet";
import { faviconOf } from "./sources";

/**
 * The "Smart journal" page of the calorie tracker.
 *
 * For non-ULTRA users it's a plain per-day notepad (iOS Notes style): one open
 * freeform text area, stored client-side in AsyncStorage as a date -> text map.
 *
 * For ULTRA users the whole page is a single shared note (again, iOS Notes
 * style): entries are separated by newlines in one continuous text field, and
 * each non-empty line carries a floating calorie annotation on its right.
 * Editing a line marks it "…"; leaving it (newline, tap elsewhere, keyboard
 * dismiss) commits it — parsing the text via Perplexity Sonar, logging real
 * food_log_entry rows, and animating the annotation through the assistant's
 * "thinking" stages before settling on the total. Tapping a settled total opens
 * a detail sheet with the macro breakdown, reasoning + confidence, sources, and
 * a ⋯ menu to edit the nutrition manually.
 */
const STORAGE_KEY = "nutrition.smartJournal";
const AI_STORAGE_KEY = "nutrition.aiJournal";
// Backend entryIds awaiting deletion, persisted so an offline/killed app still
// tears down rows whose journal lines were removed (else they'd keep counting
// toward daily totals while shown nowhere).
const AI_GRAVEYARD_KEY = "nutrition.aiGraveyard";
const BLUE = "#2F6FED";

// Note-editor geometry. The measurer, the text field, and the annotation
// overlay all share these so per-line annotations line up with their line.
// Native Notes body sizing: a comfortable body, not oversized.
const FONT_SIZE = 16;
// Kept close to the font's natural leading: on iOS the multiline caret height is
// tied to lineHeight, so a larger value here would enlarge the caret too.
const LINE_HEIGHT = 24;
const PAD_TOP = 8;
const PAD_H = 20; // left inset and right edge inset
const GUTTER = 96; // right-hand space reserved for the annotation
// iOS multiline TextInput adds ~5px of lineFragmentPadding inside its text
// container. Mirror it on the measurer so wrapped lines break at the same width
// (keeps a wrapped line's annotation aligned to the line below). May need a
// point of on-device tuning.
const TEXT_INSET = 5;

// Vertical alignment fix for the annotation overlay. RN <Text> centers its glyph
// within the line box (RCTTextShadowView adds a baseline offset of
// (lineHeight - fontLineHeight)/2), but the multiline TextInput does not — TextKit
// puts the extra leading above the glyph, so the body text sits toward the bottom
// of the line box. Nudge the annotation down by that same half-gap so it bottom-
// aligns with the body instead of floating high. ~1.2 is the system font's
// lineHeight/pointSize ratio; may need a point of on-device tuning.
const NATURAL_LINE = FONT_SIZE * 1.2;
const ANNOT_TOP_NUDGE = Math.round((LINE_HEIGHT - NATURAL_LINE) / 2);

const round = (n: number | null | undefined) => Math.round(n ?? 0);

type NotesByDate = Record<string, string>;

type EntryStatus = "empty" | "dirty" | "pending" | "logged" | "error";

/** Why a line ended in "error", so the annotation can explain and (where it
 *  helps) offer a retry. "nofood": parsed but no food recognized; "tier": the
 *  server rejected it (403, ULTRA lost); "upstream": transient AI/network fault. */
type ErrorKind = "upstream" | "tier" | "nofood";

/** One line of the shared note. `id` is stable across edits so its logged
 *  result (and in-flight animation) follows the line as text around it moves. */
interface Entry {
  id: string;
  text: string;
  status: EntryStatus;
  calories?: number;
  detail?: AiLineDetail;
  errorKind?: ErrorKind;
}

type EntriesByDate = Record<string, Entry[]>;

let idSeq = 0;
const newId = () => `e${Date.now().toString(36)}${(idSeq++).toString(36)}`;

const statusForText = (text: string, nonEmpty: EntryStatus): EntryStatus =>
  text.trim() ? nonEmpty : "empty";

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

  useEffect(() => {
    setEditing(false);
  }, [selectedDate]);

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
      keyboardDismissMode="on-drag"
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
  const { refresh, removeLog, summary } = useNutrition();

  const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
  const [heights, setHeights] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Whether the note is actively being edited. The editor is only focusable
  // through an explicit tap (a transparent Pressable), so a horizontal pager
  // swipe between Manual entry ↔ Smart journal never opens the keyboard.
  const [editing, setEditing] = useState(false);

  const [detailEntry, setDetailEntry] = useState<Entry | null>(null);
  // The food entry being edited in the shared EditEntrySheet, plus the journal
  // line it belongs to (so recalculate/save-back target the right line). The
  // edit is queued while the detail sheet closes, since iOS won't present a
  // second sheet over one still animating away.
  const [editCtx, setEditCtx] = useState<{
    lineId: string;
    entry: FoodLogEntry;
    text: string;
  } | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{
    lineId: string;
    entry: FoodLogEntry;
    text: string;
  } | null>(null);

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const committingRef = useRef<Set<string>>(new Set());
  const graveyardRef = useRef<string[]>([]); // backend entryIds pending delete
  const journalLoadedRef = useRef(false); // AsyncStorage journal finished loading

  const entries = useMemo(
    () => entriesByDate[selectedDate] ?? [],
    [entriesByDate, selectedDate],
  );
  const value = useMemo(() => entries.map((e) => e.text).join("\n"), [entries]);

  // Mirrors for reading the latest state inside async callbacks.
  const entriesRef = useRef(entriesByDate);
  entriesRef.current = entriesByDate;
  const valueRef = useRef(value);
  valueRef.current = value;
  const dateRef = useRef(selectedDate);
  dateRef.current = selectedDate;
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  // The active (caret) line is per-note; reset it when the date changes so a
  // dirty line on the new date isn't skipped by the commit effect for sitting
  // at the previous note's caret index.
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedDate]);

  /* --- persistence ---------------------------------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AI_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // Retire backend rows stranded on now-empty lines. Clearing a line's
          // text in place leaves its logged rows on an "empty" line, which the
          // commit path skips — so they'd keep counting toward the day's totals
          // forever while showing nowhere. Delete them on load.
          for (const list of Object.values(parsed) as Entry[][]) {
            if (!Array.isArray(list)) continue;
            for (const e of list) {
              if (!e.text?.trim() && (e.detail?.entries?.length ?? 0) > 0) {
                graveyardRef.current.push(
                  ...(e.detail?.entries ?? []).map((x) => x.entryId),
                );
                e.detail = undefined;
                e.calories = undefined;
                e.status = "empty";
              }
            }
          }
          setEntriesByDate(parsed);
          // Only enable the orphan sweep once we've actually loaded the local
          // journal. If storage is empty/absent we have no idea which AI rows
          // are legitimate, so we never blind-delete them.
          journalLoadedRef.current = true;
        }
      } catch (err) {
        console.error("Failed to load AI journal:", err);
      }
    })();
  }, []);

  // Reap orphaned AI rows. An AI-logged food counts toward the day's totals but
  // is only shown/managed through its journal line. If a backend row ends up
  // with no line pointing at it — e.g. a slow parse that resolved after the app
  // closed, whose line then re-committed into a fresh row on reload — it becomes
  // a phantom: counted in the totals, visible nowhere. Once the journal for this
  // date has settled (nothing pending/dirty or mid-commit), delete any AI row no
  // line references. Debounced so an in-flight log/edit is never mistaken for a
  // stray (empty lines don't count as references — their detail is stale).
  useEffect(() => {
    if (!journalLoadedRef.current) return;
    const id = setTimeout(() => {
      if (committingRef.current.size > 0) return;
      const date = dateRef.current;
      // Only reap for a date we actually hold a local journal for. If the date
      // key is absent (fresh install, a second device, partial storage loss),
      // we don't know which AI rows are legitimate — never blind-delete them.
      if (!Object.prototype.hasOwnProperty.call(entriesRef.current, date)) return;
      const list = entriesRef.current[date] ?? [];
      if (list.some((e) => e.status === "pending" || e.status === "dirty")) {
        return;
      }
      const referenced = new Set(
        list
          .filter((e) => e.text.trim())
          .flatMap((e) => (e.detail?.entries ?? []).map((x) => x.entryId)),
      );
      const strays = (summaryRef.current?.entries ?? []).filter(
        (e) => e.sourceType?.startsWith("AI") && !referenced.has(e.entryId),
      );
      strays.forEach((e) =>
        removeLog(e.entryId).catch((err) => {
          // 404: another path already deleted it, which is the goal. Ignore.
          if (err?.response?.status === 404) return;
          console.error("Failed to delete stray AI entry:", err);
        }),
      );
    }, 1500);
    return () => clearTimeout(id);
  }, [summary, entriesByDate, selectedDate, removeLog]);

  // Persist on a debounce (typing mutates state on every keystroke; we don't
  // want an AsyncStorage write each one). Transient in-flight state is demoted
  // to "dirty" so a line reloaded mid-request shows "…" not a stuck spinner.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return; // skip the initial empty state before load completes
    }
    const id = setTimeout(() => {
      const clean: EntriesByDate = {};
      for (const [date, list] of Object.entries(entriesByDate)) {
        const arr = list.map((e) =>
          e.status === "pending" ? { ...e, status: "dirty" as const } : e,
        );
        if (arr.length) clean[date] = arr;
      }
      AsyncStorage.setItem(AI_STORAGE_KEY, JSON.stringify(clean)).catch((err) =>
        console.error("Failed to save AI journal:", err),
      );
    }, 400);
    return () => clearTimeout(id);
  }, [entriesByDate]);

  const setEntries = useCallback(
    (date: string, updater: (list: Entry[]) => Entry[]) => {
      setEntriesByDate((prev) => ({
        ...prev,
        [date]: updater(prev[date] ?? []),
      }));
    },
    [],
  );

  const updateEntry = useCallback(
    (date: string, id: string, patch: Partial<Entry>) => {
      setEntries(date, (list) =>
        list.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [setEntries],
  );

  /* --- backend sync --------------------------------------------------- */

  const persistGraveyard = useCallback(() => {
    AsyncStorage.setItem(
      AI_GRAVEYARD_KEY,
      JSON.stringify(graveyardRef.current),
    ).catch(() => {});
  }, []);

  const flushGraveyard = useCallback(() => {
    const ids = graveyardRef.current;
    if (!ids.length) return;
    graveyardRef.current = [];
    // Delete each row, then persist whatever's still pending either way. Several
    // actors can delete the same row, so failures are triaged by kind rather
    // than blindly re-queued (an "already gone" 404 must not become a poison
    // pill retried and logged on every flush and launch).
    Promise.all(
      ids.map((id) =>
        removeLog(id).catch((err) => {
          // 404: the row is already gone, which is exactly the goal. Success.
          if (err?.response?.status === 404) return;
          // Offline: re-queue for the next flush. This is the normal offline
          // path, so no console.error.
          if (isNetworkError(err)) {
            if (!graveyardRef.current.includes(id)) {
              graveyardRef.current.push(id);
            }
            return;
          }
          // Anything else (500s, auth, unexpected): log once and drop, never
          // re-queue. The orphan reaper is the backstop and will delete the row
          // later if it still exists, so dropping can't strand phantom calories.
          console.error("Failed to delete AI entry:", err);
        }),
      ),
    ).finally(persistGraveyard);
  }, [removeLog, persistGraveyard]);

  // Resume any deletes stranded by a previous offline/killed session.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AI_GRAVEYARD_KEY);
        if (!raw) return;
        const ids = JSON.parse(raw);
        if (Array.isArray(ids) && ids.length) {
          for (const id of ids) {
            if (!graveyardRef.current.includes(id)) graveyardRef.current.push(id);
          }
          flushGraveyard();
        }
      } catch (err) {
        console.error("Failed to load AI graveyard:", err);
      }
    })();
  }, [flushGraveyard]);

  // Parse `text` and settle the entry with the result. Repeated phrases hit the
  // server-side cache (keyed by normalized text) so retyping a food is fast.
  const logIntoEntry = useCallback(
    async (date: string, id: string, committedText: string) => {
      try {
        const res = await aiLogFood({ text: committedText, date });
        // Clobber guard: if the line was edited while this parse was in flight,
        // its text no longer matches what we sent. Don't overwrite the user's
        // newer text — leave it dirty so the commit effect re-parses it.
        const live = (entriesRef.current[date] ?? []).find((e) => e.id === id);
        // committedText is trimmed (see commitEntry/recalcEntry), so compare the
        // live line trimmed too — otherwise surrounding whitespace looks like a
        // mid-flight edit and the line would stay stuck "pending" forever.
        if (!live || live.text.trim() !== committedText) return;

        if (!res.entries.length || res.noFood) {
          updateEntry(date, id, {
            status: "error",
            errorKind: "nofood",
            calories: undefined,
            detail: undefined,
          });
          return;
        }

        const calories = res.entries.reduce(
          (sum, e) => sum + (e.calories ?? 0),
          0,
        );
        const detail: AiLineDetail = {
          entries: res.entries,
          reasoning: res.reasoning ?? "",
          confidence: res.confidence ?? 0,
          sourceUrls: res.sourceUrls ?? [],
          fromCache: res.fromCache,
        };
        updateEntry(date, id, {
          status: "logged",
          calories,
          detail,
          errorKind: undefined,
        });
        refresh();
      } catch (err: any) {
        console.error("AI food log failed:", err);
        const live = (entriesRef.current[date] ?? []).find((e) => e.id === id);
        // User moved on to different text — don't flag stale text as failed.
        if (live && live.text.trim() !== committedText) return;
        const httpStatus = err?.response?.status;
        updateEntry(date, id, {
          status: "error",
          errorKind: httpStatus === 403 ? "tier" : "upstream",
        });
      }
    },
    [updateEntry, refresh],
  );

  // Commit a single dirty line: delete its prior logged rows, then re-parse.
  // Empty text just tears the line's rows down.
  const commitEntry = useCallback(
    async (date: string, id: string) => {
      if (committingRef.current.has(id)) return;
      const entry = (entriesRef.current[date] ?? []).find((e) => e.id === id);
      if (!entry || entry.status !== "dirty") return;

      const text = entry.text.trim();
      const oldBackend = entry.detail?.entries ?? [];

      if (!text) {
        updateEntry(date, id, {
          status: "empty",
          calories: undefined,
          detail: undefined,
        });
        oldBackend.forEach((x) => removeLog(x.entryId).catch(() => {}));
        return;
      }

      committingRef.current.add(id);
      updateEntry(date, id, { status: "pending" });
      try {
        for (const x of oldBackend) {
          try {
            await removeLog(x.entryId);
          } catch {
            /* already gone */
          }
        }
        await logIntoEntry(date, id, text);
      } finally {
        committingRef.current.delete(id);
      }
    },
    [updateEntry, removeLog, logIntoEntry],
  );

  // Commit dirty lines the cursor has left; flush any structurally-removed rows.
  useEffect(() => {
    entries.forEach((e, i) => {
      if (e.status === "dirty" && i !== activeIndex) {
        commitEntry(selectedDate, e.id);
      }
    });
    flushGraveyard();
  }, [entries, activeIndex, selectedDate, commitEntry, flushGraveyard]);

  /* --- text reconciliation ------------------------------------------- */

  // Fold the raw text back into entries, preserving each line's identity (and
  // its logged result) where possible so only genuinely-changed lines go dirty.
  const onChangeText = useCallback(
    (text: string) => {
      const date = dateRef.current;
      // Keep the mirror current so the onSelectionChange that follows this
      // keystroke reads the new text (so a just-typed newline commits the line
      // above it immediately rather than a keystroke later).
      valueRef.current = text;
      setEntries(date, (old) => {
        const paras = text.split("\n");

        // Same line count: positional edit — keep ids, mark changed lines dirty.
        if (paras.length === old.length) {
          return old.map((e, i) => {
            if (e.text === paras[i]) return e;
            const status = statusForText(paras[i], "dirty");
            // Clearing a logged line: empty lines are never committed, so its
            // rows won't get torn down there — retire them now instead of
            // stranding them (counted in the totals, shown nowhere).
            if (status === "empty" && (e.detail?.entries?.length ?? 0) > 0) {
              graveyardRef.current.push(
                ...(e.detail?.entries ?? []).map((x) => x.entryId),
              );
              return {
                ...e,
                text: paras[i],
                status,
                calories: undefined,
                detail: undefined,
              };
            }
            return { ...e, text: paras[i], status };
          });
        }

        // Line added/removed: keep the unchanged head and tail, replace the
        // middle. Removed lines' logged rows go to the graveyard for deletion.
        let p = 0;
        while (p < old.length && p < paras.length && old[p].text === paras[p]) {
          p++;
        }
        let s = 0;
        while (
          s < old.length - p &&
          s < paras.length - p &&
          old[old.length - 1 - s].text === paras[paras.length - 1 - s]
        ) {
          s++;
        }
        const removed = old.slice(p, old.length - s);
        graveyardRef.current.push(
          ...removed.flatMap((e) =>
            (e.detail?.entries ?? []).map((x) => x.entryId),
          ),
        );
        const middle: Entry[] = paras
          .slice(p, paras.length - s)
          .map((tx) => ({
            id: newId(),
            text: tx,
            status: statusForText(tx, "dirty"),
          }));
        return [...old.slice(0, p), ...middle, ...old.slice(old.length - s)];
      });
    },
    [setEntries],
  );

  const onSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const pos = e.nativeEvent.selection.start;
      const text = valueRef.current;
      let idx = 0;
      for (let i = 0; i < pos && i < text.length; i++) {
        if (text[i] === "\n") idx++;
      }
      setActiveIndex(idx);
    },
    [],
  );

  const onBlur = useCallback(() => {
    // Leaving the field: commit whatever's still dirty.
    (entriesRef.current[dateRef.current] ?? []).forEach((e) => {
      if (e.status === "dirty") commitEntry(dateRef.current, e.id);
    });
  }, [commitEntry]);

  const setHeight = useCallback((i: number, h: number) => {
    setHeights((prev) => {
      if (prev[i] === h) return prev;
      const next = prev.slice();
      next[i] = h;
      return next;
    });
  }, []);

  // Top offset of each line = cumulative measured line heights above it.
  const tops = useMemo(() => {
    const arr: number[] = [];
    let acc = PAD_TOP;
    for (let i = 0; i < entries.length; i++) {
      arr.push(acc);
      acc += heights[i] ?? LINE_HEIGHT;
    }
    return arr;
  }, [entries, heights]);

  /* --- ⋯ menu actions ------------------------------------------------- */

  // Re-run the AI parse for a line even if its text is unchanged. Also the
  // retry path for a failed line (tapping its annotation). Mutually exclusive
  // with commitEntry on the same id via committingRef.
  const recalcEntry = useCallback(
    async (id: string) => {
      if (committingRef.current.has(id)) return;
      const date = dateRef.current;
      const entry = (entriesRef.current[date] ?? []).find((e) => e.id === id);
      if (!entry) return;
      const text = entry.text.trim();
      if (!text) return;
      const oldBackend = entry.detail?.entries ?? [];
      committingRef.current.add(id);
      updateEntry(date, id, { status: "pending", errorKind: undefined });
      try {
        for (const x of oldBackend) {
          try {
            await removeLog(x.entryId);
          } catch {
            /* already gone */
          }
        }
        await logIntoEntry(date, id, text);
      } finally {
        committingRef.current.delete(id);
      }
    },
    [updateEntry, removeLog, logIntoEntry],
  );

  // After the shared edit sheet re-logs one of a line's entries (a new entryId),
  // swap it into the line's cached detail so the total stays fresh and the line
  // still owns the row (no orphaned entry left counting toward the day).
  const applyEntryEdit = useCallback(
    (lineId: string, oldEntryId: string, newEntry: FoodLogEntry) => {
      const date = dateRef.current;
      const line = (entriesRef.current[date] ?? []).find((e) => e.id === lineId);
      if (!line?.detail) return;
      const nextEntries = line.detail.entries.map((x) =>
        x.entryId === oldEntryId ? newEntry : x,
      );
      const calories = nextEntries.reduce((s, e) => s + (e.calories ?? 0), 0);
      updateEntry(date, lineId, {
        calories,
        detail: { ...line.detail, entries: nextEntries },
      });
    },
    [updateEntry],
  );

  const openDetail = useCallback((entry: Entry) => {
    if (entry.status === "logged" && entry.detail) setDetailEntry(entry);
  }, []);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.noteScroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.editorWrap}>
          {/* Editable shared note */}
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            onSelectionChange={onSelectionChange}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              onBlur();
              setEditing(false);
            }}
            multiline
            scrollEnabled={false}
            placeholder="e.g. 2 eggs and oatmeal"
            placeholderTextColor={t.secondary}
            style={[styles.noteInput, { color: t.text }]}
          />

          {/* Hidden mirror: measures each line's height to place annotations. */}
          <View style={styles.measurer} pointerEvents="none">
            {entries.map((e, i) => (
              <Text
                key={e.id}
                style={styles.noteText}
                onLayout={(ev: LayoutChangeEvent) =>
                  setHeight(i, ev.nativeEvent.layout.height)
                }
              >
                {e.text.length ? e.text : " "}
              </Text>
            ))}
          </View>

          {/* Tap-to-focus catcher. While not editing it sits above the text and
              only fires on a true tap — a pager swipe drags right past it, so
              switching sections never opens the keyboard. Removed once editing
              so taps reach the field (to reposition the cursor). */}
          {!editing && (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => inputRef.current?.focus()}
            />
          )}

          {/* Annotation overlay: one floating status per non-empty line. */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {entries.map((e, i) =>
              e.text.trim() ? (
                <View
                  key={e.id}
                  style={[styles.annotAbs, { top: tops[i] + ANNOT_TOP_NUDGE }]}
                  pointerEvents="box-none"
                >
                  <LineAnnotation
                    entry={e}
                    onPress={() => openDetail(e)}
                    onRetry={() => recalcEntry(e.id)}
                  />
                </View>
              ) : null,
            )}
          </View>
        </View>
      </ScrollView>

      <NutritionDetailSheet
        visible={!!detailEntry}
        foodText={detailEntry?.text ?? ""}
        detail={detailEntry?.detail ?? null}
        onClose={() => setDetailEntry(null)}
        onClosed={() => {
          if (pendingEdit) {
            setEditCtx(pendingEdit);
            setPendingEdit(null);
          }
        }}
        onEditEntry={(entry) => {
          if (detailEntry) {
            setPendingEdit({
              lineId: detailEntry.id,
              entry,
              text: detailEntry.text,
            });
          }
          setDetailEntry(null);
        }}
      />

      <EditEntrySheet
        entry={editCtx?.entry ?? null}
        visible={!!editCtx}
        titleText={editCtx?.text}
        onClose={() => setEditCtx(null)}
        onSaved={(newEntry) => {
          if (editCtx && newEntry) {
            applyEntryEdit(editCtx.lineId, editCtx.entry.entryId, newEntry);
          }
        }}
        onRecalculate={() => {
          if (editCtx) recalcEntry(editCtx.lineId);
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------- annotation */

type AnimPhase =
  | "dots"
  | "thinking"
  | "searching"
  | "reading"
  | "sources"
  | "calculating"
  | "done";

const PENDING_SEQUENCE: AnimPhase[] = ["dots", "thinking", "searching", "reading"];

const WORD: Partial<Record<AnimPhase, string>> = {
  thinking: "Thinking",
  searching: "Searching",
  reading: "Reading",
  calculating: "Calculating",
};

/**
 * The floating right-hand annotation for one line: "…" while it's dirty, the
 * animated thinking stages while it's parsing, then a tappable calorie total.
 */
function LineAnnotation({
  entry,
  onPress,
  onRetry,
}: {
  entry: Entry;
  onPress: () => void;
  onRetry: () => void;
}) {
  const t = useThemeColors();
  const prevStatus = useRef<EntryStatus>(entry.status);
  const [phase, setPhase] = useState<AnimPhase>(
    entry.status === "pending" ? "dots" : "done",
  );
  const [highlight, setHighlight] = useState(false);
  // Transition (crossfade + a small upward settle) for each phase word. `slide`
  // is a native-driver translateY; `pulse` is a separate looping opacity that
  // makes the displayed word feel "alive" while parsing (see effect below).
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (p: AnimPhase) => {
      setPhase(p);
      // Incoming word starts ~6px low and transparent, then settles into place.
      fade.setValue(0);
      slide.setValue(6);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [fade, slide],
  );

  // Gentle continuous pulse while a pending word is on screen so the state
  // reads as "working". Runs for every phase except the settled "done" state
  // (an error also settles phase to "done"), and is stopped + reset to full
  // opacity on cleanup so an unmounted line never leaks a running loop.
  useEffect(() => {
    if (phase === "done") {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 550,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [phase, pulse]);

  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = entry.status;

    if (entry.status === "pending") {
      let i = 0;
      animateTo(PENDING_SEQUENCE[0]);
      const id = setInterval(() => {
        i = Math.min(i + 1, PENDING_SEQUENCE.length - 1);
        animateTo(PENDING_SEQUENCE[i]);
      }, 1000);
      return () => clearInterval(id);
    }

    if (entry.status === "logged") {
      if (was !== "pending") {
        setPhase("done");
        return;
      }
      const timers: ReturnType<typeof setTimeout>[] = [];
      const finish = () => {
        animateTo("done");
        setHighlight(true);
        timers.push(setTimeout(() => setHighlight(false), 1600));
      };
      const hasSources = (entry.detail?.sourceUrls?.length ?? 0) > 0;
      if (entry.detail?.fromCache || !hasSources) {
        animateTo("calculating");
        timers.push(setTimeout(finish, 400));
      } else {
        animateTo("sources");
        timers.push(setTimeout(() => animateTo("calculating"), 850));
        timers.push(setTimeout(finish, 1400));
      }
      return () => timers.forEach(clearTimeout);
    }

    setPhase("done");
  }, [entry.status, animateTo, entry.detail]);

  if (entry.status === "error") {
    const kind = entry.errorKind ?? "upstream";
    // "no food" and transient upstream faults are worth retrying; a tier
    // rejection isn't (a retry won't restore ULTRA), so it just explains itself.
    if (kind === "tier") {
      return (
        <Text style={[styles.annotation, { color: t.danger }]}>
          not available
        </Text>
      );
    }
    const label = kind === "nofood" ? "no food" : "tap to retry";
    const color = kind === "nofood" ? t.secondary : t.danger;
    return (
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text style={[styles.annotation, { color }]}>{label}</Text>
      </Pressable>
    );
  }

  if (entry.status === "dirty") {
    return (
      <Text style={[styles.annotation, { color: t.secondary }]}>…</Text>
    );
  }

  if (phase !== "done") {
    return (
      <View style={styles.animWrap}>
        {phase === "sources" && entry.detail && (
          <SourceFavicons urls={entry.detail.sourceUrls} />
        )}
        {/* Outer view carries the phase transition (crossfade + slide); the
            inner view carries the continuous working pulse, so the two compose
            without fighting over the same opacity value. */}
        <Animated.View
          style={{ opacity: fade, transform: [{ translateY: slide }] }}
        >
          <Animated.View style={{ opacity: pulse }}>
            {phase === "dots" ? (
              <DotsText color={t.secondary} />
            ) : phase === "sources" ? (
              <Text style={[styles.animWord, { color: t.secondary }]}>
                {entry.detail?.sourceUrls.length ?? 0} sources
              </Text>
            ) : (
              <Text style={[styles.animWord, { color: t.secondary }]}>
                {WORD[phase]}
              </Text>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  const color = highlight ? BLUE : t.secondary;
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.doneWrap}>
      {highlight && <Ionicons name="flash" size={15} color={BLUE} />}
      <Text style={[styles.calAnnotation, { color }]}>
        {round(entry.calories)} cal
      </Text>
    </Pressable>
  );
}

/** Cycles ".", "..", "..." — the opening "thinking" beat. */
function DotsText({ color }: { color: string }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x % 3) + 1), 350);
    return () => clearInterval(id);
  }, []);
  return <Text style={[styles.animWord, { color }]}>{".".repeat(n)}</Text>;
}

/** A short overlapping run of source favicons, shown at the "sources" stage. */
function SourceFavicons({ urls }: { urls: string[] }) {
  const t = useThemeColors();
  const shown = urls.slice(0, 3);
  return (
    <View style={styles.faviconRow}>
      {shown.map((url, i) => (
        <Image
          key={`${url}-${i}`}
          source={{ uri: faviconOf(url) }}
          style={[
            styles.favicon,
            {
              backgroundColor: t.surface,
              borderColor: t.appBg,
              marginLeft: i === 0 ? 0 : -6,
              zIndex: shown.length - i,
            },
          ]}
        />
      ))}
    </View>
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
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    padding: 0,
    textAlignVertical: "top",
  },
  // Shared-note editor
  noteScroll: {
    flexGrow: 1,
    paddingBottom: 160,
  },
  editorWrap: {
    // flexGrow lets the writing area fill the page (tap anywhere to focus, like
    // Notes) while a modest floor keeps it comfortably tappable when empty —
    // no forced giant fixed height.
    flexGrow: 1,
    minHeight: 120,
    position: "relative",
  },
  noteInput: {
    flexGrow: 1,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    paddingTop: PAD_TOP,
    paddingLeft: PAD_H,
    paddingRight: PAD_H + GUTTER,
    paddingBottom: 0,
    textAlignVertical: "top",
  },
  measurer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    paddingTop: PAD_TOP,
    paddingLeft: PAD_H + TEXT_INSET,
    paddingRight: PAD_H + GUTTER + TEXT_INSET,
  },
  noteText: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
  },
  annotAbs: {
    position: "absolute",
    right: PAD_H,
    // Match the body's line box exactly. RN applies lineHeight as the para
    // style's min/max line height with no baseline centering, so the glyph sits
    // at a fixed offset inside the box — NOT its center. Sharing LINE_HEIGHT on
    // the annotation text (below) makes it self-position identically to the
    // body line; centering it in the box instead drifts as LINE_HEIGHT grows.
    height: LINE_HEIGHT,
    alignItems: "flex-end",
  },
  annotation: {
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  calAnnotation: {
    fontSize: 16,
    lineHeight: LINE_HEIGHT,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  animWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  animWord: {
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    fontWeight: "600",
  },
  doneWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  faviconRow: { flexDirection: "row", alignItems: "center" },
  favicon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
});

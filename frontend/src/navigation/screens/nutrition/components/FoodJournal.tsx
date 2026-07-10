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
  TextInputSelectionChangeEventData,
  View,
} from "react-native";
import { Text, TextInput } from "../../../../components/Text";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useNutrition } from "../../../../context/NutritionContext";
import { formatQuantity } from "../../../../utils/nutritionUnits";
import { aiLogFood, putJournal } from "../../../../api/nutritionService";
import { FoodLogEntry } from "../../../../api/types";
import { isNetworkError } from "../../../../utils/network";
import { AiLineDetail, NutritionDetailSheet } from "./NutritionDetailSheet";
import { EditEntrySheet } from "./EditEntrySheet";
import { faviconOf } from "./sources";

/**
 * The calorie tracker's food journal: one shared per-day note (iOS Notes
 * style) — entries are separated by newlines in one continuous text field, and
 * each non-empty line carries a floating calorie annotation on its right.
 *
 * Lines come in two kinds:
 *  - "ai": typed by the user. Editing a line marks it "…"; leaving it (newline,
 *    tap elsewhere, keyboard dismiss) commits it — parsing the text via
 *    Perplexity Sonar, logging real food_log_entry rows, and animating the
 *    annotation through the assistant's "thinking" stages before settling on
 *    the total. Tapping a settled total opens a detail sheet with the macro
 *    breakdown, reasoning + confidence, sources, and a ⋯ menu to edit the
 *    nutrition manually.
 *  - "db": a food picked from the Add food database search — the journal
 *    notices the logged row in the day summary and materializes a line for it
 *    (see the synthesis effect). Born "logged" with the food's name as the
 *    line text; never AI-parsed. Tapping its total opens the edit sheet
 *    directly. Editing the line's TEXT converts it to an "ai" line: the db row
 *    is deleted and the new text is parsed like any typed line.
 *
 * Persistence: AsyncStorage is the offline-first cache; the server holds the
 * durable copy, one note per (user, date), synced last-write-wins via the
 * date's updatedAt (see SYNC_KEY). User-driven mutations mark the date dirty
 * and a debounced PUT pushes it; /day responses carry the server copy back
 * for restore after a reinstall or on a second device.
 */
const AI_STORAGE_KEY = "nutrition.aiJournal";
// Backend entryIds awaiting deletion, persisted so an offline/killed app still
// tears down rows whose journal lines were removed (else they'd keep counting
// toward daily totals while shown nowhere).
const AI_GRAVEYARD_KEY = "nutrition.aiGraveyard";
// Per-date server-sync state: Record<date, { syncedAt, dirty }>. syncedAt is
// the server updatedAt last applied or successfully PUT for that date (never
// compared against a device clock); dirty means local edits haven't reached
// the server yet, so a server copy must not replace them. Kept separate from
// AI_STORAGE_KEY so the journal blob's shape stays what older builds wrote.
const SYNC_KEY = "nutrition.journalSync";
// One-time upload of the pre-existing local journal to the server (ifAbsent,
// so it can never clobber another device's copy). Set only after every date
// succeeded; a partial failure retries on the next app launch.
const MIGRATED_KEY = "nutrition.journalMigrated";
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

type EntryStatus = "empty" | "dirty" | "pending" | "logged" | "error";

/** Why a line ended in "error", so the annotation can explain and (where it
 *  helps) offer a retry. "nofood": parsed but no food recognized; "tier": the
 *  server rejected it (403, PLUS lost); "upstream": transient AI/network fault. */
type ErrorKind = "upstream" | "tier" | "nofood";

/** One line of the shared note. `id` is stable across edits so its logged
 *  result (and in-flight animation) follows the line as text around it moves.
 *  `kind` "ai" = typed and AI-parsed; "db" = a database pick materialized from
 *  the day summary, never AI-committed (any text edit flips it to "ai"). */
interface Entry {
  id: string;
  text: string;
  status: EntryStatus;
  kind: "ai" | "db";
  calories?: number;
  detail?: AiLineDetail;
  errorKind?: ErrorKind;
}

type EntriesByDate = Record<string, Entry[]>;

/** Server-sync state for one date's note (see SYNC_KEY). */
interface JournalSync {
  syncedAt: string | null;
  dirty: boolean;
}

let idSeq = 0;
const newId = () => `e${Date.now().toString(36)}${(idSeq++).toString(36)}`;

const statusForText = (text: string, nonEmpty: EntryStatus): EntryStatus =>
  text.trim() ? nonEmpty : "empty";

// What gets persisted (AsyncStorage and server): in-flight "pending" demotes
// to "dirty" so a line restored mid-request shows "…" not a stuck spinner.
const sanitizeLines = (list: Entry[]): Entry[] =>
  list.map((e) =>
    e.status === "pending" ? { ...e, status: "dirty" as const } : e,
  );

// JSON.stringify with object keys sorted recursively (and undefined-valued
// keys dropped, matching JSON.stringify semantics). Content that round-trips
// through Postgres jsonb comes back with reordered keys, so a plain
// stringify comparison against its locally built twin never matches.
const stableStringify = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    const rec = v as Record<string, unknown>;
    const body = Object.keys(rec)
      .filter((k) => rec[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(rec[k])}`)
      .join(",");
    return `{${body}}`;
  }
  return JSON.stringify(v) ?? "null";
};

export function FoodJournal({ selectedDate }: { selectedDate: string }) {
  const t = useThemeColors();
  const { refresh, removeLog, summary, getEntryUnitMeta } = useNutrition();

  const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
  const [heights, setHeights] = useState<number[]>([]);
  // Height of the visible scroll frame, from its onLayout. Paired with the note's
  // real text height to decide whether scrolling is actually needed.
  const [viewportH, setViewportH] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Whether the note is actively being edited, driven by the field's own
  // focus/blur. Tapping the note focuses it and drops the caret where the tap
  // landed (native behaviour); a scroll drag pans the ScrollView instead of
  // focusing, so browsing the journal never opens the keyboard. Used to pause
  // background synthesis so entries aren't rewritten mid-edit.
  const [editing, setEditing] = useState(false);

  const [detailEntry, setDetailEntry] = useState<Entry | null>(null);
  // The food entry being edited in the shared EditEntrySheet, plus the journal
  // line it belongs to (so recalculate/save-back/delete target the right
  // line). `kind` mirrors the line's kind: "ai" edits offer Recalculate, "db"
  // edits offer Delete. The edit is queued while the detail sheet closes,
  // since iOS won't present a second sheet over one still animating away.
  const [editCtx, setEditCtx] = useState<{
    lineId: string;
    entry: FoodLogEntry;
    text: string;
    kind: "ai" | "db";
  } | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{
    lineId: string;
    entry: FoodLogEntry;
    text: string;
    kind: "ai" | "db";
  } | null>(null);

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const committingRef = useRef<Set<string>>(new Set());
  const graveyardRef = useRef<string[]>([]); // backend entryIds pending delete
  // Dates whose journal we can vouch for: hydrated from local storage,
  // restored from the server, or edited by the user this session. The orphan
  // reaper only arms for these — for any other date we don't know which AI
  // rows are legitimate, so we never blind-delete them.
  const journalSourcesRef = useRef<Set<string>>(new Set());
  // Per-date server-sync state (SYNC_KEY), kept in a ref: it steers effects
  // but never renders.
  const syncRef = useRef<Record<string, JournalSync>>({});
  const flushingRef = useRef<Set<string>>(new Set()); // dates with a PUT in flight
  // Load finished, even when storage was empty (fresh install). State (not a
  // ref) so the synthesis/reconcile effects re-fire once loading settles.
  const [storageSettled, setStorageSettled] = useState(false);

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
        const [rawSync, raw] = await Promise.all([
          AsyncStorage.getItem(SYNC_KEY),
          AsyncStorage.getItem(AI_STORAGE_KEY),
        ]);
        if (rawSync) {
          try {
            const s = JSON.parse(rawSync);
            if (s && typeof s === "object") syncRef.current = s;
          } catch {
            /* corrupt sync map: start fresh */
          }
        }
        if (!raw) {
          setStorageSettled(true);
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // Retire backend rows stranded on now-empty lines. Clearing a line's
          // text in place leaves its logged rows on an "empty" line, which the
          // commit path skips — so they'd keep counting toward the day's totals
          // forever while showing nowhere. Delete them on load.
          for (const list of Object.values(parsed) as Entry[][]) {
            if (!Array.isArray(list)) continue;
            for (const e of list) {
              // Journals persisted before line kinds existed are all typed
              // lines.
              e.kind = e.kind ?? "ai";
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
          // These dates' journals are vouched for locally: the orphan sweep
          // may arm for them. Dates absent here can still be vouched for
          // later by a server-restored copy or a user edit.
          Object.keys(parsed).forEach((d) => journalSourcesRef.current.add(d));
          setStorageSettled(true);
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
    if (!storageSettled) return;
    const id = setTimeout(() => {
      if (committingRef.current.size > 0) return;
      const date = dateRef.current;
      // Only reap for a date whose journal we can vouch for (hydrated,
      // server-restored, or user-edited this session). Anything else (fresh
      // install before the server copy lands, a second device, partial
      // storage loss) means we don't know which AI rows are legitimate —
      // never blind-delete them.
      if (!journalSourcesRef.current.has(date)) return;
      if (!Object.prototype.hasOwnProperty.call(entriesRef.current, date))
        return;
      const list = entriesRef.current[date] ?? [];
      if (list.some((e) => e.status === "pending" || e.status === "dirty")) {
        return;
      }
      // Only reap when this device actually owns typed lines for the date. The
      // synthesis effect below creates the date key on a fresh install (db
      // lines materialized from the day summary), which would otherwise arm
      // this sweep against AI rows whose journal lines live on another device.
      if (!list.some((e) => e.kind === "ai" && e.text.trim())) return;
      const referenced = new Set(
        list
          .filter((e) => e.text.trim())
          .flatMap((e) => (e.detail?.entries ?? []).map((x) => x.entryId)),
      );
      // Load-bearing prefix check: sourceTypes starting with "AI" are owned
      // by typed journal lines and get reaped when unreferenced. Entries
      // logged outside the journal (BARCODE, PHOTO, DB) must never use an
      // AI-prefixed sourceType or they'd be deleted right here.
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
  }, [summary, entriesByDate, selectedDate, removeLog, storageSettled]);

  /* --- server sync ------------------------------------------------------ */

  const persistSync = useCallback(() => {
    AsyncStorage.setItem(SYNC_KEY, JSON.stringify(syncRef.current)).catch(
      () => {},
    );
  }, []);

  // A user-driven mutation touched this date's note: its server copy is now
  // stale (so reconcile must not overwrite it) and it needs a PUT. Also vouch
  // for the date — the user owns its lines this session.
  const markJournalDirty = useCallback(
    (date: string) => {
      journalSourcesRef.current.add(date);
      if (syncRef.current[date]?.dirty) return;
      syncRef.current[date] = {
        syncedAt: syncRef.current[date]?.syncedAt ?? null,
        dirty: true,
      };
      persistSync();
    },
    [persistSync],
  );

  // PUT every dirty date's sanitized lines. Last-write-wins per date. On
  // success the response updatedAt becomes the date's sync point (so the next
  // /day echoing our own write is a no-op); a network failure keeps the date
  // dirty for the next flush point, mirroring the graveyard's triage. Content
  // that changed while the PUT was in flight stays dirty too.
  const flushJournal = useCallback(() => {
    for (const date of Object.keys(syncRef.current)) {
      if (!syncRef.current[date]?.dirty) continue;
      if (flushingRef.current.has(date)) continue;
      flushingRef.current.add(date);
      const lines = sanitizeLines(entriesRef.current[date] ?? []);
      putJournal(date, lines)
        .then((res) => {
          const now = sanitizeLines(entriesRef.current[date] ?? []);
          const unchanged = JSON.stringify(now) === JSON.stringify(lines);
          syncRef.current[date] = {
            syncedAt: res?.updatedAt ?? null,
            dirty: !unchanged,
          };
          persistSync();
        })
        .catch((err) => {
          // Stays dirty either way (never drop user text); only non-network
          // failures are worth a log line.
          if (!isNetworkError(err)) {
            console.error("Journal sync failed:", err);
          }
        })
        .finally(() => {
          flushingRef.current.delete(date);
        });
    }
  }, [persistSync]);

  // Resume dirty dates stranded by a previous offline/killed session.
  useEffect(() => {
    if (!storageSettled) return;
    flushJournal();
  }, [storageSettled, flushJournal]);

  /* --- local persistence ------------------------------------------------ */

  // Persist on a debounce (typing mutates state on every keystroke; we don't
  // want an AsyncStorage write each one), then push dirty dates to the
  // server. Transient in-flight state is demoted to "dirty" so a line
  // reloaded mid-request shows "…" not a stuck spinner.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return; // skip the initial empty state before load completes
    }
    const id = setTimeout(() => {
      const clean: EntriesByDate = {};
      for (const [date, list] of Object.entries(entriesByDate)) {
        const arr = sanitizeLines(list);
        if (arr.length) clean[date] = arr;
      }
      AsyncStorage.setItem(AI_STORAGE_KEY, JSON.stringify(clean)).catch((err) =>
        console.error("Failed to save AI journal:", err),
      );
      flushJournal();
    }, 400);
    return () => clearTimeout(id);
  }, [entriesByDate, flushJournal]);

  // markDirty=false is for programmatic replacements (hydration reconcile,
  // server-restored copies, lines synthesized from the day summary): they
  // must not re-PUT what the server already knows (echo loop) — synthesized
  // db lines are derived from server entries and rebuild identically on any
  // device, so they don't need the journal blob at all.
  const setEntries = useCallback(
    (
      date: string,
      updater: (list: Entry[]) => Entry[],
      opts?: { markDirty?: boolean },
    ) => {
      if (opts?.markDirty !== false) markJournalDirty(date);
      setEntriesByDate((prev) => ({
        ...prev,
        [date]: updater(prev[date] ?? []),
      }));
    },
    [markJournalDirty],
  );

  const updateEntry = useCallback(
    (date: string, id: string, patch: Partial<Entry>) => {
      setEntries(date, (list) =>
        list.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [setEntries],
  );

  // A db line's text: "Name (amount)", one line of the shared note. The amount
  // is the display unit it was logged in when we have it (client-side
  // metadata: "4 oz", "2 servings"), else the entry's stored serving/gram
  // amount — parenthesized after the name, matching how AI-parsed descriptions
  // carry their portions.
  const dbLineText = useCallback(
    (e: FoodLogEntry) => {
      const name =
        (e.description ?? "").replace(/\s+/g, " ").trim() || "Logged food";
      const meta = getEntryUnitMeta(e.entryId);
      const amount = meta
        ? formatQuantity(meta.quantity, meta.unitKey)
        : e.unit === "GRAM"
          ? `${e.quantity} g`
          : `${e.quantity} ${e.quantity === 1 ? "serving" : "servings"}`;
      return `${name} (${amount})`;
    },
    [getEntryUnitMeta],
  );

  // Materialize "db" journal lines for backend rows no local line references:
  // foods logged from the Add food search (the journal learns about them via
  // the day-summary refresh), manual entries from before the meal cards were
  // merged into the journal, and entries created on another device. AI rows
  // are the reaper's business — they belong to a line that will re-commit.
  // Gated on the journal being idle (not editing, nothing in flight) so a
  // programmatic text change never lands under the user's caret, and debounced
  // under the reaper's 1500ms so a fresh reference lands before its sweep.
  // Idempotent: once a line is appended its entryId is referenced.
  useEffect(() => {
    if (!storageSettled) return;
    if (editing) return;
    const id = setTimeout(() => {
      if (committingRef.current.size > 0) return;
      const date = dateRef.current;
      // Clobber guard: only synthesize from a summary for the shown date.
      if (summaryRef.current?.date !== date) return;
      const list = entriesRef.current[date] ?? [];
      if (list.some((e) => e.status === "pending" || e.status === "dirty")) {
        return;
      }
      const referenced = new Set(
        list.flatMap((e) => (e.detail?.entries ?? []).map((x) => x.entryId)),
      );
      const buried = new Set(graveyardRef.current);
      const strays = (summaryRef.current?.entries ?? []).filter(
        (e) =>
          !e.sourceType?.startsWith("AI") &&
          !referenced.has(e.entryId) &&
          !buried.has(e.entryId),
      );
      if (!strays.length) return;
      const lines: Entry[] = strays.map((e) => ({
        id: newId(),
        text: dbLineText(e),
        status: "logged" as const,
        kind: "db" as const,
        calories: e.calories ?? 0,
        detail: {
          entries: [e],
          reasoning: "",
          confidence: 0,
          sourceUrls: e.sourceUrl ? [e.sourceUrl] : [],
          fromCache: false,
        },
      }));
      setEntries(
        date,
        (old) => {
          // Fill one trailing blank line (a stray newline at the end of the
          // note) instead of stranding it above the appended foods.
          const next = [...old];
          if (next.length && !next[next.length - 1].text.trim()) next.pop();
          return [...next, ...lines];
        },
        // Derived from the day summary: any device rebuilds these lines
        // identically, so they don't dirty the server journal.
        { markDirty: false },
      );
    }, 800);
    return () => clearTimeout(id);
  }, [
    summary,
    entriesByDate,
    selectedDate,
    editing,
    storageSettled,
    setEntries,
    dbLineText,
  ]);

  // Restore this date's note from the server (summary.journal rides the /day
  // response): the layer that survives an app delete/reinstall or a second
  // device. Applied only when the server copy is one we haven't seen
  // (updatedAt differs from the date's sync point) and local edits aren't
  // ahead of it (not dirty), and only while the journal is idle — the same
  // guards as the synthesis effect, so a restore never lands under the
  // user's caret or races an in-flight commit.
  useEffect(() => {
    if (!storageSettled) return;
    if (editing) return;
    const id = setTimeout(() => {
      if (committingRef.current.size > 0) return;
      const date = dateRef.current;
      // Clobber guard: only restore from a summary for the shown date.
      if (summaryRef.current?.date !== date) return;
      const journal = summaryRef.current?.journal;
      if (!journal) return;
      // The server vouches for this date's journal even if we skip applying
      // it below: the reaper may arm once the local copy is authoritative.
      journalSourcesRef.current.add(date);
      const sync = syncRef.current[date];
      if (sync?.dirty) return; // local edits win until flushed
      if (flushingRef.current.has(date)) return; // our own PUT is in flight
      // Apply only copies strictly newer than the last one we applied or
      // wrote. Both stamps come from the server clock (ISO-sortable), so
      // this also drops a stale /day snapshot that was already in flight
      // when our own PUT landed.
      if (sync?.syncedAt && journal.updatedAt <= sync.syncedAt) return;
      const list = entriesRef.current[date] ?? [];
      if (list.some((e) => e.status === "pending" || e.status === "dirty")) {
        return;
      }

      const restored = (journal.content as Entry[]).map((e) => {
        // Journals persisted before line kinds existed are all typed lines.
        const kind = e.kind ?? "ai";
        // A line stored "dirty" WITH logged rows already owns real backend
        // entries — restore it settled, or the commit effect would re-parse
        // it (re-spending an AI call and churning rows). A dirty line
        // WITHOUT rows is text the user typed but never committed; keep it
        // dirty so it commits here, exactly as it would have on the
        // original device.
        const status =
          (e.status === "dirty" || e.status === "pending") &&
          (e.detail?.entries?.length ?? 0) > 0
            ? ("logged" as const)
            : e.status === "pending"
              ? ("dirty" as const)
              : e.status;
        return { ...e, kind, status };
      });

      syncRef.current[date] = { syncedAt: journal.updatedAt, dirty: false };
      persistSync();
      // Identical content (e.g. the echo of our own flushed write on a
      // fresh sync map) just records the sync point — no state churn. Key
      // order differs after the jsonb round-trip, hence stableStringify.
      const current = sanitizeLines(list);
      if (stableStringify(current) === stableStringify(restored)) return;
      setEntries(date, () => restored, { markDirty: false });
    }, 300);
    return () => clearTimeout(id);
  }, [summary, storageSettled, editing, setEntries, persistSync]);

  // One-time migration: upload the pre-existing local journal so history
  // written before server sync existed survives a reinstall. ifAbsent means
  // an existing server note always wins — this can never clobber another
  // device. Runs after the first summary arrives (auth is ready by then);
  // the flag is only set when every date made it up, so a partial failure
  // (offline mid-way) retries on the next launch.
  const migrationRanRef = useRef(false);
  useEffect(() => {
    if (!storageSettled || !summary || migrationRanRef.current) return;
    migrationRanRef.current = true;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(MIGRATED_KEY);
        if (done) return;
        let allOk = true;
        for (const [date, list] of Object.entries(entriesRef.current)) {
          const lines = sanitizeLines(list);
          const hasContent = lines.some(
            (e) => e.text.trim() || (e.detail?.entries?.length ?? 0) > 0,
          );
          if (!hasContent) continue;
          try {
            await putJournal(date, lines, true);
          } catch {
            allOk = false;
          }
        }
        if (allOk) await AsyncStorage.setItem(MIGRATED_KEY, "1");
      } catch {
        /* retried next launch */
      }
    })();
  }, [storageSettled, summary]);

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
            if (!graveyardRef.current.includes(id))
              graveyardRef.current.push(id);
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
      // Database lines are never AI-parsed. They can't be dirty either (any
      // text edit flips them to "ai" first) — this is belt and braces.
      if (entry.kind === "db") return;

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

  // Commit dirty lines the cursor has left; flush any structurally-removed
  // rows and any journal dates still awaiting their server PUT.
  useEffect(() => {
    entries.forEach((e, i) => {
      if (e.status === "dirty" && i !== activeIndex) {
        commitEntry(selectedDate, e.id);
      }
    });
    flushGraveyard();
    flushJournal();
  }, [
    entries,
    activeIndex,
    selectedDate,
    commitEntry,
    flushGraveyard,
    flushJournal,
  ]);

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

        // Same line count: positional edit — keep ids, mark changed lines
        // dirty. Any text change makes the line a typed one: a "db" line loses
        // its database identity and re-parses like any other typed text (its
        // old row is torn down by the commit via the retained detail).
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
                kind: "ai" as const,
                calories: undefined,
                detail: undefined,
              };
            }
            return { ...e, text: paras[i], status, kind: "ai" as const };
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
        const middle: Entry[] = paras.slice(p, paras.length - s).map((tx) => ({
          id: newId(),
          text: tx,
          status: statusForText(tx, "dirty"),
          kind: "ai" as const,
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

  // The note's real text height — just the lines, not the keyboard buffer padding
  // the content container carries. Scrolling is only enabled when that overflows
  // the frame, or while editing (so the keyboard avoider can lift the active line
  // into view). Idle-and-fits keeps scroll off, which is the whole point: with no
  // scroll gesture to recognise, a browse drag can never be misread as a tap that
  // opens the keyboard, and taps still land the caret natively.
  const contentH = useMemo(() => {
    let acc = PAD_TOP;
    for (let i = 0; i < entries.length; i++) acc += heights[i] ?? LINE_HEIGHT;
    return acc;
  }, [entries, heights]);
  const canScroll = editing || contentH > viewportH + 1;

  // Snap back to the top whenever scrolling locks (idle and the list fits).
  // While editing, the keyboard avoider scrolls the note up to keep the caret
  // above the keyboard; if scroll then locks on blur with the content still
  // shifted, the user is stranded on a cut-off list with no way to scroll back.
  // A locked list fits by definition, so top-aligning it reveals every entry.
  useEffect(() => {
    if (!canScroll) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [canScroll]);

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
      const line = (entriesRef.current[date] ?? []).find(
        (e) => e.id === lineId,
      );
      if (!line?.detail) return;
      const nextEntries = line.detail.entries.map((x) =>
        x.entryId === oldEntryId ? newEntry : x,
      );
      const calories = nextEntries.reduce((s, e) => s + (e.calories ?? 0), 0);
      updateEntry(date, lineId, {
        calories,
        detail: { ...line.detail, entries: nextEntries },
        // A db line displays "Name (amount)" — rebuild it so an edited
        // quantity doesn't leave a stale amount in the note. AI lines keep
        // the user's typed text untouched.
        ...(line.kind === "db" ? { text: dbLineText(newEntry) } : {}),
      });
    },
    [updateEntry, dbLineText],
  );

  const openDetail = useCallback((entry: Entry) => {
    if (entry.status !== "logged" || !entry.detail) return;
    // A database line has no AI breakdown (reasoning/confidence/sources) to
    // show — its single backend row goes straight into the edit sheet.
    if (entry.kind === "db") {
      const backend = entry.detail.entries[0];
      if (backend) {
        setEditCtx({
          lineId: entry.id,
          entry: backend,
          text: entry.text,
          kind: "db",
        });
      }
      return;
    }
    setDetailEntry(entry);
  }, []);

  // Delete a database line: the line disappears and its backend row goes to
  // the graveyard (flushed immediately; retried offline), so the day's totals
  // drop and the synthesis effect can't resurrect it.
  const deleteDbLine = useCallback(() => {
    if (!editCtx) return;
    const { lineId, entry } = editCtx;
    graveyardRef.current.push(entry.entryId);
    setEntries(dateRef.current, (list) => list.filter((e) => e.id !== lineId));
    setEditCtx(null);
    flushGraveyard();
  }, [editCtx, setEntries, flushGraveyard]);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={canScroll}
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
        contentContainerStyle={styles.noteScroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
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
              kind: "ai",
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
        onRecalculate={
          editCtx?.kind === "ai"
            ? () => {
                if (editCtx) recalcEntry(editCtx.lineId);
              }
            : undefined
        }
        onDelete={editCtx?.kind === "db" ? deleteDbLine : undefined}
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

const PENDING_SEQUENCE: AnimPhase[] = [
  "dots",
  "thinking",
  "searching",
  "reading",
];

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
    // rejection isn't (a retry won't restore PLUS), so it just explains itself.
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
    return <Text style={[styles.annotation, { color: t.secondary }]}>…</Text>;
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

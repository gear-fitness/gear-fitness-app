# Merge Calorie Tracker into One Journal Screen

## Context

The Nutrition tab (`CalorieTracker.tsx`) is currently a `PagerView` with two swipe pages: a manual page (meal-category cards + database food search via `AddFood`) and a Smart Journal page (type a line → Perplexity Sonar parses it into logged entries). We're merging these into **one flat journal-style screen**: the "+" button becomes "Add food" opening the existing database search, picked foods become journal lines, typed lines still AI-parse, and both line kinds log identically into `food_log_entry` and count toward server-computed daily totals. The whole screen becomes premium (PLUS, the single paid tier post-V41).

**User-confirmed decisions:** meal cards/categories dropped entirely (flat journal); BASIC users get a hard paywall (PlainJournal fallback removed); keep the single-shared-TextInput journal architecture with tagged `db` lines.

## Verified architecture facts the design rests on

- `SmartJournal.tsx` → `AiJournal`: the TextInput is **controlled and derived** — `value = entries.map(e => e.text).join("\n")` (line 230). `onChangeText` fires only on user edits. So database picks are inserted by **appending an `Entry` to state**, never by touching the text — the reconciliation diff never sees them and can't mark them dirty (no AI double-log).
- Orphan reaper (lines 295–326) only deletes rows where `sourceType?.startsWith("AI")`, only when the local journal has loaded AND the date key exists locally AND nothing is dirty/pending/committing. Manual/DB rows are categorically un-reapable.
- `commitEntry` (lines ~495–525) deletes the line's old backend rows (`detail.entries`) before re-parsing — so flipping a `db` line to `ai` on text edit gets correct teardown for free.
- `LogFoodPayload` already carries optional `sourceType`/`sourceUrl` and backend `NutritionService.logFood` persists them verbatim → tagging DB entries needs **zero backend change**. AI entries already log `category = null` (frontend omits it), proving the column is nullable.
- Paywall infra exists: `frontend/src/components/PlusLockOverlay.tsx`, routes `PlusUpsell` (`{feature: string}` param → PlusUpsellSheet → "Upgrade" → `Paywall`) in `navigation/index.tsx` (lines 280–291).
- `NutritionContext.addLog` returns the created `FoodLogEntry` and refreshes `summary` for the selected date.
- `EditEntrySheet` already supports `titleText`, `onSaved`, `onDelete`, and conditionally-rendered `onRecalculate`; save preserves `sourceType`.
- The category sync queue (`nutritionCategoryQueue.ts`, `nutritionCategoryService.ts`) is a stub (`CATEGORY_SYNC_READY = false`, no backend routes) — safe to delete.

## Design

### Entry model (`SmartJournal.tsx`)

```ts
interface Entry {
  id: string;
  text: string;
  status: EntryStatus;          // unchanged
  kind: "ai" | "db";            // NEW
  calories?: number;
  detail?: AiLineDetail;        // db lines: entries=[backend row], reasoning:"", confidence:0, sourceUrls from entry.sourceUrl
  errorKind?: ErrorKind;
}
```

Migration: in the AsyncStorage load effect, normalize `kind: e.kind ?? "ai"`. Additive field, no key rename.

### AddFood → journal communication: synthesis, no callback

No route-param callbacks (non-serializable) and no one-shot return (AddFood supports multiple adds per visit). Instead:

1. `AddFood.handleAdd` logs as today, adding `sourceType: "DB"` and dropping `category`. `addLog` already refreshes `summary.entries`.
2. The journal (mounted under the AddFood modal) runs a **synthesis effect**: for every backend entry in `summary.entries` that is non-AI (`!sourceType?.startsWith("AI")`), not referenced by any local line's `detail.entries`, and not in the graveyard, append a line `{kind:"db", text: entry.description, status:"logged", calories, detail:{entries:[entry], ...}}`. Fill a trailing empty line first, otherwise append at end.

This one mechanism also solves **pre-merge manual entries** (sourceType null → synthesized as db lines, no longer invisible) and **entries created on another device**.

Synthesis skip-guards: journal loaded, `summary?.date === selectedDate`, `!editing` (TextInput blurred — avoids caret jumps and mid-typing commits), nothing dirty/pending/committing. Idempotent: once appended, entryIds are referenced.

**Reaper guard addition** (prevents a new hazard: synthesis creates the date key on a fresh device, which would arm the reaper against another device's AI rows): reaper additionally requires `list.some(e => e.kind === "ai" && e.text.trim())` before reaping.

### Line-type behavior

- `db` lines are born `logged`, never AI-committed (defensive early-return in `commitEntry` if `kind === "db"`; they're never `dirty` while `db` anyway).
- **Editing a db line's text** (same-line-count reconciliation branch, line ~552): flip `kind` to `"ai"`, mark dirty, keep `detail` — commit then deletes the old DB row and re-parses as AI. Clearing the text uses the existing graveyard branch unchanged.
- New lines created in the reconciliation middle-diff get `kind: "ai"` explicitly.
- **Tapping a db line's annotation**: `openDetail` branches on kind — `ai` → `NutritionDetailSheet` (unchanged), `db` → open `EditEntrySheet` directly (`editCtx` gains a `kind` field; pass `onRecalculate` only for ai, `onDelete` for db → graveyard the entryId + remove the line). `applyEntryEdit` works unchanged for db saves.

### Category & sourceType

- Both paths log `category: null` (make `LogFoodPayload.category` optional). No `"Journal"` magic string — old app versions bucket null into their existing "Uncategorized" card, so DB entries stay visible/deletable there.
- New `sourceType: "DB"` for database picks (free-text varchar; reaper-safe since it doesn't start with "AI"; distinguishes journal picks from pre-merge manual rows).

### Premium gating

- `CalorieTracker`: `if (!useTier().atLeast("PLUS"))` render locked layout — chrome + blurb behind `PlusLockOverlay`, onPress → `navigation.navigate("PlusUpsell", {feature: ...})`. Don't fetch/show totals for BASIC.
- `AddFood`: mount guard — BASIC → `goBack()` + navigate to `PlusUpsell` (covers deep links / stale entry points).
- **Backend `POST /nutrition/log` stays ungated** — old app versions in the field let BASIC users log manually; gating server-side would hard-break them. Follow-up: gate to PLUS after old-version adoption decays (copy the `AI_TIER` 403 pattern).

## Implementation steps

0. **Save this plan** to `docs/calorie-tracker-journal-merge.md` in the repo (user-requested).
1. **Types/API** — `frontend/src/api/nutritionService.ts`: `LogFoodPayload.category` → optional; note `"DB"` sourceType. `frontend/src/navigation/index.tsx`: `AddFood` route param `{category?}` → none.
2. **NutritionContext** (`frontend/src/context/NutritionContext.tsx`) — remove category system: `categoriesByDate`/`recurringFrom`/`categoryOrder` state + storage keys, `categories` memo, `isRecurring`, `addCategory`/`renameCategory`/`removeCategory`/`setCategoryRecurring`, queue imports. Keep `selectedDate`, `summary`, `refresh`, `addLog`, `updateLog`, `removeLog`, `entryUnits`. Optional: `AsyncStorage.multiRemove` of orphaned keys incl. `nutrition.smartJournal`.
3. **EditEntrySheet** (`.../components/EditEntrySheet.tsx`) — remove the "Meal" SelectRow + `categories` destructure; `handleSave` sends `category: shownEntry.category ?? undefined`.
4. **Journal** (`.../components/SmartJournal.tsx`) — delete `PlainJournal`, the tier branch, and `nutrition.smartJournal` key; add `Entry.kind` + load normalization; db→ai flip in reconciliation; defensive kind check in `commitEntry`; **synthesis effect** + reaper `kind === "ai"` guard; `openDetail` kind branch + `editCtx.kind` + db delete handler. Optionally `git mv` to `FoodJournal.tsx` last.
5. **AddFood** (`.../nutrition/AddFood.tsx`) — remove category state/dropdown/prop ("Log to {category}" → "Log"); `handleAdd` payload `{foodId, quantity, unit, sourceType: "DB"}`; tier mount-guard. Multi-add + "Logged!" toast untouched.
6. **CalorieTracker** (`.../nutrition/CalorieTracker.tsx`) — remove PagerView/`activeSection`/toggle, `MealCard`/`MealEntryRow`/swipe-rename-recurring machinery, `AddLogMenu`, screen-level `EditEntrySheet`, category handlers + styles. Keep date row, `CalendarSheet`, summary card + goals pencil, `CameraLogMenu`, `FloatingKeyboardDismiss`. Add: PLUS gate with `PlusLockOverlay`; "+" (Add food) button → `navigation.navigate("AddFood")`; body = `<FoodJournal selectedDate={selectedDate}/>`.
7. **Delete dead files** — `components/AddLogMenu.tsx`, `components/MealMenuButton.tsx`, `utils/nutritionCategoryQueue.ts`, `api/nutritionCategoryService.ts`; remove `flushNutritionCategoryQueue` call in `AuthContext.tsx` and `CACHE_KEYS.pendingNutritionCategoryOps` if unused.
8. **Backend** — no changes.

Suggested commit order: 1–3 (compiles standalone) → 4 → 5 → 6 → 7.

## Regression risks & mitigations

| Risk | Mitigation |
|---|---|
| Programmatic insert marked dirty → AI double-log | Insert via entries state; `value` re-derives; `onChangeText` never fires programmatically (verified line 230) |
| Mid-typing insert commits the active line / caret jump | Append-at-end only + synthesis gated on `!editing` |
| Reaper deletes manual/DB rows | Filter is `startsWith("AI")` (verified line 315); DB rows tagged `"DB"` |
| Reaper deletes other-device AI rows once synthesis creates the date key | New `some(kind === "ai")` reaper guard |
| Pre-merge manual entries invisible/undeletable after cards removed | Synthesis renders them as db lines; delete via EditEntrySheet |
| Deleted db row resurrected by synthesis | Graveyard check + optimistic `summary` filter in `removeLog` |
| db line ever AI-committed | Born `logged`; edits flip kind first; defensive check in `commitEntry` |
| BASIC deep-linked into AddFood | Mount guard → PlusUpsell |
| Old journal AsyncStorage data lacks `kind` | `kind ?? "ai"` normalization on load |
| Old app versions in the field | `/nutrition/log` stays ungated; null category → their "Uncategorized" bucket |
| BASIC users lose free manual logging | **Intentional** (user-confirmed hard paywall) — flagging for release notes |

## Verification

1. **Typed AI line** (unchanged path): type "2 eggs" + newline → pending animation → calorie annotation; tap → NutritionDetailSheet with reasoning/sources.
2. **DB add**: journal "+" → AddFood → quick-add twice + one expanded add with unit/qty → toast each time, screen stays open; back → three db lines with instant annotations; totals match summary card.
3. **DB line tap** → EditEntrySheet (no Recalculate, Delete present); change qty → save → annotation updates, exactly one backend row; Delete → line + entry gone, totals drop.
4. **DB line text edit** → goes dirty → caret leaves → DB row deleted, AI parse replaces it, tap now opens detail sheet.
5. **Synthesis**: day with pre-merge meal-card entries appears as db lines once, no dupes on reload; second device / wiped AsyncStorage: manual entries synthesized, other-device AI rows **not** deleted (check DB).
6. **Reaper still works**: AI line, kill app before parse resolves, relaunch → recommit, stale row reaped, totals not doubled.
7. **Paywall**: BASIC → lock overlay → PlusUpsell → Paywall; after tier flip the tracker renders. AI 403 "not available" annotation unchanged on downgrade.
8. **Sweep**: date navigation with in-flight adds, CalendarSheet logged-date marks, NutritionGoals pencil, quick-add macro editing in EditEntrySheet, TypeScript build after context shrink (`categories`, `isRecurring`, `addCategory`, etc. consumed only by the three files being edited).

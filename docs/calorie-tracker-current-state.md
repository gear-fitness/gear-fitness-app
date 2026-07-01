# Calorie Tracker — Current State

_Snapshot of the food-log / calorie-tracking feature across backend and frontend (branch `feat/calorie-tracker-plus`, 2026-06-30)._

This is a MyFitnessPal-style calorie & macro tracker: a seeded USDA food database, per-user daily logs grouped into client-side "meal" cards, auto-calculated calorie/macro goals, and a per-day freeform "Smart Journal". Meal categories live entirely on the client; the backend only knows about foods, log entries, and goals.

---

## 1. Schema

All tables live in the main Postgres DB. Migrations are split: schema/data changes that are pure SQL are `*.sql` under `src/main/resources/db/migration/`; CSV-loading migrations are Java under `src/main/java/db/migration/`.

### `food_item` — seeded USDA foods (nutrients per 100 g)
Created in **`V32__nutrition_schema.sql`**.

| Column | Type | Notes |
|---|---|---|
| `food_id` | `UUID PRIMARY KEY` | |
| `fdc_id` | `BIGINT UNIQUE` | USDA FoodData Central id |
| `description` | `VARCHAR(512) NOT NULL` | |
| `brand_owner` | `VARCHAR(255)` | null for whole foods |
| `data_type` | `VARCHAR(32)` | `sr_legacy_food` / `foundation_food` / `survey_fndds_food` / `branded_food` |
| `serving_size` | `NUMERIC` | grams in one serving |
| `serving_unit` | `VARCHAR(32)` | usually `g` |
| `household_serving` | `VARCHAR(255)` | friendly label, e.g. "1 slice", "1 cup" |
| `calories` | `NUMERIC` | kcal per 100 g |
| `protein_g` | `NUMERIC` | per 100 g |
| `carbs_g` | `NUMERIC` | per 100 g |
| `fat_g` | `NUMERIC` | per 100 g |

Index: `idx_food_item_description_trgm` — `gin (LOWER(description) gin_trgm_ops)` (requires `pg_trgm`) for fuzzy/substring search.

### `nutrition_goal` — one row per user
Created in **`V32__nutrition_schema.sql`**.

| Column | Type | Notes |
|---|---|---|
| `goal_id` | `UUID PRIMARY KEY` | |
| `user_id` | `UUID NOT NULL UNIQUE` | FK → `app_user(user_id)` `ON DELETE CASCADE` |
| `calorie_goal` | `INTEGER NOT NULL` | |
| `protein_g` | `INTEGER NOT NULL` | |
| `carbs_g` | `INTEGER NOT NULL` | |
| `fat_g` | `INTEGER NOT NULL` | |
| `is_custom` | `BOOLEAN NOT NULL DEFAULT FALSE` | true once user overrides; blocks auto-recalc |
| `updated_at` | `TIMESTAMP(6) NOT NULL` | |

### `food_log_entry` — a user's logged foods
Created in **`V32__nutrition_schema.sql`**, then mutated by `V34` / `V35` (see below). Net current shape:

| Column | Type | Notes |
|---|---|---|
| `entry_id` | `UUID PRIMARY KEY` | |
| `user_id` | `UUID NOT NULL` | FK → `app_user(user_id)` `ON DELETE CASCADE` |
| `food_id` | `UUID` | FK → `food_item(food_id)` `ON DELETE SET NULL`; null for quick-add |
| `log_date` | `DATE NOT NULL` | |
| `quantity` | `NUMERIC NOT NULL` | |
| `unit` | `VARCHAR(16) NOT NULL` | `CHECK IN ('SERVING','GRAM')` |
| `description` | `VARCHAR(512)` | snapshot of the food name |
| `calories` | `NUMERIC` | snapshot, already scaled by quantity |
| `protein_g` | `NUMERIC` | snapshot |
| `carbs_g` | `NUMERIC` | snapshot |
| `fat_g` | `NUMERIC` | snapshot |
| `created_at` | `TIMESTAMP(6) NOT NULL` | |
| `category` | `VARCHAR(100)` | **added in `V35`** — free-text meal-card label (e.g. "Breakfast") |

Index: `idx_food_log_entry_user_date` on `(user_id, log_date)`.

**Historical churn on this table:**
- **`V32`** created it with a fixed `meal_type VARCHAR(16)` column (`CHECK IN ('BREAKFAST','LUNCH','DINNER','SNACK')`).
- **`V34__meal_categories.sql`** dropped `meal_type` and added `category_id UUID` FK → a new **`meal_category`** table (`category_id`, `user_id`, `name`, `display_order`, `created_at`, `UNIQUE(user_id,name)`).
- **`V35__revert_meal_categories.sql`** reversed that: added the free-text `category VARCHAR(100)` column, copied labels back from `meal_category.name`, dropped `category_id`, and **dropped the `meal_category` table**. So there is currently **no server-side meal-category table** — categories are client-only.

### Food-data seed/enrichment migrations (Java)
- **`V33__seed_usda_foods.java`** — loads `classpath:db/data/usda_foods.csv` into `food_item` via batched JDBC `INSERT … ON CONFLICT (fdc_id) DO NOTHING`. **Skips entirely if `food_item` already has rows.**
- **`V36__expand_usda_foods.java`** — re-applies the same CSV with `ON CONFLICT (fdc_id) DO NOTHING` to "top up" databases that were seeded before the CSV grew (idempotent; only inserts new rows).
- **`V37__backfill_food_servings.java`** — `UPDATE food_item SET serving_size, serving_unit, household_serving … WHERE fdc_id = ? AND serving_size IS NULL`, applying the serving sizes now present in the CSV to whole-food rows that were seeded without one.

---

## 2. Entities + DTOs

### Entities (`entity/`)
- **`FoodItem`** — maps `food_item`. All nutrient fields `BigDecimal`, per 100 g. No JPA relationships (referenced by `FoodLogEntry`).
- **`FoodLogEntry`** — maps `food_log_entry`. `@ManyToOne(LAZY)` → `AppUser` (`user_id`, not null), `@ManyToOne(LAZY)` → `FoodItem` (`food_id`, nullable). `category` is a plain `String`. Inner enum **`ServingUnit { SERVING, GRAM }`** stored `@Enumerated(STRING)`. `@CreationTimestamp createdAt`. Macro fields are a snapshot already scaled by quantity.
- **`NutritionGoal`** — maps `nutrition_goal`. `@OneToOne(LAZY)` → `AppUser` (`user_id`, unique). Macro/calorie fields `Integer`. `isCustom` defaults false.
- **`AppUser`** (not nutrition-specific) — holds the subscription **`tier`** (`enum Tier`, default `BASIC`) plus `tierExpiresAt`, `tierProductId`, `tierStore`; and profile fields used to auto-calc goals: `weightLbs`, `heightInches`, `age`, `gender`.
- **`Tier`** enum — `BASIC(0)`, `PLUS(1)`, `ULTRA(2)` with `atLeast(Tier)`.

### DTOs (`dto/`)
- **`FoodItemDTO`** — search result; mirrors `FoodItem` with `Double` numerics. `from(FoodItem)`.
- **`LogFoodRequest`** — request body for `POST /log`: `foodId?`, `category`, `date` (YYYY-MM-DD), `quantity`, `unit`, plus quick-add snapshot fields (`description`, `calories`, `proteinG`, `carbsG`, `fatG`).
- **`LogEntryDTO`** — one logged entry: `entryId`, `foodId`, `category`, `description`, `quantity`, `unit`, macros. `from(FoodLogEntry)`.
- **`DaySummaryDTO`** — `date`, `goal: NutritionGoalDTO`, `totals: Totals` (nested `calories/proteinG/carbsG/fatG` doubles), `entries: List<LogEntryDTO>`.
- **`NutritionGoalDTO`** — `calorieGoal`, `proteinG`, `carbsG`, `fatG`, `isCustom`. `from(NutritionGoal)`.
- **`UpdateGoalRequest`** — `calorieGoal`, `proteinG`, `carbsG`, `fatG` (manual override).

### Repositories (`repository/`)
- **`FoodItemRepository`** — `findByFdcId`; native `search(query, limit, offset)` (relevance tiers + trigram `word_similarity`, whole-foods-first, shorter-description tiebreak); native `browse(limit, offset)` (whole-foods-first browse list).
- **`FoodLogEntryRepository`** — `findByUser_UserIdAndLogDateOrderByCreatedAtAsc(userId, date)`.
- **`NutritionGoalRepository`** — `findByUser_UserId(userId)`.

---

## 3. Endpoints

All under **`/api/nutrition`** (`NutritionController`). Every endpoint requires a Bearer JWT; the controller calls `jwtService.extractUserId(authHeader.substring(7))` — there is **no tier/subscription gate**.

| Method | Path | Body / Params | What it does |
|---|---|---|---|
| `GET` | `/foods/search` | `q` (optional), `page` (default 0) | Search seeded foods; blank `q` returns the browse list. → `List<FoodItemDTO>` |
| `GET` | `/day` | `date` (optional, YYYY-MM-DD; defaults today) | Goal + consumed totals + entries for the day. → `DaySummaryDTO` |
| `POST` | `/log` | `LogFoodRequest` | Log a food (seeded ref or quick-add). → `201 LogEntryDTO` |
| `DELETE` | `/log/{entryId}` | path `entryId` | Delete an entry (ownership-checked). → `204` |
| `GET` | `/goal` | — | Current goal, auto-creating one if absent. → `NutritionGoalDTO` |
| `PUT` | `/goal` | `UpdateGoalRequest` | Manual override; sets `isCustom = true`. → `NutritionGoalDTO` |
| `POST` | `/goal/recalculate` | — | Recompute from profile; clears `isCustom`. → `NutritionGoalDTO` |

> **Stubbed but not implemented server-side:** `PATCH /nutrition/categories/rename`, `DELETE /nutrition/categories/{name}`, `PATCH /nutrition/categories/recurring` — the frontend calls these (see §5/§8) but **no controller route exists**.

---

## 4. Services

### `NutritionService` (only backend service for this feature)
- **`searchFoods(query, page)`** — page size 25. Blank query → `foodItemRepository.browse`; else `foodItemRepository.search`. Maps to `FoodItemDTO`.
- **`getDay(userId, dateStr)`** — loads entries for the day, sums macros into `Totals`, returns `DaySummaryDTO` with the goal from `getOrCreateGoalEntity`.
- **`logFood(userId, req)`** — resolves date/unit/quantity. If `foodId` present: loads the `FoodItem`, converts to grams (`GRAM` → quantity as-is; `SERVING` → quantity × serving_size, defaulting 100 g), scales per-100 g nutrients by `grams/100`, snapshots them. If `foodId` null: quick-add, stores the provided macros directly. Saves and returns `LogEntryDTO`.
- **`deleteEntry(userId, entryId)`** — loads entry, verifies `entry.user == userId`, deletes.
- **`getGoal` / `updateGoal` / `recalculateGoal`** — read/override/recompute. `updateGoal` sets `isCustom=true`; `recalculateGoal` runs `applyAutoGoal` and sets `isCustom=false`.
- **`getOrCreateGoalEntity(userId)`** — lazily creates an auto goal (never marked custom) on first read.
- **`applyAutoGoal(goal, user)`** — **Mifflin-St Jeor** BMR × 1.375 (lightly active); protein ≈ 1 g/lb, fat = 25% kcal, carbs = remainder. Falls back to 2000 kcal / 150 P / 67 F / 200 C when height/weight/age are missing. `sexOffset` = +5 (m) / −161 (f) / −78 (unknown).

Calls: `FoodItemRepository`, `FoodLogEntryRepository`, `NutritionGoalRepository`, `AppUserRepository`.

---

## 5. Frontend

### Screens (`src/navigation/screens/nutrition/`)
- **`CalorieTracker.tsx`** — main tracker (the "Nutrition" tab). Date navigation, a fixed progress card (calorie bar + 3 `MacroRing`s + "Edit goals" link), then a horizontally-swipeable `PagerView` with a 2-dot indicator and a small section title:
  - **Manual entry** — the meal-category cards (entries per card, swipe-to-delete via `useSwipeableDelete`, tap to edit, "Log" + "Add meal category"). A FAB ("+") opens `AddFood`; FAB shows only on this page.
  - **Smart journal** — `SmartJournal` component.
  Hosts `EditEntrySheet` and `CategoryMenuSheet`, plus a `FloatingKeyboardDismiss`.
- **`AddFood.tsx`** — food search/browse. Header has a meal-category dropdown; debounced search (`searchFoods`). Each result is an expandable **`FoodRow`** (a chevron expands an inline **Serving Size** unit selector + **Quantity** stepper + "Log to {category}" button; a quick "+" logs one serving). Only one row can be expanded at a time (`expandedId` hoisted to the screen). "Logged!" toast on add.
- **`NutritionGoals.tsx`** — edit the four targets (`updateGoal`) or "recalculate from profile" (`recalcGoal`); pulls current via `getGoal`. Calls `useNutrition().refresh()` after saving.

### Components (`src/navigation/screens/nutrition/components/`)
- `MacroRing.tsx`, `MacroBar.tsx` — progress visualizations.
- `progressColor.ts` — value→color helper.
- `EditEntrySheet.tsx` — bottom sheet to edit a logged entry's unit/quantity/meal and preview macros; re-logs (no PATCH endpoint) via `updateLog`.
- `CategoryMenuSheet.tsx` — per-category action menu (make recurring / rename / delete).
- `SmartJournal.tsx` — **per-day freeform notepad**, iOS-Notes style. Stored **entirely in AsyncStorage** (`nutrition.smartJournal`, a `date → text` map). No backend. (Intended to later feed AI food entry — out of scope today.)

### Services (`src/api/`)
- **`nutritionService.ts`** — `searchFoods` (attaches client-derived `units` via `unitsForFood`), `getDay`, `logFood`, `deleteEntry`, `getGoal`, `updateGoal`, `recalcGoal`. Hits the `/api/nutrition/*` routes through `apiClient` (JWT injected there).
- **`nutritionCategoryService.ts`** — **STUBS** for category rename/delete/recurring; the routes don't exist yet (documented as a placeholder contract).

### Context (`src/context/`)
- **`NutritionContext.tsx`** (`NutritionProvider`, mounted in `App.tsx`) — holds `selectedDate`, the cached `DaySummary`, and **all meal-category state client-side** in AsyncStorage:
  - `categoriesByDate` (per-day one-off extras), `recurringFrom` (name → effective-from date; Breakfast/Lunch/Dinner recurring from epoch), `categoryOrder`. Derives the visible category list per day.
  - `entryUnits` (`nutrition.entryUnits`) — per-entry display unit/quantity metadata (`EntryUnitMeta`), since the backend only stores SERVING/GRAM.
  - Exposes `addLog` / `updateLog` (re-log + delete, migrating unit metadata) / `removeLog`, `addCategory` / `renameCategory` / `removeCategory` / `setCategoryRecurring`, `getEntryUnitMeta`, `refresh`.
  - Category mutations are applied optimistically and enqueued via `nutritionCategoryQueue` for (future) server sync.

### Utilities (`src/utils/`)
- **`nutritionUnits.ts`** — client-side unit model (`serving/g/oz/cup/ml`), `buildUnits`, `gramsPerUnit`, `servingGramsOf`, `formatQuantity`, `unitsForFood`. Backend stores only SERVING/GRAM; richer units are resolved to grams when logging.
- **`nutritionCategoryQueue.ts`** — offline-first queue for category ops (rename/delete/setRecurring), replayed on reconnect (wired in `AuthContext`); calls the stub category API. Non-network failures are dropped.
- **`offlineCache.ts`** — defines `CACHE_KEYS.pendingNutritionCategoryOps(userId)` for the queue. **The day summary / goal are NOT offline-cached** — only category ops are.

### Navigation (`src/navigation/index.tsx`)
- **`Nutrition`** tab (5th tab, `fork.knife` icon) → `CalorieTracker`.
- Root stack modals: **`AddFood`** (`{ category?: string }`) and **`NutritionGoals`** (both `headerShown: false`).
- `NutritionProvider` wraps the app in `App.tsx`.

---

## 6. Subscription / tier gating

**Mechanism (general app):**
- Backend authoritative field: **`AppUser.tier`** (`enum Tier { BASIC, PLUS, ULTRA }`, default `BASIC`), written by **`RevenueCatWebhookService`** (`POST` webhook in `RevenueCatWebhookController`) from RevenueCat events; also tracks `tierExpiresAt`, `tierProductId`, `tierStore`. Exposed to clients as a string on `UserProfileDTO.tier`.
- Frontend: **`useTier()`** resolves the tier from the RevenueCat client entitlement (`PurchasesContext`, instant after purchase) with `UserProfile.tier` as fallback; gate with `atLeast("PLUS")`. Paywall surfaces: `PaywallScreen`, `PlusUpsellSheet`, onboarding `PaywallStep`/`PaywallContent`.

**Applied to the calorie tracker:** **None.** There is no tier check anywhere in the nutrition controller/service, the nutrition screens, or the `Nutrition` tab registration. The feature is available to all authenticated users today. (Gating would be added either at the route level or around the `Nutrition` tab / `AddFood` entry points.)

---

## 7. Food catalog (USDA data)

**Source & build:** USDA FoodData Central public-domain bulk download. `backend/scripts/build_usda_csv.mjs` preprocesses the raw FDC CSVs (`food.csv`, `food_nutrient.csv`, `branded_food.csv`, plus `food_portion.csv` + `measure_unit.csv`) into the committed, per-100 g `src/main/resources/db/data/usda_foods.csv` (header: `fdc_id,description,brand_owner,data_type,serving_size,serving_unit,household_serving,calories,protein_g,carbs_g,fat_g`). It keeps Foundation / SR Legacy / FNDDS / Branded rows (caps the Branded subset via `--branded-limit`), resolves calories across FDC energy schemes, and now also derives a sensible serving for whole foods.

**Serving-size derivation:** `backend/scripts/usda_servings.mjs` (shared by the build script and a one-off `backfill_servings.mjs`) reads FDC `food_portion.csv` + `measure_unit.csv` and **scores** each portion to pick a "normal" serving — preferring discrete eat-as units (slice/medium/piece/egg…) and the FDA "NLEA serving", de-preferring bulk/odd units, with a beverage rule (cup/fl-oz over tbsp). Calibrated to butter→1 tbsp, bread→1 slice, banana→1 medium, scrambled egg→1 large, cooked rice→1 cup. `backfill_servings.mjs` wrote these into the committed CSV's whole-food rows (branded rows keep their package serving).

**Loaded by:** `V33` (fresh seed), `V36` (idempotent top-up of new rows), `V37` (backfill servings onto rows seeded without one). Approx. current CSV makeup: ~57.2k foods (≈7.8k SR Legacy, ~378 Foundation, ~5.4k FNDDS, ~43.5k Branded).

**Search:** `FoodItemRepository.search` — native query using `pg_trgm` (substring `LIKE` + `%` trigram operator), ranked by match tier (exact > prefix > word-start > contains > fuzzy), then `word_similarity`, whole-foods-first, shorter description first. Blank query → `browse` (whole-foods-first, short, alphabetical). Frontend `searchFoods` debounces and attaches client-derived units.

**Barcode:** **Not implemented.** No barcode/UPC/scanner code exists in the backend or frontend.

---

## 8. Incomplete / stubbed / notable gaps

- **Meal categories are client-only.** The `meal_category` table was added (`V34`) then removed (`V35`); categories, ordering, and recurrence all live in AsyncStorage via `NutritionContext`. There is **no server persistence** — categories don't sync across devices.
- **Category sync API is a stub.** `nutritionCategoryService.ts` calls `PATCH /nutrition/categories/rename`, `DELETE /nutrition/categories/{name}`, `PATCH /nutrition/categories/recurring`, and `nutritionCategoryQueue` queues ops for replay — but **no backend routes exist**, so these are best-effort no-ops against AsyncStorage as the source of truth.
- **No edit/PATCH endpoint for log entries.** Editing an entry (`EditEntrySheet` → `NutritionContext.updateLog`) is implemented as **re-log + delete**, migrating client-side unit metadata to the new `entryId`.
- **Rich units are client-only.** Backend persists only `SERVING`/`GRAM`; `oz/cup/ml` and exact display quantities are kept in AsyncStorage (`EntryUnitMeta`) and converted to grams at log time. Clearing app storage loses display units (logged macros are unaffected).
- **Smart Journal is a local-only placeholder.** Per-day notes persist solely in AsyncStorage; **no backend, no AI**. Explicitly scaffolded for future AI-assisted food entry.
- **Day summary / goal are not offline-cached.** Only category ops are queued offline; viewing a day requires the network.
- **No tier gating** on the feature (see §6) despite the app having a full tier system.
- **No barcode scanning** (see §7).
- **Quantity stepper is integer-only** in `AddFood` (min 1); fractional amounts require switching units. `EditEntrySheet` does allow decimal quantities.
- **`ULTRA` tier** exists in the enum but is "reserved for a future paid tier" — only BASIC/PLUS are sold.

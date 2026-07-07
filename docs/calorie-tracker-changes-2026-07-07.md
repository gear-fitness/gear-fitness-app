# Calorie Tracker — Session Changes (July 3–7, 2026)

This document covers every change made to the calorie tracker during this
session, grouped into three areas: the AI (Perplexity Sonar) logging pipeline,
the new calendar bottom sheet, and the nutrition details UI polish.

---

## 1. AI Smart Journal — Perplexity Prompt Overhaul

**Problem:** typing shorthand like "alani" returned **"no food"**. Only the
fully spelled-out "alani energy drink" produced a result. Accuracy also swung
between identical requests, and sources were unreliable — a query for "alani"
cited five Instagram posts and one Facebook post.

**File:** `backend/src/main/java/com/gearfitness/gear_api/service/PerplexityClient.java`

### Prompt — before

```
You are a nutrition parser. The user describes food they ate in natural
language. Break it into individual food items and, for each, estimate the
nutrition for the amount described (quantities are already factored in).

Respond with ONLY a JSON object, no prose and no markdown fences:
{
  "items": [
    {"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
  ],
  "reasoning": string,
  "confidence": number
}

- items: one element per distinct food. calories in kcal, macros in grams,
all already scaled to the amount eaten. description is a short human label,
e.g. "2 scrambled eggs". If the input contains no recognizable food, use [].
- reasoning: 1-2 short, friendly sentences in plain everyday language that
anyone can instantly understand. Simply explain how you came up with the
numbers — like the portion size you assumed or how the food was made. Do NOT
use jargon, technical wording, or mention sources, brands, databases, or
citations. Write it the way you'd casually explain it to a friend.
- confidence: an integer 0-100 for how sure you are of the estimate — high
when you found official/published nutrition data, lower when you had to guess
portion sizes or preparation.
```

### Prompt — after

```
You are a nutrition parser for a food journal app. Every input is text the
user typed into their food diary, so treat it as food or drink they consumed
unless it clearly cannot be. Break it into individual food items and, for
each, estimate the nutrition for the amount described.

How to interpret the entry:
- Users type shorthand: bare brand names, partial names, misspellings,
slang. Resolve each to the most popular food or drink it plausibly refers
to. Examples: "alani" means an Alani Nu energy drink, "celsius" a Celsius
energy drink, "pb&j" a peanut butter and jelly sandwich, "chipotle bowl" a
typical Chipotle burrito bowl.
- If no quantity is given, assume one standard serving (one can, one
sandwich, one cup) and say so in the description, e.g. "Alani Nu energy
drink (12 oz can)".
- If preparation is unspecified, assume the most common preparation.
- For branded or restaurant items, look up the official published nutrition
facts and use per-serving label values; for generic foods use standard
nutrition-database values. Trust, in order: the manufacturer or
restaurant's own website, government databases like USDA FoodData Central,
then established nutrition databases (Nutritionix, CalorieKing, FatSecret).
Never base numbers on social media posts, forums, blogs, or news articles.
- Return an empty items list ONLY when the input clearly is not food or
drink even under a generous reading (gibberish, a question, a note like
"meeting at 3pm"). Never return empty because the input is vague, a brand
name alone, or missing a quantity — give your best estimate and express the
uncertainty through a lower confidence instead.

Respond with ONLY a JSON object, no prose and no markdown fences:
{
  "items": [
    {"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
  ],
  "reasoning": string,
  "confidence": number
}

- items: one element per distinct food. calories in kcal, macros in grams,
all scaled to the amount eaten. description is a short human label,
e.g. "2 scrambled eggs".
- reasoning: 1-2 short, friendly sentences in plain everyday language that
anyone can instantly understand. Simply explain how you came up with the
numbers — like the portion size you assumed or how the food was made. Do NOT
use jargon, technical wording, or mention sources, brands, databases, or
citations. Write it the way you'd casually explain it to a friend.
- confidence: an integer 0-100 for how sure you are of the estimate — high
when you found official/published nutrition data, lower when you had to guess
what the user meant, the portion size, or the preparation.
```

### What changed, and why

| Change | Why |
| --- | --- |
| Re-framed as "nutrition parser **for a food journal app**" | Sonar had no idea the text came from a food diary. In that context, "alani" obviously means the drink. |
| Added shorthand/brand-name rules with examples | Nothing previously told the model to resolve brand names, misspellings, or slang to the most popular matching product. |
| Default one-standard-serving rule | The old "quantities are already factored in" implied a quantity always exists; with none given the model had no fallback. |
| Source trust hierarchy (brand site → USDA → nutrition DBs) | Anchors estimates to official label data and explicitly forbids social media / forum / blog numbers. |
| Empty-list rule tightened to "clearly not food" | The old "no recognizable food → []" was an easy escape hatch — a bare brand name isn't literally a food word, so the model bailed instead of estimating. |
| Confidence now also covers "what the user meant" | Ambiguity should lower confidence, not produce an empty result. |

### Request-level changes (same file)

- **`temperature: 0.1`** — no temperature was set before, so identical inputs
  could produce different estimates run to run (the cache assumes one text →
  one stable parse).
- **User message framed as a diary entry** — the raw text is now sent as
  `Food journal entry: "alani"` instead of bare `alani`. Sonar builds its web
  search from the user message, so the food context travels into the search.
- **`search_domain_filter` blocklist** — Perplexity never searches or cites:
  Instagram, Facebook, TikTok, Pinterest, Reddit, Twitter/X, YouTube, Quora,
  Threads. A blocklist was chosen over an allowlist because branded foods need
  the brand's own site, which can't be enumerated in the 10-domain cap.

**Deploy note:** parses already in `nutrition_cache` were built by the old
prompt and replay forever. Clear the table on deploy so stale results don't
linger. (Empty "no food" parses were never cached, so those aren't poisoned.)

---

## 2. Calendar Bottom Sheet (date navigation)

**Problem:** the only way to reach an older date was tapping the back chevron
one day at a time.

### New backend endpoint

- `GET /api/nutrition/logged-dates?start=&end=` — returns the ISO dates in
  the range with at least one logged food, via a `select distinct logDate`
  query. Touched: `FoodLogEntryRepository`, `NutritionService`,
  `NutritionController`, plus `getLoggedDates()` in the frontend
  `api/nutritionService.ts`.

### New frontend component

`frontend/src/navigation/screens/nutrition/components/CalendarSheet.tsx`,
opened by tapping the date label (now a button with a small chevron-down) in
`CalorieTracker.tsx`. Built on the app's shared `BottomSheet`.

- **Header row:** a **Today** pill (left), the month title e.g. "Jul 2026"
  (center), and a **Done** pill (right).
- **Green circles** on every day with logged entries, fetched fresh on each
  open (window: 2 years back, 1 year forward).
- **Black selection ring** (theme tint — white in dark mode) instead of the
  reference design's purple; the ring follows the selected day.
- **Future days greyed but tappable**, so meals can be logged ahead. The old
  dropdown's `maxDate` cap was removed.
- **Tapping a day selects it immediately** — the tracker behind the sheet
  updates live; the sheet stays open until Done or a backdrop tap.
- **Today** selects today and snaps the calendar back to the current month.

### Month swiping

Initially built with `Calendar` + `enableSwipeMonths`, which swaps months
instantly on gesture release (no animation). Replaced with **`CalendarList`
in horizontal `pagingEnabled` mode**: months physically follow your finger
with native momentum and an animated page settle. The pager spans 24 months
back / 12 forward, and has a fixed height so 4-, 5-, and 6-week months page
past without the sheet growing or clipping.

---

## 3. Nutrition Details Sheet (smart journal entry detail)

**File:** `frontend/src/navigation/screens/nutrition/components/NutritionDetailSheet.tsx`

- **Confidence is a loading bar, not a circle.** The SVG ring was replaced
  with a horizontal bar that animates its fill to the confidence percentage
  (600 ms ease-out, matching the macro rings). Same red/amber/green bucket
  colors; the header row shows e.g. "Very High · 87%".
- **Edit links are light grey, not purple.** Both "Something off? Click to
  edit" and each item's "Edit" (pencil icon included) now use the theme's
  secondary grey and adapt to dark mode.
- **"cal" → "Calories"** under the main calorie ring.
- **Macro identity colors:** the words **Carbs** (vibrant yellow),
  **Protein** (red with pinkish hues), and **Fat** (purple) are now colored,
  with dark-mode variants, and weighted semibold so the color reads at 12 pt.
- **Bigger header buttons:** the ⋯ and ✕ circles grew 32 → 40 pt (icons
  18 → 22), and the ⋯ dropdown shifted down to match.
- **Item dropdown simplified:** the big calorie ring was removed from
  expanded item cards — just the three macros, centered across the card. The
  summary card at the top keeps its ring.
- **Item row typography flipped:** food name is regular weight, the calorie
  number is bold (with tabular numerals).
- **Item labels show just the food name:** portion details in parentheses
  are stripped — "Ribeye steak (112 g, 1 serving, cooked)" renders as
  "Ribeye steak". The thought-process paragraph still explains portions.

---

## Misc

- **Dev build fix:** the "Unable to resolve module `@expo/ui/swift-ui`" red
  screen was a missing install — `@expo/ui` was in `package.json` but not in
  `node_modules`. Fixed with `npm install`; a new dev client build is needed
  since `@expo/ui` includes native SwiftUI code.

## Verification

- Backend: `./gradlew compileJava` passes.
- Frontend: `npx tsc --noEmit` introduces no new errors (the two pre-existing
  `navigate`-on-`never` errors in `CalorieTracker.tsx` exist on the clean
  tree too); Prettier passes on all touched files.

# Perplexity Sonar Prompt Changes — Smart Journal AI Calorie Tracker

**Date:** 2026-07-03
**File changed:** `backend/src/main/java/com/gearfitness/gear_api/service/PerplexityClient.java`

## Problem

The smart journal's AI logging was inconsistent. Shorthand entries returned
"no food" instead of an estimate — e.g. "alani" → no food, "alani energy" →
no food, and only "alani energy drink" → 10 cal. Accuracy also swung between
otherwise-identical requests.

## Root causes found in the old prompt

1. **The empty-list escape hatch was too easy.** The prompt said *"If the
   input contains no recognizable food, use []"*. A bare brand name like
   "alani" isn't literally a food word, so Sonar took the exit instead of
   inferring what the user meant.
2. **No food-diary context on the user message.** The raw text (`alani`) was
   sent alone. Sonar builds its web search from the user message, so a bare
   brand word had no food framing at all.
3. **No shorthand/brand-name guidance.** Nothing told the model to resolve
   brand names, partial names, misspellings, or slang to the most popular
   matching product.
4. **No default-portion rule.** The phrase *"quantities are already factored
   in"* implied a quantity is always present; with no quantity given, the
   model had no instruction to assume one standard serving.
5. **No grounding or determinism controls.** The prompt never told Sonar to
   anchor branded items to official nutrition labels, and no `temperature`
   was set on the request, so identical inputs could produce different
   estimates run to run.

## Changes made

### 1. System prompt rewritten

- Re-framed the task: the model is a nutrition parser **for a food journal
  app**, and every input should be treated as food or drink the user consumed
  unless it clearly cannot be.
- Added interpretation rules:
  - Resolve shorthand, brand names, misspellings, and slang to the most
    popular matching product, with concrete examples ("alani" → Alani Nu
    energy drink, "celsius" → Celsius energy drink, "pb&j" → peanut butter
    and jelly sandwich, "chipotle bowl" → typical Chipotle burrito bowl).
  - If no quantity is given, assume **one standard serving** and state it in
    the description, e.g. "Alani Nu energy drink (12 oz can)".
  - If preparation is unspecified, assume the most common preparation.
  - For branded/restaurant items, look up **official published nutrition
    facts** and use per-serving label values; use standard nutrition-database
    values for generic foods.
- Tightened the empty-result rule: return an empty items list **only** when
  the input clearly is not food or drink even under a generous reading
  (gibberish, a question, a note like "meeting at 3pm"). Never return empty
  because the input is vague, a bare brand name, or missing a quantity —
  estimate anyway and express uncertainty through a lower confidence score.
- Removed the confusing *"quantities are already factored in"* phrasing.
- Updated the confidence definition to also cover uncertainty about **what
  the user meant**, not just portion size and preparation.

### 2. User message now framed as a diary entry

The raw text is sent as `Food journal entry: "<text>"` instead of bare text,
so the food-journal context travels into Sonar's web search even for
single-word entries.

### 3. Temperature pinned low

Added `temperature: 0.1` to the request payload so estimates for the same
text don't swing between calls (the nutrition cache also assumes one text →
one stable parse).

## Follow-ups noted but not implemented

- **Clear the `nutrition_cache` table on deploy.** Non-empty parses are
  cached forever, so inaccurate old-prompt parses will keep replaying for
  every user until cleared. (Empty "no food" parses were already never
  cached, so "alani" itself was not poisoned.)
- Longer term: consider a cache TTL or a "don't cache below confidence X"
  guard so a single bad parse can't become permanent.
- Cache keys are exact normalized text, so "alani", "alani energy", and
  "alani energy drink" are separate entries — each synonym costs one Sonar
  call before it's cached. Expected behavior, just worth knowing.

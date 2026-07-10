# What's New announcement popups

Server-driven popup shown once per campaign to authenticated users after
launch. Everything is controlled by rows in the `announcement` table: no app
release is needed to launch, retarget, or kill a campaign.

## How it behaves

- On launch, once the user lands on HomeTabs, the app calls
  `GET /api/announcements/pending?appVersion=<version>` and shows the newest
  matching announcement as a large centered card.
- The primary button navigates to `cta_route`. "Not now" dismisses. The
  backdrop is not tappable: the user must choose one of the two buttons.
- A user who taps either button never sees that announcement again, on any
  device: the DISMISS / CTA event is recorded server-side and filters future
  `/pending` responses. An impression alone (force-quit mid-popup) shows it
  again next launch.
- Every failure path (network error, malformed JSON, unknown route or icon)
  silently skips the popup.

## Launching a campaign

```sql
INSERT INTO announcement
    (announcement_id, title, body, icon, features,
     cta_label, cta_route, cta_params,
     audience, min_app_version, max_app_version, starts_at, ends_at)
VALUES
    (gen_random_uuid(),
     'Progress charts just got smarter',
     'Charts update live as you log sets.',          -- footnote, nullable
     'chart.line.uptrend.xyaxis',                    -- SF Symbol hero
     '[{"icon": "chart.bar.fill",
        "title": "Per-exercise trends",
        "body": "See strength progress for every lift you track."},
       {"icon": "calendar",
        "title": "Weekly volume view",
        "body": "Compare training volume across weeks at a glance."}]',
     'Try it now',
     'Paywall',                                      -- see allowlist below
     NULL,                                           -- optional params JSON
     'FREE_ONLY',                                    -- ALL | FREE_ONLY | PLUS_ONLY
     '1.1.0',                                        -- inclusive, NULL = unbounded
     NULL,
     NULL,                                           -- starts_at, NULL = now
     NULL);                                          -- ends_at, NULL = never
```

## Kill switch

```sql
UPDATE announcement SET active = FALSE WHERE title = '...';
```

Takes effect on each user's next launch.

## Column notes

- `audience` filters on the server-side tier written by the RevenueCat
  webhook. It can briefly lag a purchase or expiration, which is fine for
  marketing. Never reuse it for entitlement gating.
- `min_app_version` / `max_app_version`: inclusive bounds compared
  segment-wise ("1.0" equals "1.0.0"). Set `min_app_version` to the release
  that contains the feature you are announcing, otherwise users on older
  builds get a CTA to something they do not have.
- `features` is a JSON array of `{icon, title, body}`; `icon` and `body` are
  optional per row. Malformed JSON means the popup is skipped entirely.
- `icon` values are SF Symbol names (SymbolView). An invalid name falls back
  to a generic sparkles glyph.
- `cta_route` must be on the app-side allowlist in
  `frontend/src/navigation/screens/WhatsNewPopup.tsx` (`CTA_ROUTES`).
  Currently: `Paywall`, `RoutineList`, `NutritionGoals`, `Settings`,
  `Activity`, `HomeTabs`. Anything else degrades to a dismiss. Add routes to
  the allowlist only if their required params are guaranteed by `cta_params`.
  To land on a specific tab, use `cta_route` `HomeTabs` with `cta_params`
  like `{"screen": "Nutrition"}` (tabs: Workouts, Explore, History, Profile,
  Nutrition).
- Only the newest matching announcement is shown per launch; overlapping
  campaigns queue up naturally across launches.

## Reading results

```sql
SELECT a.title,
       COUNT(*) FILTER (WHERE e.event_type = 'IMPRESSION') AS impressions,
       COUNT(*) FILTER (WHERE e.event_type = 'CTA')        AS cta_taps,
       COUNT(*) FILTER (WHERE e.event_type = 'DISMISS')    AS dismissals
FROM announcement a
LEFT JOIN announcement_event e USING (announcement_id)
GROUP BY a.announcement_id, a.title
ORDER BY MAX(a.created_at) DESC;
```

Events are unique per (announcement, user, type), so these counts are unique
users, not raw taps.

## Local testing

The RevenueCat webhook cannot reach a local backend, so set tiers by SQL when
testing audience filtering:

```sql
UPDATE app_user SET tier = 'PLUS' WHERE username = '...';
```

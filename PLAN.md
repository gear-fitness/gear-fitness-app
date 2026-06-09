# PLAN — Apple In-App Purchases + Subscriber Tracking via RevenueCat

Status: **DRAFT (planning only)**. No application code has been written for this feature yet.
Last researched: 2026-06-09. RevenueCat docs are unversioned/continuously updated — re-verify version numbers before implementing.

## 1. Goal & Scope

Lock premium features behind a paywall and know, server-side, **who is a paying subscriber and to which plan**.

- **Store**: Apple App Store (iOS first). RevenueCat is cross-platform, so the same setup extends to Google Play later with no architecture change.
- **Billing model**: auto-renewable subscription(s) (e.g. monthly + annual "Gear Pro").
- **Vendor**: RevenueCat as the IAP abstraction + entitlement source of truth.
- **Source of truth for gating**: our Spring Boot backend persists subscription state (driven by RevenueCat webhooks + reconciled via RevenueCat REST API). The client SDK drives UX only.

### How it maps onto the current codebase

| Concern | Existing code | Change |
| --- | --- | --- |
| User identity | `AppUser` keyed by `UUID userId`; JWT carries the UUID (`JwtService.extractUserId`, used across controllers) | Pass that same UUID to RevenueCat as the App User ID |
| Frontend | Expo SDK 55, RN 0.83, **New Architecture enabled**, EAS Build, expo-dev-client, prebuilt `ios/`+`android/`, bundle `com.gearfitness` | Add `react-native-purchases` (+ optionally `react-native-purchases-ui`); init + `logIn` in `AuthContext`; gate UI |
| Auth wiring | `AuthContext.login/logout/initializeAuth` already fetch the profile and register a push token | Add RevenueCat `logIn`/`logOut` at the same points (mirrors the push-token pattern) |
| Backend | Spring Boot, JWT stateless, Flyway migrations (**next is `V18`**), Lombok entities/DTOs/services/repos | New `subscription` table + entity/repo/service; webhook controller; RevenueCat REST client; gating helper |
| Security | `SecurityConfig` permits `/api/auth/**`, `/api/public/**`; everything else authenticated | Webhook endpoint must be `permitAll()` for JWT but guarded by a RevenueCat Authorization-header secret |

## 2. Cost (fact)

- RevenueCat **Pro** plan is **free up to $2,500/mo Monthly Tracked Revenue (MTR)**, then **1% of tracked revenue**. Below $2.5k MTR you pay $0. (https://www.revenuecat.com/pricing)
- Apple commission: **30% standard**; **15%** under the App Store Small Business Program (≤ US$1M total proceeds in the prior calendar year). (Schedule 2 v126, 2025-12-17; https://developer.apple.com/app-store/small-business-program/)

---

## Phase 0 — Apple + RevenueCat account prerequisites (no code)

These are hard gates: IAP will not function until they are done.

- [ ] **Sign the Paid Apps Agreement (Schedule 2).** App Store Connect → Business → Agreements → Paid Apps → "View and Agree to Terms." Must be done by the **Account Holder**. (https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/)
- [ ] **Complete Tax and Banking** in Agreements, Tax, and Banking — bank account must be entered and approved before IAP testing works reliably. (https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information , .../manage-banking-information/enter-banking-information)
- [ ] **Generate an In-App Purchase Key (.p8).** App Store Connect → Users and Access → Integrations → In-App Purchase → "Generate In-App Purchase Key." **Download the `.p8` immediately (one-time download).** Record the **Key ID** and **Issuer ID**. This is **required for StoreKit 2** (RevenueCat SDK v5+/RN 8+); without it transactions are not recorded. (https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/in-app-purchase-key-configuration)
- [ ] **Create a RevenueCat account + Project**, add an iOS app for bundle `com.gearfitness`, and upload the `.p8` + Key ID + Issuer ID in the RevenueCat dashboard. Note the **Apple-specific public SDK API key** (used by the app) and create a **v2 secret key (`sk_...`)** for the backend. Secret keys are server-only — never ship them in the app. (https://www.revenuecat.com/docs/projects/authentication)
- [ ] **(Optional but recommended) Enable App Store Server Notifications V2** via RevenueCat dashboard "Apply in App Store Connect" (or paste the RC URL into App Store Connect → App Information → App Store Server Notifications, both Production and Sandbox). Optional — speeds up webhook/Charts delivery and enables refund handling. (https://www.revenuecat.com/docs/platform-resources/server-notifications/apple-server-notifications)

---

## Phase 1 — Model products & entitlements

Decide the catalog before writing code; the entitlement identifier is what we gate on everywhere.

- [ ] **In App Store Connect** (Subscriptions tab): create a **Subscription Group** (e.g. `gear_pro`) and the auto-renewable products inside it. Required fields per product: Reference name, **Product ID** (permanently reserved once used — pick deliberately, e.g. `com.gearfitness.pro.monthly`, `com.gearfitness.pro.annual`), duration, price, availability, plus at least one localization. (https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/)
- [ ] **In RevenueCat**: create one **Entitlement** (e.g. identifier `pro`) and attach both products to it. Create an **Offering** (e.g. `default`) with a **monthly** and **annual** Package. (https://www.revenuecat.com/docs/getting-started/entitlements , .../getting-started/displaying-products)
- [ ] **Define the gated feature set.** List exactly which existing features become Pro-only (this is a product decision NEXT.md does not specify — confirm with the team). The entitlement `pro` is the single key both client and backend check.

Concepts (fact): **Product** = store SKU; **Entitlement** = level of access a product unlocks (gate on this, not raw product IDs); **Offering** = dashboard-configured set of packages shown to users (swappable without an app update); **Package** = cross-platform grouping of equivalent products. (https://www.revenuecat.com/docs/getting-started/entitlements)

---

## Phase 2 — Frontend: install + initialize the SDK

- [ ] **Install** (use `expo install` for version alignment):
  `npx expo install react-native-purchases react-native-purchases-ui`
  Core package `react-native-purchases` latest ~**v10.2.2** (pub. ~2026-06-05), min RN 0.73 — we are on RN 0.83. (https://www.npmjs.com/package/react-native-purchases)
  - **No Expo config plugin entry is required** for `react-native-purchases` per RevenueCat's Expo doc — but we MUST run a full native build (EAS), not hot-reload, or we get `Invariant Violation: new NativeEventEmitter()`. We already use expo-dev-client + EAS, so this fits. (https://www.revenuecat.com/docs/getting-started/installation/expo)
  - iOS: enable the **In-App Purchase capability** in the Xcode project; min iOS deployment target 13.4. Our `ios/` is prebuilt — confirm the capability is present (CNG/prebuild may need re-running or a manual entitlement). (https://www.revenuecat.com/docs/getting-started/installation/reactnative)
  - ⚠️ **Risk — New Architecture**: our app has `newArchEnabled: true`. There are 2025 community reports of `react-native-purchases-ui` build/crash issues under New Arch (no authoritative RevenueCat confirmation either way). **Validate a dev build early.** If the UI paywall package fights New Arch, fall back to a **custom paywall** built from `getOfferings()` (core SDK only) — consistent with the repo's [[feedback_platform_defaults]] preference to avoid escalating workarounds. (community: https://community.revenuecat.com/sdks-51/)
- [ ] **Will NOT work in Expo Go** for real purchases (SDK falls back to JS mocks). Test only via dev/EAS build. (https://www.revenuecat.com/docs/getting-started/installation/expo)

- [ ] **Configure once at startup** (e.g. a small `src/api/purchasesService.ts` + call in app bootstrap):
  ```ts
  import Purchases, { LOG_LEVEL } from "react-native-purchases";
  if (Platform.OS === "ios") {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: REVENUECAT_APPLE_PUBLIC_KEY });
  }
  ```
  Optionally set `storeKitVersion: STOREKIT_VERSION.DEFAULT` (RC picks SK2 on iOS 16+, SK1 below). (https://www.revenuecat.com/docs/getting-started/installation/expo)
- [ ] **Tie purchases to our identity in `AuthContext`** (mirror the existing `registerPushToken` pattern):
  - On `login` and in `initializeAuth` (after the profile loads): `await Purchases.logIn(user.userId)` — the same UUID the backend already puts in the JWT. This makes the webhook `app_user_id` equal our `AppUser` UUID. (https://www.revenuecat.com/docs/customers/identifying-customers)
  - On `logout`: `await Purchases.logOut()`.
  - No `logOut` needed before switching IDs; logging in with a non-existent ID auto-creates it. (https://www.revenuecat.com/docs/customers/user-ids)

---

## Phase 3 — Frontend: paywall + feature gating

- [ ] **Fetch & display offerings.** Either `RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: "pro" })` from `react-native-purchases-ui`, or a custom screen from `Purchases.getOfferings()` → `offerings.current.availablePackages`. (https://www.revenuecat.com/docs/getting-started/displaying-products , .../tools/paywalls/displaying-paywalls)
- [ ] **Purchase**: `Purchases.purchasePackage(pkg)`, then check `customerInfo.entitlements.active["pro"]`. Handle `userCancelled`. (https://www.revenuecat.com/docs/getting-started/making-purchases)
- [ ] **Restore**: a visible "Restore Purchases" button → `Purchases.restorePurchases()` (App Review requires this — see Phase 6).
- [ ] **Client-side gate for UX**: a `useEntitlement("pro")` hook reading `Purchases.getCustomerInfo()` (`entitlements.active`) + a `Purchases.addCustomerInfoUpdateListener` to react to changes. **UX only** — real enforcement is server-side (Phase 4).
- [ ] **Required paywall UI elements** (App Review): price as the most prominent element, billing period, Terms of Use (EULA) link, Privacy Policy link, restore button. (See Phase 6.)

---

## Phase 4 — Backend: subscriber tracking (source of truth)

Documented RevenueCat architecture: webhook fires → backend fetches authoritative state from RC REST API → persist in our DB → feature gates read our DB. (https://www.revenuecat.com/docs/guides/common-architecture)

### 4a. Schema — `V18__subscription.sql` (Flyway, follows V9 style)

- [ ] One row per (user, entitlement). Suggested columns:
  - `id UUID PK DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE`
  - `app_user_id VARCHAR NOT NULL` (RC App User ID = our UUID as text; keep for alias/transfer reconciliation)
  - `entitlement_id VARCHAR NOT NULL` (e.g. `pro`)
  - `product_id VARCHAR`, `store VARCHAR`, `environment VARCHAR NOT NULL` (`SANDBOX`|`PRODUCTION`)
  - `period_type VARCHAR` (`TRIAL`|`INTRO`|`NORMAL`|`PROMOTIONAL`|`PREPAID`)
  - `is_active BOOLEAN NOT NULL`, `expires_at TIMESTAMPTZ`, `will_renew BOOLEAN`
  - `unsubscribe_detected_at TIMESTAMPTZ`, `billing_issue_detected_at TIMESTAMPTZ`
  - `original_transaction_id VARCHAR`, `last_event_id VARCHAR`, `last_event_at TIMESTAMPTZ`
  - `UNIQUE (user_id, entitlement_id, environment)`; index on `(user_id, is_active)`.
- [ ] Field set derived from webhook + REST payloads. "Is user X on plan Y now" = row exists with `user_id=X`, `entitlement_id=Y`, `environment='PRODUCTION'`, `is_active=true`, `expires_at` in the future. (https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields)

### 4b. Webhook endpoint

- [ ] `POST /api/public/revenuecat/webhook` (under `/api/public/**` so the JWT filter permits it; see `SecurityConfig`).
- [ ] **Auth**: compare the inbound `Authorization` header against a configured shared secret (Spring `@Value` from env/EB config). Reject mismatches with 401. This is RevenueCat's only built-in webhook auth — there is **no HMAC signature scheme**. (https://www.revenuecat.com/docs/integrations/webhooks)
- [ ] **Behavior**: return **200 within 60s** and process async (we already have `AsyncConfig`); RC retries up to **5×** (5/10/20/40/80 min) then gives up. **Dedupe on `event.id`** (store `last_event_id`) for idempotency.
- [ ] **Parse** `{ "event": {...}, "api_version": "1.0" }`. Map by `event.type`: `INITIAL_PURCHASE`/`RENEWAL`/`UNCANCELLATION`/`PRODUCT_CHANGE`/`SUBSCRIPTION_EXTENDED` → upsert active; `CANCELLATION` (still active until expiry) → set `will_renew=false`; `EXPIRATION` → `is_active=false`; `BILLING_ISSUE` → record grace; `TRANSFER` → reconcile via `aliases`/`original_app_user_id`. (https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields , .../sample-events)
- [ ] **Environment guard**: only `environment == "PRODUCTION"` grants real entitlements in prod. Either filter in code, or register a separate sandbox webhook → staging. Persist `environment` and exclude SANDBOX from prod gating. (https://www.revenuecat.com/docs/integrations/webhooks)

### 4c. RevenueCat REST client (reconciliation / authoritative read)

- [ ] On each relevant webhook (and as a periodic safety sweep), call RC v2 with the `sk_` secret key to fetch authoritative state and upsert:
  - `GET https://api.revenuecat.com/v2/projects/{project_id}/customers/{app_user_id}/active_entitlements`
  - `GET .../customers/{app_user_id}/subscriptions`
  - Header `Authorization: Bearer sk_...`. Rate limit for customer info: **480 req/min** (handle `429` + `Retry-After`). (https://www.revenuecat.com/docs/api-v2)
- [ ] Optional periodic reconciliation job to recover from webhooks dropped after the 5-retry window (engineering choice, not a doc requirement).

### 4d. Server-side gating

- [ ] A `SubscriptionService.hasActiveEntitlement(UUID userId, String entitlement)` reading our table. Premium controllers call it (resolve `userId` via the existing `jwtService.extractUserId(token)` pattern) and return 402/403 when not entitled. **This is the real enforcement** — the client SDK check is UX only. (https://www.revenuecat.com/docs/guides/common-architecture)

---

## Phase 5 — Sandbox testing

- [ ] Create **Sandbox testers**: App Store Connect → Users and Access → Sandbox → Testers (real, verifiable emails). (https://www.revenuecat.com/docs/test-and-launch/sandbox/apple-app-store)
- [ ] Build a dev/EAS build (not Expo Go), sign into the sandbox account on a physical device (Developer Mode on), and verify the full flow: offerings load → purchase → entitlement active → backend webhook received (SANDBOX) → row upserted → restore works. Successful sandbox purchases appear in the RC dashboard immediately. (https://www.revenuecat.com/docs/test-and-launch/sandbox/apple-app-store)
- [ ] (Optional) StoreKit configuration file for simulator/local testing. Sandbox prices may not match App Store Connect — validate flow, not price. Sandbox metadata can take up to ~1h to propagate. (https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox)

---

## Phase 6 — App Review compliance (before submission)

- [ ] **Guideline 3.1.1**: feature unlocks must use Apple IAP; include a working **restore** mechanism. (https://developer.apple.com/app-store/review/guidelines/)
- [ ] **Guideline 3.1.2**: paywall must show price as the **most prominent** element, clear billing period (annual shows total billed), and free-trial terms if any; app + App Store metadata must link **Terms of Use (EULA)** and **Privacy Policy**. (https://developer.apple.com/app-store/subscriptions/)
- [ ] Provide a sandbox/demo account + review notes so Apple can test the paywall. Common rejections: missing restore, missing Terms/Privacy links, unclear pricing, or hinting at non-Apple payment.

---

## Risks & open questions

1. **New Architecture + `react-native-purchases-ui`** — unverified against official docs; community reports of issues. Validate a dev build before committing to the UI paywall package; custom paywall is the fallback.
2. **Which features are Pro-gated** — NEXT.md does not specify the feature list; needs a product decision (Phase 1).
3. **Android (Google Play)** — out of scope here but the same RevenueCat entitlement model extends to it later.
4. **`ios/` is prebuilt** — confirm the In-App Purchase capability lands in the Xcode project (may need prebuild re-run or manual entitlement).
5. **Secret handling** — the `sk_` REST key and webhook Authorization secret must live in backend env/EB config only, never in the app bundle or git.
6. **Unverified facts to re-check**: no documented webhook HMAC scheme (Authorization header only); "15% after 1 year of subscription" Apple rule (widely cited, not confirmed on a primary page this run); exact RN snippets for `restorePurchases`/`getCustomerInfo`.

## Source index

- RevenueCat Expo install: https://www.revenuecat.com/docs/getting-started/installation/expo
- RN install (capability, iOS 13.4): https://www.revenuecat.com/docs/getting-started/installation/reactnative
- Entitlements / products / offerings: https://www.revenuecat.com/docs/getting-started/entitlements , .../displaying-products , .../making-purchases
- Identifying customers / user IDs: https://www.revenuecat.com/docs/customers/identifying-customers , .../customers/user-ids
- Webhooks (config/security/retries, event fields, samples): https://www.revenuecat.com/docs/integrations/webhooks , .../webhooks/event-types-and-fields , .../webhooks/sample-events
- REST API v2 (endpoints, auth, rate limits): https://www.revenuecat.com/docs/api-v2 ; auth keys: https://www.revenuecat.com/docs/projects/authentication
- Common architecture: https://www.revenuecat.com/docs/guides/common-architecture
- Pricing: https://www.revenuecat.com/pricing
- Apple: Paid Apps Agreement / Tax / Banking, IAP Key, subscriptions setup, sandbox, App Review guidelines, Small Business Program — URLs inline above.

import React, { useMemo, useState, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { PurchasesPackage } from "react-native-purchases";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { usePurchases } from "../../../context/PurchasesContext";
import { openTerms, openPrivacy } from "../../../constants/legal";

type Plan = "annual" | "monthly";

// Gear Plus accent (matches the profile page) + a lighter blue connector trail.
const PLUS_BLUE = "#4F6BF6";
const PLUS_BLUE_TRAIL = "#C4CEFB";

// Per-month price derived from an annual package, reusing the product's own
// currency symbol (Hermes lacks full Intl currency formatting).
function perMonthString(pkg?: PurchasesPackage): string {
  if (!pkg) return "";
  const monthly = pkg.product.price / 12;
  const symbol = pkg.product.priceString.match(/^[^\d]*/)?.[0] ?? "";
  return `${symbol}${monthly.toFixed(2)}`;
}

// Basic is the free tier; Plus is the paid upgrade. A boolean renders a
// check (included) or lock (Plus-only); a string renders that value.
type CompareCell = boolean | string;
const COMPARE: { label: string; basic: CompareCell; plus: CompareCell }[] = [
  { label: "Track workouts & PRs", basic: true, plus: true },
  { label: "Connect with friends", basic: true, plus: true },
  { label: "Routines", basic: "3", plus: "Unlimited" },
  { label: "Exercise history", basic: "1 mo", plus: "1 yr" },
  { label: "Graph types", basic: "Volume", plus: "All" },
  { label: "Streak restore tokens / mo", basic: false, plus: "4" },
];

interface PaywallContentProps {
  /** Top bar slot — onboarding passes its progress bar, the modal a close X. */
  header: ReactNode;
  /** Called after a successful purchase/restore, or when the user dismisses. */
  onDone: () => void;
  /** Bottom dismiss label. Onboarding uses "Not now"; the modal "Maybe later". */
  dismissLabel?: string;
  /** Show the bottom dismiss button. Off in the modal (it has a close X). */
  showDismiss?: boolean;
  /**
   * Top padding applied inside the scroll content. The modal uses this (instead
   * of a fixed header bar) so content scrolls under the floating close button,
   * like RoutineList. Onboarding leaves it 0 and uses the fixed OnboardingTopBar.
   */
  scrollTopInset?: number;
}

/**
 * The full Gear Plus paywall (plan cards, comparison table, trial timeline,
 * purchase + restore). Shared by the onboarding step and the standalone modal
 * so there's a single source of truth for the paywall UI and purchase flow.
 */
export function PaywallContent({
  header,
  onDone,
  dismissLabel = "Not now",
  scrollTopInset = 0,
  showDismiss = true,
}: PaywallContentProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const [plan, setPlan] = useState<Plan>("annual");
  const [busy, setBusy] = useState(false);

  const { currentOffering, purchasePackage, restore, trialEligible } =
    usePurchases();
  const [restoring, setRestoring] = useState(false);
  const annualPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === "ANNUAL",
  );
  const monthlyPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === "MONTHLY",
  );
  const selectedPkg = plan === "annual" ? annualPkg : monthlyPkg;

  // Only promise a free trial when (a) the selected product actually carries an
  // intro offer and (b) RevenueCat confirms this Apple ID is still eligible for
  // it. A user who already used the trial is ineligible — Apple drops the trial
  // and charges immediately — so for them we show plain subscribe copy instead.
  const introOffer = selectedPkg?.product.introPrice;
  const showTrial = trialEligible && !!introOffer;

  // Free-trial length comes from the product's intro phase (3 days), default 3.
  const trialDays = introOffer?.periodNumberOfUnits ?? 3;
  const reminderDay = Math.max(1, trialDays - 1);
  const chargeDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + trialDays);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  })();

  const handleStart = async () => {
    if (!selectedPkg || busy) return;
    setBusy(true);
    try {
      await purchasePackage(selectedPkg);
      onDone();
    } catch (e: any) {
      // User dismissing the StoreKit sheet is not an error to surface.
      if (!e?.userCancelled) {
        Alert.alert(
          "Purchase failed",
          "Something went wrong. Please try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (restoring || busy) return;
    setRestoring(true);
    try {
      const info = await restore();
      const active = Object.keys(info.entitlements.active);
      if (active.length) {
        Alert.alert(
          "Purchases restored",
          "Your subscription has been restored.",
        );
        onDone();
      } else {
        Alert.alert(
          "Nothing to restore",
          "No active subscription was found for this Apple ID.",
        );
      }
    } catch {
      Alert.alert("Restore failed", "Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  // Comparison cell: a value string, a filled check (included), or a lock.
  const Cell = ({ value, plus }: { value: CompareCell; plus?: boolean }) => {
    if (typeof value === "string") {
      return (
        <Text
          style={[
            styles.cellValue,
            plus && styles.cellValuePlus,
            { color: colors.text },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {value}
        </Text>
      );
    }
    if (value) {
      return (
        <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
          <Text style={[styles.checkMark, { color: colors.accentText }]}>
            ✓
          </Text>
        </View>
      );
    }
    return (
      <SymbolView
        name="lock.fill"
        size={16}
        tintColor={colors.secondary}
        resizeMode="scaleAspectFit"
        style={styles.lockIcon}
      />
    );
  };

  const TimelineRow = ({
    icon,
    iconBg,
    iconTint,
    title,
    body,
    connectorColor,
    last,
  }: {
    icon: string;
    iconBg: string;
    iconTint: string;
    title: string;
    body: string;
    connectorColor: string;
    last?: boolean;
  }) => (
    <View style={styles.timelineRow}>
      <View style={styles.timelineIconCol}>
        <View style={[styles.timelineBadge, { backgroundColor: iconBg }]}>
          <SymbolView
            name={icon as React.ComponentProps<typeof SymbolView>["name"]}
            size={18}
            tintColor={iconTint}
            resizeMode="scaleAspectFit"
            style={styles.timelineBadgeIcon}
          />
        </View>
        <View
          style={[
            last ? styles.timelineConnectorStub : styles.timelineConnector,
            { backgroundColor: connectorColor },
          ]}
        />
      </View>
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.timelineBody, { color: colors.secondary }]}>
          {body}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={shared.screen}>
      {header}
      <ScrollView
        style={shared.body}
        contentContainerStyle={[
          styles.scrollContent,
          scrollTopInset > 0 && { paddingTop: scrollTopInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.eyebrow}>
          <Text style={[styles.eyebrowText, { color: colors.text }]}>Gear</Text>
          <View style={[styles.eyebrowPill, { backgroundColor: PLUS_BLUE }]}>
            <Text style={[styles.eyebrowPillText, { color: "#fff" }]}>
              Plus
            </Text>
          </View>
        </View>
        <Text style={shared.heading}>Achieve your goals faster</Text>

        {/* Trial timeline — only shown when the user is trial-eligible */}
        {showTrial && (
          <View style={styles.trialSection}>
            <TimelineRow
              icon="lock.open.fill"
              iconBg={PLUS_BLUE}
              iconTint="#fff"
              title="Today"
              body="Unlock all Plus features instantly."
              connectorColor={PLUS_BLUE_TRAIL}
            />
            <TimelineRow
              icon="bell.fill"
              iconBg={PLUS_BLUE}
              iconTint="#fff"
              title={`In ${reminderDay} Day${reminderDay === 1 ? "" : "s"} - Reminder`}
              body="We'll send you a reminder that your trial is ending soon if you've allowed us to notify you."
              connectorColor={PLUS_BLUE_TRAIL}
            />
            <TimelineRow
              icon="crown.fill"
              iconBg={colors.text}
              iconTint={colors.screenBg}
              title={`In ${trialDays} Day${trialDays === 1 ? "" : "s"} - Billing Starts`}
              body={`You'll be charged on ${chargeDate} unless you cancel anytime before.`}
              connectorColor={colors.secondary}
              last
            />
          </View>
        )}

        {/* Featured plan: annual */}
        <Pressable
          onPress={() => setPlan("annual")}
          style={[
            styles.featCard,
            {
              backgroundColor: colors.cardBg,
              borderColor: plan === "annual" ? colors.accent : colors.border,
            },
          ]}
        >
          <View style={styles.featTop}>
            <View style={[styles.popPill, { backgroundColor: colors.accent }]}>
              <Text style={[styles.popPillText, { color: colors.accentText }]}>
                MOST POPULAR
              </Text>
            </View>
          </View>
          <View style={styles.featBody}>
            <View style={styles.featLeft}>
              <Text style={[styles.secTitle, { color: colors.text }]}>
                Annual
              </Text>
              <Text style={[styles.featSub, { color: colors.secondary }]}>
                {perMonthString(annualPkg)
                  ? `${perMonthString(annualPkg)}/mo · Save 50%`
                  : "Save 50%"}
              </Text>
            </View>
            <View style={styles.featRight}>
              <Text style={[styles.featPrice, { color: colors.text }]}>
                {annualPkg?.product.priceString ?? "—"}
              </Text>
              <Text style={[styles.featPer, { color: colors.secondary }]}>
                per year
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Secondary plan: monthly */}
        <Pressable
          onPress={() => setPlan("monthly")}
          style={[
            styles.secCard,
            {
              backgroundColor: colors.cardBg,
              borderColor: plan === "monthly" ? colors.accent : colors.border,
            },
          ]}
        >
          <View style={styles.featLeft}>
            <Text style={[styles.secTitle, { color: colors.text }]}>
              Monthly
            </Text>
            <Text style={[styles.featSub, { color: colors.secondary }]}>
              No commitment. Cancel anytime.
            </Text>
          </View>
          <View style={styles.featRight}>
            <Text style={[styles.featPrice, { color: colors.text }]}>
              {monthlyPkg?.product.priceString ?? "—"}
            </Text>
            <Text style={[styles.featPer, { color: colors.secondary }]}>
              per month
            </Text>
          </View>
        </Pressable>

        {/* What you get — Basic vs Plus, Plus column highlighted */}
        <View style={styles.compare}>
          <View
            style={[styles.plusPanel, { backgroundColor: colors.surface }]}
            pointerEvents="none"
          />
          <View style={styles.compareHeaderRow}>
            <Text style={[styles.whatYouGet, { color: colors.text }]}>
              What you get
            </Text>
            <Text style={[styles.colLabel, { color: colors.secondary }]}>
              Basic
            </Text>
            <View style={styles.compareCell}>
              <View
                style={[styles.plusPill, { backgroundColor: colors.accent }]}
              >
                <Text
                  style={[styles.plusPillText, { color: colors.accentText }]}
                >
                  Plus
                </Text>
              </View>
            </View>
          </View>
          {COMPARE.map((row) => (
            <View key={row.label} style={styles.compareRow}>
              <Text
                style={[styles.compareLabel, { color: colors.text }]}
                numberOfLines={2}
              >
                {row.label}
              </Text>
              <View style={styles.compareCell}>
                <Cell value={row.basic} />
              </View>
              <View style={styles.compareCell}>
                <Cell value={row.plus} plus />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={shared.footer}>
        <Pressable
          onPress={handleStart}
          disabled={busy || !selectedPkg}
          style={({ pressed }) => [
            shared.continueBtn,
            (pressed || busy || !selectedPkg) && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={shared.continueBtnText}>
              {showTrial ? "Continue" : "Subscribe"}
            </Text>
          )}
        </Pressable>
        {showDismiss && (
          <Pressable onPress={onDone} disabled={busy} style={styles.notNow}>
            <Text style={[styles.notNowText, { color: colors.secondary }]}>
              {dismissLabel}
            </Text>
          </Pressable>
        )}
        <Text style={[styles.legal, { color: colors.secondary }]}>
          {showTrial
            ? "No payment now. Your free trial converts to a subscription that automatically renews until cancelled. Cancel anytime in Settings."
            : "Your subscription automatically renews until cancelled. Cancel anytime in Settings."}
        </Text>
        <View style={styles.legalLinksRow}>
          <Text
            style={[styles.legalLink, { color: colors.secondary }]}
            onPress={handleRestore}
            suppressHighlighting
          >
            {restoring ? "Restoring…" : "Restore Purchases"}
          </Text>
          <Text style={[styles.legalDot, { color: colors.secondary }]}>·</Text>
          <Text
            style={[styles.legalLink, { color: colors.secondary }]}
            onPress={openTerms}
            suppressHighlighting
          >
            Terms
          </Text>
          <Text style={[styles.legalDot, { color: colors.secondary }]}>·</Text>
          <Text
            style={[styles.legalLink, { color: colors.secondary }]}
            onPress={openPrivacy}
            suppressHighlighting
          >
            Privacy
          </Text>
        </View>
      </View>
    </View>
  );
}

const CELL = 70;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 16,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  eyebrowText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  eyebrowPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
  },
  eyebrowPillText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  featCard: {
    borderRadius: 22,
    borderWidth: 2,
    padding: 16,
    paddingTop: 22,
    marginBottom: 12,
  },
  featTop: {
    position: "absolute",
    top: -10,
    left: 16,
  },
  popPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  featBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featLeft: {
    flex: 1,
  },
  featRight: {
    alignItems: "flex-end",
    paddingLeft: 12,
  },
  featSub: {
    fontSize: 13,
    marginTop: 4,
  },
  featPrice: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  featPer: {
    fontSize: 12,
    marginTop: 2,
  },
  secCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    marginBottom: 20,
  },
  secTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  compare: {
    position: "relative",
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 8,
  },
  plusPanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: CELL,
    borderRadius: 16,
  },
  compareHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 6,
  },
  whatYouGet: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  colLabel: {
    width: CELL,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  plusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  plusPillText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  compareLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingRight: 8,
  },
  compareCell: {
    width: CELL,
    alignItems: "center",
  },
  cellValue: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  cellValuePlus: {
    fontWeight: "800",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 12,
    fontWeight: "900",
  },
  lockIcon: {
    width: 16,
    height: 16,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  trialSection: {
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineIconCol: {
    width: 40,
    alignItems: "center",
  },
  timelineBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineBadgeIcon: {
    width: 18,
    height: 18,
  },
  timelineConnector: {
    width: 6,
    flex: 1,
    minHeight: 24,
    borderRadius: 3,
    marginVertical: 3,
  },
  timelineConnectorStub: {
    width: 6,
    height: 18,
    borderRadius: 3,
    marginTop: 3,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 18,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  timelineBody: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  notNow: {
    paddingVertical: 10,
    alignItems: "center",
  },
  notNowText: {
    fontSize: 15,
    fontWeight: "500",
  },
  legal: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
  },
  legalLinksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  legalLink: {
    fontSize: 11,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 11,
  },
  pressed: {
    opacity: 0.75,
  },
});

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SymbolView } from "expo-symbols";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { TrialBoostModal } from "./TrialBoostModal";

type Plan = "annual" | "monthly";

// Basic is the free tier; Plus is the paid upgrade. A boolean renders a
// check/dash; a string renders that value in the tier's column.
type CompareCell = boolean | string;
const COMPARE: { label: string; basic: CompareCell; plus: CompareCell }[] = [
  { label: "Track workouts & PRs", basic: true, plus: true },
  { label: "Connect with friends", basic: true, plus: true },
  { label: "Routines", basic: "3", plus: "7" },
  { label: "Restore tokens / mo", basic: "1", plus: "4" },
  { label: "Progress history", basic: "3 mo", plus: "1 yr" },
  { label: "Graph types", basic: "Volume", plus: "All" },
  { label: "Calorie tracker (manual)", basic: false, plus: "Soon" },
];

export function PaywallStep({ draft, onFinish, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const [plan, setPlan] = useState<Plan>("annual");
  const [boost, setBoost] = useState(false);

  // Inviting 3 friends doubles the trial from 3 to 7 days.
  const referred = !!draft.referralSent;
  const trialDays = referred ? 7 : 3;
  const reminderDay = referred ? 5 : 2;
  const price = plan === "annual" ? "$47.99/yr" : "$7.99/mo";

  const handleStart = () => {
    if (referred) {
      onFinish();
      return;
    }
    // Offer to double the trial before settling for 3 days.
    setBoost(true);
  };

  // `accent` = the Plus column, which sits on the filled highlight panel, so
  // its content is drawn in accentText (the inverse of the page).
  const Cell = ({
    value,
    accent,
  }: {
    value: boolean | string;
    accent?: boolean;
  }) => {
    const fg = accent ? colors.accentText : colors.text;
    if (typeof value === "string") {
      return (
        <Text style={[styles.cellValue, { color: fg }]} numberOfLines={1}>
          {value}
        </Text>
      );
    }
    if (!value) {
      return <Text style={[styles.dash, { color: colors.secondary }]}>—</Text>;
    }
    return <Text style={[styles.cellCheck, { color: fg }]}>✓</Text>;
  };

  const TimelineRow = ({
    icon,
    bold,
    rest,
    last,
  }: {
    icon: string;
    bold: string;
    rest: string;
    last?: boolean;
  }) => (
    <View style={styles.timelineRow}>
      <View style={styles.timelineIconCol}>
        <SymbolView
          name={icon as React.ComponentProps<typeof SymbolView>["name"]}
          size={20}
          tintColor={colors.text}
          resizeMode="scaleAspectFit"
          style={styles.timelineIcon}
        />
        {!last && (
          <View
            style={[styles.timelineLine, { backgroundColor: colors.separator }]}
          />
        )}
      </View>
      <Text
        style={[styles.timelineText, { color: colors.text }, last && styles.timelineTextLast]}
      >
        <Text style={styles.timelineBold}>{bold}</Text>
        {rest}
      </Text>
    </View>
  );

  const PlanCard = ({
    value,
    title,
    price,
    period,
    highlight,
    badge,
  }: {
    value: Plan;
    title: string;
    price: string;
    period: string;
    highlight?: string;
    badge?: string;
  }) => {
    const active = plan === value;
    return (
      <Pressable
        onPress={() => setPlan(value)}
        style={[
          styles.planCard,
          {
            backgroundColor: colors.cardBg,
            borderColor: active ? colors.accent : colors.border,
          },
        ]}
      >
        {badge && (
          <View style={styles.badgeWrap}>
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.accentText }]}>
                {badge}
              </Text>
            </View>
          </View>
        )}
        <Text style={[styles.planTitle, { color: colors.secondary }]}>
          {title}
        </Text>
        <Text style={[styles.planPrice, { color: colors.text }]}>{price}</Text>
        <Text style={[styles.planPeriod, { color: colors.secondary }]}>
          {period}
        </Text>
        {highlight && (
          <Text style={[styles.planHighlight, { color: colors.text }]}>
            {highlight}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <ScrollView
        style={shared.body}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={shared.heading}>Try Gear Plus free</Text>
        <Text style={shared.subheading}>
          {trialDays} days free, then {price}. Cancel anytime.
        </Text>

        {referred && (
          <View style={[styles.unlock, { backgroundColor: colors.accent }]}>
            <Text style={[styles.unlockText, { color: colors.accentText }]}>
              🎉 You unlocked a 7-day free trial
            </Text>
          </View>
        )}

        {/* Basic vs Plus comparison — open layout, Plus column highlighted */}
        <View style={styles.compare}>
          <View
            style={[styles.plusPanel, { backgroundColor: colors.accent }]}
            pointerEvents="none"
          />
          <View style={styles.compareHeader}>
            <View style={styles.compareLabelSpacer} />
            <Text style={[styles.colLabel, { color: colors.secondary }]}>
              BASIC
            </Text>
            <Text style={[styles.colLabel, { color: colors.accentText }]}>
              PLUS
            </Text>
          </View>
          {COMPARE.map((row) => (
            <View key={row.label} style={styles.compareRow}>
              <Text style={[styles.compareLabel, { color: colors.text }]}>
                {row.label}
              </Text>
              <View style={styles.compareCell}>
                <Cell value={row.basic} />
              </View>
              <View style={styles.compareCell}>
                <Cell value={row.plus} accent />
              </View>
            </View>
          ))}
        </View>
        <Text style={[styles.andMore, { color: colors.secondary }]}>
          And so much more on Plus!
        </Text>

        {/* How your trial works */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            How your trial works
          </Text>
          <TimelineRow
            icon="lock.open.fill"
            bold="Today:"
            rest=" Unlock all Plus features"
          />
          <TimelineRow
            icon="bell.fill"
            bold={`Day ${reminderDay}:`}
            rest=" Get a reminder before your trial ends"
          />
          <TimelineRow
            icon="checkmark.seal.fill"
            bold={`Day ${trialDays}:`}
            rest={` You'll be charged ${price}`}
            last
          />
        </View>

        {/* Plan picker */}
        <View style={styles.plans}>
          <PlanCard
            value="annual"
            title="Yearly"
            price="$47.99"
            period="per year"
            highlight="$4.00/mo"
            badge="SAVE ~50%"
          />
          <PlanCard
            value="monthly"
            title="Monthly"
            price="$7.99"
            period="per month"
          />
        </View>
      </ScrollView>

      <View style={shared.footer}>
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>Start my free trial</Text>
        </Pressable>
        <Pressable onPress={onFinish} style={styles.notNow}>
          <Text style={[styles.notNowText, { color: colors.secondary }]}>
            Not now
          </Text>
        </Pressable>
        <Text style={[styles.legal, { color: colors.secondary }]}>
          Cancel anytime in Settings. Billing starts after your free trial.
        </Text>
      </View>

      <TrialBoostModal
        visible={boost}
        onDouble={() => {
          setBoost(false);
          onBack();
        }}
        onDecline={() => {
          setBoost(false);
          onFinish();
        }}
      />
    </View>
  );
}

const CELL = 78;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 16,
  },
  unlock: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  unlockText: {
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  compare: {
    position: "relative",
    paddingVertical: 8,
  },
  plusPanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: CELL,
    borderRadius: 16,
  },
  compareHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  compareLabelSpacer: {
    flex: 1,
  },
  colLabel: {
    width: CELL,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },
  compareLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  compareCell: {
    width: CELL,
    alignItems: "center",
  },
  cellCheck: {
    fontSize: 16,
    fontWeight: "800",
  },
  dash: {
    fontSize: 16,
    fontWeight: "700",
  },
  cellValue: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  andMore: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 18,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineIconCol: {
    width: 28,
    alignItems: "center",
  },
  timelineIcon: {
    width: 20,
    height: 20,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    minHeight: 16,
    marginVertical: 2,
  },
  timelineText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingBottom: 16,
    paddingLeft: 8,
  },
  timelineTextLast: {
    paddingBottom: 0,
  },
  timelineBold: {
    fontWeight: "700",
  },
  plans: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  planCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  badgeWrap: {
    position: "absolute",
    top: -10,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  planTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  planPeriod: {
    fontSize: 12,
    marginTop: 2,
  },
  planHighlight: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
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
  pressed: {
    opacity: 0.75,
  },
});

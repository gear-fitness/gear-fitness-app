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

  const Cell = ({
    value,
    accent,
  }: {
    value: boolean | string;
    accent?: boolean;
  }) => {
    if (typeof value === "string") {
      return (
        <Text
          style={[
            styles.cellValue,
            { color: accent ? colors.text : colors.secondary },
          ]}
          numberOfLines={2}
        >
          {value}
        </Text>
      );
    }
    if (!value) {
      return <Text style={[styles.dash, { color: colors.border }]}>—</Text>;
    }
    return (
      <View
        style={[
          styles.check,
          { backgroundColor: accent ? colors.accent : colors.surface },
        ]}
      >
        <Text
          style={[
            styles.checkMark,
            { color: accent ? colors.accentText : colors.secondary },
          ]}
        >
          ✓
        </Text>
      </View>
    );
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
    priceLabel,
    sub,
    badge,
  }: {
    value: Plan;
    title: string;
    priceLabel: string;
    sub: string;
    badge?: string;
  }) => {
    const active = plan === value;
    return (
      <Pressable
        onPress={() => setPlan(value)}
        style={[
          styles.planCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
          active && { borderColor: colors.accent },
        ]}
      >
        <View style={styles.planLeft}>
          <View
            style={[
              styles.radio,
              { borderColor: active ? colors.accent : colors.border },
              active && { backgroundColor: colors.accent },
            ]}
          >
            {active && (
              <Text style={[styles.radioMark, { color: colors.accentText }]}>
                ✓
              </Text>
            )}
          </View>
          <View>
            <Text style={[styles.planTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.planSub, { color: colors.secondary }]}>
              {sub}
            </Text>
          </View>
        </View>
        <View style={styles.planRight}>
          {badge && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.accentText }]}>
                {badge}
              </Text>
            </View>
          )}
          <Text style={[styles.planPrice, { color: colors.text }]}>
            {priceLabel}
          </Text>
        </View>
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

        {/* Basic vs Plus comparison */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.compareHeader}>
            <View style={styles.compareLabelSpacer} />
            <Text style={[styles.colLabel, { color: colors.secondary }]}>
              BASIC
            </Text>
            <Text style={[styles.colLabel, { color: colors.text }]}>
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
          <Text style={[styles.andMore, { color: colors.text }]}>
            And so much more!
          </Text>
        </View>

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
            priceLabel="$47.99/yr"
            sub={`${trialDays}-day free trial · $4.00/mo`}
            badge="SAVE ~50%"
          />
          <PlanCard
            value="monthly"
            title="Monthly"
            priceLabel="$7.99/mo"
            sub={`${trialDays}-day free trial`}
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
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 13,
    fontWeight: "800",
  },
  dash: {
    fontSize: 16,
    fontWeight: "700",
  },
  cellValue: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  andMore: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
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
    gap: 12,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioMark: {
    fontSize: 12,
    fontWeight: "700",
  },
  planTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  planSub: {
    fontSize: 13,
    marginTop: 2,
  },
  planRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "700",
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

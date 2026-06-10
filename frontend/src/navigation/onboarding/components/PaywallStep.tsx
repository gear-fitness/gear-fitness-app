import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SymbolView } from "expo-symbols";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { TrialBoostModal } from "./TrialBoostModal";

type Plan = "annual" | "monthly";

// Premium unlocks everything; `free` marks what the free tier also includes.
const COMPARE: { label: string; free: boolean }[] = [
  { label: "Track your workouts & PRs", free: true },
  { label: "Connect with friends", free: true },
  { label: "Custom goals & routines", free: false },
  { label: "AI coaching & form tips", free: false },
  { label: "Full workout history", free: false },
  { label: "Advanced progress charts", free: false },
  { label: "Compete on leaderboards", free: false },
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
  const price = plan === "annual" ? "$39.99/yr" : "$9.99/mo";

  const handleStart = () => {
    if (referred) {
      onFinish();
      return;
    }
    // Offer to double the trial before settling for 3 days.
    setBoost(true);
  };

  const Check = ({ on, accent }: { on: boolean; accent?: boolean }) => {
    if (!on) {
      return (
        <Text style={[styles.dash, { color: colors.border }]}>—</Text>
      );
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
        <Text style={shared.heading}>Try Gear Premium free</Text>
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

        {/* Free vs Premium comparison */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.compareHeader}>
            <View style={styles.compareLabelSpacer} />
            <Text style={[styles.colLabel, { color: colors.secondary }]}>
              FREE
            </Text>
            <Text style={[styles.colLabel, { color: colors.text }]}>
              PREMIUM
            </Text>
          </View>
          {COMPARE.map((row) => (
            <View key={row.label} style={styles.compareRow}>
              <Text style={[styles.compareLabel, { color: colors.text }]}>
                {row.label}
              </Text>
              <View style={styles.compareCell}>
                <Check on={row.free} />
              </View>
              <View style={styles.compareCell}>
                <Check on accent />
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
            rest=" Unlock all Premium features"
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
            priceLabel="$39.99/yr"
            sub={`${trialDays}-day free trial · $3.33/mo`}
            badge="BEST VALUE"
          />
          <PlanCard
            value="monthly"
            title="Monthly"
            priceLabel="$9.99/mo"
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

const CELL = 70;

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

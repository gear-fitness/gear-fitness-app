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
// check (included) or lock (Plus-only); a string renders that value.
type CompareCell = boolean | string;
const COMPARE: { label: string; basic: CompareCell; plus: CompareCell }[] = [
  { label: "Track workouts & PRs", basic: true, plus: true },
  { label: "Connect with friends", basic: true, plus: true },
  { label: "Routines", basic: "3", plus: "7" },
  { label: "Streak restore tokens / mo", basic: "1", plus: "4" },
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
  const price = plan === "annual" ? "$47.99/year" : "$7.99/mo";

  const handleStart = () => {
    if (referred) {
      onFinish();
      return;
    }
    // Offer to double the trial before settling for 3 days.
    setBoost(true);
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
        >
          {value}
        </Text>
      );
    }
    if (value) {
      return (
        <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
          <Text style={[styles.checkMark, { color: colors.accentText }]}>✓</Text>
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
        style={[
          styles.timelineText,
          { color: colors.text },
          last && styles.timelineTextLast,
        ]}
      >
        <Text style={styles.timelineBold}>{bold}</Text>
        {rest}
      </Text>
    </View>
  );

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <ScrollView
        style={shared.body}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.eyebrow}>
          <Text style={[styles.eyebrowText, { color: colors.text }]}>Gear</Text>
          <View style={[styles.eyebrowPill, { backgroundColor: colors.accent }]}>
            <Text style={[styles.eyebrowPillText, { color: colors.accentText }]}>
              Plus
            </Text>
          </View>
        </View>
        <Text style={shared.heading}>Achieve your goals faster</Text>
        <Text style={shared.subheading}>
          Start your {trialDays}-day free trial. Cancel anytime.
        </Text>

        {referred && (
          <View style={[styles.unlock, { backgroundColor: colors.accent }]}>
            <Text style={[styles.unlockText, { color: colors.accentText }]}>
              🎉 You unlocked a 7-day free trial
            </Text>
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
              <Text style={[styles.featTitle, { color: colors.text }]}>
                {trialDays}-day free trial
              </Text>
              <Text style={[styles.featSub, { color: colors.secondary }]}>
                then <Text style={styles.strike}>$95.88</Text> → $47.99/year
              </Text>
            </View>
            <View style={styles.featRight}>
              <Text style={[styles.featPrice, { color: colors.text }]}>
                $4.00
              </Text>
              <Text style={[styles.featPer, { color: colors.secondary }]}>
                per month
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
            <Text style={[styles.secTitle, { color: colors.text }]}>Monthly</Text>
            <Text style={[styles.featSub, { color: colors.secondary }]}>
              No commitment. Cancel anytime.
            </Text>
          </View>
          <View style={styles.featRight}>
            <Text style={[styles.featPrice, { color: colors.text }]}>$7.99</Text>
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
              <View style={[styles.plusPill, { backgroundColor: colors.accent }]}>
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
      </ScrollView>

      <View style={shared.footer}>
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>
            Start my {trialDays}-day free trial
          </Text>
        </Pressable>
        <Pressable onPress={onFinish} style={styles.notNow}>
          <Text style={[styles.notNowText, { color: colors.secondary }]}>
            Not now
          </Text>
        </Pressable>
        <Text style={[styles.legal, { color: colors.secondary }]}>
          No payment now. Cancel anytime in Settings.
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

  // Plan cards
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
  featTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  featSub: {
    fontSize: 13,
    marginTop: 4,
  },
  strike: {
    textDecorationLine: "line-through",
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

  // Comparison
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

  // Trial timeline
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

  // Footer
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

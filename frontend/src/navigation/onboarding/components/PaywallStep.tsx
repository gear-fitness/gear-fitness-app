import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

const BENEFITS = [
  "Your personalized plan & routines",
  "Unlimited workout & PR tracking",
  "Progress charts and streaks",
  "AI coaching and form tips",
];

type Plan = "annual" | "monthly";

export function PaywallStep({ onFinish, onBack, progress }: StepProps) {
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const [plan, setPlan] = useState<Plan>("annual");

  const PlanCard = ({
    value,
    title,
    price,
    sub,
    badge,
  }: {
    value: Plan;
    title: string;
    price: string;
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
            {price}
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
        <Text style={shared.heading}>Your plan is ready</Text>
        <Text style={shared.subheading}>
          Start your 7-day free trial — no charge today, cancel anytime.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <Text style={[styles.benefitCheck, { color: colors.accent }]}>
                ✓
              </Text>
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {b}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <PlanCard
            value="annual"
            title="Yearly"
            price="$39.99/yr"
            sub="7-day free trial · $3.33/mo"
            badge="BEST VALUE"
          />
          <PlanCard
            value="monthly"
            title="Monthly"
            price="$9.99/mo"
            sub="7-day free trial"
          />
        </View>
      </ScrollView>

      <View style={shared.footer}>
        <Pressable
          onPress={onFinish}
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
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 16,
  },
  benefits: {
    gap: 12,
    marginTop: 4,
    marginBottom: 22,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitCheck: {
    fontSize: 16,
    fontWeight: "800",
    width: 20,
  },
  benefitText: {
    fontSize: 15,
    fontWeight: "500",
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

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useVideoPlayer, VideoView } from "expo-video";
import { Text } from "../../../components/Text";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";

import { StepScaffold } from "../../onboarding/components/StepScaffold";
import { OnboardingTopBar } from "../../onboarding/components/OnboardingTopBar";
import { PaywallContent } from "../../onboarding/components/PaywallContent";
import { HeightPickerInline } from "../../onboarding/components/MetricPickers";
import { WeightRuler } from "../../onboarding/components/RulerPicker";
import {
  ChoiceSlider,
  SliderOption,
} from "../../onboarding/components/ChoiceSlider";
import { useOnboardingColors } from "../../onboarding/components/useOnboardingColors";
import { ACTIVITY_OPTIONS } from "../../onboarding/intakeOptions";
import { Height, Weight } from "../../onboarding/types";
import { heightToInches, weightToLbs } from "../../onboarding/units";

import { useAuth } from "../../../context/AuthContext";
import { useTier } from "../../../hooks/useTier";
import { useNutrition } from "../../../context/NutritionContext";
import { updateUserProfile } from "../../../api/userService";
import { recalcGoal } from "../../../api/nutritionService";
import {
  ActivityLevel,
  NutritionGoalIntensity,
  NutritionGoalType,
} from "../../../api/types";
import { computeGoalPlan } from "./goalFormula";
import { syncOnboardingDataToHealthKit } from "../../../utils/healthKitSync";
import { useResumeVideoOnForeground } from "../../../hooks/useResumeVideoOnForeground";

// Demo clip looping in the intro step, above the feature cards.
const introVideo = require("../../../../assets/nutrition-setup-intro.mp4");

/* Activity slider options, mirroring the onboarding ActivityStep. */
const SHORT_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  very_active: "Very active",
};
const CRITTERS: Record<ActivityLevel, SliderOption<ActivityLevel>["critter"]> =
  {
    sedentary: "couch",
    light: "turtle",
    moderate: "bunny",
    very_active: "bird",
  };
const SLIDER_OPTIONS: SliderOption<ActivityLevel>[] = ACTIVITY_OPTIONS.map(
  (o) => ({
    value: o.value,
    label: o.label,
    short: SHORT_LABELS[o.value],
    hint: o.hint,
    critter: CRITTERS[o.value],
  }),
);

const AGE_VALUES = Array.from({ length: 88 }, (_, i) => i + 13); // 13..100

const GOAL_CHOICES: {
  value: NutritionGoalType;
  title: string;
  subtitle: string;
}[] = [
  { value: "CUT", title: "Cut", subtitle: "Lose fat while keeping muscle" },
  {
    value: "MAINTAIN",
    title: "Maintain",
    subtitle: "Stay at your current weight",
  },
  { value: "BULK", title: "Bulk", subtitle: "Build muscle and gain weight" },
];

/* Per-direction pace choices. Pounds per week come from the calorie offsets
   (3500 cal per lb): cut 250/500/750, bulk 150/300/500. */
const INTENSITY_CHOICES: Record<
  "CUT" | "BULK",
  { value: NutritionGoalIntensity; title: string; subtitle: string }[]
> = {
  CUT: [
    {
      value: "SLOW",
      title: "Slow",
      subtitle: "About 0.5 lb per week (250 cal below maintenance)",
    },
    {
      value: "MODERATE",
      title: "Moderate",
      subtitle: "About 1 lb per week (500 cal below maintenance)",
    },
    {
      value: "AGGRESSIVE",
      title: "Aggressive",
      subtitle: "About 1.5 lb per week (750 cal below maintenance)",
    },
  ],
  BULK: [
    {
      value: "SLOW",
      title: "Lean",
      subtitle: "About 0.3 lb per week (150 cal above maintenance)",
    },
    {
      value: "MODERATE",
      title: "Moderate",
      subtitle: "About 0.6 lb per week (300 cal above maintenance)",
    },
    {
      value: "AGGRESSIVE",
      title: "Fast",
      subtitle: "About 1 lb per week (500 cal above maintenance)",
    },
  ],
};

type StepKind =
  | "intro"
  | "height"
  | "weight"
  | "age"
  | "activity"
  | "goal"
  | "intensity"
  | "result";

/**
 * The calorie-calculator wizard, presented full screen over the tabs. The
 * tracker pushes it with forced: true whenever the Nutrition tab is visited
 * before setup is complete (goal.setupComplete); forced closes every escape
 * hatch, so completing it is the only way to the tracker. The Daily Goals
 * screen opens it without the param for later tweaks, where swipe-back
 * dismisses. Every input is prefilled from the profile, and steps whose
 * value onboarding already captured read as confirmations rather than
 * questions; saving persists the stats to the profile, then has the server
 * recalculate and store the calorie/macro targets.
 */
export function NutritionSetup() {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;
  const colors = useOnboardingColors();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { refresh, summary } = useNutrition();
  const { atLeast } = useTier();
  const isPlus = atLeast("PLUS");

  const forced = route.params?.forced === true;
  const finished = useRef(false);

  // Forced mode: no swipe-back, and any pop this screen didn't initiate
  // (e.g. the Android back button) is blocked until saving succeeds. Scoped
  // to back/pop actions so a RESET (logout) still tears the screen down.
  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: !forced });
  }, [navigation, forced]);
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e: any) => {
        const action = e?.data?.action?.type;
        if (
          forced &&
          !finished.current &&
          (action === "GO_BACK" || action === "POP")
        ) {
          e.preventDefault();
        }
      }),
    [navigation, forced],
  );

  /* ---- prefill from the profile ---- */
  const initialInches = user?.heightInches ?? null;
  const [height, setHeight] = useState<Height | undefined>(
    initialInches != null
      ? {
          unit: "ft_in",
          ft: Math.floor(initialInches / 12),
          inch: initialInches % 12,
        }
      : undefined,
  );
  const [weight, setWeight] = useState<Weight | undefined>(
    user?.weightLbs != null
      ? { unit: "lbs", value: user.weightLbs }
      : undefined,
  );
  const [age, setAge] = useState<number>(user?.age ?? 25);
  const [activity, setActivity] = useState<ActivityLevel | undefined>(
    user?.activityLevel ?? undefined,
  );
  // Initial direction: a previously saved choice wins (reopens from Daily
  // Goals must show what the user picked, not re-derive it); first-time
  // setups fall back to the goal weight captured in onboarding (within 2 lb
  // of current weight reads as maintaining).
  const [goalType, setGoalType] = useState<NutritionGoalType>(() => {
    const saved = summary?.goal?.goalType;
    if (saved && summary?.goal?.setupComplete) return saved;
    const gw = user?.goalWeightLbs;
    const w = user?.weightLbs;
    if (gw == null || w == null) return "MAINTAIN";
    if (gw < w - 2) return "CUT";
    if (gw > w + 2) return "BULK";
    return "MAINTAIN";
  });
  const [intensity, setIntensity] = useState<NutritionGoalIntensity>(() =>
    summary?.goal?.setupComplete
      ? (summary?.goal?.goalIntensity ?? "MODERATE")
      : "MODERATE",
  );

  // Onboarding already captured most of these stats, so steps read as
  // confirming the imported value ("is this still right?") and only fall
  // back to asking when the profile lacks one.
  const imported = {
    height: initialInches != null,
    weight: user?.weightLbs != null,
    age: user?.age != null,
    activity: user?.activityLevel != null,
    goal: user?.goalWeightLbs != null && user?.weightLbs != null,
  };

  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  // The Plus paywall shown after a Basic user's goals save. Kept out of the
  // steps array so a tier change mid-wizard can't reshuffle step indices.
  const [showPaywall, setShowPaywall] = useState(false);

  // Single exit point, guarded so the paywall's onDone and the isPlus effect
  // below can't both fire goBack and pop the screen underneath too.
  const closed = useRef(false);
  const closeWizard = () => {
    if (closed.current) return;
    closed.current = true;
    navigation.goBack();
  };

  // Never pitch Plus to a Plus user: if the tier resolves to Plus while the
  // paywall is up (profile refreshed during save, or the purchase itself
  // landed), close the wizard instead.
  useEffect(() => {
    if (showPaywall && isPlus) closeWizard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaywall, isPlus]);

  // Looping demo clip on the intro step; paused once the user moves on.
  const player = useVideoPlayer(introVideo, (p) => {
    p.loop = true;
    p.muted = true;
    // Don't seize the iOS audio session / stop the user's music.
    p.audioMixingMode = "mixWithOthers";
    p.play();
  });
  useResumeVideoOnForeground(player, () => !showPaywall && stepIdx === 0);

  // Maintaining needs no pace choice, so the intensity step drops out.
  const steps: StepKind[] = useMemo(
    () =>
      goalType === "MAINTAIN"
        ? ["intro", "height", "weight", "age", "activity", "goal", "result"]
        : [
            "intro",
            "height",
            "weight",
            "age",
            "activity",
            "goal",
            "intensity",
            "result",
          ],
    [goalType],
  );
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const progress = stepIdx / (steps.length - 1);

  // Only the intro renders the video; stop decoding once the user moves on,
  // and pick back up if they back into the intro.
  useEffect(() => {
    if (step === "intro" && !showPaywall) player.play();
    else player.pause();
  }, [player, step, showPaywall]);

  const plan = useMemo(
    () =>
      computeGoalPlan({
        heightInches: heightToInches(height),
        weightLbs: weightToLbs(weight),
        age,
        gender: user?.gender ?? null,
        activityLevel: activity ?? "light",
        goalType,
        goalIntensity: intensity,
      }),
    [height, weight, age, user?.gender, activity, goalType, intensity],
  );

  // The intro hides the top bar, so backing up is only possible from step
  // one onward, and only ever within the wizard. There is no decline: forced
  // pushes offer no way out, and Daily Goals opens rely on swipe-back.
  const goBackStep = () => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateUserProfile(
        heightToInches(height),
        weightToLbs(weight),
        age,
        null,
        null,
        null,
        activity ?? null,
        null,
      );
      await recalcGoal({ goalType, goalIntensity: intensity });
      syncOnboardingDataToHealthKit({ height, weight });
      await refreshUser();
      // Await the summary refresh so setupComplete is already true when the
      // tracker refocuses; a stale summary would re-push this wizard.
      await refresh();
      finished.current = true;
      // Basic users see the Plus paywall before the wizard closes; goals are
      // already saved at this point, so dismissing it loses nothing. (If the
      // profile refresh above just revealed a Plus tier, the isPlus effect
      // closes the paywall before it's seen.)
      if (isPlus) {
        closeWizard();
      } else {
        setShowPaywall(true);
      }
    } catch {
      Alert.alert("Couldn't save your goals", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const choiceCard = (
    selected: boolean,
    title: string,
    subtitle: string,
    onPress: () => void,
  ) => (
    <Pressable
      key={title}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[
        styles.choiceCard,
        {
          backgroundColor: colors.cardBg,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <Text style={[styles.choiceTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.choiceSubtitle, { color: colors.secondary }]}>
        {subtitle}
      </Text>
    </Pressable>
  );

  const glassAvailable = isLiquidGlassAvailable();

  const introRow = (
    icon: React.ComponentProps<typeof SymbolView>["name"],
    title: string,
    subtitle: string,
  ) => (
    <View
      key={title}
      style={[
        styles.introRow,
        {
          backgroundColor: glassAvailable ? "transparent" : colors.cardBg,
          borderColor: glassAvailable ? "transparent" : colors.cardBorder,
        },
      ]}
    >
      {glassAvailable && (
        <GlassView
          style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
          glassEffectStyle="regular"
        />
      )}
      <View style={styles.introIconWrap}>
        <SymbolView
          name={icon}
          size={17}
          tintColor={colors.text}
          resizeMode="scaleAspectFit"
        />
      </View>
      <View style={styles.introRowText}>
        <Text style={[styles.introRowTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.introRowSubtitle, { color: colors.secondary }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );

  const renderStep = () => {
    // Post-save Plus pitch for Basic users. Purchasing or dismissing both
    // close the wizard; back returns to the (already saved) result step.
    if (showPaywall) {
      if (isPlus) return null; // closing via the effect above
      return (
        <PaywallContent
          header={
            <OnboardingTopBar
              progress={1}
              onBack={() => setShowPaywall(false)}
            />
          }
          onDone={closeWizard}
        />
      );
    }

    switch (step) {
      case "intro":
        return (
          <StepScaffold
            progress={progress}
            onBack={goBackStep}
            hideTopBar
            headingOffset={18}
            heading="Set up your smart journal"
            onContinue={() => setStepIdx((i) => i + 1)}
            continueLabel="Get started"
            footerExtra={
              // Forced pushes (first visit to the tracker) offer no way out;
              // opens from Daily Goals can be dismissed without changes.
              !forced ? (
                <Pressable onPress={closeWizard} style={styles.notNow}>
                  <Text
                    style={[styles.notNowText, { color: colors.secondary }]}
                  >
                    Not now
                  </Text>
                </Pressable>
              ) : undefined
            }
          >
            <View style={styles.introBody}>
              <View style={styles.introVideoWrap} pointerEvents="none">
                <View style={styles.introVideoFrame}>
                  <VideoView
                    player={player}
                    style={styles.introVideo}
                    contentFit="cover"
                    nativeControls={false}
                    allowsPictureInPicture={false}
                    allowsVideoFrameAnalysis={false}
                  />
                </View>
              </View>
              <View style={styles.introList}>
                {introRow(
                  "target",
                  "Targets built for you",
                  "Calories and macros calculated from your height, weight, and activity.",
                )}
                {introRow(
                  "fork.knife",
                  "Note what you ate, and we'll do the rest",
                  "We research your food and compare sources to log the most accurate nutrition info.",
                )}
                {introRow(
                  "slider.horizontal.3",
                  "Change your mind anytime",
                  "Tweak your goal and pace later from Daily Goals.",
                )}
              </View>
            </View>
          </StepScaffold>
        );

      case "height":
        return (
          <StepScaffold
            progress={progress}
            onBack={goBackStep}
            heading={
              imported.height ? "Confirm your height" : "How tall are you?"
            }
            subheading={
              imported.height
                ? "Imported from your onboarding. Adjust it if anything's changed."
                : "We use this to estimate your daily burn."
            }
            onContinue={() => setStepIdx((i) => i + 1)}
            continueDisabled={!height}
          >
            <View style={styles.center}>
              <HeightPickerInline
                initial={height}
                onChange={setHeight}
                colors={colors}
              />
            </View>
          </StepScaffold>
        );

      case "weight":
        return (
          <StepScaffold
            progress={progress}
            onBack={goBackStep}
            heading={
              imported.weight ? "Confirm your weight" : "How much do you weigh?"
            }
            subheading={
              imported.weight
                ? "Keeping this current keeps your targets accurate."
                : undefined
            }
            onContinue={() => setStepIdx((i) => i + 1)}
            continueDisabled={!weight}
          >
            <View style={styles.center}>
              <WeightRuler
                initial={weight}
                onChange={setWeight}
                colors={colors}
              />
            </View>
          </StepScaffold>
        );

      case "age":
        return (
          <StepScaffold
            progress={progress}
            onBack={goBackStep}
            heading={imported.age ? "Confirm your age" : "How old are you?"}
            onContinue={() => setStepIdx((i) => i + 1)}
          >
            <View style={styles.center}>
              <Picker
                selectedValue={age}
                onValueChange={setAge}
                style={styles.agePicker}
                itemStyle={[styles.agePickerItem, { color: colors.text }]}
              >
                {AGE_VALUES.map((v) => (
                  <Picker.Item key={v} label={`${v}`} value={v} />
                ))}
              </Picker>
            </View>
          </StepScaffold>
        );

      case "activity":
        return (
          <StepScaffold
            progress={progress}
            onBack={goBackStep}
            heading={
              imported.activity
                ? "Confirm your activity level"
                : "How active are you day to day?"
            }
            subheading="This sets your baseline."
            onContinue={() => setStepIdx((i) => i + 1)}
            continueDisabled={!activity}
          >
            <View style={styles.center}>
              <ChoiceSlider
                options={SLIDER_OPTIONS}
                value={activity}
                defaultValue="light"
                onChange={setActivity}
              />
            </View>
          </StepScaffold>
        );

      case "goal":
        return (
          <StepScaffold
            progress={progress}
            onBack={goBackStep}
            heading={imported.goal ? "Confirm your goal" : "What's your goal?"}
            subheading={
              imported.goal
                ? "Set from the goal weight you gave us. Change it if your aim has shifted."
                : "This decides whether we aim above or below maintenance."
            }
            onContinue={() => setStepIdx((i) => i + 1)}
          >
            <View style={styles.cards}>
              {GOAL_CHOICES.map((c) =>
                choiceCard(goalType === c.value, c.title, c.subtitle, () =>
                  setGoalType(c.value),
                ),
              )}
            </View>
          </StepScaffold>
        );

      case "intensity": {
        const choices = INTENSITY_CHOICES[goalType === "CUT" ? "CUT" : "BULK"];
        return (
          <StepScaffold
            progress={progress}
            onBack={goBackStep}
            heading="How fast do you want to go?"
            subheading={
              goalType === "CUT"
                ? "Bigger deficits move faster but are harder to stick to."
                : "Smaller surpluses keep the gains leaner."
            }
            onContinue={() => setStepIdx((i) => i + 1)}
          >
            <View style={styles.cards}>
              {choices.map((c) =>
                choiceCard(intensity === c.value, c.title, c.subtitle, () =>
                  setIntensity(c.value),
                ),
              )}
            </View>
          </StepScaffold>
        );
      }

      case "result":
      default:
        return (
          <StepScaffold
            progress={progress}
            onBack={goBackStep}
            heading="Your daily plan"
            subheading="Based on your stats, activity, and goal."
            onContinue={handleSave}
            continueLabel={saving ? "Saving..." : "Set my goals"}
            continueDisabled={saving}
          >
            <View style={styles.center}>
              <View
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[styles.planPill, { backgroundColor: colors.accent }]}
                >
                  <Text
                    style={[styles.planPillText, { color: colors.accentText }]}
                  >
                    {goalType === "CUT"
                      ? "CUT"
                      : goalType === "BULK"
                        ? "BULK"
                        : "MAINTAIN"}
                  </Text>
                </View>
                <Text style={[styles.resultCalories, { color: colors.text }]}>
                  {plan.calories.toLocaleString()}
                </Text>
                <Text
                  style={[
                    styles.resultCaloriesLabel,
                    { color: colors.secondary },
                  ]}
                >
                  calories per day
                </Text>
                <View style={styles.macroRow}>
                  {(
                    [
                      ["Protein", plan.proteinG],
                      ["Carbs", plan.carbsG],
                      ["Fat", plan.fatG],
                    ] as const
                  ).map(([label, grams]) => (
                    <View key={label} style={styles.macroCell}>
                      <Text style={[styles.macroValue, { color: colors.text }]}>
                        {grams}g
                      </Text>
                      <Text
                        style={[styles.macroLabel, { color: colors.secondary }]}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={[styles.resultNote, { color: colors.secondary }]}>
                You can tweak these numbers anytime from Daily Goals.
              </Text>
            </View>
          </StepScaffold>
        );
    }
  };

  return (
    // Presented as its own headerless screen (unlike onboarding, whose
    // parent applies the top inset), so the wizard pads for the status bar
    // itself.
    <View style={[styles.safeScreen, { paddingTop: insets.top }]}>
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
  },
  cards: {
    flex: 1,
    justifyContent: "center",
  },
  safeScreen: {
    flex: 1,
  },
  introBody: {
    flex: 1,
  },
  // The demo clip sits above the feature cards at a fixed 5:3 (w:h) ratio:
  // full width when the screen is tall enough, otherwise capped by the
  // available height with the width shrinking to hold the ratio, centered
  // either way. The wrap flexes; only the frame is the visible video box.
  introVideoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  introVideoFrame: {
    width: "100%",
    maxHeight: "100%",
    aspectRatio: 5 / 3,
    borderRadius: 16,
    overflow: "hidden",
  },
  introVideo: {
    width: "100%",
    height: "100%",
  },
  introList: {
    gap: 8,
    paddingBottom: 8,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
    overflow: "hidden",
  },
  introIconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  introRowText: {
    flex: 1,
  },
  introRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 1,
  },
  introRowSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  notNow: {
    paddingVertical: 10,
    alignItems: "center",
  },
  notNowText: {
    fontSize: 15,
    fontWeight: "500",
  },
  choiceCard: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
  },
  choiceTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  choiceSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  agePicker: {
    height: 216,
  },
  agePickerItem: {
    fontSize: 22,
  },
  resultCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
  },
  planPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  planPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  resultCalories: {
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 60,
  },
  resultCaloriesLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignSelf: "stretch",
    marginTop: 20,
  },
  macroCell: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  macroLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  resultNote: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 14,
  },
});

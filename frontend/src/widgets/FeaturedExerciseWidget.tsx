import { Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type FeaturedExerciseWidgetProps = {
  exerciseName: string;
  bodyPart: string;
  prLbs: number;
  lastSessionDate: string;
  sparkline: string;
};

export const EMPTY_FEATURED_EXERCISE_PROPS: FeaturedExerciseWidgetProps = {
  exerciseName: "Pick an exercise",
  bodyPart: "GEAR FITNESS",
  prLbs: 0,
  lastSessionDate: "—",
  sparkline: "—",
};

const FeaturedExerciseWidgetComponent = (
  props: FeaturedExerciseWidgetProps,
  env: WidgetEnvironment,
) => {
  "widget";

  const isDark = env.colorScheme === "dark";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subtleColor = isDark ? "#AAAAAA" : "#666666";
  const accentColor = "#007AFF";
  const prColor = "#FFD700";

  const prDisplay = props.prLbs > 0 ? `${props.prLbs}` : "—";

  return (
    <VStack modifiers={[padding({ all: 4 })]}>
      <Text
        modifiers={[
          font({ weight: "bold", size: 10 }),
          foregroundStyle(accentColor),
        ]}
      >
        {props.bodyPart.toUpperCase()}
      </Text>

      <Text
        modifiers={[
          font({ weight: "bold", size: 14 }),
          foregroundStyle(textColor),
        ]}
      >
        {props.exerciseName}
      </Text>

      <Text
        modifiers={[
          font({ weight: "bold", size: 32 }),
          foregroundStyle(prColor),
        ]}
      >
        {prDisplay}
      </Text>

      <Text
        modifiers={[
          font({ weight: "regular", size: 10 }),
          foregroundStyle(subtleColor),
        ]}
      >
        PR (lbs)
      </Text>

      <Text modifiers={[font({ size: 14 }), foregroundStyle(accentColor)]}>
        {props.sparkline}
      </Text>

      <Text modifiers={[font({ size: 10 }), foregroundStyle(subtleColor)]}>
        Last: {props.lastSessionDate}
      </Text>
    </VStack>
  );
};

export const FeaturedExerciseWidget = createWidget(
  "FeaturedExerciseWidget",
  FeaturedExerciseWidgetComponent,
);

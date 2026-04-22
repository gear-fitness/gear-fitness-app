import { Text, VStack, Spacer } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type FeaturedExerciseWidgetProps = {
  exerciseName: string;
  bodyPart: string;
  prLbs: number | null;
  lastSessionDate: string | null; // "Nov 14" pre-formatted from app
  sparkline: string; // e.g. "▂▃▅▄▇" — pre-built unicode string
};

// Empty-state fallback shown when no featured exercise is set
const EMPTY: FeaturedExerciseWidgetProps = {
  exerciseName: "No exercise set",
  bodyPart: "",
  prLbs: null,
  lastSessionDate: null,
  sparkline: "",
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

  const prDisplay = props.prLbs != null ? `${props.prLbs}` : "—";

  return (
    <VStack modifiers={[padding({ all: 4 })]}>
      <Text
        modifiers={[
          font({ weight: "semibold", size: 11 }),
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

      <Spacer />

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
          font({ weight: "medium", size: 10 }),
          foregroundStyle(subtleColor),
        ]}
      >
        PR (lbs)
      </Text>

      <Spacer />

      {props.sparkline.length > 0 && (
        <Text modifiers={[font({ size: 16 }), foregroundStyle(accentColor)]}>
          {props.sparkline}
        </Text>
      )}

      {props.lastSessionDate && (
        <Text modifiers={[font({ size: 10 }), foregroundStyle(subtleColor)]}>
          Last: {props.lastSessionDate}
        </Text>
      )}
    </VStack>
  );
};

export const FeaturedExerciseWidget = createWidget(
  "FeaturedExerciseWidget",
  FeaturedExerciseWidgetComponent,
);

export { EMPTY as EMPTY_FEATURED_EXERCISE_PROPS };

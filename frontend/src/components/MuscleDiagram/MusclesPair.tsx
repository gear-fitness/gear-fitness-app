import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Text } from "../Text";

import { MuscleDiagram, type MuscleActivation } from "./MuscleDiagram";
import type { BodyVariant } from "./bodyData";

export type MusclesPairProps = {
  activations: MuscleActivation[];
  variant: BodyVariant;
  width: number;
  baseColor: string;
  outlineColor: string;
  intensityToColor: (intensity: number) => string;
  showCaptions?: boolean;
  captionStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

export function MusclesPair({
  activations,
  variant,
  width,
  baseColor,
  outlineColor,
  intensityToColor,
  showCaptions = true,
  captionStyle,
  style,
}: MusclesPairProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.cell}>
        <MuscleDiagram
          side="front"
          variant={variant}
          activations={activations}
          baseColor={baseColor}
          outlineColor={outlineColor}
          intensityToColor={intensityToColor}
          width={width}
        />
        {showCaptions && (
          <Text style={[styles.caption, captionStyle]}>Front</Text>
        )}
      </View>
      <View style={styles.cell}>
        <MuscleDiagram
          side="back"
          variant={variant}
          activations={activations}
          baseColor={baseColor}
          outlineColor={outlineColor}
          intensityToColor={intensityToColor}
          width={width}
        />
        {showCaptions && (
          <Text style={[styles.caption, captionStyle]}>Back</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  cell: {
    alignItems: "center",
  },
  caption: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginTop: 10,
  },
});

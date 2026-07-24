import { ColorValue, StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@react-navigation/native";

import { Text } from "./Text";
import { BottomSheet } from "./BottomSheet";
import { SupersetLinkIcon } from "./SupersetLinkIcon";
import { BodyPartDTO } from "../api/exerciseService";
import { formatMuscleGroups } from "../utils/exerciseUtils";

export interface SupersetPartnerOption {
  workoutExerciseId: string;
  name: string;
  bodyParts?: BodyPartDTO[];
}

interface Props {
  visible: boolean;
  // Snapshot of the workout's other ungrouped exercises. The parent holds the
  // last non-null snapshot through the close animation (BottomSheet consumer
  // contract), so rows never vanish mid-slide.
  options: SupersetPartnerOption[];
  onPick: (workoutExerciseId: string) => void;
  onPickFromLibrary: () => void;
  onClose: () => void;
  // Follow-up navigation (the library picker) must chain through onClosed:
  // iOS refuses to present anything while this modal is still up.
  onClosed?: () => void;
}

// "Superset with" partner picker, following the PostActionsSheet consumer
// pattern on the shared BottomSheet.
export function SupersetPartnerSheet({
  visible,
  options,
  onPick,
  onPickFromLibrary,
  onClose,
  onClosed,
}: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={onClosed}>
      <View style={styles.content}>
        <Text style={[styles.overline, { color: colors.text }]}>
          SUPERSET WITH
        </Text>
        {options.map((option) => (
          <TouchableOpacity
            key={option.workoutExerciseId}
            activeOpacity={0.7}
            onPress={() => onPick(option.workoutExerciseId)}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            <View style={styles.rowIcon}>
              <SupersetLinkIcon size={18} color={colors.text} />
            </View>
            <View style={styles.rowName}>
              <Text
                style={[styles.rowTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {option.name}
              </Text>
              {option.bodyParts && option.bodyParts.length > 0 && (
                <Text
                  style={[styles.rowSub, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {formatMuscleGroups(option.bodyParts)}
                </Text>
              )}
            </View>
            <Chevron color={colors.text} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPickFromLibrary}
          style={styles.row}
        >
          <Svg width={18} height={18} viewBox="0 0 16 16" fill="none">
            <Path
              d="M8 3v10M3 8h10"
              stroke={colors.text}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.rowName}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Pick from library
            </Text>
          </View>
          <Chevron color={colors.text} />
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

function Chevron({ color }: { color: ColorValue }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
      <Path
        d="M6 3l5 5-5 5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
  },
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    opacity: 0.55,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  rowIcon: {
    opacity: 0.55,
  },
  rowName: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 12,
    opacity: 0.45,
    marginTop: 2,
  },
});

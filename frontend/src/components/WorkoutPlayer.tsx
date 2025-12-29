import { StyleSheet } from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayer } from "./MiniPlayer";
import { useWorkoutTimer } from "../context/WorkoutContext";
import { navigationRef } from "../App";

const MINI_PLAYER_HEIGHT = 70;
// HARD MINIMUM - player will NEVER be lower than this (tab bar ~50px + small margin)
const MINIMUM_BOTTOM_CLEARANCE = 84;

export function WorkoutPlayer() {
  const { playerVisible } = useWorkoutTimer();
  const insets = useSafeAreaInsets();

  const handleTap = () => {
    // Navigate to WorkoutSummary (last workout page they were using)
    navigationRef.current?.navigate("WorkoutSummary");
  };

  // Don't render player when no workout is active
  if (!playerVisible) {
    return null;
  }

  // Calculate bottom offset: use the LARGER of safe area bottom OR minimum clearance
  // This ensures it NEVER overlaps nav bar, even during transitions
  const bottomOffset = Math.max(insets.bottom, MINIMUM_BOTTOM_CLEARANCE);

  return (
    <View style={[styles.playerContainer, { bottom: bottomOffset }]}>
      <MiniPlayer onTap={handleTap} isVisible={playerVisible} />
    </View>
  );
}

const styles = StyleSheet.create({
  playerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    zIndex: 999,
  },
});

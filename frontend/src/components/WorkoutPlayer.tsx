import { StyleSheet } from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as React from "react";

import { MiniPlayer } from "./MiniPlayer";
import { useWorkoutTimer } from "../context/WorkoutContext";
import { navigationRef } from "../App";

// Screens that have bottom tab navigation
const TAB_SCREENS = ['Home', 'Social', 'Workouts', 'History', 'Profile'];

const MINI_PLAYER_HEIGHT = 70;
// Clearance for screens WITH bottom tab bar (tab bar ~50px + margin)
const TAB_BAR_CLEARANCE = 84;
// Clearance for screens WITHOUT bottom tab bar (no gap, just safe area)
const MODAL_CLEARANCE = 0;

export function WorkoutPlayer() {
  const { playerVisible } = useWorkoutTimer();
  const insets = useSafeAreaInsets();

  // Detect if current screen has bottom tab bar
  const currentRoute = navigationRef.current?.getCurrentRoute();
  const hasTabBar = currentRoute ? TAB_SCREENS.includes(currentRoute.name) : false;

  // Force re-render when route changes
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    const unsubscribe = navigationRef.current?.addListener('state', () => {
      forceUpdate();
    });
    return unsubscribe;
  }, []);

  const handleTap = () => {
    // Navigate to WorkoutSummary (last workout page they were using)
    navigationRef.current?.navigate("WorkoutSummary");
  };

  // Don't render player when no workout is active
  if (!playerVisible) {
    return null;
  }

  // Calculate bottom offset based on whether screen has tab bar
  // For tab screens: clear tab bar (~50px) + margin, respect safe area
  // For non-tab screens: flush to bottom (no gap)
  const bottomOffset = hasTabBar
    ? Math.max(insets.bottom, TAB_BAR_CLEARANCE)
    : MODAL_CLEARANCE;

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

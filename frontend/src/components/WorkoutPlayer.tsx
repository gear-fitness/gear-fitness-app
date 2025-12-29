import { StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";

import { MiniPlayer } from "./MiniPlayer";
import { useWorkoutTimer } from "../context/WorkoutContext";
import { navigationRef } from "../App";

const MINI_PLAYER_HEIGHT = 70;
const MINIMUM_BOTTOM_CLEARANCE = 84;

// Tabs where miniplayer should be visible
const ALLOWED_TABS = ["Home", "Social", "Workouts", "History", "Profile"];

export function WorkoutPlayer() {
  const { playerVisible, activeTab } = useWorkoutTimer();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleTap = () => {
    navigationRef.current?.navigate("WorkoutSummary");
  };

  // Check if we're on an allowed tab
  const isAllowedTab = ALLOWED_TABS.includes(activeTab);
  const shouldShow = playerVisible && isAllowedTab;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim]);

  const bottomOffset = Math.max(insets.bottom, MINIMUM_BOTTOM_CLEARANCE);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [MINI_PLAYER_HEIGHT + 20, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.playerContainer,
        {
          bottom: bottomOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={shouldShow ? "auto" : "none"}
    >
      <MiniPlayer onTap={handleTap} isVisible={playerVisible} />
    </Animated.View>
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

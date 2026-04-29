import { StyleSheet, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";

import { MiniPlayer } from "./MiniPlayer";
import { useWorkoutTimer } from "../context/WorkoutContext";
import { navigationRef } from "../App";

export const MINI_PLAYER_HEIGHT = 70;

// Tabs where miniplayer should be visible
const ALLOWED_TABS = ["Home", "Social", "Workouts", "History", "Profile"];

export function WorkoutPlayer() {
  const {
    playerVisible,
    activeTab,
    lastModalScreen,
    currentExerciseId,
    exercises,
  } = useWorkoutTimer();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleTap = () => {
    if (lastModalScreen === "ExerciseDetail" && currentExerciseId) {
      const ex = exercises.find(
        (e) => e.workoutExerciseId === currentExerciseId,
      );
      if (ex) {
        navigationRef.current?.navigate("WorkoutFlow", {
          screen: "ExerciseDetail",
          params: { exercise: ex },
        });
        return;
      }
    }
    navigationRef.current?.navigate("WorkoutFlow", {
      screen: "WorkoutSummary",
    });
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

  const majorVersionIOS = parseInt(Platform.Version, 10);

  const bottomOffset = 49 + insets.bottom + (majorVersionIOS < 26 ? 8 : 0);
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

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ExerciseSelect } from "./screens/ExerciseSelect";
import { ExerciseDetail } from "./screens/ExerciseDetail";
import { WorkoutSummary } from "./screens/WorkoutSummary";
import { WorkoutComplete } from "./screens/WorkoutComplete";

export const WorkoutFlowNavigator = createNativeStackNavigator({
  initialRouteName: "ExerciseSelect",
  screenOptions: {
    headerShown: false,
    animation: "none",
  },
  screens: {
    ExerciseSelect: {
      screen: ExerciseSelect,
    },
    ExerciseDetail: {
      screen: ExerciseDetail,
    },
    WorkoutSummary: {
      screen: WorkoutSummary,
    },
    WorkoutComplete: {
      screen: WorkoutComplete,
    },
  },
});

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
      options: {
        // The default 'pause' hides this screen with React's <Activity> while
        // WorkoutComplete covers it, which unmounts effects and wipes the
        // Sortable.Grid item measurements; they never re-measure on reveal
        // (no layout change), leaving drag-to-reorder dead after Finish ->
        // back. Keep the screen live instead.
        inactiveBehavior: "none",
      },
    },
    WorkoutComplete: {
      screen: WorkoutComplete,
      options: {
        animation: "slide_from_right",
      },
    },
  },
});

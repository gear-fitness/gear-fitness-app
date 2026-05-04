import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import {
  createStaticNavigation,
  StaticParamList,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text } from "react-native";

/* SCREENS */
import { Profile } from "./screens/Profile";
import { SettingsNavigator } from "./SettingsNavigator";
import { Social } from "./screens/Social";
import { Workout } from "./screens/Workout";
import { NotFound } from "./screens/NotFound";
import { History } from "./screens/History";
import { PR } from "./screens/PR";
import { DetailedHistory } from "./screens/DetailedHistory";
import { PostDetail } from "./screens/PostDetail";
import { WorkoutFlowNavigator } from "./WorkoutFlowNavigator";
import { OnboardingScreen } from "./screens/Onboarding";
import { WorkoutChat } from "./screens/WorkoutChat";
import { AuthLoadingScreen } from "./screens/AuthLoading";
import { CommentsScreen } from "../components/CommentsScreen";
import { ExerciseList } from "./screens/ExerciseList";
import { ExerciseHistory } from "./screens/ExerciseHistory";
import { CreateExerciseScreen } from "./screens/CreateExerciseScreen";
import { RoutineList } from "./screens/RoutineList";
import { RoutineDetail } from "./screens/RoutineDetail";
import { CreateRoutine } from "./screens/CreateRoutine";
import { EditRoutine } from "./screens/EditRoutine";
import { UserPosts } from "./screens/UserPosts";
import FollowScreen from "./screens/FollowScreen";
import { ImageViewer } from "./screens/ImageViewer";
import { Platform } from "react-native";

/* ---------------------- TABS ---------------------- */

const majorVersionIOS = parseInt(Platform.Version, 10);
const HomeTabs = createBottomTabNavigator({
  initialRouteName: "Workouts",
  ...(majorVersionIOS >= 26 && { implementation: "native" }),
  ...(majorVersionIOS < 26 && {
    tabBar: (props) => (
      <View
        style={{
          paddingTop: 8,
          borderTopColor: "#00000020",
          borderTopWidth: 1,
        }}
      >
        <BottomTabBar {...props} />
      </View>
    ),
  }),
  screenOptions: {
    headerShown: false,
    tabBarLabel: "",
    ...(majorVersionIOS < 26 && {
      tabBarStyle: {
        borderTopWidth: 0,
      },
    }),
  },
  screens: {
    Workouts: {
      screen: Workout,
      options: {
        tabBarIcon: { type: "sfSymbol", name: "dumbbell.fill" },
      },
    },
    Explore: {
      screen: Social,
      options: {
        headerShown: false,
        tabBarIcon: { type: "sfSymbol", name: "magnifyingglass" },
      },
    },
    History: {
      screen: History,
      options: {
        tabBarIcon: { type: "sfSymbol", name: "calendar" },
      },
    },
    Profile: {
      screen: Profile,
      options: {
        tabBarIcon: { type: "sfSymbol", name: "person.fill" },
      },
    },
    AiChat: {
      screen: WorkoutChat,
      options: {
        ...(majorVersionIOS >= 26 && { tabBarSystemItem: "search" }),
        tabBarIcon: { type: "sfSymbol", name: "sparkle" },
      },
    },
  },
});

/* ---------------------- STACK (MODALS) ---------------------- */

const RootStack = createNativeStackNavigator({
  initialRouteName: "AuthLoading",

  screens: {
    AuthLoading: {
      screen: AuthLoadingScreen,
      options: { headerShown: false },
    },
    Onboarding: {
      screen: OnboardingScreen,
      options: { headerShown: false, gestureEnabled: false },
    },
    HomeTabs: {
      screen: HomeTabs,
      options: { headerShown: false },
    },

    Settings: { screen: SettingsNavigator, options: { headerShown: false } },

    UserProfile: {
      screen: Profile,
      options: {
        headerShown: false,
        gestureEnabled: true,
      },
    },

    FollowScreen: {
      screen: FollowScreen,
      options: {
        headerShown: false,
      },
    },

    UserPosts: {
      screen: UserPosts,
      options: {
        headerShown: false,
        gestureEnabled: true,
      },
    },

    PR: {
      screen: PR,
      options: { headerShown: false },
    },

    DetailedHistory: {
      screen: DetailedHistory,
      options: {
        title: "Workout",
        headerShown: false,
        gestureEnabled: true,
      },
    },

    PostDetail: {
      screen: PostDetail,
      options: {
        title: "Post",
        headerShown: false,
        gestureEnabled: true,
      },
    },

    /* WORKOUT FLOW — single fullscreen modal containing the inner stack
       (ExerciseSelect, ExerciseDetail, WorkoutSummary, WorkoutComplete).
       Inter-screen transitions happen inside the inner stack with no
       UIKit modal dismiss/present, so no flash to HomeTabs. */
    WorkoutFlow: {
      screen: WorkoutFlowNavigator,
      options: {
        presentation: "fullScreenModal",
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "vertical",
      },
    },

    CreateExercise: {
      screen: CreateExerciseScreen,
      options: {
        title: "New Exercise",
        presentation: "fullScreenModal",
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "vertical",
      },
    },

    NotFound: {
      screen: NotFound,
      options: { title: "404" },
      linking: { path: "*" },
    },
    Comments: {
      screen: CommentsScreen,
      options: {
        title: "Comments",
        presentation: "modal",
        headerShown: true,
      },
    },
    ImageViewer: {
      screen: ImageViewer,
      options: {
        presentation: "transparentModal",
        headerShown: false,
        animation: "fade",
        animationDuration: 150,
        gestureEnabled: false,
      },
    },
    ExerciseList: {
      screen: ExerciseList,
      options: { headerShown: false },
    },
    ExerciseHistory: {
      screen: ExerciseHistory,
      options: { headerShown: false },
    },

    CreateRoutine: {
      screen: CreateRoutine,
      options: { headerShown: false },
    },

    EditRoutine: {
      screen: EditRoutine,
      options: { headerShown: false },
    },

    RoutineList: {
      screen: RoutineList,
      options: { headerShown: false },
    },

    RoutineDetail: {
      screen: RoutineDetail,
      options: { headerShown: false },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

/* ---------------------- TYPES ---------------------- */
export type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      AuthLoading: undefined;
      Onboarding: undefined;
      HomeTabs: undefined;
      History: undefined;
      Settings: undefined;
      Profile: undefined;
      UserProfile: { username: string };
      UserPosts: { userId: string; username: string };
      ExerciseChat: undefined;

      FollowScreen: {
        initialTab: "followers" | "following";
        userId: string;
      };
      ExerciseDetail: {
        exercise: {
          workoutExerciseId?: string;
          exerciseId: string;
          name: string;
          sets?: any[];
        };
      };
      WorkoutFlow:
        | {
            screen?:
              | "ExerciseSelect"
              | "ExerciseDetail"
              | "WorkoutSummary"
              | "WorkoutComplete";
            params?: any;
          }
        | undefined;

      CreateExercise:
        | {
            startWorkout?: boolean; // if true, navigate to ExerciseDetail after creation
          }
        | undefined;

      Comments: {
        postId: string;
      };

      ImageViewer: {
        photos: string[];
        initialIndex: number;
      };

      PostDetail: {
        postId: string;
        openCommentsOnMount?: boolean;
      };

      CreateRoutine: { prefilledWorkoutId?: string } | undefined;
      EditRoutine: { routine: import("../api/types").Routine };
      RoutineList: undefined;
      RoutineDetail: {
        routineId: string;
      };
    }
  }
}

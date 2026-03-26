import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { HeaderButton } from "@react-navigation/elements";
import {
  createStaticNavigation,
  StaticParamList,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image, View, Text } from "react-native";

/* ICONS */
import close from "../assets/close.png";

/* SCREENS */
import { Profile } from "./screens/Profile";
import { Settings } from "./screens/Settings";
import { Social } from "./screens/Social";
import { Workout } from "./screens/Workout";
import { NotFound } from "./screens/NotFound";
import { History } from "./screens/History";
import { PR } from "./screens/PR";
import { DetailedHistory } from "./screens/DetailedHistory";
import { ExerciseSelect } from "./screens/ExerciseSelect";
import { ExerciseDetail } from "./screens/ExerciseDetail";
import { WorkoutSummary } from "./screens/WorkoutSummary";
import { WorkoutComplete } from "./screens/WorkoutComplete";
import { LoginScreen } from "./screens/Login";
import { SignUpProfileScreen } from "./screens/SignUpProfile";
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
import { Platform } from "react-native";

/* ---------------------- TABS ---------------------- */

const majorVersionIOS = parseInt(Platform.Version, 10);
const HomeTabs = createBottomTabNavigator({
  initialRouteName: "Explore",
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
    Login: {
      screen: LoginScreen,
      options: { headerShown: false },
    },
    SignUpProfile: {
      screen: SignUpProfileScreen,
      options: {
        headerShown: true,
        title: "Complete Profile",
        headerBackVisible: false,
      },
    },
    HomeTabs: {
      screen: HomeTabs,
      options: { headerShown: false },
    },

    Settings: { screen: Settings, options: { headerBackTitle: "Profile" } },

    UserProfile: {
      screen: Profile,
      options: {
        headerShown: false,
        gestureEnabled: true,
      },
    },

    PR: {
      screen: PR,
      options: {
        title: "Personal Records",
        headerBackTitle: "History",
        headerShown: true,
      },
    },

    DetailedHistory: {
      screen: DetailedHistory,
      options: {
        title: "Workout",
        headerShown: true,
        headerBackTitle: "Back",
      },
    },

    /* MODAL 1 — SELECT EXERCISE */
    ExerciseSelect: {
      screen: ExerciseSelect,
      options: ({ navigation }) => ({
        title: "Select Exercise",
        presentation: "modal",
        headerRight: () => (
          <HeaderButton onPress={navigation.goBack}>
            <Image source={close} style={{ width: 15, height: 15 }} />
          </HeaderButton>
        ),
      }),
    },

    CreateExercise: {
      screen: CreateExerciseScreen,
      options: {
        title: "New Exercise",
        presentation: "modal",
        headerShown: true,
      },
    },

    /* MODAL 2 — EXERCISE DETAIL */
    ExerciseDetail: {
      screen: ExerciseDetail,
      options: {
        title: "Exercise Detail",
        presentation: "modal",
        headerShown: true,
        headerBackTitle: "Back",
      },
    },

    /* MODAL 3 — WORKOUT SUMMARY */
    WorkoutSummary: {
      screen: WorkoutSummary,
      options: {
        title: "Workout Summary",
        presentation: "modal",
        headerShown: true,
      },
    },

    /* MODAL 4 — WORKOUT COMPLETE */
    WorkoutComplete: {
      screen: WorkoutComplete,
      options: {
        title: "Workout Complete",
        presentation: "modal",
        headerShown: true,
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
    ExerciseList: {
      screen: ExerciseList,
      options: {
        title: "Exercises",
        headerBackTitle: "Back",
      },
    },
    ExerciseHistory: {
      screen: ExerciseHistory,
      options: {
        title: "Exercise History",
        headerBackTitle: "Back",
      },
    },

    CreateRoutine: {
      screen: CreateRoutine,
      options: ({ theme }) => ({
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.dark ? "#000" : "#fff" },
        headerTintColor: theme.dark ? "#fff" : "#000",
      }),
    },

    EditRoutine: {
      screen: EditRoutine,
      options: ({ theme }) => ({
        headerShown: true,
        title: "Edit Routine",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.dark ? "#000" : "#fff" },
        headerTintColor: theme.dark ? "#fff" : "#000",
      }),
    },

    RoutineList: {
      screen: RoutineList,
      options: ({ theme }) => ({
        headerShown: true,
        title: "Routines",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.dark ? "#000" : "#fff" },
        headerTintColor: theme.dark ? "#fff" : "#000",
        headerTitleStyle: {
          color: theme.dark ? "#fff" : "#000",
          fontWeight: "800" as const,
          fontSize: 30,
        },
      }),
    },

    RoutineDetail: {
      screen: RoutineDetail,
      options: ({ theme }) => ({
        title: "",
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.dark ? "#000" : "#fff" },
        headerTintColor: theme.dark ? "#fff" : "#000",
      }),
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
      Login: undefined;
      HomeTabs: undefined;
      History: undefined;
      Settings: undefined;
      Profile: undefined;
      UserProfile: { username: string };
      WorkoutSummary: undefined;
      WorkoutComplete: undefined;
      ExerciseSelect: undefined;
      ExerciseChat: undefined;

      ExerciseDetail: {
        exercise: {
          workoutExerciseId?: string;
          exerciseId: string;
          name: string;
          sets?: any[];
        };
      };

      CreateExercise:
        | {
            startWorkout?: boolean; // if true, navigate to ExerciseDetail after creation
          }
        | undefined;

      Comments: {
        postId: string;
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

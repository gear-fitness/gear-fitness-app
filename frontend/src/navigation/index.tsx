import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HeaderButton } from "@react-navigation/elements";
import {
  createStaticNavigation,
  StaticParamList,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image } from "react-native";

/* ICONS */
import bell from "../assets/bell.png";
import avatar from "../assets/avatar.png";
import workout from "../assets/workout.png";
import home from "../assets/home.png";
import community from "../assets/community.png";
import calendar from "../assets/calendar.png";
import close from "../assets/close.png";

/* SCREENS */
import { Home } from "./screens/Home";
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
import { ExerciseChat } from "./screens/ExerciseChat";
import { AuthLoadingScreen } from "./screens/AuthLoading";

/* ---------------------- TABS ---------------------- */

const HomeTabs = createBottomTabNavigator({
  initialRouteName: "Home",
  screenOptions: {
    tabBarShowLabel: true,
    headerShown: false,
  },
  screens: {
    Home: {
      screen: Home,
      options: {
        title: "Home",
        tabBarIcon: ({ color, size }) => (
          <Image
            source={home}
            tintColor={color}
            style={{ width: size, height: size }}
          />
        ),
      },
    },

    Social: {
      screen: Social,
      options: {
        headerShown: false,
        title: "Social",
        tabBarIcon: ({ color, size }) => (
          <Image
            source={community}
            tintColor={color}
            style={{ width: size, height: size }}
          />
        ),
      },
    },

    Workouts: {
      screen: Workout,
      options: {
        tabBarIcon: ({ color, size }) => (
          <Image
            source={workout}
            tintColor={color}
            style={{ width: size, height: size }}
          />
        ),
      },
    },

    History: {
      screen: History,
      options: {
        tabBarIcon: ({ color, size }) => (
          <Image
            source={calendar}
            tintColor={color}
            style={{ width: size, height: size }}
          />
        ),
      },
    },

    Profile: {
      screen: Profile,
      options: {
        tabBarIcon: ({ color, size }) => (
          <Image
            source={avatar}
            tintColor={color}
            style={{ width: size, height: size }}
          />
        ),
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
    Profile: { screen: Profile },

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
        headerBackTitle: "History",
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

    NotFound: {
      screen: NotFound,
      options: { title: "404" },
      linking: { path: "*" },
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
    /* MODAL 5 — EXERCISE CHAT */
    ExerciseChat: {
      screen: ExerciseChat,
      options: {
        title: "Exercise Chat",
        presentation: "modal",
        headerShown: true,
      },
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
      WorkoutSummary: undefined;
      WorkoutComplete: undefined;
      ExerciseSelect: undefined;

      ExerciseDetail: {
        exercise: {
          exerciseId: string;
          name: string;
          sets?: any[];
        };
      };

      ExerciseChat: {
        exercise: {
          exerciseId: string;
          name: string;
          bodyPart: string;
          description: string;
        };
        greetingText: string;
      };
    }
  }
}

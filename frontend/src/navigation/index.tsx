import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HeaderButton } from "@react-navigation/elements";
import {
  createStaticNavigation,
  StaticParamList,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image } from "react-native";

/* ICONS */
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

/* ---------------- TABS ---------------- */

const HomeTabs = createBottomTabNavigator({
  initialRouteName: "Home",
  screenOptions: {
    headerShown: false,
    tabBarShowLabel: true,
  },
  screens: {
    Home: {
      screen: Home,
      options: {
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

/* ---------------- ROOT STACK ---------------- */

const RootStack = createNativeStackNavigator({
  initialRouteName: "Login",

  screens: {
    Login: {
      screen: LoginScreen,
      options: { headerShown: false },
    },

    SignUpProfile: {
      screen: SignUpProfileScreen,
      options: {
        title: "Complete Profile",
        headerBackVisible: false,
      },
    },

    HomeTabs: {
      screen: HomeTabs,
      options: { headerShown: false },
    },

    Settings: {
      screen: Settings,
      options: { title: "" },
    },

    UserProfile: {
      screen: Profile,
      options: {
        headerShown: true,
        title: "",
        headerBackTitleVisible: false,
      },
    },

    PR: {
      screen: PR,
      options: { title: "Personal Records" },
    },

    DetailedHistory: {
      screen: DetailedHistory,
      options: { title: "Workout" },
    },

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

    ExerciseDetail: {
      screen: ExerciseDetail,
      options: { presentation: "modal" },
    },

    WorkoutSummary: {
      screen: WorkoutSummary,
      options: { presentation: "modal" },
    },

    WorkoutComplete: {
      screen: WorkoutComplete,
      options: { presentation: "modal" },
    },

    ExerciseChat: {
      screen: ExerciseChat,
      options: { presentation: "modal" },
    },

    NotFound: {
      screen: NotFound,
      options: { title: "404" },
      linking: { path: "*" },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

/* ---------------- TYPES ---------------- */

export type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      Login: undefined;
      HomeTabs: undefined;
      UserProfile: { username: string };
      Settings: undefined;
    }
  }
}

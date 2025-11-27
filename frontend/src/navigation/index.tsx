import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HeaderButton, Text } from "@react-navigation/elements";
import {
  createStaticNavigation,
  StaticParamList,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image } from "react-native";
import bell from "../assets/bell.png";
import avatar from "../assets/avatar.png";
import workout from "../assets/workout.png";
import home from "../assets/home.png";
import community from "../assets/community.png";
import calendar from "../assets/calendar.png";
import close from "../assets/close.png";
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
import { LoginScreen } from "./screens/Login";
import { SignUpProfileScreen } from "./screens/SignUpProfile";

const HomeTabs = createBottomTabNavigator({
  initialRouteName: "Home",
  screenOptions: {
    tabBarShowLabel: true, //shows the label from the navigation bar in all screens
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
            style={{
              width: size,
              height: size,
            }}
          />
        ),
      },
    },
    Social: {
      screen: Social,
      options: {
        headerShown: true,
        title: "Social",
        tabBarIcon: ({ color, size }) => (
          <Image
            source={community}
            tintColor={color}
            style={{
              width: size,
              height: size,
            }}
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
            style={{
              width: size,
              height: size,
            }}
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
            style={{
              width: size,
              height: size,
            }}
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
            style={{
              width: size,
              height: size,
            }}
          />
        ),
      },
    },
  },
});

const RootStack = createNativeStackNavigator({
  initialRouteName: "Login",
  screens: {
    Login: {
      screen: LoginScreen,
      options: {
        headerShown: false,
      },
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
      options: {
        title: "Home",
        headerShown: false,
      },
    },
    Profile: {
      screen: Profile,
      linking: {
        path: ":user(@[a-zA-Z0-9-_]+)",
        parse: {
          user: (value) => value.replace(/^@/, ""),
        },
        stringify: {
          user: (value) => `@${value}`,
        },
      },
    },
    Settings: {
      screen: Settings,
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
        title: "Detailed Workout History",
        headerBackTitle: "History",
        headerShown: true,
      },
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
    NotFound: {
      screen: NotFound,
      options: {
        title: "404",
      },
      linking: {
        path: "*",
      },
    },
  },
});

export const Navigation = createStaticNavigation(RootStack);

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

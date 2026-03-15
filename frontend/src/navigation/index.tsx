import { useLayoutEffect } from "react";
import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { HeaderButton } from "@react-navigation/elements";
import {
  createStaticNavigation,
  StaticParamList,
  useNavigation,
  useTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Image,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInputFocusEventData,
  View,
} from "react-native";

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
import { ExerciseChat } from "./screens/ExerciseChat";
import { AuthLoadingScreen } from "./screens/AuthLoading";
import { CommentsScreen } from "../components/CommentsScreen";
import { ExerciseList } from "./screens/ExerciseList";
import { ExerciseHistory } from "./screens/ExerciseHistory";
import { CreateExerciseScreen } from "./screens/CreateExerciseScreen";

/* ---------------------- TABS ---------------------- */

function SearchTabScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShadowVisible: false,
      headerLargeTitle: true,
      headerLargeTitleStyle: {
        fontSize: 30,
        fontWeight: "700",
        color: colors.text,
      },
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerLargeStyle: {
        backgroundColor: colors.background,
      },
      headerSearchBarOptions: {
        placeholder: "Ask about any exercise",
        hideWhenScrolling: false,
        barTintColor: colors.background,
        tintColor: colors.text,
        onSearchButtonPress: (
          e: NativeSyntheticEvent<TextInputFocusEventData>,
        ) => {
          const text = e.nativeEvent.text?.trim();

          if (!text) {
            return;
          }

          navigation.getParent()?.navigate("ExerciseChat", {
            initialPrompt: text,
          });
        },
      },
    });
  }, [colors.background, colors.text, navigation]);

  return (
    <View style={[styles.searchScreen, { backgroundColor: colors.background }]}>
      <Text style={[styles.searchHeadline, { color: colors.text }]}>
        Ask me about any exercise, movement pattern, or training question.
      </Text>
    </View>
  );
}

const HomeTabs = createNativeBottomTabNavigator({
  initialRouteName: "Workouts",
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Workouts: {
      screen: Workout,
      options: {
        title: "Workouts",
        tabBarLabel: "",
        tabBarIcon: { type: "sfSymbol", name: "dumbbell" },
      },
    },

    Social: {
      screen: Social,
      options: {
        headerShown: false,
        title: "Social",
        tabBarLabel: "",
        tabBarIcon: { type: "sfSymbol", name: "magnifyingglass" },
      },
    },

    History: {
      screen: History,
      options: {
        title: "History",
        tabBarLabel: "",
        tabBarIcon: { type: "sfSymbol", name: "calendar" },
      },
    },

    Profile: {
      screen: Profile,
      options: {
        title: "Profile",
        tabBarLabel: "",
        tabBarIcon: ({ focused }) => ({
          type: "sfSymbol",
          name: focused ? "person.crop.circle.fill" : "person.crop.circle",
        }),
      },
    },

    Search: {
      screen: SearchTabScreen,
      options: {
        title: "Assistant",
        headerShown: true,
        tabBarLabel: "",
        tabBarSystemItem: "search",
        tabBarIcon: { type: "sfSymbol", name: "sparkle" },
      },
    },
  },
});

const styles = StyleSheet.create({
  searchScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  searchHeadline: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
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

    /* MODAL 5 — EXERCISE CHAT */
    ExerciseChat: {
      screen: ExerciseChat,
      options: {
        title: "Exercise Coach",
        headerShown: true,
        headerBackTitle: "Back",
      },
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

      ExerciseChat:
        | {
            exercise?: {
              exerciseId: string;
              name: string;
              bodyPart: string;
              description: string;
            };
            greetingText?: string;
            initialPrompt?: string;
          }
        | undefined;

      Comments: {
        postId: string;
      };
    }
  }
}

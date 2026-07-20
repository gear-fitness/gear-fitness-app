import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import {
  createStaticNavigation,
  StaticParamList,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";
import { Text } from "../components/Text";

/* SCREENS */
import { Profile } from "./screens/Profile";
import { PaywallScreen } from "./screens/PaywallScreen";
import { PlusUpsellSheet } from "./screens/PlusUpsellSheet";
import { WhatsNewPopup } from "./screens/WhatsNewPopup";
import { SettingsNavigator } from "./SettingsNavigator";
import { Social } from "./screens/Social";
import { Workout } from "./screens/Workout";
import { NotFound } from "./screens/NotFound";
import { History } from "./screens/History";
import { PR } from "./screens/PR";
import { DetailedHistory } from "./screens/DetailedHistory";
import { ShareWorkout } from "./screens/ShareWorkout";
import { PostDetail } from "./screens/PostDetail";
import { WorkoutFlowNavigator } from "./WorkoutFlowNavigator";
import { OnboardingScreen } from "./screens/Onboarding";
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
import { DayPosts } from "./screens/DayPosts";
import { Activity } from "./screens/Activity";
import FollowScreen from "./screens/FollowScreen";
import { ImageViewer } from "./screens/ImageViewer";
import { CameraScreen } from "./screens/CameraScreen";
import { BarcodeScannerScreen } from "./screens/BarcodeScannerScreen";
import { BarcodeReview } from "./screens/nutrition/BarcodeReview";
import { CalorieTracker } from "./screens/nutrition/CalorieTracker";
import { AddFood } from "./screens/nutrition/AddFood";
import { NutritionGoals } from "./screens/nutrition/NutritionGoals";
import { NutritionSetup } from "./screens/nutrition/NutritionSetup";
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
    // Restored 5th tab (formerly the orphaned AI-chat "AiChat" slot),
    // repurposed to open the calorie & macro tracker.
    Nutrition: {
      screen: CalorieTracker,
      options: {
        // iOS 26+ native tab bar renders this slot as the system Search item
        // (the distinct search affordance), matching how the AI tool was
        // presented on older builds. `fork.knife` is the pre-26 fallback icon.
        ...(majorVersionIOS >= 26 && { tabBarSystemItem: "search" }),
        // A plain, static food icon. Adding food is handled by the in-screen
        // "+" button on the calorie tracker (see CalorieTracker), so the tab no
        // longer morphs into a "+" FAB when focused.
        tabBarIcon: { type: "sfSymbol", name: "fork.knife" },
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
      options: {
        headerShown: false,
        // Keep the whole tab subtree rendered while a pushed screen covers it.
        // Under the default ("pause") React's Activity API tears down and
        // replays every effect in every tab when the stack pops back, and that
        // commit lands in the same frames as the slide animation — the source
        // of the stutter when returning to the glass-heavy Social feed.
        //
        // This belongs on HomeTabs rather than an individual tab: a pushed
        // RootStack screen covers the HomeTabs route, and a child tab's
        // inactiveBehavior only governs it relative to its sibling tabs, so it
        // cannot opt out of an ancestor's Activity boundary. Same rationale as
        // UserProfile and FollowScreen below.
        inactiveBehavior: "none",
      },
    },

    Settings: { screen: SettingsNavigator, options: { headerShown: false } },

    UserProfile: {
      screen: Profile,
      options: {
        headerShown: false,
        gestureEnabled: true,
        // Keep the screen rendered while it's covered. The default ("pause")
        // hides it via React's Activity API, which tears down and re-runs all
        // effects when it's revealed again — re-firing the mount fetch and
        // resetting scroll every time you back out of a pushed profile.
        inactiveBehavior: "none",
      },
    },

    FollowScreen: {
      screen: FollowScreen,
      options: {
        headerShown: false,
        // See UserProfile: prevents the follower/following list from reloading
        // (and losing scroll) when you return from a tapped profile.
        inactiveBehavior: "none",
      },
    },

    UserPosts: {
      screen: UserPosts,
      options: {
        headerShown: false,
        gestureEnabled: true,
      },
    },

    DayPosts: {
      screen: DayPosts,
      options: {
        headerShown: false,
        gestureEnabled: true,
      },
    },

    Activity: {
      screen: Activity,
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

    ShareWorkout: {
      screen: ShareWorkout,
      options: {
        presentation: "modal",
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

    /* IN-APP CAMERA — registered on the root stack so it can be presented
       from anywhere (workout complete, settings avatar, onboarding). Consumers
       go through openCamera() in utils/inAppCamera rather than navigating
       here directly. */
    Camera: {
      screen: CameraScreen,
      options: {
        presentation: "fullScreenModal",
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "vertical",
      },
    },

    /* BARCODE SCANNER: same contract as Camera; consumers go through
       openBarcodeScanner() in utils/barcodeScanner and await the code. */
    BarcodeScanner: {
      screen: BarcodeScannerScreen,
      options: {
        presentation: "fullScreenModal",
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "vertical",
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

    Paywall: {
      screen: PaywallScreen,
      options: {
        presentation: "fullScreenModal",
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "vertical",
      },
    },

    PlusUpsell: {
      screen: PlusUpsellSheet,
      options: {
        presentation: "transparentModal",
        headerShown: false,
        animation: "none",
        gestureEnabled: false,
      },
    },

    WhatsNew: {
      screen: WhatsNewPopup,
      options: {
        presentation: "transparentModal",
        headerShown: false,
        animation: "none",
        gestureEnabled: false,
      },
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

    AddFood: {
      screen: AddFood,
      options: { headerShown: false },
    },

    // Barcode-scan result review: pageSheet-style modal where the user picks
    // the serving and quantity before the product is logged.
    BarcodeReview: {
      screen: BarcodeReview,
      options: {
        presentation: "modal",
        headerShown: false,
        gestureEnabled: true,
      },
    },

    NutritionGoals: {
      screen: NutritionGoals,
      options: { headerShown: false },
    },

    // The calorie-calculator wizard: pushed forced (inescapable until
    // completed) on visiting the Nutrition tab before setup is done, and
    // reachable dismissibly from Daily Goals.
    NutritionSetup: {
      screen: NutritionSetup,
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
      DayPosts: {
        posts: import("../api/socialFeedApi").FeedPost[];
        dateLabel: string;
      };
      Activity: undefined;
      Nutrition: undefined;
      AddFood: undefined;
      NutritionGoals: undefined;
      // forced: pushed by the tracker when setup is required; the wizard
      // blocks every way back until it's completed. Daily Goals opens it
      // without the param, where swipe-back dismisses.
      NutritionSetup: { forced?: boolean } | undefined;

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
        postOwnerId?: string;
        focusCommentId?: string;
      };

      ImageViewer: {
        photos: string[];
        initialIndex: number;
      };

      Camera: undefined;
      BarcodeScanner: undefined;
      BarcodeReview: { food: import("../api/types").FoodItem };

      PostDetail: {
        postId: string;
        openCommentsOnMount?: boolean;
      };

      WhatsNew: {
        announcement: import("../api/announcementService").Announcement;
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

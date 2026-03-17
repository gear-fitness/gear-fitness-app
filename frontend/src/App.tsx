import { Assets as NavigationAssets } from "@react-navigation/elements";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainerRefWithCurrent,
} from "@react-navigation/native";
import { Asset } from "expo-asset";
import { createURL } from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as React from "react";
import { useColorScheme } from "react-native";
import { Navigation } from "./navigation";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WorkoutTimerProvider } from "./context/WorkoutContext";
import { WorkoutPlayer } from "./components/WorkoutPlayer";
import * as Notifications from "expo-notifications";

// Create navigation ref for use outside NavigationContainer
export const navigationRef =
  React.createRef<NavigationContainerRefWithCurrent<any>>();

Asset.loadAsync([
  ...NavigationAssets,
  require("./assets/home.png"),
  require("./assets/bell.png"),
  require("./assets/workout.png"),
  require("./assets/community.png"),
  require("./assets/avatar.png"),
  require("./assets/calendar.png"),
]);

SplashScreen.preventAutoHideAsync();

const prefix = createURL("/");

export function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
      profileImageSize: 150,
    });
  }, []);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  return (
    <AuthProvider>
      <AppContent theme={theme} />
    </AuthProvider>
  );
}

function AppContent({
  theme,
}: {
  theme: typeof DarkTheme | typeof DefaultTheme;
}) {
  const [isNavigationReady, setIsNavigationReady] = React.useState(false);
  const { isLoading } = useAuth();

  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      !lastNotificationResponse ||
      lastNotificationResponse.actionIdentifier !==
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }

    const data = lastNotificationResponse.notification.request.content.data;
    if (!data?.type || !navigationRef.current) return;

    switch (data.type) {
      case "FOLLOW":
        if (data.params?.username) {
          navigationRef.current.navigate("UserProfile", {
            username: data.params.username,
          });
        }
        break;
      case "LIKE":
        if (data.params?.workoutId) {
          navigationRef.current.navigate("DetailedHistory", {
            workoutId: data.params.workoutId,
          });
        }
        break;
      case "COMMENT":
        if (data.params?.postId) {
          navigationRef.current.navigate("Comments", {
            postId: data.params.postId,
          });
        }
        break;
      // No default — notifications without a type just open the app
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    // Hide splash screen only when both navigation AND auth are ready
    if (isNavigationReady && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isNavigationReady, isLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <WorkoutTimerProvider>
          <Navigation
            ref={navigationRef}
            theme={theme}
            linking={{
              enabled: "auto",
              prefixes: [prefix],
            }}
            onReady={() => setIsNavigationReady(true)}
          />
          <WorkoutPlayer />
        </WorkoutTimerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

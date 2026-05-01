import {
  DarkTheme,
  DefaultTheme,
  NavigationContainerRefWithCurrent,
} from "@react-navigation/native";
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
import { LikesProvider } from "./context/LikesContext";
import { SocialFeedProvider } from "./context/SocialFeedContext";
import { WorkoutPlayer } from "./components/WorkoutPlayer";
import * as Notifications from "expo-notifications";
import {
  useFonts,
  LibreCaslonText_400Regular,
  LibreCaslonText_400Regular_Italic,
  LibreCaslonText_700Bold,
} from "@expo-google-fonts/libre-caslon-text";

// Create navigation ref for use outside NavigationContainer
export const navigationRef =
  React.createRef<NavigationContainerRefWithCurrent<any>>();

SplashScreen.preventAutoHideAsync();

const prefix = createURL("/");

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#fafafa",
    card: "#fff",
    primary: "#000",
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0a0a0a",
    card: "#141414",
    primary: "#fff",
  },
};

export function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? CustomDarkTheme : LightTheme;

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

  const [fontsLoaded] = useFonts({
    LibreCaslonText_400Regular,
    LibreCaslonText_400Regular_Italic,
    LibreCaslonText_700Bold,
  });

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
        if (data.params?.postId) {
          navigationRef.current.navigate("PostDetail", {
            postId: data.params.postId,
          });
        }
        break;
      case "COMMENT":
        if (data.params?.postId) {
          navigationRef.current.navigate("PostDetail", {
            postId: data.params.postId,
            openCommentsOnMount: true,
          });
        }
        break;
      case "UNFINISHED_WORKOUT":
        navigationRef.current.navigate("WorkoutFlow", {
          screen: "WorkoutSummary",
        });
        break;
      // No default — notifications without a type just open the app
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    // Hide splash screen only when navigation, auth, and fonts are ready
    if (isNavigationReady && !isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isNavigationReady, isLoading, fontsLoaded]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <SafeAreaProvider>
        <WorkoutTimerProvider>
          <LikesProvider>
            <SocialFeedProvider>
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
            </SocialFeedProvider>
          </LikesProvider>
        </WorkoutTimerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

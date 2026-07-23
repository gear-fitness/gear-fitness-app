import {
  DarkTheme,
  DefaultTheme,
  NavigationContainerRefWithCurrent,
} from "@react-navigation/native";
import { createURL } from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as React from "react";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Navigation } from "./navigation";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PurchasesProvider } from "./context/PurchasesContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  WorkoutTimerProvider,
  WORKOUT_STATE_STORAGE_KEY,
  UNFINISHED_WORKOUT_NOTIFICATION_ID,
} from "./context/WorkoutContext";
import { LikesProvider } from "./context/LikesContext";
import { SocialFeedProvider } from "./context/SocialFeedContext";
import { MessagesProvider } from "./context/MessagesContext";
import { FollowStatusProvider } from "./context/FollowStatusContext";
import { UnitPreferenceProvider } from "./context/UnitPreferenceContext";
import { NutritionProvider } from "./context/NutritionContext";
import { WorkoutPlayer } from "./components/WorkoutPlayer";
import { getPendingAnnouncement } from "./api/announcementService";
import { hasSeenAnnouncement } from "./utils/announcementStorage";
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

  useEffect(() => {
    AsyncStorage.getItem("@theme_override").then((stored) => {
      if (stored === "light" || stored === "dark") {
        Appearance.setColorScheme(stored);
      }
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
      <PurchasesProvider>
        <AppContent theme={theme} />
      </PurchasesProvider>
    </AuthProvider>
  );
}

function AppContent({
  theme,
}: {
  theme: typeof DarkTheme | typeof DefaultTheme;
}) {
  const [isNavigationReady, setIsNavigationReady] = React.useState(false);
  const { isLoading, isAuthenticated } = useAuth();
  const whatsNewAttempted = React.useRef(false);

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
      case "REPLY":
      case "MENTION":
        if (data.params?.postId) {
          navigationRef.current.navigate("PostDetail", {
            postId: data.params.postId,
            // Caption mentions omit these → just open the post.
            openCommentsOnMount: data.params?.openCommentsOnMount === true,
            focusCommentId: data.params?.focusCommentId,
          });
        }
        break;
      case "MESSAGE": {
        const conversationId = (
          data.params as { conversationId?: string } | undefined
        )?.conversationId;
        if (conversationId) {
          navigationRef.current.navigate("MessageThread", { conversationId });
        }
        break;
      }
      case "UNFINISHED_WORKOUT":
        // Always dismiss the tapped notification, regardless of whether we
        // navigate. Only route to WorkoutSummary if storage actually has an
        // in-progress workout — otherwise the notification is stale and
        // jerking the user to an empty Summary screen is worse UX.
        (async () => {
          try {
            await Notifications.dismissNotificationAsync(
              UNFINISHED_WORKOUT_NOTIFICATION_ID,
            );
          } catch {
            // Already cleared.
          }
          try {
            const stored = await AsyncStorage.getItem(
              WORKOUT_STATE_STORAGE_KEY,
            );
            const parsed = stored ? JSON.parse(stored) : null;
            const hasActive =
              parsed &&
              ((Array.isArray(parsed.exercises) &&
                parsed.exercises.length > 0) ||
                parsed.running === true);
            if (hasActive) {
              navigationRef.current?.navigate("WorkoutFlow", {
                screen: "WorkoutSummary",
              });
            }
          } catch {
            // Storage read failed — silently dismiss is still better than
            // navigating somewhere arbitrary.
          }
        })();
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

  useEffect(() => {
    // What's New popup: at most one attempt per app session, and only once
    // the user has actually landed on HomeTabs. AuthLoading holds the root
    // route on its launch video well after auth resolves, so a one-shot
    // route check here would race it and lose; instead listen for
    // navigation-state changes and fire when HomeTabs becomes focused.
    if (isLoading || !isAuthenticated || !isNavigationReady) return;
    if (whatsNewAttempted.current) return;

    // Focused top-level route, not getCurrentRoute(): that returns the
    // deepest route (a tab name), and routes[0] would still say HomeTabs
    // while a notification deep link sits on top.
    const isOnHomeTabs = () => {
      const state = navigationRef.current?.getRootState();
      if (!state || state.index == null) return false;
      return state.routes[state.index]?.name === "HomeTabs";
    };

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | undefined;

    const attempt = () => {
      if (cancelled || whatsNewAttempted.current || !isOnHomeTabs()) return;
      whatsNewAttempted.current = true;
      unsubscribe?.();
      (async () => {
        const announcement = await getPendingAnnouncement();
        if (!announcement || cancelled) return;
        if (await hasSeenAnnouncement(announcement.id)) return;
        // Let the arrival transition settle, then re-check the route in
        // case a slow notification deep link landed during the delay.
        timer = setTimeout(() => {
          if (!cancelled && isOnHomeTabs()) {
            navigationRef.current?.navigate("WhatsNew", { announcement });
          }
        }, 800);
      })();
    };

    unsubscribe = navigationRef.current?.addListener("state", attempt);
    attempt();

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, isAuthenticated, isNavigationReady]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <KeyboardProvider>
        <SafeAreaProvider>
        <WorkoutTimerProvider>
          <LikesProvider>
            <SocialFeedProvider>
              <MessagesProvider>
                <FollowStatusProvider>
                  <UnitPreferenceProvider>
                    <NutritionProvider>
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
                    </NutritionProvider>
                  </UnitPreferenceProvider>
                </FollowStatusProvider>
              </MessagesProvider>
            </SocialFeedProvider>
          </LikesProvider>
        </WorkoutTimerProvider>
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

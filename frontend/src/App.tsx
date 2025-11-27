import { Assets as NavigationAssets } from "@react-navigation/elements";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Asset } from "expo-asset";
import { createURL } from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as React from "react";
import { useColorScheme } from "react-native";
import { Navigation } from "./navigation";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useEffect } from "react";

import { GestureHandlerRootView } from "react-native-gesture-handler";

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
      iosClientId:
        "637676049223-kg32deotit3muuhi3j1q253vfhotnoai.apps.googleusercontent.com",
      profileImageSize: 150,
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Navigation
          theme={theme}
          linking={{
            enabled: "auto",
            prefixes: [prefix],
          }}
          onReady={() => {
            SplashScreen.hideAsync();
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

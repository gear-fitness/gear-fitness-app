import { useEffect, useRef, useState } from "react";
import { View, Image, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAuth } from "../../context/AuthContext";
import { useResumeVideoOnForeground } from "../../hooks/useResumeVideoOnForeground";

// The launch animation plays its first 2.5s and then holds on that frame for as
// long as auth takes. Light mode runs the colour-negated (black-on-white) copy
// on a white background; dark mode runs the original (white-on-black) on black.
const FREEZE_AT = 2.5;
// Roughly matches the native splash logo size for a seamless handoff at launch.
const LAUNCH_LOGO_SIZE = 150;
const loadingVideoDark = require("../../../assets/loading-dark.mp4");
const loadingVideoLight = require("../../../assets/loading-light.mp4");

export function AuthLoadingScreen() {
  const { colors, dark } = useTheme();
  const navigation = useNavigation();
  const { isLoading, isAuthenticated, authError, retryAuth } = useAuth();

  const player = useVideoPlayer(
    dark ? loadingVideoDark : loadingVideoLight,
    (p) => {
      p.loop = false;
      p.muted = true;
      // Mix with other audio so starting this (silent) launch video doesn't
      // seize the iOS audio session and stop the user's music/podcast.
      p.audioMixingMode = "mixWithOthers";
      p.timeUpdateEventInterval = 0.1;
      p.play();
    },
  );

  // Once the intro reaches FREEZE_AT it holds on that frame; don't let a
  // foreground resume restart the animation past the freeze.
  const frozen = useRef(false);
  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      if (currentTime >= FREEZE_AT) {
        player.currentTime = FREEZE_AT;
        player.pause();
        frozen.current = true;
      }
    });
    return () => sub.remove();
  }, [player]);

  // expo-video pauses on background and won't resume on its own. Resume only if
  // the intro was still playing when we left; stay frozen otherwise.
  useResumeVideoOnForeground(player, () => !frozen.current);

  // The launch animation plays for a mandatory 2.5s before we navigate away,
  // even when auth resolves sooner.
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), FREEZE_AT * 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    if (minTimeElapsed && !isLoading && !authError) {
      if (isAuthenticated) {
        navigation.reset({ index: 0, routes: [{ name: "HomeTabs" }] });
      } else {
        if (!isMounted.current) return;
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
      }
    }
    return () => {
      isMounted.current = false;
    };
  }, [minTimeElapsed, isLoading, isAuthenticated, authError, navigation]);

  // Show error state with retry option
  if (authError && !isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: dark ? "#000000" : "#ffffff" },
        ]}
      >
        <Image
          source={
            dark
              ? require("../../../assets/GearLogo.png")
              : require("../../../assets/GearLogoInverse.png")
          }
          style={styles.logo}
        />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {authError}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={retryAuth}
        >
          <Text
            style={[styles.retryText, { color: dark ? "#000000" : "#fff" }]}
          >
            Retry
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] })
          }
        >
          <Text style={[styles.loginText, { color: colors.primary }]}>
            Go to Onboarding
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading state. Background matches the native splash (white in light
  // mode, black in dark) so the launch hands off seamlessly.
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: dark ? "#000000" : "#ffffff" },
      ]}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  video: {
    width: LAUNCH_LOGO_SIZE,
    height: LAUNCH_LOGO_SIZE,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  loginText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

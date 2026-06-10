import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { StepProps } from "../stepProps";

// Reuse the launch-screen gear-logo animation. We loop just the first 5s.
const LOOP_AT = 5;
const loadingVideoDark = require("../../../../assets/loading-dark.mp4");
const loadingVideoLight = require("../../../../assets/loading-light.mp4");

export function WelcomeStep({ onNext, onGoogleSignIn }: StepProps) {
  const isDark = useColorScheme() === "dark";
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

  const player = useVideoPlayer(
    isDark ? loadingVideoDark : loadingVideoLight,
    (p) => {
      // loop handles clips shorter than 5s; the timeUpdate cap below handles
      // longer ones so only the first 5 seconds ever play.
      p.loop = true;
      p.muted = true;
      p.timeUpdateEventInterval = 0.1;
      p.play();
    },
  );

  // Restart from the top once we reach 5s so only the first 5 seconds repeat.
  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      if (currentTime >= LOOP_AT) {
        player.currentTime = 0;
      }
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View style={shared.screen}>
      <View style={styles.heroSection}>
        <View style={styles.logoWrap} pointerEvents="none">
          <VideoView
            player={player}
            style={styles.logoImage}
            contentFit="contain"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            allowsVideoFrameAnalysis={false}
            pointerEvents="none"
          />
        </View>
        <Text style={[shared.heading, styles.centeredHeading]}>
          Train hard.{"\n"}Track everything.
        </Text>
      </View>
      <View style={[shared.footer, styles.footerGap]}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>Get Started</Text>
        </Pressable>
        <Pressable onPress={onGoogleSignIn} style={styles.signInRow}>
          <Text style={[styles.signInText, { color: colors.secondary }]}>
            Already have an account?{" "}
            <Text style={[styles.signInLink, { color: colors.text }]}>
              Sign in
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 260,
    height: 260,
    borderRadius: 32,
  },
  centeredHeading: {
    fontSize: 36,
    letterSpacing: -1.2,
    lineHeight: 40,
    marginBottom: 12,
    textAlign: "center",
  },
  centeredSub: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 280,
    textAlign: "center",
    marginBottom: 0,
  },
  footerGap: {
    gap: 12,
  },
  signInRow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  signInText: {
    fontSize: 14,
  },
  signInLink: {
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
});

import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  useColorScheme,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useResumeVideoOnForeground } from "../../../hooks/useResumeVideoOnForeground";

// Gear animation, played once. Dark = white-on-black original; light = the
// colour-inverted (black-on-white) copy, matching the loading-video convention.
const gearSpinDark = require("../../../../assets/gear-spin-dark.mp4");
const gearSpinLight = require("../../../../assets/gear-spin-light.mp4");

export function GearSpinVideo({
  style,
  playLastSeconds = 0,
}: {
  style?: StyleProp<ViewStyle>;
  // Play only the final N seconds of the clip (0 = play from the beginning).
  playLastSeconds?: number;
}) {
  const isDark = useColorScheme() === "dark";

  const player = useVideoPlayer(
    isDark ? gearSpinDark : gearSpinLight,
    (p) => {
      // Play through once and hold on the final frame.
      p.loop = false;
      p.muted = true;
      // Don't seize the iOS audio session / stop the user's music.
      p.audioMixingMode = "mixWithOthers";
      // When starting mid-clip we play after seeking, once the duration is
      // known (see the sourceLoad effect below).
      if (playLastSeconds <= 0) p.play();
    },
  );

  // Seek to `duration - playLastSeconds` once the duration is known, then play.
  useEffect(() => {
    if (playLastSeconds <= 0) return;
    const seekAndPlay = (duration: number) => {
      if (duration > 0) {
        player.currentTime = Math.max(0, duration - playLastSeconds);
      }
      player.play();
    };
    if (player.status === "readyToPlay" && player.duration > 0) {
      seekAndPlay(player.duration);
      return;
    }
    const sub = player.addListener("sourceLoad", ({ duration }) => {
      seekAndPlay(duration);
    });
    return () => sub.remove();
  }, [player, playLastSeconds]);

  // Once the clip finishes, it should stay stopped — including across a
  // background/foreground cycle.
  const finished = useRef(false);
  useEffect(() => {
    const sub = player.addListener("playToEnd", () => {
      finished.current = true;
    });
    return () => sub.remove();
  }, [player]);

  // expo-video pauses on background and won't resume on its own. Resume only if
  // the clip was still playing when we left; stay stopped once it has finished.
  useResumeVideoOnForeground(player, () => !finished.current);

  return (
    <View style={style} pointerEvents="none">
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
        allowsPictureInPicture={false}
        allowsVideoFrameAnalysis={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    height: "100%",
  },
});

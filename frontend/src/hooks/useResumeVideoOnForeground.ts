import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import type { VideoPlayer } from "expo-video";

/**
 * expo-video pauses playback when the app is backgrounded and does NOT resume
 * when it returns to the foreground, leaving looping clips frozen. Re-issue
 * play() every time the app becomes active.
 *
 * Pass `shouldResume` for clips that intentionally pause on a final frame
 * (e.g. the launch animation) so they aren't restarted on foreground.
 */
export function useResumeVideoOnForeground(
  player: VideoPlayer,
  shouldResume: () => boolean = () => true,
) {
  // Keep the latest predicate without re-subscribing on every render.
  const shouldResumeRef = useRef(shouldResume);
  shouldResumeRef.current = shouldResume;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active" && shouldResumeRef.current()) {
        player.play();
      }
    });
    return () => sub.remove();
  }, [player]);
}

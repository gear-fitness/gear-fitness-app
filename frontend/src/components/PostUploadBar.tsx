import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { Text } from "./Text";
import { confirmDiscardPendingPost } from "../utils/pendingPosts";
import {
  getUploadProgress,
  subscribePostUploadEvents,
} from "../utils/postUploadProgress";
import {
  getPendingWorkouts,
  isEntryFailed,
  retryPendingWorkout,
} from "../utils/workoutQueue";

const FAILED_RED = "#C93838";

/**
 * The outbox entry the feed's upload bar represents: the entry the flush is
 * actively delivering, else the newest still-pending post, else the newest
 * failure (which needs its Retry/Discard controls visible).
 */
export type PostUploadHeadline = {
  queueId: string;
  status: "pending" | "failed";
  /** Local URI of the post's first photo, for the thumbnail. */
  thumbUri: string | null;
};

/**
 * Watch the workout outbox for post-producing entries and their live upload
 * progress. Returns a null headline when the outbox holds no posts so the
 * feed can skip rendering the bar (and its layout accommodations) entirely.
 * onDelivered fires once per landed post; use it to refresh the feed so the
 * bar resolves into the real post.
 */
export function usePostUploadHeadline(onDelivered: () => void): {
  headline: PostUploadHeadline | null;
  fraction: number;
} {
  const [headline, setHeadline] = useState<PostUploadHeadline | null>(null);
  const [progress, setProgress] = useState(getUploadProgress());

  // The subscription below is mounted once; route the latest callback through
  // a ref so it never closes over stale feed state.
  const onDeliveredRef = useRef(onDelivered);
  onDeliveredRef.current = onDelivered;

  const reload = useCallback(async () => {
    const pending = await getPendingWorkouts();
    const posts = pending.filter((p) => p.submission.createPost);
    if (posts.length === 0) {
      setHeadline(null);
      return;
    }
    const active = getUploadProgress();
    const byNewest = [...posts].sort((a, b) => b.createdAt - a.createdAt);
    const chosen =
      posts.find((p) => p.id === active?.queueId) ??
      byNewest.find((p) => !isEntryFailed(p)) ??
      byNewest[0];
    setHeadline({
      queueId: chosen.id,
      status: isEntryFailed(chosen) ? "failed" : "pending",
      thumbUri: chosen.pendingPhotoUris[0] ?? null,
    });
  }, []);

  // outboxChanged fires per persisted queue write (one per uploaded photo
  // mid-flush), and delivery emits two events back to back. Coalesce the
  // storage re-reads behind a short trailing debounce so a burst of writes
  // costs one reload, not one each.
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current != null) return;
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      void reload();
    }, 150);
  }, [reload]);

  useEffect(() => {
    void reload();
    const unsubscribe = subscribePostUploadEvents((event) => {
      if (event.type === "progress") {
        // S3 byte callbacks arrive far faster than the bar can show. Keep
        // the previous state reference for sub-1% moves so they don't
        // re-render the whole feed screen per network tick.
        setProgress((prev) =>
          prev &&
          prev.queueId === event.queueId &&
          Math.abs(event.fraction - prev.fraction) < 0.01
            ? prev
            : { queueId: event.queueId, fraction: event.fraction },
        );
        return;
      }
      setProgress(getUploadProgress());
      if (event.type === "delivered") {
        onDeliveredRef.current();
        // Unmount the delivered entry's bar in this same render: the
        // delivered event nulls the progress snapshot, so waiting for the
        // (debounced, async) reload would leave the bar mounted with
        // fraction 0 and visibly animate the fill backward before it
        // vanishes.
        setHeadline((h) => (h && h.queueId === event.queueId ? null : h));
      }
      scheduleReload();
    });
    return () => {
      unsubscribe();
      if (reloadTimerRef.current != null) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, [reload, scheduleReload]);

  return {
    headline,
    fraction:
      headline && progress?.queueId === headline.queueId
        ? progress.fraction
        : 0,
  };
}

/**
 * Instagram-style "finish posting" bar shown at the top of the social feed
 * while an outbox post is uploading: photo thumbnail, a keep-the-app-open
 * hint, and a live progress track. A parked failure swaps to the same
 * Retry/Discard contract the Profile pending card offers.
 */
export function PostUploadBar({
  headline,
  fraction,
  animate = true,
}: {
  headline: PostUploadHeadline;
  fraction: number;
  /**
   * Both feed lists keep a bar instance mounted but only one is on screen.
   * The hidden one passes false so it tracks the fill by direct set instead
   * of running a second JS-driver animation on every progress tick.
   */
  animate?: boolean;
}) {
  const { colors, dark } = useTheme();
  const failed = headline.status === "failed";

  // Width is not a native-animatable prop, so this must use the JS driver.
  const widthAnim = useRef(new Animated.Value(0)).current;
  // The bar instance survives headline changes (same tree position), so when
  // it starts representing a different queue entry the fill must jump to that
  // entry's fraction, not animate backwards from the previous entry's.
  const lastQueueIdRef = useRef(headline.queueId);
  useEffect(() => {
    if (lastQueueIdRef.current !== headline.queueId || !animate) {
      lastQueueIdRef.current = headline.queueId;
      widthAnim.setValue(fraction);
      return;
    }
    Animated.timing(widthAnim, {
      toValue: fraction,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [fraction, headline.queueId, animate, widthAnim]);
  const fillWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const handleRetry = () => {
    retryPendingWorkout(headline.queueId).catch((err) => {
      console.error("Error retrying pending post:", err);
    });
  };

  const handleDiscard = () => {
    // No onDone: the discard's queue write emits outboxChanged, which the
    // headline hook already reloads on.
    confirmDiscardPendingPost(headline.queueId);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {headline.thumbUri ? (
          <Image source={{ uri: headline.thumbUri }} style={styles.thumb} />
        ) : (
          <View
            style={[
              styles.thumb,
              styles.thumbPlaceholder,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="barbell-outline"
              size={18}
              color={colors.text}
              style={styles.thumbIcon}
            />
          </View>
        )}

        {failed ? (
          <>
            <Text
              style={[styles.message, { color: colors.text }]}
              numberOfLines={1}
            >
              Couldn't post. It's saved on this device.
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={handleRetry} hitSlop={8}>
                <Text style={[styles.action, { color: colors.text }]}>
                  Retry
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDiscard} hitSlop={8}>
                <Text style={[styles.action, { color: FAILED_RED }]}>
                  Discard
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text
            style={[styles.message, styles.hint, { color: colors.text }]}
            numberOfLines={1}
          >
            Keep Gear open to finish posting...
          </Text>
        )}
      </View>

      {!failed && (
        <View
          style={[
            styles.track,
            { backgroundColor: dark ? "#ffffff22" : "#00000014" },
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              { width: fillWidth, backgroundColor: colors.text },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  thumbPlaceholder: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbIcon: {
    opacity: 0.55,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  hint: {
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    gap: 18,
  },
  action: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  track: {
    height: 2.5,
    width: "100%",
  },
  fill: {
    height: "100%",
  },
});

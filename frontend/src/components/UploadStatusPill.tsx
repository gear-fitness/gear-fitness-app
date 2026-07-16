import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ColorValue,
  Image,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { FontScaleProvider, Text } from "./Text";
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
 * The outbox entry the feed's upload pill represents: the entry the flush is
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
 * feed can skip rendering the pill (and its layout accommodations) entirely.
 * onDelivered fires once per landed post; use it to refresh the feed so the
 * pill resolves into the real post.
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
        // Unmount the delivered entry's pill in this same render: the
        // delivered event nulls the progress snapshot, so waiting for the
        // (debounced, async) reload would leave the pill mounted with
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
 * Live upload fraction for one outbox entry, or null while the flush is not
 * actively delivering it. Lets a pending card's bar show real progress
 * without threading feed-level state down through the card tree.
 */
export function useUploadFraction(queueId?: string): number | null {
  const [progress, setProgress] = useState(getUploadProgress());
  useEffect(() => {
    return subscribePostUploadEvents((event) => {
      if (event.type === "progress") {
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
    });
  }, []);
  return queueId != null && progress?.queueId === queueId
    ? progress.fraction
    : null;
}

/**
 * Animated width for a determinate fill. When resetKey changes the fill must
 * jump to the new value, not animate backward from the previous entry's
 * fraction. Width is not a native-animatable prop, so this uses the JS driver.
 */
function useAnimatedFill(fraction: number, resetKey: string) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const lastKeyRef = useRef(resetKey);
  useEffect(() => {
    if (lastKeyRef.current !== resetKey) {
      lastKeyRef.current = resetKey;
      widthAnim.setValue(fraction);
      return;
    }
    Animated.timing(widthAnim, {
      toValue: fraction,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [fraction, resetKey, widthAnim]);
  return widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
}

/**
 * Glass pill shell. Liquid glass when available, else a solid surface with a
 * hairline border. Both the container and the glass overlay carry the radius
 * so the effect stays clipped.
 */
function PillSurface({
  borderRadius,
  fallbackBackground,
  fallbackBorder,
  interactive = false,
  style,
  children,
}: {
  borderRadius: number;
  fallbackBackground: ColorValue;
  fallbackBorder: ColorValue;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const glassAvailable = isLiquidGlassAvailable();
  return (
    <View
      style={[
        styles.pillSurface,
        {
          borderRadius,
          backgroundColor: glassAvailable ? "transparent" : fallbackBackground,
          borderColor: glassAvailable ? "transparent" : fallbackBorder,
        },
        style,
      ]}
    >
      {glassAvailable && (
        <GlassView
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
          glassEffectStyle="regular"
          isInteractive={interactive}
        />
      )}
      {children}
    </View>
  );
}

/**
 * Floating "finish posting" pill fixed under the social header while an
 * outbox post is uploading: photo thumbnail, a keep-the-app-open hint, and a
 * live progress line along the pill's bottom edge. A parked failure swaps to
 * the same Retry/Discard contract the Profile pending card offers.
 */
export function SocialUploadPill({
  headline,
  fraction,
}: {
  headline: PostUploadHeadline;
  fraction: number;
}) {
  const { colors, dark } = useTheme();
  const failed = headline.status === "failed";
  const fillWidth = useAnimatedFill(fraction, headline.queueId);

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

  // No entrance animation: a glass effect mounted under an ancestor whose
  // alpha is below 1 renders as nothing at all, so the pill must appear at
  // full opacity. It also never translates, which keeps the
  // rasterize-while-moving glass rule out of play.
  return (
    <View style={styles.socialPillShadow}>
      <FontScaleProvider max={1.2}>
        <PillSurface
          borderRadius={26}
          fallbackBackground={dark ? "#141414" : "#ffffff"}
          fallbackBorder={
            dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
          }
          interactive={failed}
          style={styles.socialPill}
        >
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
                size={16}
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
                <TouchableOpacity onPress={handleRetry} hitSlop={12}>
                  <Text style={[styles.action, { color: colors.text }]}>
                    Retry
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDiscard} hitSlop={12}>
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

          {!failed && (
            <View
              style={[
                styles.socialTrack,
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
        </PillSurface>
      </FontScaleProvider>
    </View>
  );
}

/**
 * Centered status pill floating over a pending post card: an "Uploading..."
 * loading bar while the outbox delivers, or the failed treatment with Retry
 * and Discard once it gives up. With a queueId it shows live progress; while
 * no flush snapshot exists for that entry the bar parks at an almost-done
 * fill, matching the old static treatment.
 */
export function CardUploadPill({
  failed,
  onRetry,
  onDiscard,
  overPhotos,
  queueId,
}: {
  failed: boolean;
  onRetry?: () => void;
  onDiscard?: () => void;
  overPhotos: boolean;
  queueId?: string;
}) {
  const { colors, dark } = useTheme();
  const glassAvailable = isLiquidGlassAvailable();
  const foreground = overPhotos && glassAvailable ? "#FFFFFF" : colors.text;
  const fallbackBackground = overPhotos
    ? dark
      ? "rgba(20,20,20,0.72)"
      : "rgba(255,255,255,0.82)"
    : colors.card;
  const fallbackBorder = overPhotos
    ? dark
      ? "rgba(255,255,255,0.24)"
      : "rgba(0,0,0,0.12)"
    : colors.border;

  const liveFraction = useUploadFraction(queueId);
  // Key the jump guard on parked vs live too: when the flush picks this entry
  // up, the fill must jump from the parked value to the real fraction rather
  // than animating backward through it.
  const fillWidth = useAnimatedFill(
    liveFraction ?? 0.8,
    `${queueId ?? "static"}:${liveFraction == null ? "parked" : "live"}`,
  );

  return (
    <PillSurface
      borderRadius={22}
      fallbackBackground={fallbackBackground}
      fallbackBorder={fallbackBorder}
      interactive={failed}
      style={styles.cardPill}
    >
      {failed ? (
        <>
          <Text
            style={[styles.cardMessage, { color: foreground }]}
            numberOfLines={2}
          >
            Couldn't post. It's saved on this device.
          </Text>
          <View style={styles.cardActions}>
            {onRetry && (
              <TouchableOpacity onPress={onRetry} hitSlop={10}>
                <Text style={[styles.action, { color: foreground }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            )}
            {onDiscard && (
              <TouchableOpacity onPress={onDiscard} hitSlop={10}>
                <Text style={[styles.action, { color: FAILED_RED }]}>
                  Discard
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.cardHint, { color: foreground }]}>
            Uploading...
          </Text>
          <View
            style={[
              styles.cardTrack,
              { backgroundColor: dark ? "#ffffff22" : "#00000014" },
            ]}
          >
            <Animated.View
              style={[
                styles.fill,
                { width: fillWidth, backgroundColor: foreground },
              ]}
            />
          </View>
        </>
      )}
    </PillSurface>
  );
}

const styles = StyleSheet.create({
  pillSurface: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  socialPillShadow: {
    width: "100%",
    maxWidth: 560,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  socialPill: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
  },
  thumb: {
    width: 32,
    height: 32,
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
    fontSize: 13,
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
  socialTrack: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  cardPill: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    maxWidth: "82%",
  },
  cardHint: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  cardTrack: {
    width: 120,
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  cardMessage: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  cardActions: {
    flexDirection: "row",
    gap: 24,
  },
});

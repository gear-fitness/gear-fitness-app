import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ColorValue,
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useTheme } from "@react-navigation/native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { FeedPost } from "../api/socialFeedApi";
import { useAuth } from "../context/AuthContext";
import { useLikeState } from "../context/LikesContext";
import { usePostMenu } from "../hooks/usePostMenu";
import { formatTimeAgo } from "../utils/date";
import { Avatar } from "./Avatar";
import { FontScaleProvider, Text } from "./Text";
import { MentionableText } from "./MentionableText";
import { PostActionsSheet } from "./PostActionsSheet";
import { PostVisibilitySheet } from "./PostVisibilitySheet";
import { PresignedImage } from "./PresignedImage";
import { ReportPostSheet } from "./ReportPostSheet";
import { CardUploadPill } from "./UploadStatusPill";

// Keep the seeded carousel width aligned with the card's screen margins. This
// prevents iOS from initially decoding a photo into a zero-width image while
// onLayout catches up after rotation, split-view changes, or first mount.
const CARD_MARGIN_HORIZONTAL = 16;
const CARD_RADIUS = 24;
const PAGE_HORIZONTAL_INSET = CARD_MARGIN_HORIZONTAL * 2;
// Text-only posts get the tall statement card only when the title and
// caption together measure at least this many rendered lines; anything
// shorter hugs its content instead of framing dead space under the text.
const TEXT_CARD_MIN_TOTAL_LINES = 3;
const DOUBLE_TAP_HEART_SIZE = 80;
const GOLD_MILESTONE_HEART_SIZE = 170;
const BLUE_MILESTONE_HEART_SIZE = 220;
const PURPLE_MILESTONE_HEART_SIZE = 280;
const HEART_STREAK_TIMEOUT_MS = 1200;

interface Props {
  post: FeedPost;
  onOpenComments: (postId: string) => void;
  /**
   * When true, render an indeterminate progress bar at the top of the card
   * and suppress interactions whose targets only exist server-side (likes,
   * comments, navigation to the workout detail). Used for outbox posts that
   * have been saved locally but not yet sent to the backend.
   */
  isPending?: boolean;
  /**
   * When true (only meaningful with isPending), the backing outbox entry
   * gave up delivering: render the failed treatment with Retry and Discard
   * instead of the progress bar.
   */
  pendingFailed?: boolean;
  onRetryPending?: () => void;
  onDiscardPending?: () => void;
  /**
   * Outbox queue id backing this pending post. Lets the uploading pill show
   * live delivery progress; without it the bar parks at an almost-done fill.
   */
  pendingQueueId?: string;
}

export function FeedPostCard({
  post,
  isPending = false,
  pendingFailed = false,
  onRetryPending,
  onDiscardPending,
  pendingQueueId,
}: Props) {
  const { colors, dark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation() as any;
  const glassAvailable = isLiquidGlassAvailable();
  const {
    liked: likedByUser,
    count: likeCount,
    toggle: handleLike,
    like: handleImageLike,
  } = useLikeState(post.postId, post);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const heartLayerRef = useRef<DoubleTapHeartLayerHandle>(null);
  const [scrollWidth, setScrollWidth] = useState(() =>
    Math.max(1, Dimensions.get("window").width - PAGE_HORIZONTAL_INSET),
  );
  // Rendered line counts for the text-only variant, reported by onTextLayout.
  // Caption presence alone can't drive the tall treatment: a one-line title
  // with a one-line caption would reserve the full min height mostly empty.
  const [titleLineCount, setTitleLineCount] = useState(0);
  const [captionLineCount, setCaptionLineCount] = useState(0);
  const totalDetailLines =
    titleLineCount + (post.caption ? captionLineCount : 0);
  const {
    onPress: onMenuPress,
    actions: menuActions,
    showVisibilitySheet,
    closeVisibilitySheet,
    pendingVisibility,
    handleVisibilitySelect,
    showActionsSheet,
    closeActionsSheet,
    onActionsSheetClosed,
    showReportSheet,
    closeReportSheet,
    submitReport,
  } = usePostMenu({
    workoutId: post.workoutId,
    postId: post.postId,
    ownerUserId: post.userId,
    ownerUsername: post.username,
    viewerFollowsAuthor: post.viewerFollowsAuthor,
    currentVisibility: post.visibility ?? "PUBLIC",
  });

  const photos =
    post.photoUrls && post.photoUrls.length > 0
      ? post.photoUrls
      : post.imageUrl
        ? [post.imageUrl]
        : [];
  const hasPhotos = photos.length > 0;
  const isOwnPost = post.username === user?.username;
  const textMuted: StyleProp<TextStyle> = { color: colors.text, opacity: 0.55 };
  const textFaint: StyleProp<TextStyle> = { color: colors.text, opacity: 0.45 };

  const visibility = post.visibility ?? "PUBLIC";
  const visibilityIcon =
    isOwnPost && visibility === "FRIENDS"
      ? "people-outline"
      : isOwnPost && visibility === "PRIVATE"
        ? "lock-closed-outline"
        : null;

  const handlePhotoScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / scrollWidth);
    if (index !== activePhotoIndex) setActivePhotoIndex(index);
  };

  const handleMediaLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width <= 0 || width === scrollWidth) return;
    setScrollWidth(width);
    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({
        x: activePhotoIndex * width,
        animated: false,
      });
    });
  };

  const openImageViewer = (initialIndex = activePhotoIndex) => {
    if (photos.length === 0) return;
    navigation.navigate("ImageViewer", {
      photos,
      initialIndex,
    });
  };

  const handleImageDoubleTap = (x: number, y: number) => {
    if (isPending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    heartLayerRef.current?.show(x, y);

    // Unlike the action button, a double tap expresses only positive intent.
    // The shared store applies this atomically so another mounted post surface
    // cannot turn a concurrent double tap into an accidental unlike.
    handleImageLike();
  };

  const openWorkoutDetails = () => {
    if (isPending) return;
    const targetNavigator = navigation.getParent() || navigation;
    targetNavigator.navigate("DetailedHistory", {
      workoutId: post.workoutId,
      caption: post.caption,
      workoutName: post.workoutName,
      postId: post.postId,
      ownerUserId: post.userId,
      ownerUsername: post.username,
      viewerFollowsAuthor: post.viewerFollowsAuthor,
      initialLikeCount: likeCount,
      initialLikedByUser: likedByUser,
    });
  };

  const openComments = () => {
    if (isPending) return;
    navigation.navigate("Comments", {
      postId: post.postId,
      postOwnerId: post.userId,
    });
  };

  const foreground = hasPhotos ? "#FFFFFF" : colors.text;
  const timestampStyle = hasPhotos ? styles.photoSecondaryText : textFaint;

  const userHeader = (
    <View style={styles.userInfo}>
      <Avatar
        username={post.username}
        profilePictureUrl={post.userProfilePictureUrl}
        size={34}
      />
      <View style={styles.userNameBlock}>
        <View style={styles.userNameLine}>
          <Text
            numberOfLines={1}
            style={[
              styles.username,
              { color: foreground },
              hasPhotos && styles.photoTextShadow,
            ]}
          >
            {post.username}
          </Text>
          {visibilityIcon && (
            <Ionicons
              name={visibilityIcon}
              size={13}
              color={foreground}
              style={styles.visibilityIcon}
            />
          )}
        </View>
        <View style={styles.timestampLine}>
          <Text
            numberOfLines={1}
            style={[
              styles.timestamp,
              timestampStyle,
              hasPhotos && styles.photoTextShadow,
            ]}
          >
            {formatTimeAgo(post.createdAt)}
          </Text>
          {post.locationId && post.locationName ? (
            // Nested touchable: claims the tap over the header's
            // profile-navigation wrapper, IG-style location link.
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={6}
              onPress={() =>
                (navigation as any).push("LocationPage", {
                  locationId: post.locationId,
                  name: post.locationName,
                })
              }
              style={styles.locationLink}
              accessibilityRole="button"
              accessibilityLabel={`View posts at ${post.locationName}`}
            >
              <Ionicons
                name="location-outline"
                size={11}
                color={hasPhotos ? "#FFFFFF" : colors.text}
                style={[
                  hasPhotos ? styles.photoLocationIcon : styles.locationIcon,
                  hasPhotos && styles.photoTextShadow,
                ]}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.timestamp,
                  timestampStyle,
                  hasPhotos && styles.photoTextShadow,
                  styles.locationName,
                ]}
              >
                {post.locationName}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );

  const header = (
    <View style={[styles.header, hasPhotos && styles.photoHeader]}>
      {isOwnPost ? (
        <View style={styles.userInfoWrap}>{userHeader}</View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            (navigation as any).push("UserProfile", {
              username: post.username,
            })
          }
          style={styles.userInfoWrap}
          accessibilityRole="button"
          accessibilityLabel={`View ${post.username}'s profile`}
        >
          {userHeader}
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={isPending ? undefined : onMenuPress}
        disabled={isPending}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="More options"
        accessibilityState={{ disabled: isPending }}
        style={[styles.menuButton, isPending && styles.menuDisabled]}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={foreground} />
      </TouchableOpacity>
    </View>
  );

  const actionBar = (
    <PostActionBar
      glassAvailable={glassAvailable}
      fallbackBackground={
        hasPhotos
          ? dark
            ? "rgba(20,20,20,0.72)"
            : "rgba(255,255,255,0.82)"
          : colors.card
      }
      fallbackBorder={
        hasPhotos
          ? dark
            ? "rgba(255,255,255,0.24)"
            : "rgba(0,0,0,0.12)"
          : colors.border
      }
      foreground={hasPhotos && glassAvailable ? "#FFFFFF" : colors.text}
      liked={likedByUser}
      likeCount={likeCount}
      commentCount={post.commentCount}
      isPending={isPending}
      onLike={handleLike}
      onComment={openComments}
    />
  );

  // Centered over the media (or the card body for text posts); box-none so
  // taps outside the pill still reach the content beneath.
  const pendingPill = isPending ? (
    <View style={styles.pendingPillOverlay} pointerEvents="box-none">
      <CardUploadPill
        failed={pendingFailed}
        onRetry={onRetryPending}
        onDiscard={onDiscardPending}
        overPhotos={hasPhotos}
        queueId={pendingQueueId}
      />
    </View>
  ) : null;

  return (
    <FontScaleProvider max={1}>
      <View style={styles.cardShadow}>
        <View
          style={[
            styles.card,
            !hasPhotos &&
              totalDetailLines >= TEXT_CARD_MIN_TOTAL_LINES &&
              styles.textCard,
            {
              backgroundColor: glassAvailable ? "transparent" : colors.card,
            },
          ]}
        >
          {glassAvailable && (
            <GlassView
              style={[StyleSheet.absoluteFillObject, styles.cardGlass]}
              glassEffectStyle="regular"
            />
          )}

          <PostActionsSheet
            visible={showActionsSheet}
            actions={menuActions}
            onClose={closeActionsSheet}
            onClosed={onActionsSheetClosed}
          />
          <PostVisibilitySheet
            visible={showVisibilitySheet}
            current={pendingVisibility}
            onSelect={handleVisibilitySelect}
            onClose={closeVisibilitySheet}
          />
          <ReportPostSheet
            visible={showReportSheet}
            onSubmit={submitReport}
            onClose={closeReportSheet}
          />

          {hasPhotos ? (
            <>
              <View style={styles.media} onLayout={handleMediaLayout}>
                {photos.length === 1 ? (
                  <PostImageTapTarget
                    onSingleTap={() => openImageViewer(0)}
                    onDoubleTap={handleImageDoubleTap}
                    doubleTapEnabled={!isPending}
                    accessibilityLabel="Open workout photo"
                    style={StyleSheet.absoluteFillObject}
                  >
                    <View style={StyleSheet.absoluteFillObject}>
                      <PresignedImage
                        imageKey={photos[0]}
                        style={styles.mediaImage}
                        resizeMode="cover"
                      />
                    </View>
                  </PostImageTapTarget>
                ) : (
                  <ScrollView
                    ref={carouselRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handlePhotoScroll}
                    style={StyleSheet.absoluteFillObject}
                    contentContainerStyle={styles.carouselContent}
                  >
                    {photos.map((url, index) => (
                      <PostImageTapTarget
                        key={`${url}-${index}`}
                        onSingleTap={() => openImageViewer(index)}
                        onDoubleTap={handleImageDoubleTap}
                        doubleTapEnabled={!isPending}
                        accessibilityLabel={`Open workout photo ${index + 1} of ${photos.length}`}
                        style={[styles.carouselPage, { width: scrollWidth }]}
                      >
                        <View style={StyleSheet.absoluteFillObject}>
                          <PresignedImage
                            imageKey={url}
                            style={styles.mediaImage}
                            resizeMode="cover"
                          />
                        </View>
                      </PostImageTapTarget>
                    ))}
                  </ScrollView>
                )}

                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    "rgba(0,0,0,0.58)",
                    "rgba(0,0,0,0.03)",
                    "rgba(0,0,0,0.42)",
                  ]}
                  locations={[0, 0.48, 1]}
                  style={StyleSheet.absoluteFillObject}
                />

                <DoubleTapHeartLayer ref={heartLayerRef} />

                {header}

                {photos.length > 1 && (
                  <View style={styles.dotsRow} pointerEvents="none">
                    {photos.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          index === activePhotoIndex
                            ? styles.activeDot
                            : styles.inactiveDot,
                        ]}
                      />
                    ))}
                  </View>
                )}

                <View style={styles.photoActions}>{actionBar}</View>

                {pendingPill}
              </View>

              <TouchableOpacity
                activeOpacity={isPending ? 1 : 0.72}
                disabled={isPending}
                onPress={openWorkoutDetails}
                style={styles.photoDetails}
                accessibilityRole="button"
              >
                <Text
                  numberOfLines={2}
                  style={[styles.workoutName, { color: colors.text }]}
                >
                  {post.workoutName}
                </Text>
                {post.caption ? (
                  <MentionableText
                    text={post.caption}
                    style={[styles.caption, textMuted]}
                  />
                ) : null}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {header}
              <TouchableOpacity
                activeOpacity={isPending ? 1 : 0.72}
                disabled={isPending}
                onPress={openWorkoutDetails}
                style={styles.textDetails}
                accessibilityRole="button"
              >
                <Text
                  numberOfLines={3}
                  onTextLayout={(event) =>
                    setTitleLineCount(event.nativeEvent.lines.length)
                  }
                  style={[styles.workoutName, { color: colors.text }]}
                >
                  {post.workoutName}
                </Text>
                {post.caption ? (
                  <MentionableText
                    text={post.caption}
                    onTextLayout={(event) =>
                      setCaptionLineCount(event.nativeEvent.lines.length)
                    }
                    style={[styles.caption, textMuted]}
                  />
                ) : null}
              </TouchableOpacity>
              <View style={styles.textActions}>{actionBar}</View>

              {pendingPill}
            </>
          )}
        </View>
      </View>
    </FontScaleProvider>
  );
}

type HeartTier = "red" | "gold" | "blue" | "purple";
type TapHeart = {
  id: number;
  x: number;
  y: number;
  tier: HeartTier;
  milestone: boolean;
};
type DoubleTapHeartLayerHandle = { show: (x: number, y: number) => void };

const DoubleTapHeartLayer = forwardRef<DoubleTapHeartLayerHandle>(
  function DoubleTapHeartLayer(_props, ref) {
    const nextId = useRef(0);
    const streak = useRef(0);
    const lastTapAt = useRef(0);
    const [hearts, setHearts] = useState<TapHeart[]>([]);

    useImperativeHandle(
      ref,
      () => ({
        show: (x, y) => {
          const now = Date.now();
          streak.current =
            now - lastTapAt.current <= HEART_STREAK_TIMEOUT_MS
              ? streak.current + 1
              : 1;
          lastTapAt.current = now;

          const tier: HeartTier =
            streak.current >= 100
              ? "purple"
              : streak.current >= 50
                ? "blue"
                : streak.current >= 20
                  ? "gold"
                  : "red";
          const milestone =
            streak.current === 20 ||
            streak.current === 50 ||
            streak.current === 100;

          const heart = { id: ++nextId.current, x, y, tier, milestone };
          setHearts((current) => [...current, heart]);
        },
      }),
      [],
    );

    const removeHeart = useCallback((id: number) => {
      setHearts((current) => current.filter((heart) => heart.id !== id));
    }, []);

    return (
      <View pointerEvents="none" style={styles.doubleTapHeartLayer}>
        {hearts.map((heart) => (
          <FloatingTapHeart
            key={heart.id}
            heart={heart}
            onComplete={removeHeart}
          />
        ))}
      </View>
    );
  },
);

function FloatingTapHeart({
  heart,
  onComplete,
}: {
  heart: TapHeart;
  onComplete: (id: number) => void;
}) {
  const size = heart.milestone
    ? heart.tier === "purple"
      ? PURPLE_MILESTONE_HEART_SIZE
      : heart.tier === "blue"
        ? BLUE_MILESTONE_HEART_SIZE
        : GOLD_MILESTONE_HEART_SIZE
    : DOUBLE_TAP_HEART_SIZE;
  const color =
    heart.tier === "gold"
      ? "#FFD84D"
      : heart.tier === "blue"
        ? "#00B7FF"
        : heart.tier === "purple"
          ? "#A855F7"
          : "#F04452";
  const opacity = useSharedValue(0);
  const scale = useSharedValue(heart.milestone ? 0.45 : 0.65);
  const lift = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));

  useEffect(() => {
    const fadeDelay = heart.milestone ? 450 : 250;
    const fadeDuration = heart.milestone ? 300 : 190;
    const totalDuration = 55 + fadeDelay + fadeDuration;

    opacity.value = withSequence(
      withTiming(1, { duration: 55 }),
      withDelay(
        fadeDelay,
        withTiming(0, { duration: fadeDuration }, (finished) => {
          if (finished) runOnJS(onComplete)(heart.id);
        }),
      ),
    );
    scale.value = withSequence(
      withSpring(heart.milestone ? 1.12 : 1.08, {
        damping: heart.milestone ? 8 : 9,
        stiffness: heart.milestone ? 210 : 260,
      }),
      withDelay(
        heart.milestone ? 350 : 190,
        withTiming(heart.milestone ? 0.95 : 0.9, { duration: 180 }),
      ),
    );
    lift.value = withTiming(heart.milestone ? -105 : -64, {
      duration: totalDuration,
    });
  }, [heart.id, heart.milestone, lift, onComplete, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.doubleTapHeart,
        {
          left: heart.x - size / 2,
          top: heart.y - size / 2,
          width: size,
          height: size,
        },
        animatedStyle,
      ]}
    >
      <Ionicons
        name="heart"
        size={size}
        color={color}
        style={[
          styles.doubleTapHeartIcon,
          heart.tier !== "red" && [
            styles.tierHeartIcon,
            { shadowColor: color },
          ],
        ]}
      />
    </Animated.View>
  );
}

function PostImageTapTarget({
  onSingleTap,
  onDoubleTap,
  doubleTapEnabled,
  accessibilityLabel,
  style,
  children,
}: {
  onSingleTap: () => void;
  onDoubleTap: (x: number, y: number) => void;
  doubleTapEnabled: boolean;
  accessibilityLabel: string;
  style: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const doubleTap = Gesture.Tap()
    .enabled(doubleTapEnabled)
    .numberOfTaps(2)
    .maxDelay(250)
    .maxDistance(30)
    .onEnd((event, success) => {
      if (success) runOnJS(onDoubleTap)(event.x, event.y);
    });
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd((_event, success) => {
      if (success) runOnJS(onSingleTap)();
    });

  return (
    <GestureDetector gesture={Gesture.Exclusive(doubleTap, singleTap)}>
      <View
        style={style}
        accessible
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel}
        onAccessibilityTap={onSingleTap}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "activate") onSingleTap();
        }}
      >
        {children}
      </View>
    </GestureDetector>
  );
}

function PostActionBar({
  glassAvailable,
  fallbackBackground,
  fallbackBorder,
  foreground,
  liked,
  likeCount,
  commentCount,
  isPending,
  onLike,
  onComment,
}: {
  glassAvailable: boolean;
  fallbackBackground: ColorValue;
  fallbackBorder: ColorValue;
  foreground: ColorValue;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  isPending: boolean;
  onLike: () => void;
  onComment: () => void;
}) {
  const content = (
    <>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={isPending ? undefined : onLike}
        disabled={isPending}
        activeOpacity={isPending ? 1 : 0.65}
        accessibilityRole="button"
        accessibilityLabel={`${liked ? "Unlike" : "Like"} post, ${likeCount} likes`}
        accessibilityState={{ disabled: isPending, selected: liked }}
      >
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={21}
          color={liked ? "#F04452" : foreground}
          style={isPending ? styles.actionDisabled : undefined}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.actionCount,
            { color: liked ? "#F04452" : foreground },
            isPending && styles.actionDisabled,
          ]}
        >
          {likeCount}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={isPending ? undefined : onComment}
        disabled={isPending}
        activeOpacity={isPending ? 1 : 0.65}
        accessibilityRole="button"
        accessibilityLabel={`View comments, ${commentCount} comments`}
        accessibilityState={{ disabled: isPending }}
      >
        <Ionicons
          name="chatbubble-outline"
          size={20}
          color={foreground}
          style={isPending ? styles.actionDisabled : undefined}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.actionCount,
            { color: foreground },
            isPending && styles.actionDisabled,
          ]}
        >
          {commentCount}
        </Text>
      </TouchableOpacity>
    </>
  );

  if (glassAvailable) {
    return (
      <GlassView
        style={styles.actionBar}
        glassEffectStyle="regular"
        isInteractive
      >
        {content}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.actionBar,
        {
          backgroundColor: fallbackBackground,
          borderColor: fallbackBorder,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    marginHorizontal: CARD_MARGIN_HORIZONTAL,
    marginBottom: 16,
    borderRadius: CARD_RADIUS,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  card: {
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  cardGlass: {
    borderRadius: CARD_RADIUS,
  },
  textCard: {
    minHeight: 250,
  },
  header: {
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 3,
  },
  photoHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  userInfoWrap: {
    flex: 1,
    minWidth: 0,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  userNameBlock: {
    flex: 1,
    minWidth: 0,
  },
  userNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  visibilityIcon: {
    opacity: 0.72,
  },
  username: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.25,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  timestampLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 1,
  },
  locationIcon: {
    marginTop: 2,
    opacity: 0.5,
  },
  photoLocationIcon: {
    marginTop: 2,
    opacity: 0.9,
  },
  locationName: {
    flexShrink: 1,
  },
  photoSecondaryText: {
    color: "rgba(255,255,255,0.76)",
  },
  photoTextShadow: {
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  menuButton: {
    width: 36,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  menuDisabled: {
    opacity: 0.4,
  },
  media: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    overflow: "hidden",
    backgroundColor: "#222222",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  carouselContent: {
    height: "100%",
  },
  carouselPage: {
    height: "100%",
  },
  doubleTapHeartLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  doubleTapHeart: {
    position: "absolute",
  },
  doubleTapHeartIcon: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
  },
  tierHeartIcon: {
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  dotsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 5,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    zIndex: 2,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 16,
    backgroundColor: "#FFFFFF",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  photoActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 17,
    alignItems: "center",
    zIndex: 3,
  },
  actionBar: {
    width: 144,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    height: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionCount: {
    maxWidth: 34,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  actionDisabled: {
    opacity: 0.35,
  },
  photoDetails: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 18,
  },
  textDetails: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 21,
    paddingBottom: 10,
  },
  workoutName: {
    fontSize: 25,
    lineHeight: 29,
    fontWeight: "700",
    letterSpacing: -0.65,
  },
  caption: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
  },
  textActions: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  pendingPillOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 4,
  },
});

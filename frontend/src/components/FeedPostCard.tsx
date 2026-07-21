import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  LayoutChangeEvent,
  StyleProp,
  TextStyle,
  Dimensions,
} from "react-native";
import { FontScaleProvider, Text } from "./Text";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useTheme } from "@react-navigation/native";
import { FeedPost } from "../api/socialFeedApi";
import { parseLocalDate, formatTimeAgo } from "../utils/date";
import { formatTag } from "../utils/formatTag";
import { useAuth } from "../context/AuthContext";
import { useLikeState } from "../context/LikesContext";
import { usePostMenu } from "../hooks/usePostMenu";
import { Avatar } from "./Avatar";
import { MentionableText } from "./MentionableText";
import { PostVisibilitySheet } from "./PostVisibilitySheet";
import { PostActionsSheet } from "./PostActionsSheet";
import { ReportPostSheet } from "./ReportPostSheet";
import { PresignedImage } from "./PresignedImage";

// Horizontal margins between the screen edge and the photo. Kept as named
// constants so the seeded scrollWidth (used to size photos before onLayout
// fires) can never drift from the actual `card` / `carouselWrap` styles.
const CARD_MARGIN_HORIZONTAL = 16;
const CAROUSEL_MARGIN_HORIZONTAL = 14;
const PAGE_HORIZONTAL_INSET =
  (CARD_MARGIN_HORIZONTAL + CAROUSEL_MARGIN_HORIZONTAL) * 2;

interface Props {
  post: FeedPost;
  onOpenComments: (postId: string) => void;
  /**
   * When true, render an indeterminate progress bar at the top of the card
   * and suppress interactions whose targets only exist server-side (likes,
   * comments, navigation to the workout detail). Used for offline posts that
   * have been saved locally but not yet sent to the backend.
   */
  isPending?: boolean;
}

export function FeedPostCard({ post, isPending = false }: Props) {
  const { colors } = useTheme();
  const cardBg = colors.card;
  const innerBg = colors.card;
  const { user } = useAuth();
  const {
    liked: likedByUser,
    count: likeCount,
    toggle: handleLike,
  } = useLikeState(post.postId, post);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  // Seed with the real page width (full screen minus the card + carousel
  // horizontal margins) so a photo never mounts into a 0-width box. Mounting an
  // <Image> at width 0 makes iOS decode it to a ~1px bitmap that then gets
  // stretched to fill once layout settles, rendering a flat block of the
  // photo's average color. onLayout below still refines this for rotation /
  // iPad / split-view. See PAGE_HORIZONTAL_INSET.
  const [scrollWidth, setScrollWidth] = useState(
    () => Dimensions.get("window").width - PAGE_HORIZONTAL_INSET,
  );
  const navigation = useNavigation();
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

  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (scrollWidth === 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / scrollWidth);
    if (index !== activePhotoIndex) setActivePhotoIndex(index);
  };

  const handleScrollLayout = (e: LayoutChangeEvent) => {
    setScrollWidth(e.nativeEvent.layout.width);
  };

  const openImageViewer = () => {
    if (photos.length === 0) return;
    navigation.navigate("ImageViewer", {
      photos,
      initialIndex: activePhotoIndex,
    });
  };

  const isOwnPost = post.username === user?.username;

  const formatOverlineDate = (dateString: string) => {
    return parseLocalDate(dateString)
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  };

  const formatBodyTag = (tag: string) => {
    return tag
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const textMuted: StyleProp<TextStyle> = { color: colors.text, opacity: 0.5 };
  const textFaint: StyleProp<TextStyle> = { color: colors.text, opacity: 0.4 };

  const visibility = post.visibility ?? "PUBLIC";
  const visibilityIcon =
    isOwnPost && visibility === "FRIENDS"
      ? "people-outline"
      : isOwnPost && visibility === "PRIVATE"
        ? "lock-closed-outline"
        : null;

  const userHeader = (
    <View style={styles.userInfo}>
      <Avatar
        username={post.username}
        profilePictureUrl={post.userProfilePictureUrl}
        size={40}
      />
      <View style={styles.userNameRow}>
        <View style={styles.userNameLine}>
          <Text style={[styles.username, { color: colors.text }]}>
            {post.username}
          </Text>
          {visibilityIcon && (
            <Ionicons
              name={visibilityIcon}
              size={13}
              color={colors.text}
              style={styles.visIcon}
            />
          )}
        </View>
        <View style={styles.timestampLine}>
          <Text style={[styles.timestamp, textFaint]}>
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
            >
              <Ionicons
                name="location-outline"
                size={11}
                color={colors.text}
                style={{ opacity: 0.5 }}
              />
              <Text style={[styles.locationName, textMuted]} numberOfLines={1}>
                {post.locationName}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );

  const hasDuration = post.durationMin != null && post.durationMin > 0;
  const hasMuscles = Array.isArray(post.bodyTags) && post.bodyTags.length > 0;
  const hasPhotos = photos.length > 0;
  const contentPaddingHorizontal = 16;

  return (
    <FontScaleProvider max={1}>
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: colors.border },
        ]}
      >
        {isPending && <PendingProgressBar color={colors.text} />}
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
        <View style={styles.header}>
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
            >
              {userHeader}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onMenuPress}
            hitSlop={10}
            accessibilityLabel="More options"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {photos.length === 1 && (
          // Single photo (the common case): render directly so its width comes
          // from the flex-laid-out carouselWrap. This has a real width on the
          // very first render, so the <Image> can never mount into a 0-width box
          // (the cause of the flat-gray "average color" bug) regardless of
          // whether the presigned url is resolved synchronously from cache.
          <View style={styles.carouselWrap}>
            <TouchableWithoutFeedback onPress={openImageViewer}>
              <View>
                <PresignedImage
                  imageKey={photos[0]}
                  style={[styles.image, { borderColor: colors.border }]}
                  resizeMode="cover"
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        )}

        {photos.length > 1 && (
          <View style={styles.carouselWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onLayout={handleScrollLayout}
              onMomentumScrollEnd={handlePhotoScroll}
            >
              {photos.map((url, i) => (
                <TouchableWithoutFeedback
                  key={`${url}-${i}`}
                  onPress={openImageViewer}
                >
                  <View style={{ width: scrollWidth }}>
                    <PresignedImage
                      imageKey={url}
                      style={[styles.image, { borderColor: colors.border }]}
                      resizeMode="cover"
                    />
                  </View>
                </TouchableWithoutFeedback>
              ))}
            </ScrollView>
            <View style={styles.dotsRow}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === activePhotoIndex ? colors.text : colors.border,
                      opacity: i === activePhotoIndex ? 0.9 : 0.5,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={isPending ? 1 : 0.7}
          disabled={isPending}
          onPress={() => {
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
          }}
        >
          <View
            style={[
              styles.titleBlock,
              hasPhotos && { paddingHorizontal: contentPaddingHorizontal },
            ]}
          >
            <Text style={[styles.dateOverline, textMuted]}>
              {formatOverlineDate(post.datePerformed)}
            </Text>
            <Text style={[styles.workoutName, { color: colors.text }]}>
              {post.workoutName}
            </Text>
          </View>

          <View
            style={[
              styles.metricsRow,
              hasPhotos && { paddingHorizontal: contentPaddingHorizontal },
            ]}
          >
            {hasDuration && (
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, textMuted]}>Time</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {formatDuration(post.durationMin!)}
                </Text>
              </View>
            )}
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, textMuted]}>Exercises</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {post.exerciseCount}
              </Text>
            </View>
            {!hasPhotos && hasMuscles && (
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, textMuted]}>Muscles</Text>
                <Text style={[styles.musclesText, { color: colors.text }]}>
                  {post.bodyTags.map(formatTag).join(", ")}
                </Text>
              </View>
            )}
          </View>

          {hasPhotos && hasMuscles && (
            <View
              style={[
                styles.musclesRow,
                { paddingHorizontal: contentPaddingHorizontal },
              ]}
            >
              <Text style={[styles.metricLabel, textMuted]}>Muscles</Text>
              <Text style={[styles.musclesText, { color: colors.text }]}>
                {post.bodyTags.map(formatTag).join(", ")}
              </Text>
            </View>
          )}

          {post.caption && (
            <MentionableText
              text={post.caption}
              style={[
                styles.caption,
                { color: colors.text },
                hasPhotos && { paddingHorizontal: contentPaddingHorizontal },
              ]}
            />
          )}
        </TouchableOpacity>

        <View
          style={[
            styles.engagement,
            {
              backgroundColor: innerBg,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.engagementItem}
            onPress={isPending ? undefined : handleLike}
            disabled={isPending}
            activeOpacity={isPending ? 1 : 0.7}
          >
            <Ionicons
              name={likedByUser ? "heart" : "heart-outline"}
              size={24}
              color={likedByUser ? "#e74c3c" : colors.text}
              style={isPending ? styles.engagementDisabled : undefined}
            />
            <Text
              style={[
                styles.engagementText,
                { color: likedByUser ? "#e74c3c" : colors.text },
                isPending && styles.engagementDisabled,
              ]}
            >
              {likeCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.engagementItem}
            onPress={
              isPending
                ? undefined
                : () =>
                    navigation.navigate("Comments", {
                      postId: post.postId,
                      postOwnerId: post.userId,
                    })
            }
            disabled={isPending}
            activeOpacity={isPending ? 1 : 0.7}
          >
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={colors.text}
              style={isPending ? styles.engagementDisabled : undefined}
            />
            <Text
              style={[
                styles.engagementText,
                { color: colors.text },
                isPending && styles.engagementDisabled,
              ]}
            >
              {post.commentCount}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </FontScaleProvider>
  );
}

/**
 * Thin "almost done" progress bar drawn at the very top of a pending offline
 * post card. The filled portion is anchored to the left and stops short of
 * the right edge so the card reads as nearly-but-not-finished. A helper
 * line beneath the bar tells the user how to complete the upload.
 */
function PendingProgressBar({ color }: { color: string }) {
  const { dark } = useTheme();
  const backdropColor = dark ? "#616161" : "#E5E5E5";
  return (
    <View>
      <View
        style={[styles.progressBackdrop, { backgroundColor: backdropColor }]}
      />
      <View style={[styles.progressTrack, { backgroundColor: `${color}33` }]}>
        <View style={[styles.progressFill, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.progressHint, { color, opacity: 0.55 }]}>
        Uploading...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: CARD_MARGIN_HORIZONTAL,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userInfoWrap: {
    flex: 1,
    minWidth: 0,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userNameRow: {
    flexShrink: 1,
  },
  userNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  visIcon: {
    opacity: 0.5,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  timestamp: {
    fontSize: 12,
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
    marginTop: 2,
    flexShrink: 1,
  },
  locationName: {
    fontSize: 12,
    flexShrink: 1,
  },
  carouselWrap: {
    marginHorizontal: CAROUSEL_MARGIN_HORIZONTAL,
    marginBottom: 12,
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleBlock: {
    paddingHorizontal: 16,
  },
  dateOverline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  workoutName: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 28,
  },
  metricsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  musclesRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  musclesText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 24,
    marginTop: 2,
  },
  caption: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  engagement: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  engagementItem: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  engagementText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  engagementDisabled: {
    opacity: 0.35,
  },
  progressBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressTrack: {
    height: 3,
    marginRight: 64,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    overflow: "hidden",
    flexDirection: "row",
  },
  progressFill: {
    height: 3,
    width: "80%",
  },
  progressHint: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
    textAlign: "center",
  },
});

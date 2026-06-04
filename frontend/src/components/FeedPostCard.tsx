import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  LayoutChangeEvent,
  StyleProp,
  TextStyle,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useTheme } from "@react-navigation/native";
import { FeedPost } from "../api/socialFeedApi";
import { parseLocalDate, formatTimeAgo } from "../utils/date";
import { formatTag } from "../utils/formatTag";
import { useAuth } from "../context/AuthContext";
import { useLikeState } from "../context/LikesContext";
import { usePostMenu } from "../hooks/usePostMenu";
import { Avatar } from "./Avatar";
import { PostVisibilitySheet } from "./PostVisibilitySheet";
import { PostActionsSheet } from "./PostActionsSheet";

interface Props {
  post: FeedPost;
  onOpenComments: (postId: string) => void;
}

export function FeedPostCard({ post }: Props) {
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
  const [scrollWidth, setScrollWidth] = useState(0);
  const navigation = useNavigation();
  const {
    onPress: onMenuPress,
    showVisibilitySheet,
    closeVisibilitySheet,
    pendingVisibility,
    handleVisibilitySelect,
    showActionsSheet,
    closeActionsSheet,
    handleShare,
    handleEditVisibility,
  } = usePostMenu({
    workoutId: post.workoutId,
    postId: post.postId,
    ownerUserId: post.userId,
    ownerUsername: post.username,
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
        <Text style={[styles.timestamp, textFaint]}>
          {formatTimeAgo(post.createdAt)}
        </Text>
      </View>
    </View>
  );

  const hasDuration = post.durationMin != null && post.durationMin > 0;
  const hasMuscles = Array.isArray(post.bodyTags) && post.bodyTags.length > 0;
  const hasPhotos = photos.length > 0;
  const contentPaddingHorizontal =
    hasPhotos && scrollWidth > 0
      ? 14 + Math.max(0, (scrollWidth - 300) / 2)
      : 16;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: colors.border },
      ]}
    >
      <PostActionsSheet
        visible={showActionsSheet}
        onShare={handleShare}
        onEditVisibility={handleEditVisibility}
        onClose={closeActionsSheet}
      />
      <PostVisibilitySheet
        visible={showVisibilitySheet}
        current={pendingVisibility}
        onSelect={handleVisibilitySelect}
        onClose={closeVisibilitySheet}
      />
      <View style={styles.header}>
        {isOwnPost ? (
          <View style={styles.userInfoWrap}>{userHeader}</View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("UserProfile", {
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
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {photos.length > 0 && (
        <View style={styles.carouselWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={handleScrollLayout}
            onMomentumScrollEnd={handlePhotoScroll}
            scrollEnabled={photos.length > 1}
          >
            {photos.map((url, i) => (
              <TouchableWithoutFeedback
                key={`${url}-${i}`}
                onPress={openImageViewer}
              >
                <View style={{ width: scrollWidth, alignItems: "center" }}>
                  <Image
                    source={{ uri: url }}
                    style={[
                      styles.image,
                      { height: scrollWidth + 60, borderColor: colors.border },
                    ]}
                    resizeMode="cover"
                  />
                </View>
              </TouchableWithoutFeedback>
            ))}
          </ScrollView>
          {photos.length > 1 && (
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
          )}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          const targetNavigator = navigation.getParent() || navigation;
          targetNavigator.navigate("DetailedHistory", {
            workoutId: post.workoutId,
            caption: post.caption,
            workoutName: post.workoutName,
            postId: post.postId,
            ownerUserId: post.userId,
            ownerUsername: post.username,
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
          <Text
            style={[
              styles.caption,
              { color: colors.text },
              hasPhotos && { paddingHorizontal: contentPaddingHorizontal },
            ]}
          >
            {post.caption}
          </Text>
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
        <TouchableOpacity style={styles.engagementItem} onPress={handleLike}>
          <Ionicons
            name={likedByUser ? "heart" : "heart-outline"}
            size={24}
            color={likedByUser ? "#e74c3c" : colors.text}
          />
          <Text
            style={[
              styles.engagementText,
              { color: likedByUser ? "#e74c3c" : colors.text },
            ]}
          >
            {likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.engagementItem}
          onPress={() =>
            navigation.navigate("Comments", { postId: post.postId })
          }
        >
          <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
          <Text style={[styles.engagementText, { color: colors.text }]}>
            {post.commentCount}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
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
  carouselWrap: {
    marginHorizontal: 14,
    marginBottom: 12,
  },
  image: {
    width: 300,
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
});

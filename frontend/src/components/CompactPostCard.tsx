import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { FeedPost } from "../api/socialFeedApi";
import { Avatar } from "./Avatar";
import { PresignedImage } from "./PresignedImage";
import { formatDurationShort, formatTimeAgo } from "../utils/date";
import { useLikeState } from "../context/LikesContext";
import { usePostMenu } from "../hooks/usePostMenu";
import { useAuth } from "../context/AuthContext";
import { PostVisibilitySheet } from "./PostVisibilitySheet";
import { PostActionsSheet } from "./PostActionsSheet";
import { ReportPostSheet } from "./ReportPostSheet";

export type CompactPostCardTheme = {
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  chipBg: string;
};

type Props = {
  post: FeedPost;
  theme: CompactPostCardTheme;
  width: number;
};

export function CompactPostCard({ post, theme: t, width }: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const {
    liked: likedByUser,
    count: likeCount,
    toggle: handleLike,
  } = useLikeState(post.postId, post);
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
  const isOwnPost =
    post.userId === user?.userId || post.username === user?.username;
  const visibility = post.visibility ?? "PUBLIC";
  const visibilityIcon =
    isOwnPost && visibility === "FRIENDS"
      ? "people-outline"
      : isOwnPost && visibility === "PRIVATE"
        ? "lock-closed-outline"
        : null;
  const time = post.durationMin ? formatDurationShort(post.durationMin) : "—";

  const photos =
    post.photoUrls && post.photoUrls.length > 0
      ? post.photoUrls
      : post.imageUrl
        ? [post.imageUrl]
        : [];

  const openImageViewer = () => {
    if (photos.length === 0) return;
    navigation.navigate("ImageViewer", {
      photos,
      initialIndex: 0,
    });
  };

  const openDetail = () => {
    const parent = navigation.getParent?.() ?? navigation;
    parent.navigate("DetailedHistory", {
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

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={openDetail}
      style={[
        styles.card,
        { backgroundColor: t.surface, borderColor: t.border, width },
      ]}
    >
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
      <View style={styles.cardHeader}>
        <Avatar
          username={post.username}
          profilePictureUrl={post.userProfilePictureUrl}
          size={24}
        />
        <Text
          style={[styles.timeAgo, { color: t.textFaint }]}
          numberOfLines={1}
        >
          {formatTimeAgo(post.createdAt)}
        </Text>
        {visibilityIcon && (
          <Ionicons
            name={visibilityIcon}
            size={12}
            color={t.text}
            style={{ opacity: 0.5 }}
          />
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            onMenuPress();
          }}
          hitSlop={10}
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={t.text} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.workoutName, { color: t.text }]} numberOfLines={2}>
        {post.workoutName}
      </Text>

      <View style={styles.metricsRow}>
        <View>
          <Text style={[styles.metricValue, { color: t.text }]}>{time}</Text>
          <Text style={[styles.metricLabel, { color: t.textFaint }]}>TIME</Text>
        </View>
        <View>
          <Text style={[styles.metricValue, { color: t.text }]}>
            {post.exerciseCount}
          </Text>
          <Text style={[styles.metricLabel, { color: t.textFaint }]}>EX.</Text>
        </View>
        {photos.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openImageViewer}
            style={styles.thumbStackWrap}
          >
            {photos[2] && (
              <View
                shouldRasterizeIOS
                renderToHardwareTextureAndroid
                style={[
                  styles.thumbLayer,
                  styles.thumbLayerThird,
                  { backgroundColor: t.surface, borderColor: t.surface },
                ]}
              >
                <PresignedImage
                  imageKey={photos[2]}
                  style={[styles.thumbImage, { borderColor: t.border }]}
                  resizeMode="cover"
                  showLoader={false}
                />
              </View>
            )}
            {photos[1] && (
              <View
                shouldRasterizeIOS
                renderToHardwareTextureAndroid
                style={[
                  styles.thumbLayer,
                  styles.thumbLayerSecond,
                  { backgroundColor: t.surface, borderColor: t.surface },
                ]}
              >
                <PresignedImage
                  imageKey={photos[1]}
                  style={[styles.thumbImage, { borderColor: t.border }]}
                  resizeMode="cover"
                  showLoader={false}
                />
              </View>
            )}
            <View
              style={[
                styles.thumbLayer,
                { backgroundColor: t.surface, borderColor: t.surface },
              ]}
            >
              <PresignedImage
                imageKey={photos[0]}
                style={[styles.thumbImage, { borderColor: t.border }]}
                resizeMode="cover"
                showLoader={false}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.cardFooter, { borderTopColor: t.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLike}
          hitSlop={8}
          style={styles.footerItem}
        >
          <Ionicons
            name={likedByUser ? "heart" : "heart-outline"}
            size={16}
            color={likedByUser ? "#e74c3c" : t.text}
          />
          <Text
            style={[
              styles.footerText,
              { color: likedByUser ? "#e74c3c" : t.text },
            ]}
          >
            {likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate("Comments", { postId: post.postId })
          }
          hitSlop={8}
          style={styles.footerItem}
        >
          <Ionicons name="chatbubble-outline" size={16} color={t.text} />
          <Text style={[styles.footerText, { color: t.text }]}>
            {post.commentCount}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
    minHeight: 156,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeAgo: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  workoutName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: "auto",
    alignItems: "flex-end",
    position: "relative",
    minHeight: 48,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    fontSize: 9,
    marginTop: 3,
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
  },
  thumbStackWrap: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 56,
    height: 56,
  },
  thumbLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 52,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbLayerSecond: {
    transform: [{ translateX: 2 }, { translateY: 2 }, { rotate: "-3deg" }],
    opacity: 0.85,
  },
  thumbLayerThird: {
    transform: [{ translateX: 4 }, { translateY: 4 }, { rotate: "4deg" }],
    opacity: 0.72,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderRadius: 8.5,
  },
});

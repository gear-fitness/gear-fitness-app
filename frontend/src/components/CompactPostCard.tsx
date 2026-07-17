import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";

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

const CARD_RADIUS = 20;
// Both card variants must show the same gap above the title: measured from
// the image bottom on photo posts, and from the avatar bottom on text posts
// (where the header's own bottom padding contributes to it).
const TITLE_GAP = 11;
const HEADER_PADDING_BOTTOM = 5;

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
  const navigation = useNavigation() as any;
  const glassAvailable = isLiquidGlassAvailable();
  const { user } = useAuth();
  const { liked: likedByUser, count: likeCount } = useLikeState(
    post.postId,
    post,
  );
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
  const hasPhoto = photos.length > 0;
  const isOwnPost =
    post.userId === user?.userId || post.username === user?.username;
  const visibility = post.visibility ?? "PUBLIC";
  const visibilityIcon =
    isOwnPost && visibility === "FRIENDS"
      ? "people-outline"
      : isOwnPost && visibility === "PRIVATE"
        ? "lock-closed-outline"
        : null;

  const openImageViewer = () => {
    if (!hasPhoto) return;
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

  const foreground = hasPhoto ? "#FFFFFF" : t.text;
  const header = (
    <View style={[styles.header, hasPhoto && styles.photoHeader]}>
      <TouchableOpacity
        activeOpacity={0.72}
        onPress={openDetail}
        style={styles.headerIdentity}
        accessibilityRole="button"
        accessibilityLabel={`Open ${post.workoutName}`}
      >
        <Avatar
          username={post.username}
          profilePictureUrl={post.userProfilePictureUrl}
          size={26}
        />
        <View style={styles.identity}>
          <View style={styles.usernameRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.username,
                { color: foreground },
                hasPhoto && styles.photoTextShadow,
              ]}
            >
              {post.username}
            </Text>
            {visibilityIcon && (
              <Ionicons
                name={visibilityIcon}
                size={10}
                color={foreground}
                style={styles.visibilityIcon}
              />
            )}
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.timestamp,
              { color: hasPhoto ? "rgba(255,255,255,0.76)" : t.textFaint },
              hasPhoto && styles.photoTextShadow,
            ]}
          >
            {formatTimeAgo(post.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onMenuPress}
        hitSlop={10}
        style={styles.menuButton}
        accessibilityRole="button"
        accessibilityLabel="More options"
      >
        <Ionicons name="ellipsis-vertical" size={16} color={foreground} />
      </TouchableOpacity>
    </View>
  );

  return (
    <FontScaleProvider max={1}>
      <View style={[styles.shadow, { width }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: glassAvailable ? "transparent" : t.surface,
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

          {hasPhoto ? (
            <>
              <View style={styles.media}>
                <TouchableOpacity
                  activeOpacity={0.94}
                  onPress={openImageViewer}
                  style={StyleSheet.absoluteFillObject}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={
                    photos.length > 1
                      ? `Open ${photos.length} workout photos`
                      : "Open workout photo"
                  }
                >
                  <PresignedImage
                    imageKey={photos[0]}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    "rgba(0,0,0,0.58)",
                    "rgba(0,0,0,0.02)",
                    "rgba(0,0,0,0.4)",
                  ]}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFillObject}
                />
                {header}
                {photos.length > 1 && (
                  <View style={styles.photoCount} pointerEvents="none">
                    <Ionicons name="images-outline" size={11} color="#FFFFFF" />
                    <Text style={styles.photoCountText}>{photos.length}</Text>
                  </View>
                )}
              </View>
              <View style={styles.photoDetails}>
                <TouchableOpacity
                  activeOpacity={0.72}
                  onPress={openDetail}
                  accessibilityRole="button"
                >
                  <Text
                    numberOfLines={2}
                    style={[styles.workoutName, { color: t.text }]}
                  >
                    {post.workoutName}
                  </Text>
                </TouchableOpacity>
                {post.caption ? (
                  <MentionableText
                    text={post.caption}
                    numberOfLines={2}
                    style={[styles.caption, { color: t.textMuted }]}
                  />
                ) : null}
              </View>
            </>
          ) : (
            <>
              {header}
              <View style={styles.textDetails}>
                <TouchableOpacity
                  activeOpacity={0.72}
                  onPress={openDetail}
                  accessibilityRole="button"
                >
                  <Text
                    numberOfLines={3}
                    style={[styles.workoutName, { color: t.text }]}
                  >
                    {post.workoutName}
                  </Text>
                </TouchableOpacity>
                {post.caption ? (
                  <MentionableText
                    text={post.caption}
                    numberOfLines={2}
                    style={[styles.caption, { color: t.textMuted }]}
                  />
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>
    </FontScaleProvider>
  );
}

const styles = StyleSheet.create({
  shadow: {
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
  media: {
    width: "100%",
    aspectRatio: 1,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    overflow: "hidden",
    backgroundColor: "#222222",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  header: {
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: HEADER_PADDING_BOTTOM,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 3,
  },
  photoHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  username: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  timestamp: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
  visibilityIcon: {
    opacity: 0.72,
  },
  photoTextShadow: {
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  menuButton: {
    width: 32,
    height: 26,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  photoCount: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.38)",
    zIndex: 2,
  },
  photoCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  photoDetails: {
    paddingHorizontal: 13,
    paddingTop: TITLE_GAP,
    paddingBottom: 13,
  },
  textDetails: {
    paddingHorizontal: 13,
    paddingTop: TITLE_GAP - HEADER_PADDING_BOTTOM,
    paddingBottom: 8,
  },
  workoutName: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  caption: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
  },
});

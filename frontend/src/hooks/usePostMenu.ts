import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { followUser, getUserProfile, unfollowUser } from "../api/userService";
import { blockUser } from "../api/followService";
import { socialFeedApi } from "../api/socialFeedApi";
import { useAuth } from "../context/AuthContext";
import { useSocialFeed } from "../context/SocialFeedContext";

type Visibility = "PUBLIC" | "FRIENDS" | "PRIVATE";

/**
 * Shared 3-dot menu handler for post surfaces.
 *
 * Own post:
 *   - Opens a bottom sheet with two large buttons: Share + Edit Visibility.
 *   - Tapping Share navigates to ShareWorkout.
 *   - Tapping Edit Visibility opens the visibility picker sheet.
 *
 * Others' post:
 *   - Follow/Unfollow option.
 *   - Block option (with confirm alert).
 */
export function usePostMenu(args: {
  workoutId: string;
  postId?: string;
  ownerUserId?: string;
  ownerUsername?: string;
  currentVisibility?: Visibility;
  onVisibilityChanged?: (v: Visibility) => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { invalidate } = useSocialFeed();

  const isOwn =
    args.ownerUserId === undefined || args.ownerUserId === user?.userId;

  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showVisibilitySheet, setShowVisibilitySheet] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<Visibility>(
    args.currentVisibility ?? "PUBLIC",
  );

  const navigateToShare = () => {
    const target = (navigation as any).getParent?.() ?? (navigation as any);
    target.navigate("ShareWorkout", {
      workoutId: args.workoutId,
      ownerUserId: args.ownerUserId,
    });
  };

  const handleShare = () => {
    setShowActionsSheet(false);
    navigateToShare();
  };

  const handleEditVisibility = () => {
    setShowActionsSheet(false);
    setShowVisibilitySheet(true);
  };

  const handleVisibilitySelect = async (v: Visibility) => {
    setShowVisibilitySheet(false);
    if (!args.postId) return;
    try {
      await socialFeedApi.updatePostVisibility(args.postId, v);
      setPendingVisibility(v);
      args.onVisibilityChanged?.(v);
      invalidate();
    } catch {
      Alert.alert("Couldn't update", "Failed to change visibility.");
    }
  };

  const onPress = async () => {
    if (isOwn) {
      if (args.postId) {
        setShowActionsSheet(true);
      } else {
        navigateToShare();
      }
      return;
    }

    if (!args.ownerUsername) {
      navigateToShare();
      return;
    }

    let profile;
    try {
      profile = await getUserProfile(args.ownerUsername);
    } catch {
      Alert.alert("Couldn't load user", "Try again in a moment.");
      return;
    }

    const isFollowing = profile.isFollowing;

    Alert.alert(`@${args.ownerUsername}`, undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: isFollowing ? "Unfollow" : "Follow",
        style: isFollowing ? "destructive" : "default",
        onPress: async () => {
          try {
            if (isFollowing) {
              await unfollowUser(profile.userId);
            } else {
              await followUser(profile.userId);
            }
            invalidate();
          } catch {
            Alert.alert("Couldn't update", "Failed to update follow status.");
          }
        },
      },
      {
        text: `Block @${args.ownerUsername}`,
        style: "destructive",
        onPress: () => {
          Alert.alert(
            `Block @${args.ownerUsername}?`,
            "They won't be able to see your posts or follow you, and you won't see theirs.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Block",
                style: "destructive",
                onPress: async () => {
                  try {
                    await blockUser(profile.userId);
                    invalidate();
                    navigation.goBack();
                  } catch {
                    Alert.alert(
                      "Couldn't block",
                      "Failed to block this user.",
                    );
                  }
                },
              },
            ],
          );
        },
      },
    ]);
  };

  return {
    onPress,
    showActionsSheet,
    closeActionsSheet: () => setShowActionsSheet(false),
    handleShare,
    handleEditVisibility,
    showVisibilitySheet,
    closeVisibilitySheet: () => setShowVisibilitySheet(false),
    pendingVisibility,
    handleVisibilitySelect,
  };
}

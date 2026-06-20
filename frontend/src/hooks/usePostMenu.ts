import { useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { followUser, unfollowUser } from "../api/userService";
import { blockUser } from "../api/followService";
import { socialFeedApi } from "../api/socialFeedApi";
import { reportService, ReportReason } from "../api/reportService";
import { PostAction } from "../components/PostActionsSheet";
import { useAuth } from "../context/AuthContext";
import { useSocialFeed } from "../context/SocialFeedContext";

type Visibility = "PUBLIC" | "FRIENDS" | "PRIVATE";

/**
 * Shared 3-dot menu handler for post surfaces. Both variants render the same
 * PostActionsSheet, differing only in the actions it is given:
 *
 * Own post:    Share, Edit Visibility.
 * Others' post: Follow/Unfollow, Report, Block (Block keeps a native confirm).
 *
 * Follow state (`viewerFollowsAuthor`) comes precomputed on the post payload,
 * the same way `likedByCurrentUser` does, so the menu opens with no network
 * round-trip.
 */
export function usePostMenu(args: {
  workoutId: string;
  postId?: string;
  ownerUserId?: string;
  ownerUsername?: string;
  viewerFollowsAuthor?: boolean;
  currentVisibility?: Visibility;
  onVisibilityChanged?: (v: Visibility) => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { invalidateAll } = useSocialFeed();

  const isOwn =
    args.ownerUserId === undefined || args.ownerUserId === user?.userId;

  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showVisibilitySheet, setShowVisibilitySheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  // `pendingVisibility` is the option highlighted in the sheet; `savedVisibility`
  // is the last value persisted to the server. The sheet edits the former and we
  // only write to the server on dismiss, and only if the two differ.
  const [pendingVisibility, setPendingVisibility] = useState<Visibility>(
    args.currentVisibility ?? "PUBLIC",
  );
  const savedVisibilityRef = useRef<Visibility>(
    args.currentVisibility ?? "PUBLIC",
  );

  const navigateToShare = () => {
    const target = (navigation as any).getParent?.() ?? (navigation as any);
    target.navigate("ShareWorkout", {
      workoutId: args.workoutId,
      ownerUserId: args.ownerUserId,
    });
  };

  // iOS won't present a new modal (RN sheet or a modal-presentation screen)
  // while the actions sheet is still on screen, so we close it first and run
  // the follow-up only once `onActionsSheetClosed` reports it has unmounted.
  const pendingActionRef = useRef<(() => void) | null>(null);

  const closeActionsThen = (next: () => void) => {
    pendingActionRef.current = next;
    setShowActionsSheet(false);
  };

  const onActionsSheetClosed = () => {
    const next = pendingActionRef.current;
    pendingActionRef.current = null;
    next?.();
  };

  const handleShare = () => closeActionsThen(navigateToShare);

  const handleEditVisibility = () =>
    closeActionsThen(() => {
      setPendingVisibility(savedVisibilityRef.current);
      setShowVisibilitySheet(true);
    });

  const handleReport = () => closeActionsThen(() => setShowReportSheet(true));

  const handleToggleFollow = async () => {
    setShowActionsSheet(false);
    const targetId = args.ownerUserId;
    if (!targetId) return;
    try {
      if (args.viewerFollowsAuthor) {
        await unfollowUser(targetId);
      } else {
        await followUser(targetId);
      }
      invalidateAll();
    } catch {
      Alert.alert("Couldn't update", "Failed to update follow status.");
    }
  };

  const handleBlock = () => {
    setShowActionsSheet(false);
    const targetId = args.ownerUserId;
    if (!targetId) return;
    const label = args.ownerUsername ? `@${args.ownerUsername}` : "this user";
    Alert.alert(
      `Block ${label}?`,
      "They won't be able to see your posts or follow you, and you won't see theirs.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(targetId);
              invalidateAll();
              navigation.goBack();
            } catch {
              Alert.alert("Couldn't block", "Failed to block this user.");
            }
          },
        },
      ],
    );
  };

  const handleVisibilitySelect = (v: Visibility) => setPendingVisibility(v);

  const saveVisibility = async (v: Visibility) => {
    if (!args.postId || v === savedVisibilityRef.current) return;
    try {
      await socialFeedApi.updatePostVisibility(args.postId, v);
      savedVisibilityRef.current = v;
      args.onVisibilityChanged?.(v);
      invalidateAll();
    } catch {
      setPendingVisibility(savedVisibilityRef.current);
      Alert.alert("Couldn't update", "Failed to change visibility.");
    }
  };

  const closeVisibilitySheet = () => {
    setShowVisibilitySheet(false);
    void saveVisibility(pendingVisibility);
  };

  const submitReport = async (reason: ReportReason, note?: string) => {
    setShowReportSheet(false);
    if (!args.postId) return;
    try {
      await reportService.reportPost(args.postId, reason, note);
      Alert.alert(
        "Report submitted",
        "Thanks for letting us know. Our team will review this post.",
      );
    } catch (e: any) {
      if (e?.response?.status === 409) {
        Alert.alert("Already reported", "You've already reported this post.");
      } else {
        Alert.alert("Couldn't submit report", "Please try again in a moment.");
      }
    }
  };

  const actions: PostAction[] = isOwn
    ? [
        {
          key: "share",
          icon: "arrow-redo-outline",
          label: "Share",
          onPress: handleShare,
        },
        ...(args.postId
          ? [
              {
                key: "visibility",
                icon: "eye-outline",
                label: "Edit Visibility",
                onPress: handleEditVisibility,
              } as PostAction,
            ]
          : []),
      ]
    : [
        {
          key: "follow",
          icon: args.viewerFollowsAuthor
            ? "person-remove-outline"
            : "person-add-outline",
          label: args.viewerFollowsAuthor ? "Unfollow" : "Follow",
          onPress: handleToggleFollow,
        },
        {
          key: "report",
          icon: "flag-outline",
          label: "Report",
          onPress: handleReport,
        },
        {
          key: "block",
          icon: "ban-outline",
          label: "Block",
          destructive: true,
          onPress: handleBlock,
        },
      ];

  const onPress = () => {
    if (isOwn) {
      if (args.postId) {
        setShowActionsSheet(true);
      } else {
        navigateToShare();
      }
      return;
    }

    if (!args.ownerUserId) {
      navigateToShare();
      return;
    }

    setShowActionsSheet(true);
  };

  return {
    onPress,
    actions,
    showActionsSheet,
    closeActionsSheet: () => setShowActionsSheet(false),
    onActionsSheetClosed,
    showVisibilitySheet,
    closeVisibilitySheet,
    pendingVisibility,
    handleVisibilitySelect,
    showReportSheet,
    closeReportSheet: () => setShowReportSheet(false),
    submitReport,
  };
}

import { useRef, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { followUser, unfollowUser } from "../api/userService";
import { blockUser } from "../api/followService";
import { GymLocation } from "../api/locationService";
import {
  deleteWorkout,
  updateWorkoutLocation,
  WorkoutLocationUpdate,
} from "../api/workoutService";
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
 * Own post:    Share, Edit Visibility, Delete (Delete keeps a native confirm).
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
  /**
   * Opt-in for the "Edit Location" own-post action. Surfaces that know the
   * post's current gym tag (the post cards) pass true along with locationId/
   * locationName and mount a LocationPicker driven by this hook's state;
   * surfaces without that data (DetailedHistory) leave it off.
   */
  canEditLocation?: boolean;
  locationId?: string | null;
  locationName?: string | null;
  /**
   * Called after the gym tag is changed or removed (null = untagged), so the
   * surface can update its own copy of the post before feeds refetch.
   */
  onLocationChanged?: (location: WorkoutLocationUpdate | null) => void;
  /**
   * Called after the workout behind this post is deleted. Surfaces that show
   * only this workout (the detail screen) pass a goBack here; feed surfaces
   * rely on the invalidateAll the hook already performs.
   */
  onDeleted?: () => void;
}) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { invalidateAll, patchPost } = useSocialFeed();

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

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  // The gym tag as last persisted to the server. Seeds the picker's
  // "currently selected" row and the remove-confirmation copy.
  const [savedLocation, setSavedLocation] =
    useState<WorkoutLocationUpdate | null>(
      args.locationId && args.locationName
        ? { locationId: args.locationId, locationName: args.locationName }
        : null,
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

  const handleEditLocation = () =>
    closeActionsThen(() => setShowLocationPicker(true));

  const applyLocation = async (gym: GymLocation | null) => {
    try {
      const updated = await updateWorkoutLocation(args.workoutId, gym);
      setSavedLocation(updated);
      if (args.postId) {
        patchPost(args.postId, {
          locationId: updated?.locationId ?? null,
          locationName: updated?.locationName ?? null,
        });
      }
      args.onLocationChanged?.(updated);
      invalidateAll();
    } catch {
      Alert.alert("Couldn't update", "Failed to update the location.");
    }
  };

  // The picker's own "Remove location" row fires with null; a removal is
  // destructive-ish (the tag is gone from the post) so it gets a native
  // confirm, which can present over the closing sheet (same as handleDelete).
  const handleLocationSelect = (gym: GymLocation | null) => {
    if (gym) {
      void applyLocation(gym);
      return;
    }
    if (!savedLocation) return;
    Alert.alert(
      "Remove location?",
      `This post will no longer be tagged at ${savedLocation.locationName}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void applyLocation(null),
        },
      ],
    );
  };

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

  // Native alerts can present over the RN sheet, so no closeActionsThen here
  // (same as handleBlock).
  const handleDelete = () => {
    setShowActionsSheet(false);
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWorkout(args.workoutId);
              invalidateAll();
              args.onDeleted?.();
            } catch (e: any) {
              Alert.alert("Couldn't delete", e?.message ?? "Unknown error");
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
        ...(args.postId && args.canEditLocation
          ? [
              {
                key: "location",
                icon: "location-outline",
                label: savedLocation ? "Edit Location" : "Add Location",
                onPress: handleEditLocation,
              } as PostAction,
            ]
          : []),
        {
          key: "delete",
          icon: "trash-outline",
          label: "Delete",
          destructive: true,
          onPress: handleDelete,
        },
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
      // Even without a postId (own workout that was never posted) the sheet
      // still offers Share and Delete, so always open it.
      setShowActionsSheet(true);
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
    showLocationPicker,
    closeLocationPicker: () => setShowLocationPicker(false),
    /** Seed for LocationPicker's `selected` — enables its remove row. */
    locationPickerSelected: savedLocation
      ? ({ name: savedLocation.locationName } as GymLocation)
      : null,
    handleLocationSelect,
  };
}

import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { followUser, getUserProfile, unfollowUser } from "../api/userService";
import { useAuth } from "../context/AuthContext";
import { useSocialFeed } from "../context/SocialFeedContext";

/**
 * Shared onPress handler for the ellipsis (3-dots) menu attached to any
 * workout surface: feed post card, compact post card, or DetailedHistory.
 *
 *   Viewer is owner → opens ShareWorkout modal (image share + delete).
 *   Viewer is not owner → fetches follow state for the owner, then shows
 *                         an Alert with Follow/Unfollow + Cancel.
 *
 * Pass `ownerUserId`/`ownerUsername` from the surface's data source:
 *   - FeedPost → post.userId / post.username
 *   - History card → omit both (workout always belongs to the viewer)
 *   - DetailedHistory → from route params (set by the caller that navigated)
 *
 * When `ownerUserId` is undefined, we treat the workout as the viewer's own.
 */
export function usePostMenu(args: {
  workoutId: string;
  ownerUserId?: string;
  ownerUsername?: string;
}) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { invalidate } = useSocialFeed();

  const isOwn =
    args.ownerUserId === undefined || args.ownerUserId === user?.userId;

  return async function onPress() {
    const target = (navigation as any).getParent?.() ?? (navigation as any);

    if (isOwn) {
      target.navigate("ShareWorkout", {
        workoutId: args.workoutId,
        ownerUserId: args.ownerUserId,
      });
      return;
    }

    // Need a username to look up the profile / show follow option.
    // If the caller didn't provide one, just fall back to ShareWorkout
    // (still useful — viewer can save/copy/share the image).
    if (!args.ownerUsername) {
      target.navigate("ShareWorkout", {
        workoutId: args.workoutId,
        ownerUserId: args.ownerUserId,
      });
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
    ]);
  };
}

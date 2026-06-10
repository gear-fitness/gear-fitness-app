import { FeedPost } from "../api/socialFeedApi";
import { UserProfile } from "../api/types";
import { getPendingWorkouts, PendingWorkout } from "./workoutQueue";

/**
 * Marker prefix that identifies a `FeedPost.postId` as a synthesized pending
 * post backed by the offline workout queue. The Profile screen merges these
 * with server-side posts so a workout the user finished offline still shows
 * up in their feed (with a "pending" loading bar) before it has been posted.
 */
export const PENDING_POST_PREFIX = "pending_post_";

export function isPendingPostId(postId: string): boolean {
  return postId.startsWith(PENDING_POST_PREFIX);
}

function buildSyntheticPost(
  pending: PendingWorkout,
  user: Pick<UserProfile, "userId" | "username" | "profilePictureUrl">,
): FeedPost | null {
  const sub = pending.submission;
  if (!sub.createPost) return null;
  const photoUrls = [
    ...(sub.photoUrls ?? []),
    ...pending.pendingPhotoUris,
  ];
  return {
    postId: `${PENDING_POST_PREFIX}${pending.id}`,
    workoutId: pending.id,
    imageUrl: sub.imageUrl ?? photoUrls[0],
    photoUrls,
    caption: sub.caption,
    createdAt: new Date(pending.createdAt).toISOString(),
    userId: user.userId,
    username: user.username,
    userProfilePictureUrl: user.profilePictureUrl ?? undefined,
    workoutName: sub.name,
    datePerformed: sub.datePerformed ?? new Date(pending.createdAt)
      .toISOString()
      .slice(0, 10),
    durationMin: sub.durationMin,
    bodyTags: sub.bodyTags,
    exerciseCount: sub.exercises.length,
    setCount: sub.exercises.reduce((n, ex) => n + ex.sets.length, 0),
    likeCount: 0,
    commentCount: 0,
    likedByCurrentUser: false,
  };
}

/**
 * Return the pending workout queue rendered as synthetic FeedPosts, newest
 * first. Only queue entries with `createPost = true` produce a post; offline
 * "save without posting" submissions stay invisible until they flush.
 */
export async function getPendingPosts(
  user: Pick<UserProfile, "userId" | "username" | "profilePictureUrl"> | null,
): Promise<FeedPost[]> {
  if (!user) return [];
  const pending = await getPendingWorkouts();
  const synthesized = pending
    .map((p) => buildSyntheticPost(p, user))
    .filter((p): p is FeedPost => p != null);
  return synthesized.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

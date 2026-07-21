import apiClient from "./apiClient";

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}
export interface FeedPost {
  postId: string;
  workoutId: string;
  imageUrl?: string;
  photoUrls?: string[];
  caption?: string;
  createdAt: string;
  userId: string;
  username: string;
  userProfilePictureUrl?: string;
  workoutName: string;
  datePerformed: string;
  durationMin?: number;
  bodyTags: string[];
  exerciseCount: number;
  setCount: number;
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
  visibility?: "PUBLIC" | "FRIENDS" | "PRIVATE";
  viewerFollowsAuthor?: boolean;
  locationId?: string | null;
  locationName?: string | null;
}

export interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  username: string;
  userProfilePictureUrl?: string;
  body: string;
  createdAt: string;
  /** Top-level parent comment id; null/absent for top-level comments. */
  parentCommentId?: string | null;
  /** Visible reply count; only populated for top-level comments. */
  replyCount?: number;
}

export const socialFeedApi = {
  getFeed: async (page: number, size: number = 20): Promise<Page<FeedPost>> => {
    const { data } = await apiClient.get("/feed", { params: { page, size } });
    return data;
  },

  getDiscoverFeed: async (
    page: number,
    size: number = 20,
  ): Promise<Page<FeedPost>> => {
    const { data } = await apiClient.get("/feed/discover", {
      params: { page, size },
    });
    return data;
  },

  getUserPosts: async (
    userId: string,
    page: number,
    size: number = 20,
  ): Promise<Page<FeedPost>> => {
    const { data } = await apiClient.get(`/feed/user/${userId}`, {
      params: { page, size },
    });
    return data;
  },

  getPost: async (postId: string): Promise<FeedPost> => {
    const { data } = await apiClient.get(`/feed/posts/${postId}`);
    return data;
  },

  // Posts tagged at one gym (discover-grade audience), for its location page.
  getLocationPosts: async (
    locationId: string,
    page: number,
    size: number = 20,
  ): Promise<Page<FeedPost>> => {
    const { data } = await apiClient.get(`/feed/location/${locationId}`, {
      params: { page, size },
    });
    return data;
  },

  toggleLike: async (
    postId: string,
  ): Promise<{ liked: boolean; likeCount: number }> => {
    const { data } = await apiClient.post(`/posts/${postId}/like`);
    return data;
  },

  getComments: async (
    postId: string,
    page: number = 0,
    size: number = 20,
  ): Promise<Page<Comment>> => {
    const { data } = await apiClient.get(`/posts/${postId}/comments`, {
      params: { page, size },
    });
    return data;
  },

  addComment: async (
    postId: string,
    body: string,
    parentCommentId?: string,
  ): Promise<Comment> => {
    const { data } = await apiClient.post(`/posts/${postId}/comments`, {
      body,
      parentCommentId: parentCommentId ?? null,
    });
    return data;
  },

  getReplies: async (
    postId: string,
    commentId: string,
    page: number = 0,
    size: number = 20,
  ): Promise<Page<Comment>> => {
    const { data } = await apiClient.get(
      `/posts/${postId}/comments/${commentId}/replies`,
      { params: { page, size } },
    );
    return data;
  },

  deleteComment: async (postId: string, commentId: string): Promise<void> => {
    await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
  },

  updatePostVisibility: async (
    postId: string,
    visibility: "PUBLIC" | "FRIENDS" | "PRIVATE",
  ): Promise<void> => {
    await apiClient.patch(`/feed/posts/${postId}/visibility`, { visibility });
  },
};

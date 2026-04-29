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
}

export interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
}

export const socialFeedApi = {
  getFeed: async (page: number, size: number = 20): Promise<Page<FeedPost>> => {
    const { data } = await apiClient.get("/feed", { params: { page, size } });
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
  toggleLike: async (postId: string): Promise<{ liked: boolean }> => {
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

  addComment: async (postId: string, body: string): Promise<Comment> => {
    const { data } = await apiClient.post(`/posts/${postId}/comments`, {
      body,
    });
    return data;
  },
};

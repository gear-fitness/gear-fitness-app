import { getAuthHeader } from "../utils/auth";

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
  caption?: string;
  createdAt: string;
  userId: string;
  username: string;
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
    const authHeader = await getAuthHeader();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/feed?page=${page}&size=${size}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      }
    );

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      throw new Error("Failed to fetch feed");
    }

    return response.json();
  },

  getUserPosts: async (userId: string, page: number, size: number = 20): Promise<Page<FeedPost>> => {
    const authHeader = await getAuthHeader();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/feed/user/${userId}?page=${page}&size=${size}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user posts");
    }

    return response.json();
  },
  toggleLike: async (postId: string): Promise<{ liked: boolean }> => {
    const authHeader = await getAuthHeader();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/posts/${postId}/like`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to toggle like");
    }

    return response.json();
  },

  getComments: async (
    postId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<Comment>> => {
    const authHeader = await getAuthHeader();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/posts/${postId}/comments?page=${page}&size=${size}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch comments");
    }

    return response.json();
  },

  addComment: async (postId: string, body: string): Promise<Comment> => {
    const authHeader = await getAuthHeader();
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/posts/${postId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to add comment");
    }

    return response.json();
  },
};

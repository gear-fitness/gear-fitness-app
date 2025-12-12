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
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
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
};

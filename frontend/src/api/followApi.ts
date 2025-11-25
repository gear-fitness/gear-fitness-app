import { getAuthHeader } from "../utils/auth";

export interface FollowResponse {
  followeeId: string;
  followeeUsername: string;
  status: "pending" | "accepted";
  message: string;
}
export const followApi = {
  followUser: async (username: string): Promise<FollowResponse> => {
    const authHeader = await getAuthHeader();

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/follow`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({ username }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to follow user");
    }

    return response.json();
  },
};

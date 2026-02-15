import apiClient from "./apiClient";
import {
  UserProfile,
  FollowerUser,
  FollowStatusResponse,
  FollowResponse,
} from "./types";

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get("/users/me/profile");
  return data;
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  const { data } = await apiClient.get(`/users/${username}`);
  return data;
}

export async function getUserFollowers(
  userId: string,
): Promise<FollowerUser[]> {
  const { data } = await apiClient.get(`/follows/${userId}/followers`);
  return data;
}

export async function getUserFollowing(
  userId: string,
): Promise<FollowerUser[]> {
  const { data } = await apiClient.get(`/follows/${userId}/following`);
  return data;
}

export async function followUser(userId: string): Promise<FollowResponse> {
  const { data } = await apiClient.post(`/follows/${userId}`);
  return data;
}

export async function followUserByUsername(
  username: string,
): Promise<FollowResponse> {
  const { data } = await apiClient.post(`/follows/username/${username}`);
  return data;
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiClient.delete(`/follows/${userId}`);
}

export async function checkFollowStatus(userId: string): Promise<boolean> {
  try {
    const { data } = await apiClient.get<FollowStatusResponse>(
      `/follows/${userId}/status`,
    );
    return data.isFollowing;
  } catch {
    return false;
  }
}

export async function updateUserProfile(
  heightInches?: number | null,
  weightLbs?: number | null,
  age?: number | null,
): Promise<any> {
  const { data } = await apiClient.put("/users/me", {
    heightInches,
    weightLbs,
    age,
  });
  return data;
}

export async function searchUsers(query: string) {
  const { data } = await apiClient.get(
    `/users/search?q=${encodeURIComponent(query)}`,
  );
  return data;
}

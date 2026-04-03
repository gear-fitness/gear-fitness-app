import apiClient from "./apiClient";
import {
  UserProfile,
  FollowerUser,
  FollowStatusResponse,
  FollowResponse,
  UsernameAvailabilityResponse,
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
  username?: string | null,
  displayName?: string | null,
  gender?: string | null,
): Promise<any> {
  const { data } = await apiClient.put("/users/me", {
    heightInches,
    weightLbs,
    age,
    username,
    displayName,
    gender,
  });
  return data;
}

export async function searchUsers(query: string) {
  const { data } = await apiClient.get("/users/search", {
    params: { q: query },
  });
  return data;
}

export async function checkUsernameAvailability(
  username: string,
): Promise<UsernameAvailabilityResponse> {
  const { data } = await apiClient.get("/users/username-availability", {
    params: { username },
  });
  return data;
}

/**
 * Upload a profile picture
 */
export async function uploadProfilePicture(imageUri: string): Promise<any> {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "profile.jpg",
  } as any);

  const { data } = await apiClient.post("/users/me/profile-picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Delete the current user's profile picture
 */
export async function deleteProfilePicture(): Promise<any> {
  const { data } = await apiClient.delete("/users/me/profile-picture");
  return data;
}

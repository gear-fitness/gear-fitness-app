import apiClient from "./apiClient";
import { uploadImageToS3 } from "./imageService";
import {
  UserProfile,
  FollowerUser,
  FollowStatusResponse,
  FollowResponse,
  SearchUserResult,
  UsernameAvailabilityResponse,
} from "./types";
import { getCurrentLocalDateString } from "../utils/date";

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get("/users/me/profile", {
    params: { localDate: getCurrentLocalDateString() },
  });
  return data;
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  const { data } = await apiClient.get(`/users/${username}`, {
    params: { localDate: getCurrentLocalDateString() },
  });
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

export async function updateUserPrivacy(isPrivate: boolean): Promise<void> {
  await apiClient.patch("/users/me/privacy", { isPrivate });
}

export async function searchUsers(query: string): Promise<SearchUserResult[]> {
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
 * Upload a profile picture via a presigned PUT (direct client-to-S3), mirroring
 * the post-image flow. The bytes never traverse the backend, so a WAF/proxy in
 * front of the API can't 403 the multipart body (which is what the old proxy
 * upload hit). Returns the updated user, including the new profilePictureUrl.
 */
export async function uploadProfilePicture(imageUri: string): Promise<any> {
  const contentType = "image/jpeg";
  // 1. Mint a deterministic key + presigned PUT url.
  const { data: presign } = await apiClient.post(
    "/users/me/profile-picture/upload-url",
    { contentType },
  );
  // 2. Upload the image bytes straight to S3.
  await uploadImageToS3(presign.uploadUrl, imageUri, contentType);
  // 3. Persist the key on the profile and return the updated user.
  const { data } = await apiClient.put("/users/me/profile-picture", {
    key: presign.key,
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

/**
 * Soft-delete the current user's account. The account is hidden immediately
 * and permanently deleted after 48 hours. Signing back in within that window
 * restores it.
 */
export async function deleteAccount(
  usernameConfirmation: string,
): Promise<void> {
  await apiClient.delete("/users/me", {
    data: { usernameConfirmation },
  });
}

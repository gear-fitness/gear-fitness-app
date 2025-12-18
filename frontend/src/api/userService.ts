/**
 * User service
 * API calls for user profile data, followers, and following
 */

import { getAuthHeader } from "../utils/auth";
import {
  UserProfile,
  FollowerUser,
  FollowStatusResponse,
  FollowResponse,
} from "./types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Get the current authenticated user's enhanced profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/users/me/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch profile: ${errorText}`);
  }

  return response.json();
}

/**
 * Get a user's enhanced profile by username
 */
export async function getUserProfile(username: string): Promise<UserProfile> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/users/${username}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch profile: ${errorText}`);
  }

  return response.json();
}

/**
 * Get the list of followers for a user
 */
export async function getUserFollowers(
  userId: string
): Promise<FollowerUser[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/follows/${userId}/followers`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch followers: ${errorText}`);
  }

  return response.json();
}

/**
 * Get the list of users that a user is following
 */
export async function getUserFollowing(
  userId: string
): Promise<FollowerUser[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/follows/${userId}/following`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch following: ${errorText}`);
  }

  return response.json();
}

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<FollowResponse> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/follows/${userId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to follow user: ${errorText}`);
  }

  return response.json();
}

/**
 * Follow a user by username
 */
export async function followUserByUsername(
  username: string
): Promise<FollowResponse> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/follows/username/${username}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to follow user: ${errorText}`);
  }

  return response.json();
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<void> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/follows/${userId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to unfollow user: ${errorText}`);
  }
}

/**
 * Check if the current user is following another user
 */
export async function checkFollowStatus(userId: string): Promise<boolean> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/follows/${userId}/status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    return false;
  }

  const data: FollowStatusResponse = await response.json();
  return data.isFollowing;
}

/**
 * Update the current user's profile with physical stats
 */
export async function updateUserProfile(
  heightInches: number,
  weightLbs: number,
  age: number
): Promise<any> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify({ heightInches, weightLbs, age }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update profile: ${errorText}`);
  }

  return response.json();
}

/**
 * Search users by username (partial match)
 */
export async function searchUsers(query: string) {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to search users: ${errorText}`);
  }

  return response.json();
}

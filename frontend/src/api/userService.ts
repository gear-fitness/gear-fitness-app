/**
 * User service
 * API calls for user profile data, followers, and following
 */

import { getAuthHeader } from '../utils/auth';
import { API_ENDPOINTS } from './config';
import {
  UserProfile,
  FollowerUser,
  FollowStatusResponse,
} from './types';

/**
 * Get the current authenticated user's enhanced profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile> {
  const authHeader = await getAuthHeader();

  const response = await fetch(API_ENDPOINTS.USER_ME_PROFILE, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
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

  const response = await fetch(API_ENDPOINTS.USER_BY_USERNAME(username), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
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
export async function getUserFollowers(userId: string): Promise<FollowerUser[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(API_ENDPOINTS.FOLLOWERS(userId), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch followers: ${errorText}`);
  }

  return response.json();
}

/**
 * Get the list of users that a user is following
 */
export async function getUserFollowing(userId: string): Promise<FollowerUser[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(API_ENDPOINTS.FOLLOWING(userId), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch following: ${errorText}`);
  }

  return response.json();
}

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<void> {
  const authHeader = await getAuthHeader();

  const response = await fetch(API_ENDPOINTS.FOLLOW_USER(userId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to follow user: ${errorText}`);
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<void> {
  const authHeader = await getAuthHeader();

  const response = await fetch(API_ENDPOINTS.UNFOLLOW_USER(userId), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
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

  const response = await fetch(API_ENDPOINTS.FOLLOW_STATUS(userId), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
  });

  if (!response.ok) {
    return false;
  }

  const data: FollowStatusResponse = await response.json();
  return data.isFollowing;
}

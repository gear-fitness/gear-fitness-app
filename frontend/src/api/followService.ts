/**
 * Follow service
 * API calls related to follow requests and follow approvals
 */

import { getAuthHeader } from "../utils/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Follow request / activity DTO
 */
export type FollowActivityDTO = {
  userId: string;
  username: string;
  createdAt?: string; // ISO timestamp (optional for backward compatibility)
};

/**
 * Get pending follow requests for the current authenticated user
 */
export async function getPendingFollowRequests(): Promise<FollowActivityDTO[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/follows/requests`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch follow requests: ${errorText}`);
  }

  return response.json();
}

/**
 * Accept a follow request
 */
export async function acceptFollowRequest(followerId: string): Promise<void> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/follows/requests/${followerId}/accept`,
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
    throw new Error(`Failed to accept follow request: ${errorText}`);
  }
}

/**
 * Decline a follow request
 */
export async function declineFollowRequest(followerId: string): Promise<void> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/follows/requests/${followerId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to decline follow request: ${errorText}`);
  }
}

/**
 * Get follow activity for the current authenticated user
 * (users who followed you)
 */
export async function getFollowActivity(): Promise<FollowActivityDTO[]> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/follows/activity`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch follow activity: ${errorText}`);
  }

  return response.json();
}

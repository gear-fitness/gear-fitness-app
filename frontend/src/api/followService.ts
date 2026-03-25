/**
 * Follow service
 * API calls related to follow requests and follow approvals
 */

import apiClient from "./apiClient";

/**
 * Follow request / activity DTO
 */
export type FollowActivityDTO = {
  userId: string;
  username: string;
  profilePictureUrl?: string;
  createdAt?: string; // ISO timestamp (optional for backward compatibility)
};

/**
 * Get pending follow requests for the current authenticated user
 */
export async function getPendingFollowRequests(): Promise<FollowActivityDTO[]> {
  const { data } = await apiClient.get("/follows/requests");
  return data;
}

/**
 * Accept a follow request
 */
export async function acceptFollowRequest(followerId: string): Promise<void> {
  await apiClient.post(`/follows/requests/${followerId}/accept`);
}

/**
 * Decline a follow request
 */
export async function declineFollowRequest(followerId: string): Promise<void> {
  await apiClient.delete(`/follows/requests/${followerId}`);
}

/**
 * Get follow activity for the current authenticated user
 * (users who followed you)
 */
export async function getFollowActivity(): Promise<FollowActivityDTO[]> {
  const { data } = await apiClient.get("/follows/activity");
  return data;
}

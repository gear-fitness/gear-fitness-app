/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

// TODO: Move to environment variable or app config
// Update this URL to match your backend server
export const API_BASE_URL = 'http://10.54.49.13:8080';

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_GOOGLE: `${API_BASE_URL}/api/auth/google`,

  // User Profile
  USER_ME: `${API_BASE_URL}/api/users/me`,
  USER_ME_PROFILE: `${API_BASE_URL}/api/users/me/profile`,
  USER_BY_USERNAME: (username: string) => `${API_BASE_URL}/api/users/${username}`,

  // Follow
  FOLLOW_USER: (userId: string) => `${API_BASE_URL}/api/follows/${userId}`,
  UNFOLLOW_USER: (userId: string) => `${API_BASE_URL}/api/follows/${userId}`,
  FOLLOWERS: (userId: string) => `${API_BASE_URL}/api/follows/${userId}/followers`,
  FOLLOWING: (userId: string) => `${API_BASE_URL}/api/follows/${userId}/following`,
  FOLLOW_STATUS: (userId: string) => `${API_BASE_URL}/api/follows/${userId}/status`,
};

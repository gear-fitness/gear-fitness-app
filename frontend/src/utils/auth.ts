/**
 * Authentication utilities
 * Helper functions for managing JWT tokens
 */

import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * Store both access and refresh tokens
 */
export async function storeTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Get the authentication token from SecureStore
 * @returns The JWT token or null if not found
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return token;
  } catch (error) {
    console.error("Error retrieving access token:", error);
    return null;
  }
}

/** Get refresh token */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    return null;
  }
}

/**
 * Get the authorization header with Bearer token
 * @returns Object with Authorization header or empty object if no token
 */
export async function getAuthHeader(): Promise<{ Authorization?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

/** Clear all auth tokens */
export async function clearAuthTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Error clearing auth tokens:", error);
  }
}

/** Check if user has tokens stored */
export async function hasStoredTokens(): Promise<boolean> {
  const accessToken = await getAccessToken();
  return accessToken !== null;
}

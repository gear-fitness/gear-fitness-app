/**
 * Authentication utilities
 * Helper functions for managing JWT tokens
 */

import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "authToken";

/**
 * Store JWT token securely
 */
export async function storeToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error("Failed to store token:", error);
    throw new Error("Failed to store authentication token");
  }
}

/**
 * Get the authentication token from SecureStore
 * @returns The JWT token or null if not found
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error("Error retrieving auth token:", error);
    return null;
  }
}

/**
 * Get the authorization header with Bearer token
 * @returns Object with Authorization header or empty object if no token
 */
export async function getAuthHeader(): Promise<{ Authorization?: string }> {
  const token = await getAuthToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Save the authentication token to SecureStore
 * @param token The JWT token to save
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error("Error saving auth token:", error);
  }
}

/**
 * Remove the authentication token from SecureStore
 */
export async function clearAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Error clearing auth token:", error);
  }
}

/**
 * Check if user is authenticated (has valid token)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null;
}

/**
 * Authentication utilities
 * Helper functions for managing JWT tokens
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "authToken";

/**
 * Get the authentication token from AsyncStorage
 * @returns The JWT token or null if not found
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
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
 * Save the authentication token to AsyncStorage
 * @param token The JWT token to save
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error("Error saving auth token:", error);
  }
}

/**
 * Remove the authentication token from AsyncStorage
 */
export async function clearAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Error clearing auth token:", error);
  }
}

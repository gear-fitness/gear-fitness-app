/**
 * Authentication service
 * API calls for Google login
 */

import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface GoogleLoginResponse {
  token: string;
  refreshToken: string;
  user: any;
  newUser: boolean;
}

export async function loginWithGoogle(
  idToken: string,
): Promise<GoogleLoginResponse> {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/google`, {
      idToken,
    });
    return data;
  } catch (error) {
    console.error("Error in loginWithGoogle:", error);
    throw error;
  }
}

export async function logoutFromServer(refreshToken: string): Promise<void> {
  try {
    await axios.post(`${API_BASE_URL}/api/auth/logout`, { refreshToken });
  } catch (error) {
    console.error("Error in logout:", error);
  }
}

/**
 * Authentication service
 * API calls for Google login
 */

import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export type GoogleAuthIntent = "sign_in" | "sign_up";

interface GoogleLoginResponse {
  token: string;
  refreshToken: string;
  user: any;
  newUser: boolean;
  error?: string;
  errorCode?: string;
}

export class AuthApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
  }
}

export async function loginWithGoogle(
  idToken: string,
  intent: GoogleAuthIntent,
): Promise<GoogleLoginResponse> {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/google`, {
      idToken,
      intent,
    });
    if (data?.error) {
      throw new AuthApiError(data.error, data.errorCode);
    }
    return data;
  } catch (error: any) {
    const responseData = error?.response?.data;
    if (responseData?.error) {
      throw new AuthApiError(
        responseData.error,
        responseData.errorCode,
        error?.response?.status,
      );
    }
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

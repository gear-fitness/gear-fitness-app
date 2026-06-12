/**
 * Authentication service
 * API calls for Google login
 */

import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export type GoogleAuthIntent = "sign_in" | "sign_up";
export type AppleAuthIntent = "sign_in" | "sign_up";

interface GoogleLoginResponse {
  token?: string;
  refreshToken?: string;
  user?: any;
  newUser?: boolean;
  error?: string;
  errorCode?: string;
  accountPendingDeletion?: boolean;
  deletedAt?: string;
  accountExistsForLinking?: boolean; // new
  existingProvider?: string; // new
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

export interface SignUpProfile {
  username?: string | null;
  displayName?: string | null;
  gender?: string | null;
  heightInches?: number | null;
  weightLbs?: number | null;
  age?: number | null;
}

export interface AppleSignUpProfile extends SignUpProfile {
  // Inherits username, displayName, gender, heightInches, weightLbs, age
}

interface AppleLoginParams {
  identityToken: string;
  appleUserId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  intent: AppleAuthIntent;
  confirmRestore?: boolean;
  confirmLink?: boolean;
  profile?: AppleSignUpProfile;
}

export async function loginWithApple(
  params: AppleLoginParams,
): Promise<GoogleLoginResponse> {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/apple`, {
      identityToken: params.identityToken,
      appleUserId: params.appleUserId,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      intent: params.intent,
      confirmRestore: params.confirmRestore,
      confirmLink: params.confirmLink,
      ...(params.profile ?? {}),
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
    console.error("Error in loginWithApple:", error);
    throw error;
  }
}

export async function loginWithGoogle(
  idToken: string,
  intent: GoogleAuthIntent,
  confirmRestore?: boolean,
  profile?: SignUpProfile,
): Promise<GoogleLoginResponse> {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/google`, {
      idToken,
      intent,
      confirmRestore,
      ...(profile ?? {}),
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

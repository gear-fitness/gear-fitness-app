/**
 * Authentication service
 * API calls for Google login
 */

interface GoogleLoginResponse {
  token: string;
  user: any;
  newUser: boolean;
}

export async function loginWithGoogle(
  idToken: string
): Promise<GoogleLoginResponse> {
  try {
    const response = await fetch("http://10.54.49.13:8080/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error(`Login failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in loginWithGoogle:", error);
    throw error;
  }
}

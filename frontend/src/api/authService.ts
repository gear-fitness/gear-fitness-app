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
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const endpoint = `${apiUrl}/api/auth/google`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend returned error:", errorText);
      throw new Error(`Login failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in loginWithGoogle:", error);
    throw error;
  }
}

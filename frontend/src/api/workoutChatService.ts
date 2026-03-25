/**
 * Workout Chat service
 * API calls for AI chat about general workout / exercise topics
 */
import apiClient from "./apiClient";

export interface ChatMessage {
  text: string;
  isUser: boolean;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  response: string;
}

/**
 * Send a chat message to the general workout assistant
 */
export async function sendWorkoutChat(
  messages: ChatMessage[],
): Promise<ChatResponse> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/api/workout-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat failed: ${errorText}`);
  }

  return response.json();
}

/**
 * Exercise Chat service
 * API calls for AI chat about exercises
 */

import { getAuthHeader } from "../utils/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

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
 * Send a chat message about a specific exercise
 */
export async function sendExerciseChat(
  exerciseId: string,
  messages: ChatMessage[]
): Promise<ChatResponse> {
  const authHeader = await getAuthHeader();

  const response = await fetch(
    `${API_BASE_URL}/api/exercises/${exerciseId}/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ messages }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat failed: ${errorText}`);
  }

  return response.json();
}

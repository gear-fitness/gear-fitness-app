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

export async function sendExerciseChat(
  messages: ChatMessage[],
  exerciseId?: string,
): Promise<ChatResponse> {
  const authHeader = await getAuthHeader();

  const endpoint = exerciseId
    ? `${API_BASE_URL}/api/exercises/${exerciseId}/chat`
    : `${API_BASE_URL}/api/exercises/chat`;

  const response = await fetch(endpoint, {
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

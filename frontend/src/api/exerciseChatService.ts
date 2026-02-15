/**
 * Exercise Chat service
 * API calls for AI chat about exercises
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
 * Send a chat message about a specific exercise
 */
export async function sendExerciseChat(
  exerciseId: string,
  messages: ChatMessage[],
): Promise<ChatResponse> {
  const { data } = await apiClient.post(`/exercises/${exerciseId}/chat`, {
    messages,
  });
  return data;
}

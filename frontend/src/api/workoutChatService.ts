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
  const { data } = await apiClient.post<ChatResponse>("/workout-chat", {
    messages,
  });
  return data;
}

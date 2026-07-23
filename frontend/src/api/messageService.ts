import apiClient from "./apiClient";
import { Page } from "./socialFeedApi";

/**
 * Direct-message DTOs — mirror the backend records in
 * com.gearfitness.gear_api.dto (MessageDTO, ConversationDTO, ...). Kept in sync
 * by hand, per the project convention (no generated types).
 */

export type ConversationType = "DIRECT" | "GROUP";
export type ParticipantState = "ACCEPTED" | "PENDING";
export type ParticipantRole = "MEMBER" | "ADMIN";

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderProfilePictureUrl?: string | null;
  content: string | null;
  mediaKeys: string[];
  createdAt: string;
  editedAt?: string | null;
  deleted: boolean;
  clientNonce?: string | null;
}

export interface ConversationParticipant {
  userId: string;
  username: string;
  displayName?: string | null;
  profilePictureUrl?: string | null;
  role: ParticipantRole;
  state: ParticipantState;
  lastReadMessageId?: string | null;
}

export interface Conversation {
  conversationId: string;
  type: ConversationType;
  title?: string | null;
  imageKey?: string | null;
  createdBy: string;
  createdAt: string;
  lastMessageAt?: string | null;
  myState: ParticipantState;
  myRole: ParticipantRole;
  muted: boolean;
  unreadCount: number;
  participants: ConversationParticipant[];
  lastMessage?: Message | null;
}

export interface SendMessagePayload {
  content?: string;
  mediaKeys?: string[];
  clientNonce?: string;
}

export const messageService = {
  // ---- conversations ----
  getInbox: async (
    page: number,
    size: number = 20,
  ): Promise<Page<Conversation>> => {
    const { data } = await apiClient.get("/conversations", {
      params: { page, size },
    });
    return data;
  },

  getRequests: async (
    page: number,
    size: number = 20,
  ): Promise<Page<Conversation>> => {
    const { data } = await apiClient.get("/conversations/requests", {
      params: { page, size },
    });
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get("/conversations/unread-count");
    return data.count ?? 0;
  },

  getRequestCount: async (): Promise<number> => {
    const { data } = await apiClient.get("/conversations/request-count");
    return data.count ?? 0;
  },

  createConversation: async (
    participantIds: string[],
    title?: string,
  ): Promise<Conversation> => {
    const { data } = await apiClient.post("/conversations", {
      participantIds,
      title,
    });
    return data;
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const { data } = await apiClient.get(`/conversations/${conversationId}`);
    return data;
  },

  /**
   * Resolve an existing 1:1 thread with another user without creating one — used
   * to show prior history the moment a draft opens. Returns null when there's no
   * existing thread (the endpoint responds 204).
   */
  findDirect: async (otherUserId: string): Promise<Conversation | null> => {
    const { data } = await apiClient.get(
      `/conversations/direct/${otherUserId}`,
    );
    return data && data.conversationId ? data : null;
  },

  accept: async (conversationId: string): Promise<Conversation> => {
    const { data } = await apiClient.post(
      `/conversations/${conversationId}/accept`,
    );
    return data;
  },

  decline: async (conversationId: string): Promise<void> => {
    await apiClient.post(`/conversations/${conversationId}/decline`);
  },

  leave: async (conversationId: string): Promise<void> => {
    await apiClient.post(`/conversations/${conversationId}/leave`);
  },

  /**
   * Delete the chat for the current user only. The thread stays intact for
   * everyone else and returns to your inbox if a new message arrives — this is
   * not the same as leaving a group.
   */
  deleteForMe: async (conversationId: string): Promise<void> => {
    await apiClient.delete(`/conversations/${conversationId}`);
  },

  /** Mute/unmute the conversation for the current user (silences push only). */
  setMuted: async (conversationId: string, muted: boolean): Promise<void> => {
    await apiClient.post(`/conversations/${conversationId}/mute`, { muted });
  },

  addParticipants: async (
    conversationId: string,
    userIds: string[],
  ): Promise<Conversation> => {
    const { data } = await apiClient.post(
      `/conversations/${conversationId}/participants`,
      { userIds },
    );
    return data;
  },

  removeParticipant: async (
    conversationId: string,
    targetUserId: string,
  ): Promise<void> => {
    await apiClient.delete(
      `/conversations/${conversationId}/participants/${targetUserId}`,
    );
  },

  updateGroup: async (
    conversationId: string,
    update: { title?: string; imageKey?: string },
  ): Promise<Conversation> => {
    const { data } = await apiClient.patch(
      `/conversations/${conversationId}`,
      update,
    );
    return data;
  },

  // ---- messages ----
  getMessages: async (
    conversationId: string,
    page: number,
    size: number = 30,
  ): Promise<Page<Message>> => {
    const { data } = await apiClient.get(
      `/conversations/${conversationId}/messages`,
      { params: { page, size } },
    );
    return data;
  },

  sendMessage: async (
    conversationId: string,
    payload: SendMessagePayload,
  ): Promise<Message> => {
    const { data } = await apiClient.post(
      `/conversations/${conversationId}/messages`,
      payload,
    );
    return data;
  },

  markRead: async (
    conversationId: string,
    lastReadMessageId?: string,
  ): Promise<void> => {
    await apiClient.post(`/conversations/${conversationId}/messages/read`, {
      lastReadMessageId,
    });
  },
};

import apiClient from "./apiClient";

export interface NotificationDTO {
  notificationId: string;
  type: string;
  actorUsername: string;
  postId?: string;
  workoutId?: string | null;
  commentBody?: string;
  createdAt: string;
  isRead: boolean;
}

export const notificationService = {
  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<number>("/notifications/unread-count");
    return data;
  },

  getNotifications: async (): Promise<NotificationDTO[]> => {
    const { data } = await apiClient.get<NotificationDTO[]>("/notifications");
    return data;
  },

  markNotificationsRead: async (): Promise<void> => {
    await apiClient.post("/notifications/mark-read");
  },

  registerToken: async (pushToken: string): Promise<void> => {
    await apiClient.post("/notifications/token", { token: pushToken });
  },

  unregisterToken: async (): Promise<void> => {
    await apiClient.delete("/notifications/token");
  },
};

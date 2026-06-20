import apiClient from "./apiClient";
import { getDeviceTimeZone } from "../utils/date";

export interface NotificationDTO {
  notificationId: string;
  type: string;
  actorUserId?: string;
  actorUsername: string;
  actorProfilePictureUrl?: string | null;
  postId?: string;
  workoutId?: string | null;
  postImageUrl?: string | null;
  commentBody?: string;
  focusCommentId?: string | null;
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

  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  registerToken: async (pushToken: string): Promise<void> => {
    await apiClient.post("/notifications/token", {
      token: pushToken,
      timeZone: getDeviceTimeZone(),
    });
  },

  unregisterToken: async (): Promise<void> => {
    await apiClient.delete("/notifications/token");
  },
};

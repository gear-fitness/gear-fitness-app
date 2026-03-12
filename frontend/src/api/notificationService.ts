import { getAuthHeader } from "../utils/auth";

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
    const authHeader = await getAuthHeader();

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/notifications/unread-count`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch unread count");
    }

    return response.json();
  },

  getNotifications: async (): Promise<NotificationDTO[]> => {
    const authHeader = await getAuthHeader();

    console.log(
      "Calling:",
      `${process.env.EXPO_PUBLIC_API_URL}/api/notifications`,
    );
    console.log("Auth header:", authHeader);

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/notifications`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      },
    );

    console.log("Status:", response.status);

    const text = await response.text();
    console.log("Response body:", text);

    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }

    return JSON.parse(text);
  },

  markNotificationsRead: async (): Promise<void> => {
    const authHeader = await getAuthHeader();

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/notifications/mark-read`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to mark notifications read");
    }
  },
};

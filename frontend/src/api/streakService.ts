import apiClient from "./apiClient";
import { getCurrentLocalDateString } from "../utils/date";

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  restoreTokensRemaining: number;
  todayLogged: boolean;
  lastStreakDate: string | null;
}

export const streakService = {
  getStreakInfo: async (): Promise<StreakInfo> => {
    const { data } = await apiClient.get<StreakInfo>("/streaks/info", {
      params: { localDate: getCurrentLocalDateString() },
    });
    return data;
  },

  logRestDay: async (): Promise<StreakInfo> => {
    const { data } = await apiClient.post<StreakInfo>(
      "/streaks/rest-day",
      null,
      { params: { localDate: getCurrentLocalDateString() } },
    );
    return data;
  },

  useRestoreToken: async (): Promise<StreakInfo> => {
    const { data } = await apiClient.post<StreakInfo>(
      "/streaks/restore",
      null,
      { params: { localDate: getCurrentLocalDateString() } },
    );
    return data;
  },
};

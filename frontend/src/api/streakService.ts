import apiClient from "./apiClient";

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  restoreTokensRemaining: number;
  todayLogged: boolean;
  lastStreakDate: string | null;
}

export const streakService = {
  getStreakInfo: async (): Promise<StreakInfo> => {
    const { data } = await apiClient.get<StreakInfo>("/streaks/info");
    return data;
  },

  logRestDay: async (): Promise<StreakInfo> => {
    const { data } = await apiClient.post<StreakInfo>("/streaks/rest-day");
    return data;
  },

  useRestoreToken: async (): Promise<StreakInfo> => {
    const { data } = await apiClient.post<StreakInfo>("/streaks/restore");
    return data;
  },
};

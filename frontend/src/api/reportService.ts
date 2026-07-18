import apiClient from "./apiClient";

export type ReportReason =
  | "NUDITY"
  | "SPAM"
  | "HARASSMENT"
  | "VIOLENCE"
  | "OTHER";

export const reportService = {
  reportPost: async (
    postId: string,
    reason: ReportReason,
    note?: string,
  ): Promise<void> => {
    await apiClient.post("/reports", {
      postId,
      reason,
      note: note?.trim() ? note.trim() : null,
    });
  },

  reportComment: async (
    commentId: string,
    reason: ReportReason,
    note?: string,
  ): Promise<void> => {
    await apiClient.post("/comment-reports", {
      commentId,
      reason,
      note: note?.trim() ? note.trim() : null,
    });
  },
};

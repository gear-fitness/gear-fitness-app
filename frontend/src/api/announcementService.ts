import Constants from "expo-constants";
import apiClient from "./apiClient";

export interface AnnouncementFeature {
  icon?: string;
  title: string;
  body?: string;
}

export interface Announcement {
  id: string;
  title: string;
  /** Optional footnote / intro paragraph shown below the feature rows. */
  body: string | null;
  /** SF Symbol name for the hero. */
  icon: string;
  features: AnnouncementFeature[] | null;
  ctaLabel: string;
  ctaRoute: string;
  ctaParams: Record<string, unknown> | null;
}

interface AnnouncementDTO {
  announcementId: string;
  title: string;
  body: string | null;
  icon: string;
  features: string | null;
  ctaLabel: string;
  ctaRoute: string;
  ctaParams: string | null;
}

export type AnnouncementEventType = "IMPRESSION" | "CTA" | "DISMISS";

/**
 * The newest announcement the current user should see, or null. Every
 * failure path (network, 204, malformed JSON in features/ctaParams) returns
 * null: a marketing popup must never break launch.
 */
export async function getPendingAnnouncement(): Promise<Announcement | null> {
  try {
    const appVersion = Constants.expoConfig?.version;
    const response = await apiClient.get<AnnouncementDTO>(
      "/announcements/pending",
      { params: appVersion ? { appVersion } : undefined },
    );
    if (response.status === 204 || !response.data) return null;

    const dto = response.data;
    if (!dto.announcementId || !dto.title || !dto.ctaLabel || !dto.ctaRoute) {
      return null;
    }

    let features: AnnouncementFeature[] | null = null;
    if (dto.features) {
      const parsed = JSON.parse(dto.features);
      if (!Array.isArray(parsed)) return null;
      features = parsed.filter(
        (f): f is AnnouncementFeature =>
          !!f && typeof f === "object" && typeof f.title === "string",
      );
    }

    let ctaParams: Record<string, unknown> | null = null;
    if (dto.ctaParams) {
      const parsed = JSON.parse(dto.ctaParams);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }
      ctaParams = parsed;
    }

    return {
      id: dto.announcementId,
      title: dto.title,
      body: dto.body ?? null,
      icon: dto.icon || "sparkles",
      features,
      ctaLabel: dto.ctaLabel,
      ctaRoute: dto.ctaRoute,
      ctaParams,
    };
  } catch {
    return null;
  }
}

/** Fire-and-forget interaction event; errors are swallowed. */
export async function postAnnouncementEvent(
  announcementId: string,
  type: AnnouncementEventType,
): Promise<void> {
  try {
    await apiClient.post(`/announcements/${announcementId}/events`, { type });
  } catch {
    // Best effort only. The server dedupes, so retrying is pointless.
  }
}

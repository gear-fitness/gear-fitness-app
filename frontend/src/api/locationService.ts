/**
 * Location service
 * Gym search for the workout location picker. The backend proxies Google
 * Places and degrades to its own gym table, so results may or may not carry
 * a googlePlaceId.
 */

import apiClient from "./apiClient";

// Shape shared by search results, the WorkoutComplete selection, the recents
// store, and the submission payload's `location` field — a picked result is
// submitted as-is and the backend find-or-creates the gym row.
export interface GymLocation {
  googlePlaceId?: string | null;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function searchLocations(
  query: string,
  coords?: { latitude: number; longitude: number },
): Promise<GymLocation[]> {
  const params: Record<string, string | number> = {};
  if (query) params.query = query;
  if (coords) {
    params.lat = coords.latitude;
    params.lng = coords.longitude;
  }
  const response = await apiClient.get<GymLocation[]>("/locations/search", {
    params,
  });
  return response.data;
}

// One gym row in the Social tab's location search results.
export interface TaggedLocation {
  locationId: string;
  name: string;
  address?: string | null;
  postCount: number;
}

// Header data for a gym's location page.
export interface LocationPageInfo {
  locationId: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  postCount: number;
  athleteCount: number;
}

// Social search: only gyms that have at least one publicly visible post,
// ranked by post count (distinct from searchLocations, the picker's
// Places-backed lookup of any gym in the world).
export async function searchTaggedLocations(
  query: string,
): Promise<TaggedLocation[]> {
  const response = await apiClient.get<TaggedLocation[]>(
    "/locations/tagged-search",
    { params: { query } },
  );
  return response.data;
}

export async function getLocationPage(
  locationId: string,
): Promise<LocationPageInfo> {
  const response = await apiClient.get<LocationPageInfo>(
    `/locations/${locationId}`,
  );
  return response.data;
}

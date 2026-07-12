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

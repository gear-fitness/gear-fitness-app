import AsyncStorage from "@react-native-async-storage/async-storage";

const SEEN_KEY = "@announcement_seen_ids_v1";
const MAX_SEEN_IDS = 20;

/**
 * Local shortcut for "already dismissed this announcement". The server-side
 * dismiss/CTA events are the source of truth (they cover reinstalls and
 * second devices); this just avoids re-presenting within the same install
 * when the network beats the event write.
 */
export async function hasSeenAnnouncement(id: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw);
    return Array.isArray(ids) && ids.includes(id);
  } catch {
    return false;
  }
}

export async function markAnnouncementSeen(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const ids: string[] = Array.isArray(parsed) ? parsed : [];
    const next = [...ids.filter((x) => x !== id), id].slice(-MAX_SEEN_IDS);
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    // Silently ignore. Worst case the server-side seen check catches it.
  }
}

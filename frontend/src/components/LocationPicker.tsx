import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as Location from "expo-location";
import { GymLocation, searchLocations } from "../api/locationService";
import { getRecentGyms } from "../utils/locationRecents";
import { BottomSheet } from "./BottomSheet";
import { SearchBar } from "./SearchBar";
import { Text } from "./Text";

const SEARCH_DEBOUNCE_MS = 400;
const DESTRUCTIVE = "#C93838";

type Coords = { latitude: number; longitude: number };

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Currently tagged gym, if any — shows the "Remove location" row. */
  selected: GymLocation | null;
  /** Fires with the picked gym, or null when the tag is removed. */
  onSelect: (gym: GymLocation | null) => void;
}

/**
 * Bottom-sheet gym picker for WorkoutComplete. With no query it shows recent
 * gyms (AsyncStorage) and nearby gyms (GPS, when permitted); typing runs a
 * debounced backend search. Location permission is requested lazily on first
 * open, and a denial just means no "Nearby" section — text search still
 * works, so the sheet never nags.
 */
export function LocationPicker({
  visible,
  onClose,
  selected,
  onSelect,
}: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<GymLocation[]>([]);
  const [nearby, setNearby] = useState<GymLocation[]>([]);
  // null = no active search (show recents/nearby); [] = search ran, no hits.
  const [results, setResults] = useState<GymLocation[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const coordsRef = useRef<Coords | null>(null);
  // One permission+GPS+nearby fetch per mount; reopening the sheet reuses it.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    void getRecentGyms().then(setRecents);
    if (initializedRef.current) return;
    initializedRef.current = true;
    void initializeNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const initializeNearby = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        return;
      }
      // Last-known fix is instant and plenty for "which gyms are near me";
      // fall back to a fresh low-accuracy read only when there is none.
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        }));
      coordsRef.current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setNearby(await searchLocations("", coordsRef.current));
    } catch (err) {
      console.error("Failed to load nearby gyms:", err);
    }
  };

  // Debounced search so the backend (and the paid Places path behind it)
  // sees one call per pause in typing, not one per keystroke.
  useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (!q) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        setResults(await searchLocations(q, coordsRef.current ?? undefined));
      } catch (err) {
        console.error("Gym search failed:", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, visible]);

  const pick = (gym: GymLocation | null) => {
    onSelect(gym);
    setQuery("");
    onClose();
  };

  const trimmedQuery = query.trim();
  // Offer manual entry unless a result already matches the typed name — the
  // escape hatch for gyms Google doesn't know.
  const showManualAdd =
    trimmedQuery.length > 0 &&
    !searching &&
    !(results ?? []).some(
      (g) => g.name.trim().toLowerCase() === trimmedQuery.toLowerCase(),
    );

  const renderRow = (gym: GymLocation, key: string) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.7}
      style={styles.row}
      onPress={() => pick(gym)}
    >
      <Ionicons name="location-outline" size={20} color={colors.text} />
      <View style={styles.rowText}>
        <Text
          style={[styles.rowName, { color: colors.text }]}
          numberOfLines={1}
        >
          {gym.name}
        </Text>
        {gym.address ? (
          <Text
            style={[styles.rowAddress, { color: colors.border }]}
            numberOfLines={1}
          >
            {gym.address}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const sectionHeader = (label: string) => (
    <Text style={[styles.sectionHeader, { color: colors.border }]}>
      {label}
    </Text>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      bodyDrag={false}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Add location</Text>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search gyms"
          returnKeyType="search"
        />
        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {selected && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.row}
              onPress={() => pick(null)}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color={DESTRUCTIVE}
              />
              <Text style={[styles.rowName, { color: DESTRUCTIVE }]}>
                Remove location
              </Text>
            </TouchableOpacity>
          )}

          {results === null ? (
            <>
              {recents.length > 0 && (
                <>
                  {sectionHeader("RECENT")}
                  {recents.map((g, i) => renderRow(g, `recent-${i}`))}
                </>
              )}
              {nearby.length > 0 && (
                <>
                  {sectionHeader("NEARBY")}
                  {nearby.map((g, i) => renderRow(g, `nearby-${i}`))}
                </>
              )}
              {locationDenied && nearby.length === 0 && (
                <Text style={[styles.hint, { color: colors.border }]}>
                  Allow location access to see gyms near you, or search by name.
                </Text>
              )}
            </>
          ) : (
            <>
              {searching && results.length === 0 ? (
                <ActivityIndicator style={styles.spinner} />
              ) : (
                results.map((g, i) => renderRow(g, `result-${i}`))
              )}
              {showManualAdd && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.row}
                  onPress={() => pick({ name: trimmedQuery })}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={[styles.rowName, { color: colors.text }]}>
                    Add "{trimmedQuery}"
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
        {/* Required attribution: gym results come from Google Places. */}
        <Text style={[styles.attribution, { color: colors.border }]}>
          Search powered by Google
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 2,
  },
  list: {
    maxHeight: 320,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  rowAddress: {
    fontSize: 12,
    marginTop: 1,
  },
  hint: {
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  spinner: {
    marginTop: 16,
  },
  attribution: {
    fontSize: 10,
    textAlign: "center",
  },
});

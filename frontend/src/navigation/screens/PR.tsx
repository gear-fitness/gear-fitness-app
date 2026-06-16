import {
  Text,
  Image,
  StyleSheet,
  View,
  Dimensions,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import bench from "../../assets/bench.png";
import squat from "../../assets/squat.png";
import deadlift from "../../assets/deadlift.png";
import {
  getCachedPersonalRecords,
  getUserPersonalRecords,
} from "../../api/workoutService";
import { PersonalRecord } from "../../api/types";
import { useTrackTab } from "../../hooks/useTrackTab";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { subscribeOnlineStatus } from "../../utils/network";
import { useUnitPreference } from "../../context/UnitPreferenceContext";
import { toDisplayWeight } from "../../utils/weight";

type RootStackParamList = {
  PR: { userId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "PR">;

export function PR({ route }: Props) {
  useTrackTab("PR");

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { userId } = route.params;

  const { weightUnit } = useUnitPreference();
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Paint from the offline cache while the live request is in flight. Stops
  // the loading spinner from blocking the screen when the device is offline.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedPersonalRecords(userId);
      if (!cancelled && cached.length > 0) {
        setPrs((prev) => (prev.length === 0 ? cached : prev));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const fetchPRs = React.useCallback(async () => {
    try {
      const data = await getUserPersonalRecords(userId);
      setPrs(data);
    } catch (err: any) {
      console.error("Error loading PRs:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  // Refresh when connectivity returns so newly-set PRs (from a queued
  // offline workout that just synced) show up without manual reload.
  useEffect(() => {
    return subscribeOnlineStatus((online) => {
      if (online) fetchPRs();
    });
  }, [fetchPRs]);

  const getImageForExercise = (exerciseName: string) => {
    if (exerciseName === "Bench Press") return bench;
    if (exerciseName === "Squat") return squat;
    if (exerciseName === "Deadlift") return deadlift;
    return bench;
  };

  const formatPR = (pr: PersonalRecord) => {
    if (pr.maxWeight === 0 || !pr.maxWeight) {
      return `${pr.exerciseName.toUpperCase()}\nNo PR recorded yet`;
    }

    // maxWeight is canonical lbs from the backend — convert to the user's unit.
    const weight = Math.round(toDisplayWeight(pr.maxWeight, weightUnit));

    return `${pr.exerciseName.toUpperCase()}\n${weight} ${weightUnit.toUpperCase()} x ${
      pr.repsAtMaxWeight
    } REPS\n${pr.dateAchieved || ""}`;
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: isDark ? "#121212" : "#fff" },
        ]}
      >
        <FloatingCloseButton direction="left" accessibilityLabel="Back" />
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
        <Text style={[styles.loadingText, { color: isDark ? "#fff" : "#000" }]}>
          Loading PRs...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#121212" : "#fff",
          paddingTop: insets.top + 60,
        },
      ]}
    >
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      {prs.map((pr, index) => (
        <View
          key={index}
          style={[styles.row, { borderColor: isDark ? "#555" : "#ccc" }]}
        >
          {/* Left cell with image */}
          <View
            style={[
              styles.cell,
              { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
            ]}
          >
            <Image
              source={getImageForExercise(pr.exerciseName)}
              style={[styles.image, { tintColor: isDark ? "#fff" : "#000" }]}
            />
          </View>

          {/* Right cell with PR text */}
          <View
            style={[
              styles.cell,
              { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
            ]}
          >
            <View
              style={[
                styles.textContainer,
                {
                  backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0",
                },
              ]}
            >
              <Text
                style={[styles.prText, { color: isDark ? "#fff" : "#000" }]}
              >
                {formatPR(pr)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const screenWidth = Dimensions.get("window").width;
const columnWidth = screenWidth / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1,
  },
  cell: {
    width: columnWidth,
    borderRightWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "80%",
    height: "80%",
    resizeMode: "contain",
  },
  textContainer: {
    width: "90%",
    height: "60%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
});

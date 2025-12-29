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
import bench from "../../assets/bench.png";
import squat from "../../assets/squat.png";
import deadlift from "../../assets/deadlift.png";
import { getUserPersonalRecords } from "../../api/workoutService";
import { PersonalRecord } from "../../api/types";

type RootStackParamList = {
  PR: { userId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "PR">;

export function PR({ route }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { userId } = route.params;

  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPRs = async () => {
      console.log("Fetching PRs for user:", userId);

      try {
        const data = await getUserPersonalRecords(userId);
        console.log("PRs received:", data);
        setPrs(data);
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading PRs:", err);
        setLoading(false);
      }
    };

    fetchPRs();
  }, [userId]);

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

    // Weight is already in lbs from backend - no conversion needed
    const weightLbs = Math.round(pr.maxWeight);

    return `${pr.exerciseName.toUpperCase()}\n${weightLbs} LBS x ${
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
        <ActivityIndicator size="large" color="#1877F2" />
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
        { backgroundColor: isDark ? "#121212" : "#fff" },
      ]}
    >
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

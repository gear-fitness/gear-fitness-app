import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { deleteRoutine, getUserRoutines } from "../../api/routineService";
import { Routine } from "../../api/types";
import { useSwipeableDelete } from "../../hooks/useSwipeableDelete";
import { formatDayAbbrev } from "../../utils/days";
import { useThemedHeader } from "../../hooks/useThemedHeader";
import { useTrackTab } from "../../hooks/useTrackTab";
import { getPrimaryBodyPart } from "../../utils/exerciseUtils";

function getBodyPartsSummary(routine: Routine): string {
  const parts = routine.exercises
    .map((e) => {
      const bp = getPrimaryBodyPart(e.bodyParts).toLowerCase();
      return bp.charAt(0).toUpperCase() + bp.slice(1);
    })
    .filter((v, i, arr) => arr.indexOf(v) === i);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " & " + parts[parts.length - 1];
}

export function RoutineList() {
  useTrackTab("FollowScreen");

  const { navigation, colors } = useThemedHeader((c) => ({
    headerTitleStyle: {
      color: c.text,
      fontWeight: "800" as const,
      fontSize: 30,
    },
  }));

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserRoutines();
      setRoutines(data);
    } catch (err) {
      console.error("Failed to fetch routines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [fetchRoutines]),
  );

  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: async (id) => {
      try {
        await deleteRoutine(id);
        setRoutines((prev) => prev.filter((r) => r.routineId !== id));
      } catch {
        fetchRoutines();
      }
    },
    deleteTitle: "Delete Routine",
    deleteMessage: "Are you sure you want to delete this routine?",
  });

  const renderCard = ({ item, index }: { item: Routine; index: number }) => {
    const dayLabel =
      item.scheduledDays.length > 0
        ? item.scheduledDays.map(formatDayAbbrev).join(", ")
        : "";
    const bodyParts = getBodyPartsSummary(item);

    return (
      <View style={styles.cardWrapper}>
        <Swipeable {...getSwipeableProps(item.routineId)}>
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() =>
              navigation.navigate("RoutineDetail", {
                routineId: item.routineId,
              })
            }
            activeOpacity={0.7}
          >
            {dayLabel !== "" && (
              <Text
                style={[styles.dayLabel, { color: colors.secondary }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {dayLabel.toUpperCase()}
              </Text>
            )}
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {item.name}
            </Text>
            {bodyParts !== "" && (
              <Text
                style={[styles.cardBodyParts, { color: colors.secondary }]}
                numberOfLines={1}
              >
                {bodyParts.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  const renderAddCard = () => (
    <TouchableOpacity
      style={[styles.addCard, { borderColor: colors.dashedBorder }]}
      onPress={() => navigation.navigate("CreateRoutine")}
      activeOpacity={0.7}
    >
      <Text style={[styles.addCardPlus, { color: colors.dashedBorder }]}>
        +
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        style={[styles.container, { backgroundColor: colors.bg }]}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      {/* Cards */}
      <FlatList
        data={routines}
        keyExtractor={(item) => item.routineId}
        renderItem={renderCard}
        ListHeaderComponent={renderAddCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 14,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: "hidden",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    height: 120,
    justifyContent: "center",
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  cardBodyParts: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  addCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  addCardPlus: {
    fontSize: 48,
    fontWeight: "200",
    lineHeight: 56,
  },
});

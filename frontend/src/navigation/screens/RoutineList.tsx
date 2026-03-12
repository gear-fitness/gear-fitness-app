import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getUserRoutines } from "../../api/routineService";
import { Routine } from "../../api/types";
import { CreateRoutineModal } from "../../components/CreateRoutineModal";

const CARD_ICONS = ["💪", "🔥", "⚡", "🏋️", "🎯", "🦵", "🏃", "🧠"];
const CARD_COLORS = [
  { bg: "rgba(0, 122, 255, 0.15)", text: "#007AFF" },
  { bg: "rgba(255, 59, 48, 0.15)", text: "#FF3B30" },
  { bg: "rgba(175, 82, 222, 0.15)", text: "#AF52DE" },
  { bg: "rgba(52, 199, 89, 0.15)", text: "#34C759" },
  { bg: "rgba(255, 149, 0, 0.15)", text: "#FF9500" },
  { bg: "rgba(90, 200, 250, 0.15)", text: "#5AC8FA" },
  { bg: "rgba(255, 45, 85, 0.15)", text: "#FF2D55" },
  { bg: "rgba(88, 86, 214, 0.15)", text: "#5856D6" },
];

function formatDay(day: string): string {
  const map: Record<string, string> = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
  };
  return map[day] ?? day;
}

function getBodyPartsSummary(routine: Routine): string {
  const parts = routine.exercises
    .map((e) => {
      const bp = e.bodyPart.toLowerCase();
      return bp.charAt(0).toUpperCase() + bp.slice(1);
    })
    .filter((v, i, arr) => arr.indexOf(v) === i);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " & " + parts[parts.length - 1];
}

export function RoutineList() {
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    card: isDark ? "#1C1C1E" : "#F2F2F7",
    cardBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    text: isDark ? "#fff" : "#000",
    secondary: isDark ? "#999" : "#666",
    dashedBorder: isDark ? "#333" : "#C7C7CC",
    headerButton: isDark ? "#1C1C1E" : "#F2F2F7",
  };

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchRoutines = useCallback(async () => {
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
      setLoading(true);
      fetchRoutines();
    }, [fetchRoutines])
  );

  const renderCard = ({ item, index }: { item: Routine; index: number }) => {
    const colorPair = CARD_COLORS[index % CARD_COLORS.length];
    const icon = CARD_ICONS[index % CARD_ICONS.length];
    const dayLabel =
      item.scheduledDays.length > 0 ? formatDay(item.scheduledDays[0]) : "";
    const bodyParts = getBodyPartsSummary(item);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
        onPress={() =>
          navigation.navigate("RoutineDetail", { routineId: item.routineId })
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconBadge, { backgroundColor: colorPair.bg }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          {dayLabel !== "" && (
            <Text style={[styles.dayLabel, { color: colors.secondary }]}>
              {dayLabel.toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.cardBottom}>
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
        </View>
      </TouchableOpacity>
    );
  };

  const renderAddCard = () => (
    <TouchableOpacity
      style={[styles.addCard, { borderColor: colors.dashedBorder }]}
      onPress={() => setModalVisible(true)}
      activeOpacity={0.7}
    >
      <Text style={[styles.addCardPlus, { color: colors.dashedBorder }]}>
        +
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Routines
          </Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Routines
        </Text>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.headerButton }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.headerButtonText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <FlatList
        data={routines}
        keyExtractor={(item) => item.routineId}
        renderItem={renderCard}
        ListFooterComponent={renderAddCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <CreateRoutineModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={(newRoutine) => {
          setRoutines((prev) => [newRoutine, ...prev]);
          setModalVisible(false);
        }}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonText: {
    fontSize: 26,
    fontWeight: "300",
    lineHeight: 30,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    height: 160,
    justifyContent: "space-between",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 22,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  cardBottom: {
    gap: 4,
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
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  addCardPlus: {
    fontSize: 48,
    fontWeight: "200",
    lineHeight: 56,
  },
});

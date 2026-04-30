import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";
import React, { useMemo, useState, useEffect } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { useAuth } from "../../context/AuthContext";
import { getUserWorkouts, deleteWorkout } from "../../api/workoutService";
import { Workout } from "../../api/types";
import { parseLocalDate, getCurrentLocalDateString } from "../../utils/date";
import { useSwipeableDelete } from "../../hooks/useSwipeableDelete";
import { useTrackTab } from "../../hooks/useTrackTab";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { SearchBar } from "../../components/SearchBar";

type RootStackParamList = {
  HomeTabs: undefined;
  Profile: { user: string };
  Settings: undefined;
  DetailedHistory: {
    workoutId: string;
    caption?: string;
    workoutName?: string;
  };
  NotFound: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatBodyTag(tag: string): string {
  return tag
    .split("_")
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(" ");
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function History() {
  useTrackTab("History");

  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const t = isDark
    ? {
        bg: "#0a0a0a",
        surface: "#141414",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        textGhost: "rgba(255,255,255,0.18)",
        border: "rgba(255,255,255,0.08)",
        chipBg: "rgba(255,255,255,0.08)",
      }
    : {
        bg: "#fafafa",
        surface: "#fff",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        textFaint: "rgba(0,0,0,0.4)",
        textGhost: "rgba(0,0,0,0.18)",
        border: "rgba(0,0,0,0.08)",
        chipBg: "rgba(0,0,0,0.05)",
      };

  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    if (!user?.userId) return;
    try {
      const workouts = await getUserWorkouts(user.userId);
      setData(workouts);
    } catch (err) {
      console.error("Error loading workouts:", err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchWorkouts();
    }, []),
  );

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      await deleteWorkout(workoutId);
      setData((prevData) => prevData.filter((w) => w.workoutId !== workoutId));
    } catch (error) {
      console.error("Error deleting workout:", error);
      fetchWorkouts();
    }
  };

  const { getSwipeableProps } = useSwipeableDelete({
    onDelete: handleDeleteWorkout,
    deleteTitle: "Delete Workout",
    deleteMessage:
      "Are you sure you want to delete this workout? This action cannot be undone.",
  });

  const todayStr = getCurrentLocalDateString();

  const markedDates = useMemo(() => {
    const circle = {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    };
    const marks: Record<string, object> = {};
    data.forEach((w) => {
      marks[w.datePerformed] = {
        customStyles: {
          container: { ...circle, backgroundColor: t.chipBg },
          text: { color: t.text, fontWeight: "600" },
        },
      };
    });
    if (todayStr !== selectedDate) {
      marks[todayStr] = {
        customStyles: {
          container: {
            ...circle,
            backgroundColor: marks[todayStr] ? t.chipBg : "transparent",
            borderWidth: 1.5,
            borderColor: t.text,
          },
          text: { color: t.text, fontWeight: "700" },
        },
      };
    }
    if (selectedDate) {
      marks[selectedDate] = {
        customStyles: {
          container: { ...circle, backgroundColor: t.text },
          text: { color: t.bg, fontWeight: "600" },
        },
      };
    }
    return marks;
  }, [data, selectedDate, todayStr, t.bg, t.chipBg, t.text]);

  const filteredData = data.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDate = selectedDate
      ? item.datePerformed === selectedDate
      : true;
    return matchesSearch && matchesDate;
  });

  const handleSelectDate = (iso: string) => {
    setSelectedDate((prev) => (prev === iso ? null : iso));
  };

  const renderItem = ({ item }: { item: Workout }) => {
    const dateLabel = parseLocalDate(item.datePerformed)
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();

    const hasDuration = item.durationMin != null && item.durationMin > 0;
    const hasMuscles = Array.isArray(item.bodyTags) && item.bodyTags.length > 0;
    const hasMetrics = hasDuration || item.exerciseCount > 0 || hasMuscles;

    return (
      <View style={styles.rowWrapper}>
        <Swipeable {...getSwipeableProps(item.workoutId)}>
          <TouchableOpacity
            style={[
              styles.workoutCard,
              { backgroundColor: t.surface, borderColor: t.border },
            ]}
            activeOpacity={0.7}
            onPress={() =>
              navigation.getParent()?.navigate("DetailedHistory", {
                workoutId: item.workoutId,
              })
            }
          >
            <Text
              style={[styles.workoutDate, { color: t.textMuted }]}
              numberOfLines={1}
            >
              {dateLabel}
            </Text>
            <Text style={[styles.workoutTitle, { color: t.text }]}>
              {item.name}
            </Text>

            {hasMetrics && (
              <View style={styles.metricsRow}>
                {hasDuration && (
                  <View style={styles.metricCell}>
                    <Text style={[styles.metricLabel, { color: t.textMuted }]}>
                      Time
                    </Text>
                    <Text style={[styles.metricValue, { color: t.text }]}>
                      {formatDuration(item.durationMin!)}
                    </Text>
                  </View>
                )}
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: t.textMuted }]}>
                    Exercises
                  </Text>
                  <Text style={[styles.metricValue, { color: t.text }]}>
                    {item.exerciseCount}
                  </Text>
                </View>
                {hasMuscles && (
                  <View style={styles.metricCell}>
                    <Text style={[styles.metricLabel, { color: t.textMuted }]}>
                      Muscles
                    </Text>
                    <Text style={[styles.musclesText, { color: t.text }]}>
                      {item.bodyTags.map(formatBodyTag).join(", ")}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  const ListHeader = (
    <View>
      <View style={styles.calendarBlock}>
        <Calendar
          key={`${isDark ? "dark" : "light"}-${selectedDate ?? "none"}`}
          maxDate={todayStr}
          current={todayStr}
          markedDates={markedDates}
          markingType="custom"
          onDayPress={(day: { dateString: string }) =>
            handleSelectDate(day.dateString)
          }
          theme={{
            backgroundColor: t.bg,
            calendarBackground: t.bg,
            dayTextColor: t.text,
            monthTextColor: t.text,
            textSectionTitleColor: t.textMuted,
            todayTextColor: t.text,
            textDisabledColor: t.textGhost,
            arrowColor: t.text,
            textDayFontFamily: "System",
            textMonthFontFamily: "System",
            textDayHeaderFontFamily: "System",
            textDayFontWeight: "600",
            textMonthFontWeight: "600",
            textDayHeaderFontWeight: "600",
            textDayFontSize: 17,
            textMonthFontSize: 22,
            textDayHeaderFontSize: 11,
          }}
          hideExtraDays={true}
          enableSwipeMonths={true}
          style={{ backgroundColor: t.bg }}
        />
      </View>

      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search workouts"
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.overline, { color: t.textMuted }]}>WORKOUTS</Text>
        <Text style={[styles.overlineRight, { color: t.textFaint }]}>
          {filteredData.length} logged
        </Text>
      </View>

      {filteredData.length === 0 && (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={[styles.emptyBox, { borderColor: t.border }]}>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              {selectedDate
                ? "No workout on this day."
                : searchQuery
                  ? `No matches for "${searchQuery}".`
                  : "No workouts yet."}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.workoutId}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: MINI_PLAYER_HEIGHT + 30 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarBlock: {
    paddingTop: 40,
    paddingHorizontal: 8,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 12,
  },
  overline: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  overlineRight: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    fontVariant: ["tabular-nums"],
  },
  emptyBox: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  rowWrapper: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  workoutCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  workoutDate: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    fontVariant: ["tabular-nums"],
    marginBottom: 6,
  },
  workoutTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 29,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 12,
  },
  metricCell: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  musclesText: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
    lineHeight: 24,
    marginTop: 2,
  },
});

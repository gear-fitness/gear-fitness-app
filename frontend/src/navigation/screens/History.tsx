import { Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";
import React, { useState, useEffect } from "react";
import { useTheme } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { useAuth } from "../../context/AuthContext";
import { getUserWorkouts, deleteWorkout } from "../../api/workoutService";
import { Workout } from "../../api/types";
import { parseLocalDate } from "../../utils/date";
import { useSwipeableDelete } from "../../hooks/useSwipeableDelete";
import { useTrackTab } from "../../hooks/useTrackTab";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";

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

export function History() {
  // Add the tab tracking hook at the beginning of the component
  useTrackTab("History");

  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [markedDates, setMarkedDates] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<Workout[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch workouts on initial mount
  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Function to fetch workouts
  const fetchWorkouts = async () => {
    if (!user?.userId) return;
    try {
      const workouts = await getUserWorkouts(user.userId);
      setData(workouts);
      setMarkedDates(buildMarkedDates(workouts));
    } catch (err) {
      console.error("Error loading workouts:", err);
    }
  };

  const buildMarkedDates = (workouts: Workout[]) => {
    const marks: Record<string, boolean> = {};
    workouts.forEach((w) => {
      marks[w.datePerformed] = true;
    });
    return marks;
  };

  // Refetch workouts every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchWorkouts();
    }, []),
  );

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      await deleteWorkout(workoutId);
      setData((prevData) => {
        const updated = prevData.filter((w) => w.workoutId !== workoutId);
        setMarkedDates(buildMarkedDates(updated));
        return updated;
      });
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

  const today = new Date();
  const formattedToday =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  const filteredData = data.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDate = selectedDate
      ? item.datePerformed === selectedDate
      : true;
    return matchesSearch && matchesDate;
  });

  const renderItem = ({ item }: { item: Workout }) => (
    <View style={styles.rowWrapper}>
      <Swipeable {...getSwipeableProps(item.workoutId)}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isDarkMode ? colors.card : "white" },
          ]}
          activeOpacity={0.7}
          onPress={() =>
            navigation.getParent()?.navigate("DetailedHistory", {
              workoutId: item.workoutId,
            })
          }
        >
          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <Text
                style={[
                  styles.cardTitle,
                  { color: isDarkMode ? "#FFF" : "#1a1a1a" },
                ]}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: isDarkMode ? "#AAA" : "#777" },
                ]}
              >
                {parseLocalDate(item.datePerformed).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </Text>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Calendar
          maxDate={formattedToday}
          key={colors.background}
          style={styles.calendar}
          current={formattedToday}
          markedDates={{
            ...Object.keys(markedDates).reduce((acc: any, date: string) => {
              acc[date] = {
                customStyles: {
                  container: {
                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                    borderRadius: 16,
                  },
                  text: { color: colors.text },
                },
              };
              return acc;
            }, {}),

            [formattedToday]: {
              customStyles: {
                text: { color: isDarkMode ? "#fff" : "#000", fontWeight: "700" },
              },
            },

            // Selected day (not today) - inverted circle
            ...(selectedDate
              ? {
                  [selectedDate]: {
                    customStyles: {
                      container: {
                        backgroundColor: isDarkMode ? "#fff" : "#000",
                        borderRadius: 16,
                      },
                      text: {
                        color: isDarkMode ? "#000" : "#fff",
                        fontWeight: "600",
                      },
                    },
                  },
                }
              : {}),
          }}
          markingType="custom"
          onDayPress={(day: { dateString: string }) => {
            setSelectedDate((prev) =>
              prev === day.dateString ? null : day.dateString,
            );
          }}
          theme={{
            backgroundColor: colors.card,
            calendarBackground: colors.card,
            dayTextColor: colors.text,
            monthTextColor: colors.text,
            textSectionTitleColor: colors.text,
            todayTextColor: isDarkMode ? "#fff" : "#000",
            arrowColor: isDarkMode ? "#fff" : "#000",
            textDayFontFamily: "System",
            textMonthFontFamily: "System",
            textDayHeaderFontFamily: "System",
            textDayFontWeight: "400",
            textMonthFontWeight: "700",
            textDayHeaderFontWeight: "600",
            textDayFontSize: 15,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 13,
            textDisabledColor: isDarkMode ? "#555" : "#ccc",
          }}
          hideExtraDays={true}
          enableSwipeMonths={true}
        />
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            placeholder="Search workouts..."
            placeholderTextColor={colors.text + "80"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.workoutId}
          renderItem={renderItem}
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
    justifyContent: "flex-start",
    paddingTop: 50,
  },
  calendar: {
    width: "90%",
    alignSelf: "center",
    maxHeight: 350,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 8,
  },
  rowWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 20,
    marginVertical: 5,
  },
  button: {
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
  cardChevron: {
    fontSize: 24,
    color: "#C7C7CC",
    fontWeight: "300",
    marginLeft: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
});

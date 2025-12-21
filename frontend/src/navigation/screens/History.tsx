import { Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  useColorScheme,
  Keyboard,
} from "react-native";
import { Calendar } from "react-native-calendars";
import React, { useState, useEffect } from "react";
import { useTheme } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import weightlifter from "../../assets/weightlifter.png";
import { useAuth } from "../../context/AuthContext";
import { getUserWorkouts } from "../../api/workoutService";
import { Workout } from "../../api/types";

type RootStackParamList = {
  HomeTabs: undefined;
  Profile: { user: string };
  Settings: undefined;
  PR: { userId: string };
  DetailedHistory: { workoutId: string };
  NotFound: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function History() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [markedDates, setMarkedDates] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<Workout[]>([]);

  // Function to fetch workouts
  const fetchWorkouts = async () => {
    if (!user?.userId) return;

    console.log("Fetching workouts for user:", user.userId);
    try {
      const workouts = await getUserWorkouts(user.userId);
      console.log("Workouts fetched:", workouts.length);
      setData(workouts);

      const marks: any = {};
      workouts.forEach((w) => {
        marks[w.datePerformed] = {
          marked: true,
          selected: true,
          dotColor: "#1877F2",
          selectedColor: "#1877F2",
        };
      });
      setMarkedDates(marks);
    } catch (err) {
      console.error("Error loading workouts:", err);
    }
  };

  // Fetch workouts on initial mount
  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Refetch workouts every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchWorkouts();
    }, [])
  );

  const today = new Date();
  const formattedToday =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  const handlePrPress = () => {
    if (!user?.userId) return;
    // Pass userId to PR screen
    navigation.getParent()?.navigate("PR", { userId: user.userId });
  };

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: Workout }) => (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: isDarkMode ? colors.card : "white" }]}
      activeOpacity={0.7}
      onPress={() =>
        navigation.getParent()?.navigate("DetailedHistory", {
          workoutId: item.workoutId,
        })
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: isDarkMode ? "#FFF" : "#1a1a1a" }]}>
            {item.name}
          </Text>
          <Text style={[styles.cardSubtitle, { color: isDarkMode ? "#AAA" : "#777" }]}>
            {new Date(item.datePerformed).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
            {item.durationMin && ` • ${item.durationMin} min`}
            {item.bodyTag && ` • ${item.bodyTag}`}
          </Text>
        </View>
        <Text style={styles.cardChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Calendar
        key={colors.background}
        style={styles.calendar}
        current={formattedToday}
        markedDates={markedDates}
        theme={{
          backgroundColor: colors.card,
          calendarBackground: colors.card,
          dayTextColor: colors.text,
          monthTextColor: colors.text,
          textSectionTitleColor: colors.text,
          todayTextColor: "#1877F2",
          arrowColor: "#1877F2",
        }}
        hideExtraDays={true}
      />

      {/* Search Bar + PR Button */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
          ]}
          placeholder="Search workouts..."
          placeholderTextColor={colors.text + "80"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <TouchableOpacity style={[styles.settingsButton, { backgroundColor: colors.primary }]} onPress={handlePrPress}>
          <Image source={weightlifter} style={styles.settingsButtonIcon} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.workoutId}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 50,
  },
  calendar: {
    width: "95%",
    alignSelf: "center",
    maxHeight: 350,
  },
  button: {
    marginHorizontal: 20,
    marginVertical: 5,
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
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsButtonIcon: {
    width: 24,
    height: 24,
  },
});

import { Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { Calendar } from "react-native-calendars";
import React, { useState, useEffect } from "react";
import { useTheme } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import weightlifter from "../../assets/weightlifter.png";

type RootStackParamList = {
  HomeTabs: undefined;
  Profile: { user: string };
  Settings: undefined;
  PR: undefined;
  DetailedHistory: undefined;
  NotFound: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Workout = {
  workoutId: string;
  name: string;
  datePerformed: string;
};

export function History() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [markedDates, setMarkedDates] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<Workout[]>([]);

  const userId = "550e8400-e29b-41d4-a716-446655440004"; // Bryant's UUID
  const API_URL = "http://10.72.10.77:8080/api/workouts"; // Replace with your backend address

  useEffect(() => {
    fetch(`${API_URL}/user/${userId}`)
      .then((res) => res.json())
      .then((workouts) => {
        setData(workouts);

        const marks = {};
        workouts.forEach((w) => {
          marks[w.datePerformed] = {
            marked: true,
            selected: true,
            dotColor: "#1877F2",
            selectedColor: "#1877F2",
          };
        });
        setMarkedDates(marks);
      })
      .catch((err) => console.error("Error loading workouts:", err));
  }, []);

  const today = new Date();
  const formattedToday =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  const handleDayPress = (day) => {
    setMarkedDates((prev) => {
      const isAlreadyMarked = prev[day.dateString];
      if (isAlreadyMarked) {
        const { [day.dateString]: _, ...rest } = prev;
        return rest;
      } else {
        return {
          ...prev,
          [day.dateString]: {
            marked: true,
            selected: true,
            dotColor: "#1877F2",
            selectedColor: "#1877F2",
          },
        };
      }
    });
  };

  const handlePrPress = () => {
    navigation.getParent()?.navigate("PR");
  };

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: Workout }) => (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.getParent()?.navigate("DetailedHistory")}
    >
      <Text style={styles.buttonText}>
        {item.name} — {item.datePerformed}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Calendar
        key={colors.background}
        style={styles.calendar}
        // current={formattedToday}
        // onDayPress={handleDayPress}
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
            { color: colors.text, borderColor: colors.border },
          ]}
          placeholder="Search workouts..."
          placeholderTextColor={colors.text + "80"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.settingsButton} onPress={handlePrPress}>
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
    backgroundColor: "#1877F2",
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
    backgroundColor: "white",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  settingsButton: {
    backgroundColor: "#1877F2",
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

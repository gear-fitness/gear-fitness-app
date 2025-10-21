import { Button, Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import React, { useState } from "react";
import search from "../../assets/search.png";
import filter from "../../assets/filter.png";
import close from "../../assets/close.png";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterKey = "arms" | "legs" | "back" | "chest" | "shoulders" | "core";
type SelectedFilters = Record<FilterKey, boolean>;

export function ExerciseSelect() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    arms: false,
    legs: false,
    back: false,
    chest: false,
    shoulders: false,
    core: false,
  });
  const toggleFilter = (key: FilterKey) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <SafeAreaView
      style={styles.searchBox}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Image source={search} style={styles.search} />

          <TextInput
            placeholder="Search Exercises"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Image source={close} style={styles.clearIcon} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setIsFiltering(true)}>
            <Image source={filter} style={styles.filterIcon} />
          </TouchableOpacity>
          <Modal visible={isFiltering} animationType="fade" transparent={true}>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: "80%",
                  backgroundColor: "#fff",
                  borderRadius: 10,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <TouchableOpacity onPress={() => setIsFiltering(false)}>
                  <Image
                    source={close}
                    style={[styles.clearIcon, { alignSelf: "flex-end" }]}
                  />
                </TouchableOpacity>
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}
                >
                  Filter Exercise
                </Text>
                <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
                  {Object.entries(selectedFilters).map(([key, value]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => toggleFilter(key as FilterKey)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginVertical: 5,
                      }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderWidth: 1,
                          borderColor: "#ccc",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 10,
                          backgroundColor: value ? "#007AFF" : "#fff",
                        }}
                      >
                        {value && (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              backgroundColor: "#fff",
                            }}
                          />
                        )}
                      </View>
                      <Text
                        style={{ fontSize: 16, textTransform: "capitalize" }}
                      >
                        {key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Button onPress={() => setIsFiltering(false)}>
                  Apply Filters
                </Button>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  searchBox: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 40,
  },
  search: {
    width: 18,
    height: 18,
    tintColor: "#555",
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearIcon: {
    width: 13,
    height: 13,
    tintColor: "#555",
  },
  filterIcon: {
    width: 18,
    height: 18,
    marginLeft: 10,
  },
});

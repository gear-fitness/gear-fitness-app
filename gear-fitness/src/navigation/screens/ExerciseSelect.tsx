import { Button, Text } from "@react-navigation/elements";
import { StyleSheet, View, TextInput, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import search from "../../assets/search.png";
import filter from "../../assets/filter.png";
import close from "../../assets/close.png";
import { Image } from "react-native";

export function ExerciseSelect() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
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
      </View>
    </View>
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
});

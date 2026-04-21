import React from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
} from "react-native";
import { useColorScheme } from "react-native";

import search from "../assets/search.png";
import close from "../assets/close.png";

interface ExerciseSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export function ExerciseSearchBar({
  searchQuery,
  onSearchChange,
  placeholder = "Search exercises...",
}: ExerciseSearchBarProps) {
  const isDark = useColorScheme() === "dark";

  const colors = {
    subtle: isDark ? "#aaa" : "#666",
    icon: isDark ? "#fff" : "#555",
    border: isDark ? "#333" : "#e0e0e0",
    inputBg: isDark ? "#1c1c1e" : "#f5f5f5",
    text: isDark ? "#fff" : "#000",
  };

  return (
    <View style={styles.searchWrapper}>
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.inputBg, borderColor: colors.border },
        ]}
      >
        <Image
          source={search}
          style={[styles.searchIcon, { tintColor: colors.icon }]}
        />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          value={searchQuery}
          onChangeText={onSearchChange}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="done"
          autoCorrect={false}
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <Image
              source={close}
              style={[styles.clearIcon, { tintColor: colors.icon }]}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    marginTop: 10,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  clearIcon: {
    width: 16,
    height: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
});

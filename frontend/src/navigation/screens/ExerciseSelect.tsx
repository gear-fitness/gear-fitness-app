import { Button, Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import search from "../../assets/search.png";
import filter from "../../assets/filter.png";
import close from "../../assets/close.png";
import chat from "../../assets/chat.png";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native";

type FilterKey =
  | "CALVES"
  | "HAMSTRINGS"
  | "TRICEPS"
  | "BICEPS"
  | "LEGS"
  | "BACK"
  | "CHEST"
  | "SHOULDERS"
  | "CORE";

type SelectedFilters = Record<FilterKey, boolean>;

// Reusing the type from your DTO for local state clarity
type ChatMessageState = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

export function ExerciseSelect({ route }: { route: any }) {
  const navigation = useNavigation();

  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    icon: isDark ? "#fff" : "#555",
    border: isDark ? "#333" : "#ccc",
    inputBg: isDark ? "#1c1c1e" : "#fff",
    modalBg: isDark ? "#111" : "#fff",
    card: isDark ? "#222" : "#fff",
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);

  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({
    LEGS: false,
    BACK: false,
    CHEST: false,
    SHOULDERS: false,
    CORE: false,
    CALVES: false,
    HAMSTRINGS: false,
    TRICEPS: false,
    BICEPS: false,
  });

  const [exercises, setExercises] = useState<any[]>([]);

  // Chat modal state
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
  const [messages, setMessages] = useState<ChatMessageState[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeFilters = Object.entries(selectedFilters)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  const filteredExercises = exercises.filter((ex) => {
    const searchMatch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.bodyPart.toLowerCase().includes(searchQuery.toLowerCase());

    const filterMatch =
      activeFilters.length === 0 ||
      activeFilters.includes(ex.bodyPart.toUpperCase());

    return searchMatch && filterMatch;
  });

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const res = await fetch("http://172.20.10.3:8080/api/exercises");
        const text = await res.text();
        if (!res.ok) return;
        setExercises(JSON.parse(text));
      } catch (err) {
        console.error("Failed to fetch exercises:", err);
      }
    };

    loadExercises();
  }, []);

  const handleCloseChat = () => {
    setChatModalVisible(false);
    setMessages([]); // Clear chat on close
    setSelectedExercise(null);
  };

  const sendMessage = async (userMessage: string) => {
    if (!selectedExercise || !userMessage.trim()) return;

    setIsLoading(true);

    // 1. Add user message
    const newUserMessage: ChatMessageState = {
      id: Date.now().toString(),
      text: userMessage.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    // The current messages state + the new user message
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputText("");

    try {
      // Get JWT token from storage
      const token = await AsyncStorage.getItem("authToken");
      console.log(
        "Token retrieved:",
        token ? "Token exists" : "No token found"
      );

      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(
        `http://172.20.10.3:8080/api/exercises/${selectedExercise.exerciseId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            // Send the full, updated history including the AI greeting
            messages: updatedMessages.map((m) => ({
              text: m.text,
              isUser: m.isUser,
            })),
          }),
        }
      );

      // Check if response is OK before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error:", response.status, errorText);
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.response;

      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      const aiMessage: ChatMessageState = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      // Add the AI response to the history
      setMessages([...updatedMessages, aiMessage]);
    } catch (error) {
      console.error("Chat API error:", error);
      // Show error message in chat
      const errorMessage: ChatMessageState = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, there was an error. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
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
            placeholder="Search Exercises"
            placeholderTextColor={colors.subtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Image
                source={close}
                style={[styles.clearIcon, { tintColor: colors.icon }]}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          onPress={() => setIsFiltering(true)}
          style={[
            styles.filterButton,
            { backgroundColor: colors.inputBg, borderColor: colors.border },
          ]}
        >
          <Image
            source={filter}
            style={[styles.filterIcon, { tintColor: colors.icon }]}
          />
        </TouchableOpacity>
      </View>

      {/* Exercises List */}
      <ScrollView style={{ marginTop: 20 }}>
        {filteredExercises.map((ex) => (
          <View key={ex.exerciseId} style={styles.exerciseRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() =>
                navigation.navigate("ExerciseDetail", {
                  exercise: ex,
                })
              }
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: colors.text }}
              >
                {ex.name}
              </Text>
              <Text style={{ color: colors.subtle }}>{ex.bodyPart}</Text>
              <Text style={{ color: colors.subtle, marginTop: 4 }}>
                {ex.description}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const greetingText = `Hello, I'm your personal ${ex.name} assistant! If you have any questions on this exercise, let me know!`;

                // FIX: Initialize messages with the AI's greeting
                setSelectedExercise(ex);
                setMessages([
                  {
                    id: "0",
                    text: greetingText,
                    isUser: false,
                    timestamp: new Date(),
                  },
                ]);
                setChatModalVisible(true);
              }}
              style={styles.chatIconButton}
            >
              <Image
                source={chat}
                style={{ width: 20, height: 20, tintColor: colors.icon }}
              />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={isFiltering} animationType="fade" transparent>
        <View style={styles.modalBackground}>
          <View
            style={[styles.modalContainer, { backgroundColor: colors.modalBg }]}
          >
            <TouchableOpacity onPress={() => setIsFiltering(false)}>
              <Image
                source={close}
                style={[
                  styles.clearIcon,
                  { tintColor: colors.icon, alignSelf: "flex-end" },
                ]}
              />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Filter Exercises
            </Text>

            <ScrollView style={styles.scrollArea}>
              {Object.entries(selectedFilters).map(([key, value]) => {
                const typedKey = key as FilterKey;

                return (
                  <TouchableOpacity
                    key={typedKey}
                    onPress={() =>
                      setSelectedFilters((prev) => ({
                        ...prev,
                        [typedKey]: !prev[typedKey],
                      }))
                    }
                    style={styles.filterOption}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: value ? "#007AFF" : colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    />

                    <Text style={{ fontSize: 16, color: colors.text }}>
                      {typedKey}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button onPress={() => setIsFiltering(false)}>Apply Filters</Button>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        transparent={false}
      >
        <KeyboardAvoidingView
          style={[styles.chatContainer, { backgroundColor: colors.bg }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
            {/* Header with close button and exercise name */}
            <View
              style={[
                styles.chatHeader,
                { borderBottomColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={handleCloseChat}
                style={styles.closeButton}
              >
                <Image
                  source={close}
                  style={[styles.closeIcon, { tintColor: colors.icon }]}
                />
              </TouchableOpacity>
              <View style={styles.chatHeaderContent}>
                <Text style={[styles.chatTitle, { color: colors.text }]}>
                  {selectedExercise?.name || "Exercise Chat"}
                </Text>
                <Text style={[styles.chatSubtitle, { color: colors.subtle }]}>
                  AI Assistant
                </Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {/* Messages ScrollView */}
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 10 }}
              contentContainerStyle={{ paddingVertical: 10 }}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    {
                      alignSelf: msg.isUser ? "flex-end" : "flex-start",
                      backgroundColor: msg.isUser ? "#007AFF" : colors.card,
                    },
                  ]}
                >
                  <Text style={{ color: msg.isUser ? "#fff" : colors.text }}>
                    {msg.text}
                  </Text>
                </View>
              ))}
              {isLoading && (
                <Text style={{ color: colors.subtle, fontStyle: "italic" }}>
                  AI is thinking...
                </Text>
              )}
            </ScrollView>

            {/* Input Row */}
            <View
              style={[styles.chatInputRow, { borderTopColor: colors.border }]}
            >
              <TextInput
                style={[
                  styles.chatInput,
                  { backgroundColor: colors.inputBg, color: colors.text },
                ]}
                placeholder="Ask about this exercise..."
                placeholderTextColor={colors.subtle}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                style={[
                  styles.sendButton,
                  { opacity: inputText.trim() && !isLoading ? 1 : 0.5 },
                ]}
              >
                <Text style={{ color: "#007AFF", fontWeight: "600" }}>
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },

  searchRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },

  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    height: 40,
  },

  searchIcon: { width: 18, height: 18, marginRight: 8 },
  clearIcon: { width: 16, height: 16 },

  searchInput: { flex: 1, fontSize: 16 },

  filterButton: {
    marginLeft: 10,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  filterIcon: { width: 20, height: 20 },

  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalContainer: {
    width: "80%",
    borderRadius: 10,
    padding: 20,
  },

  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },

  scrollArea: { maxHeight: 300, marginVertical: 10 },

  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    marginRight: 10,
    borderRadius: 4,
  },

  // Chat styles
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  chatIconButton: {
    padding: 10,
    marginLeft: 10,
  },

  chatContainer: {
    flex: 1,
  },

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },

  closeButton: {
    padding: 5,
    width: 40,
  },

  closeIcon: {
    width: 24,
    height: 24,
  },

  chatHeaderContent: {
    flex: 1,
    alignItems: "center",
  },

  chatTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  chatSubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },

  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },

  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
  },

  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },

  sendButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
});

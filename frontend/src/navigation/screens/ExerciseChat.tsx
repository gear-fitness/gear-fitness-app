import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { useColorScheme } from "react-native";
import { sendExerciseChat } from "../../api/exerciseChatService";

type ChatMessageState = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

export function ExerciseChat() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const isDark = useColorScheme() === "dark";

  const exercise = route.params?.exercise;
  const greetingText = route.params?.greetingText;

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    icon: isDark ? "#fff" : "#555",
    border: isDark ? "#333" : "#ccc",
    inputBg: isDark ? "#1c1c1e" : "#fff",
    card: isDark ? "#222" : "#fff",
  };

  // Initialize with greeting message
  const [messages, setMessages] = useState<ChatMessageState[]>(
    greetingText
      ? [
          {
            id: "0",
            text: greetingText,
            isUser: false,
            timestamp: new Date(),
          },
        ]
      : []
  );
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (userMessage: string) => {
    if (!exercise || !userMessage.trim()) return;

    setIsLoading(true);

    // 1. Add user message
    const newUserMessage: ChatMessageState = {
      id: Date.now().toString(),
      text: userMessage.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputText("");

    try {
      // Send chat request
      const data = await sendExerciseChat(
        exercise.exerciseId,
        updatedMessages.map((m) => ({
          text: m.text,
          isUser: m.isUser,
        }))
      );

      if (!data.response) {
        throw new Error("No response from AI");
      }

      const aiMessage: ChatMessageState = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages([...updatedMessages, aiMessage]);
    } catch (error) {
      console.error("Chat API error:", error);

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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 125 : 0}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        {/* Header with exercise name */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>
              {exercise?.name || "Exercise Chat"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtle }]}>
              AI Assistant
            </Text>
          </View>
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
          style={[
            styles.inputRow,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text },
            ]}
            placeholder="Ask about this exercise..."
            placeholderTextColor={colors.subtle}
            value={inputText}
            onChangeText={setInputText}
            multiline
            blurOnSubmit={true}
          />
          <TouchableOpacity
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            style={[
              styles.sendButton,
              { opacity: inputText.trim() && !isLoading ? 1 : 0.5 },
            ]}
          >
            <Text style={styles.sendArrow}>↑</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    alignItems: "center",
  },

  headerContent: {
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },

  subtitle: {
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

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    borderWidth: 1,
    borderRadius: 25,
    marginHorizontal: 10,
    marginBottom: 25,
  },

  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },

  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },

  sendArrow: {
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
  },
});

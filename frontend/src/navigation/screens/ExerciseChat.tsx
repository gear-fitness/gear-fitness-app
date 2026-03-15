import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColorScheme } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { sendExerciseChat } from "../../api/exerciseChatService";
import { BackButton } from "../../components/BackButton";
import { useTrackTab } from "../../hooks/useTrackTab";

type ChatMessageState = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

export function ExerciseChat() {
  useTrackTab("ExerciseChat");

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === "dark";
  const handledInitialPromptRef = useRef(false);

  const exercise = route.params?.exercise;
  const greetingText = route.params?.greetingText;
  const initialPrompt = route.params?.initialPrompt;

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#ccc",
    inputBg: isDark ? "#1c1c1e" : "#fff",
    card: isDark ? "#222" : "#fff",
  };

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
      : [],
  );
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: exercise?.name || "Exercise Coach",
      headerBackVisible: false,
      headerLeft: () => (
        <BackButton onPress={navigation.goBack} color={colors.text} />
      ),
    });
  }, [colors.text, exercise?.name, navigation]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    setIsLoading(true);

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
      const data = await sendExerciseChat(
        updatedMessages.map((message) => ({
          text: message.text,
          isUser: message.isUser,
        })),
        exercise?.exerciseId,
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

  useEffect(() => {
    if (!initialPrompt?.trim()) return;
    if (handledInitialPromptRef.current) return;

    handledInitialPromptRef.current = true;
    void sendMessage(initialPrompt);
  }, [initialPrompt]);

  const showEmptyState = messages.length === 0 && !isLoading;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 125 : 0}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 10 }}
          contentContainerStyle={[
            styles.messagesContent,
            showEmptyState && styles.emptyMessagesContent,
          ]}
        >
          {showEmptyState ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.text }]}>
                {exercise
                  ? `Ask me anything about ${exercise.name}.`
                  : "Ask me about any exercise, movement pattern, or training question."}
              </Text>
            </View>
          ) : (
            messages.map((msg) => (
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
            ))
          )}

          {isLoading && (
            <Text style={{ color: colors.subtle, fontStyle: "italic" }}>
              AI is thinking...
            </Text>
          )}
        </ScrollView>

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
            placeholder={
              exercise ? "Ask about this exercise..." : "Ask about any exercise..."
            }
            placeholderTextColor={colors.subtle}
            value={inputText}
            onChangeText={setInputText}
            multiline
            blurOnSubmit
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
  messagesContent: {
    paddingVertical: 10,
  },
  emptyMessagesContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
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

import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useState, useRef, useEffect } from "react";
import { useColorScheme } from "react-native";
import { sendWorkoutChat } from "../../api/workoutChatService";
import { useTrackTab } from "../../hooks/useTrackTab";

type ChatMessageState = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

const GREETING_TEXT =
  "Hey! I'm your workout assistant. Ask me anything about exercises, form, programming, or training — I'm here to help!";

export function WorkoutChat() {
  useTrackTab("WorkoutChat");

  const navigation = useNavigation();
  const isDark = useColorScheme() === "dark";
  const scrollViewRef = useRef<ScrollView>(null);

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    icon: isDark ? "#fff" : "#555",
    border: isDark ? "#333" : "#ccc",
    inputBg: isDark ? "#1c1c1e" : "#fff",
    card: isDark ? "#222" : "#fff",
  };

  const [messages, setMessages] = useState<ChatMessageState[]>([
    {
      id: "0",
      text: GREETING_TEXT,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      const data = await sendWorkoutChat(
        updatedMessages.map((m) => ({
          text: m.text,
          isUser: m.isUser,
        })),
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

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setTimeout(() => inputRef.current?.focus(), 1);
    });
    return unsubscribe;
  }, [navigation]);

  const majorVersionIOS = parseInt(Platform.Version, 10);
  const insets = useSafeAreaInsets();

  const tabBarPadding = majorVersionIOS >= 26 ? 49 + insets.bottom : 0;

  return (
    <SafeAreaView
      style={{ flex: 1, paddingBottom: tabBarPadding }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>
              Workout Assistant
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtle }]}>
              Ask about any exercise, form, or programming
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingHorizontal: 10 }}
          contentContainerStyle={{ paddingVertical: 10 }}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                {
                  alignSelf: msg.isUser ? "flex-end" : "flex-start",
                  backgroundColor: msg.isUser ? (isDark ? "#fff" : "#000") : colors.card,
                },
              ]}
            >
              <Text style={{ color: msg.isUser ? (isDark ? "#000" : "#fff") : colors.text }}>
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
            ref={inputRef}
            placeholder="Ask about any exercise..."
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 8,
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

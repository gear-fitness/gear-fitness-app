import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../context/AuthContext";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { FloatingCloseButton } from "../../../components/FloatingCloseButton";
import { deleteAccount } from "../../../api/userService";

export function DeleteAccount() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const expectedUsername = user?.username ?? "";
  const matches =
    typed.trim().toLowerCase() === expectedUsername.toLowerCase() &&
    typed.trim().length > 0;

  const handleDelete = () => {
    if (!matches || submitting) return;

    Alert.alert(
      "Delete account?",
      "This will delete your account, workouts, posts, and likes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await deleteAccount(typed.trim());
              try {
                await logout();
              } catch {
                // Expected post-delete; safe to ignore.
              }
              navigation.getParent()?.reset({
                index: 0,
                routes: [{ name: "Onboarding" }],
              });
            } catch (err: any) {
              console.error("Delete account failed:", err);
              const message =
                err?.response?.data ||
                err?.message ||
                "Something went wrong. Please try again.";
              Alert.alert("Couldn't delete account", String(message));
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.appBg }]}>
      <FloatingCloseButton
        direction="left"
        accessibilityLabel="Back"
        onPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Text style={[styles.title, { color: themeColors.text }]}>
            Delete account
          </Text>
          <Text style={[styles.body, { color: themeColors.secondary }]}>
            This deletes your account along with all of your workouts, posts,
            comments, and likes.
          </Text>
          <Text style={[styles.body, { color: themeColors.secondary }]}>
            To confirm, type your username{" "}
            <Text style={{ color: themeColors.text, fontWeight: "600" }}>
              {expectedUsername}
            </Text>{" "}
            below.
          </Text>

          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder="Type your username"
            placeholderTextColor={themeColors.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            editable={!submitting}
            style={[
              styles.input,
              {
                backgroundColor: themeColors.cardBg,
                color: themeColors.text,
                borderColor: matches
                  ? themeColors.danger
                  : themeColors.separator,
              },
            ]}
          />
          <TouchableOpacity
            onPress={handleDelete}
            disabled={!matches || submitting}
            activeOpacity={0.85}
            style={[
              styles.deleteBtn,
              {
                backgroundColor: matches
                  ? themeColors.danger
                  : themeColors.cardBg,
                opacity: matches && !submitting ? 1 : 0.5,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.deleteBtnText,
                  { color: matches ? "#fff" : themeColors.secondary },
                ]}
              >
                Delete my account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  deleteBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

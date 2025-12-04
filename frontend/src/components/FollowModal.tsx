import React, { useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { followUserByUsername } from "../api/userService";
import { useTheme } from "@react-navigation/native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FollowModal({ visible, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    try {
      setLoading(true);
      const response = await followUserByUsername(username.trim());

      Alert.alert("Success", response.message);
      setUsername("");
      onClose();
      onSuccess();
    } catch (error) {
      console.error("Error following user:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to follow user"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Follow User</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Input */}
          <View style={[styles.inputContainer, { borderColor: colors.border }]}>
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.text}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Enter username"
              placeholderTextColor={colors.text + '80'}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.followButton, { backgroundColor: colors.primary }]}
              onPress={handleFollow}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.followButtonText}>Follow</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  followButton: {},
  followButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

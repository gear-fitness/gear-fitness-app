import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import apiClient from "../../api/apiClient";

type Props = {
  visible: boolean;
  field: string;
  value: string;
  onClose: () => void;
  onSaved?: () => void; // optional refresh
};

const fieldDisplayMap: Record<string, string> = {
  username: "Username",
  age: "Age",
  weightLbs: "Weight",
  heightInches: "Height",
};

export default function EditFieldModal({
  visible,
  field,
  value,
  onClose,
  onSaved,
}: Props) {
  const { colors } = useTheme();

  const [input, setInput] = useState(value || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  const handleSave = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await apiClient.put("/users/me", {
        [field]: input,
      });

      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: "#1c1c1e" }]}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            Edit {fieldDisplayMap[field] || field}
          </Text>

          {/* Input */}
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={input}
            onChangeText={setInput}
            autoFocus
            placeholder="Enter value"
            placeholderTextColor="#999"
          />

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} disabled={loading}>
              <Text style={styles.save}>{loading ? "Saving..." : "Done"}</Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    width: "85%",
    borderRadius: 12,
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#2c2c2e",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cancel: {
    color: "#aaa",
    fontSize: 16,
  },

  save: {
    color: "#0A84FF",
    fontSize: 16,
    fontWeight: "600",
  },
});

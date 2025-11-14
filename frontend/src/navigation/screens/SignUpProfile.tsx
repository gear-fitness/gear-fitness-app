import { useNavigation, useTheme } from "@react-navigation/native";
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
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function SignUpProfileScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [heightInches, setHeightInches] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);

  const validateInputs = () => {
    const height = parseInt(heightInches);
    const weight = parseInt(weightLbs);
    const userAge = parseInt(age);

    if (!heightInches || !weightLbs || !age) {
      Alert.alert("Missing Information", "Please fill in all fields");
      return false;
    }

    if (isNaN(height) || height < 24 || height > 96) {
      Alert.alert(
        "Invalid Height",
        "Please enter a valid height between 24 and 96 inches (2-8 feet)"
      );
      return false;
    }

    if (isNaN(weight) || weight < 50 || weight > 500) {
      Alert.alert(
        "Invalid Weight",
        "Please enter a valid weight between 50 and 500 lbs"
      );
      return false;
    }

    if (isNaN(userAge) || userAge < 13 || userAge > 120) {
      Alert.alert("Invalid Age", "Please enter a valid age between 13 and 120");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      const authToken = await AsyncStorage.getItem("authToken");

      if (!authToken) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please log in again."
        );
        navigation.navigate("Login");
        return;
      }

      const response = await fetch("http://10.0.0.219:8080/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          heightInches: parseInt(heightInches),
          weightLbs: parseInt(weightLbs),
          age: parseInt(age),
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("Profile updated successfully:", userData);
        navigation.navigate("HomeTabs");
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert("Error", "An error occurred while updating your profile");
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingHorizontal: 20,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 10,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      marginBottom: 40,
      textAlign: "center",
      opacity: 0.7,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
    },
    submitButton: {
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 20,
    },
    submitButtonText: {
      fontSize: 18,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    disabledButton: {
      opacity: 0.6,
    },
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Complete Your Profile
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Help us personalize your fitness experience
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Height (inches)
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholder="e.g., 70 (5'10'')"
            placeholderTextColor={colors.text + "80"}
            keyboardType="numeric"
            value={heightInches}
            onChangeText={setHeightInches}
            maxLength={3}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Weight (lbs)
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholder="e.g., 180"
            placeholderTextColor={colors.text + "80"}
            keyboardType="numeric"
            value={weightLbs}
            onChangeText={setWeightLbs}
            maxLength={3}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Age</Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholder="e.g., 25"
            placeholderTextColor={colors.text + "80"}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
            maxLength={3}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: "#007AFF" },
            loading && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

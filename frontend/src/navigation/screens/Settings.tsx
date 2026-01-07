import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { useTrackTab } from "../../hooks/useTrackTab";

export function Settings() {
  useTrackTab("Settings");

  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 p-5 bg-white dark:bg-black">
      <Text className="text-2xl font-bold mb-7 text-black dark:text-white">Settings</Text>

      {user && (
        <View className="mb-7 p-4 rounded-lg bg-light-card dark:bg-dark-card">
          <Text className="text-base mb-2 text-black dark:text-white">Username: {user.username}</Text>
          <Text className="text-base mb-2 text-black dark:text-white">Email: {user.email}</Text>
        </View>
      )}

      <TouchableOpacity className="bg-red-500 p-4 rounded-lg items-center active:opacity-80" onPress={handleLogout}>
        <Text className="text-white text-base font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { useTrackTab } from "../../hooks/useTrackTab";
import SettingsRow from "../../components/Settings/SettingsRow";

export function Settings() {
  useTrackTab("Settings");

  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const { colors } = useTheme();

  // 🔥 Local toggle state (later connect to backend)
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false);
  const [muteNotifications, setMuteNotifications] = useState(false);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: "Onboarding" }],
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      {user && (
        <>
          {/* PROFILE */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Profile
          </Text>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <SettingsRow
              label="Username"
              value={user.username}
              textColor={colors.text}
              onPress={() => console.log("Edit username")}
            />

            <SettingsRow
              label="Email"
              value={user.email}
              textColor={colors.text}
              showArrow={false}
            />
          </View>

          {/* PERSONAL */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Personal
          </Text>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <SettingsRow
              label="Age"
              value={user.age ? user.age.toString() : "Not set"}
              textColor={colors.text}
              onPress={() => console.log("Edit age")}
            />

            <SettingsRow
              label="Weight"
              value={user.weightLbs ? `${user.weightLbs} lb` : "Not set"}
              textColor={colors.text}
              onPress={() => console.log("Edit weight")}
            />

            <SettingsRow
              label="Height"
              value={
                user.heightInches
                  ? `${Math.floor(user.heightInches / 12)}'${user.heightInches % 12}`
                  : "Not set"
              }
              textColor={colors.text}
              onPress={() => console.log("Edit height")}
            />
          </View>

          {/* PRIVACY */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Privacy
          </Text>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.toggleRow}>
              <Text style={[styles.label, { color: colors.text }]}>
                Private Account
              </Text>

              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: "#767577", true: "#007AFF" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* NOTIFICATIONS */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Notifications
          </Text>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.toggleRow}>
              <Text style={[styles.label, { color: colors.text }]}>
                Mute Notifications
              </Text>

              <Switch
                value={muteNotifications}
                onValueChange={setMuteNotifications}
                trackColor={{ false: "#767577", true: "#007AFF" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </>
      )}

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
  },

  section: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

  label: {
    fontSize: 16,
    fontWeight: "500",
  },

  logoutButton: {
    marginTop: 40,
    backgroundColor: "#ff3b30",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

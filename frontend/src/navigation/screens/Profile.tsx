import {
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text } from "@react-navigation/elements";
import setting from "../../assets/setting.png";
import avatar from "../../assets/avatar.png";
import { Image, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { getCurrentUserProfile, getUserFollowers } from "../../api/userService";
import { UserProfile, FollowerUser } from "../../api/types";
import { Ionicons } from "@expo/vector-icons";

export function Profile() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile data
      const profileData = await getCurrentUserProfile();
      setProfile(profileData);

      // Fetch followers
      const followersData = await getUserFollowers(profileData.userId);
      setFollowers(followersData);
    } catch (err) {
      console.error("Error loading profile:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
      Alert.alert("Error", "Failed to load profile data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Format height from inches to feet and inches
  const formatHeight = (heightInches: number | null): string => {
    if (!heightInches) return "N/A";
    const feet = Math.floor(heightInches / 12);
    const inches = heightInches % 12;
    return `${feet}' ${inches}"`;
  };

  const styles = StyleSheet.create({
    scrollContainer: {
      flex: 1,
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    container: {
      flex: 1,
      gap: 10,
      paddingHorizontal: 16,
    },
    upperSection: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    profilePicture: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: "#ccc",
    },
    badges: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    badge: {
      width: 50,
      height: 50,
      backgroundColor: "#333",
      borderRadius: 4,
    },
    profileCard: {
      borderRadius: 8,
      padding: 16,
      marginTop: 10,
    },
    username: {
      fontSize: 24,
      fontWeight: "bold",
    },
    handle: {
      fontSize: 14,
      color: "#999",
      marginBottom: 10,
    },
    bio: {
      fontSize: 14,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    statItem: {
      flex: 1,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 4,
    },
    statValue: {
      fontSize: 14,
      color: "#999",
    },
    friendsSection: {
      marginTop: 16,
    },
    friendsTitle: {
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 8,
    },
    friendsRow: {
      flexDirection: "row",
      gap: 16,
    },
    friend: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "#ccc",
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 16,
      marginBottom: 16,
    },
    dayItem: {
      alignItems: "center",
      flex: 1,
    },
    dayLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    dayCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "#eee",
    },
    dayActive: {
      backgroundColor: "#ffc107",
    },
    progressSection: {
      marginTop: 16,
    },
    progressTitle: {
      fontSize: 14,
      fontWeight: "bold",
      marginBottom: 8,
    },
    chartArea: {
      height: 150,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 4,
    },
    bar: {
      flex: 1,
      backgroundColor: "#0066cc",
      borderRadius: 4,
    },
  });

  // Show loading state
  if (loading) {
    return (
      <View
        style={[
          styles.scrollContainer,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  // Show error state
  if (error || !profile) {
    return (
      <View
        style={[
          styles.scrollContainer,
          { justifyContent: "center", alignItems: "center", padding: 20 },
        ]}
      >
        <Text style={{ fontSize: 18, marginBottom: 10 }}>
          Failed to load profile
        </Text>
        <Button onPress={loadProfileData}>Retry</Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.upperSection}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <View>
              <Image source={avatar} style={styles.profilePicture} />
            </View>
            <View>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.handle}>@{profile.username}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Settings");
            }}
          >
            <Ionicons
              name="settings-outline"
              size={40}
              color="#666"
              style={{ marginRight: 10, marginTop: 10 }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>
                {profile.weightLbs ? `${profile.weightLbs}lbs` : "N/A"}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Height</Text>
              <Text style={styles.statValue}>
                {formatHeight(profile.heightInches)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>{profile.age || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Completed Workouts</Text>
              <Text style={styles.statValue}>
                {profile.workoutStats.totalWorkouts}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Followers</Text>
              <Text style={styles.statValue}>{profile.followersCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Following</Text>
              <Text style={styles.statValue}>{profile.followingCount}</Text>
            </View>
          </View>

          <View style={styles.friendsSection}>
            <Text style={styles.friendsTitle}>
              Friends ({followers.length})
            </Text>
            <View style={styles.friendsRow}>
              {followers.slice(0, 5).map((follower) => (
                <View key={follower.userId} style={styles.friend}></View>
              ))}
              {followers.length === 0 && (
                <Text style={styles.statValue}>No followers yet</Text>
              )}
            </View>
          </View>

          <View style={styles.weekRow}>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Mon</Text>
              <View
                style={[
                  styles.dayCircle,
                  profile.workoutStats.weeklySplit.Mon > 0 && styles.dayActive,
                ]}
              ></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Tue</Text>
              <View
                style={[
                  styles.dayCircle,
                  profile.workoutStats.weeklySplit.Tue > 0 && styles.dayActive,
                ]}
              ></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Wed</Text>
              <View
                style={[
                  styles.dayCircle,
                  profile.workoutStats.weeklySplit.Wed > 0 && styles.dayActive,
                ]}
              ></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Thu</Text>
              <View
                style={[
                  styles.dayCircle,
                  profile.workoutStats.weeklySplit.Thu > 0 && styles.dayActive,
                ]}
              ></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Fri</Text>
              <View
                style={[
                  styles.dayCircle,
                  profile.workoutStats.weeklySplit.Fri > 0 && styles.dayActive,
                ]}
              ></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Sat</Text>
              <View
                style={[
                  styles.dayCircle,
                  profile.workoutStats.weeklySplit.Sat > 0 && styles.dayActive,
                ]}
              ></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Sun</Text>
              <View
                style={[
                  styles.dayCircle,
                  profile.workoutStats.weeklySplit.Sun > 0 && styles.dayActive,
                ]}
              ></View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

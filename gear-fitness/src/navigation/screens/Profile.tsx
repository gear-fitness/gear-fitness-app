import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text } from "@react-navigation/elements";
import setting from "../../assets/setting.png";
import { Image, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";

export function Profile() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const styles = StyleSheet.create({
    scrollContainer: {
      flex: 1,
      paddingTop: insets.top,
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

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.upperSection}>
          <View>
            <View style={styles.profilePicture}></View>
          </View>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Settings");
            }}
          >
            <Image
              source={setting}
              style={{ width: 45, height: 45, marginRight: 10, marginTop: 10 }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.username}>jonahmulcrone</Text>
          <Text style={styles.handle}>@hans</Text>
          <Text style={styles.bio}>
            everyone has thought of taking steroids at least once in their life.
            I think about it every day.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>185lbs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Height</Text>
              <Text style={styles.statValue}>5' 10</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>23</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Home Gym</Text>
              <Text style={styles.statValue}>Anytime Fitness</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Split</Text>
              <Text style={styles.statValue}>Push, Pull, Legs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Completed Workouts</Text>
              <Text style={styles.statValue}>154</Text>
            </View>
          </View>

          <View style={styles.friendsSection}>
            <Text style={styles.friendsTitle}>Friends (3)</Text>
            <View style={styles.friendsRow}>
              <View style={styles.friend}></View>
              <View style={styles.friend}></View>
              <View style={styles.friend}></View>
            </View>
          </View>

          <View style={styles.weekRow}>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Mon</Text>
              <View style={styles.dayCircle}></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Tue</Text>
              <View style={[styles.dayCircle, styles.dayActive]}></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Wed</Text>
              <View style={styles.dayCircle}></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Thu</Text>
              <View style={[styles.dayCircle, styles.dayActive]}></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Fri</Text>
              <View style={styles.dayCircle}></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Sat</Text>
              <View style={[styles.dayCircle, styles.dayActive]}></View>
            </View>
            <View style={styles.dayItem}>
              <Text style={styles.dayLabel}>Sun</Text>
              <View style={styles.dayCircle}></View>
            </View>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>Progress</Text>
            <View style={styles.chartArea}>
              <View style={[styles.bar, { height: 40 }]}></View>
              <View style={[styles.bar, { height: 50 }]}></View>
              <View style={[styles.bar, { height: 60 }]}></View>
              <View style={[styles.bar, { height: 55 }]}></View>
              <View style={[styles.bar, { height: 80 }]}></View>
              <View style={[styles.bar, { height: 95 }]}></View>
              <View style={[styles.bar, { height: 110 }]}></View>
              <View style={[styles.bar, { height: 120 }]}></View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

import { Button, Text } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  Touchable,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export function Home() {
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
      paddingHorizontal: 16,
      gap: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      alignSelf: "center",
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",

      marginTop: 8,
    },
    chart: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#e3f2fd",
      width: "100%",
      height: height * 0.25,
      borderRadius: 12,
      marginVertical: 8,
    },
    activityCards: {
      gap: 12,
      paddingBottom: 20,
    },
    activityCard: {
      backgroundColor: "white",
      padding: 16,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: "#666",
    },
    activityCardsTitle: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
  });

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Activity</Text>

        <View style={styles.chart}>
          <Text>This will be a chart</Text>
        </View>

        <View style={styles.activityCardsTitle}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("History");
            }}
          >
            <Text>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCards}>
          <View style={styles.activityCard}>
            <Text style={styles.cardTitle}>Morning Run</Text>
            <Text style={styles.cardSubtitle}>5.2 km • 32 min</Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.cardTitle}>Weight Training</Text>
            <Text style={styles.cardSubtitle}>45 min • Upper Body</Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.cardTitle}>Evening Walk</Text>
            <Text style={styles.cardSubtitle}>2.1 km • 25 min</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

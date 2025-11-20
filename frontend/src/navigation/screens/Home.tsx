import { Button, Text } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { useEffect, useState } from "react";

const { width, height } = Dimensions.get("window");

interface WeeklyVolumeData {
  weekStartDate: string;
  weekEndDate: string;
  totalVolumeLbs: number;
  workoutCount: number;
}

export function Home() {
  const userId = "550e8400-e29b-41d4-a716-446655440004"; // Alton's UUID
  const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/api/workouts`;

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [weeklyData, setWeeklyData] = useState<WeeklyVolumeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyVolume();
  }, []);

  const fetchWeeklyVolume = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/user/${userId}/weekly-volume?weeks=8`
      );

      if (response.ok) {
        const data = await response.json();
        setWeeklyData(data);
      } else {
        console.error("Failed to fetch weekly volume data");
      }
    } catch (error) {
      console.error("Error fetching weekly volume:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toFixed(0);
  };

  const getChartData = () => {
    if (weeklyData.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [
          {
            data: [0],
          },
        ],
      };
    }

    // Show up to 8 weeks of data
    const recentData = weeklyData.slice(-8);

    return {
      labels: recentData.map((item) => formatDate(item.weekStartDate)),
      datasets: [
        {
          data: recentData.map((item) => item.totalVolumeLbs),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#e3f2fd",
    backgroundGradientTo: "#bbdefb",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#1976d2",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#e0e0e0",
      strokeWidth: 1,
    },
  };

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
      borderRadius: 12,
      marginVertical: 8,
      overflow: "hidden",
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1976d2",
      marginTop: 12,
      marginBottom: 8,
      alignSelf: "center",
    },
    loadingContainer: {
      height: height * 0.25,
      justifyContent: "center",
      alignItems: "center",
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
          <Text style={styles.chartTitle}>Weekly Volume (lbs)</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976d2" />
            </View>
          ) : (
            <LineChart
              data={getChartData()}
              width={width - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              formatYLabel={(value) => formatVolume(Number(value))}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              withDots={true}
              withShadow={false}
            />
          )}
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

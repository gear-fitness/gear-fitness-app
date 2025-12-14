import { Text } from "@react-navigation/elements";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart } from "react-native-gifted-charts";
import { useEffect, useState } from "react";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { getDailyVolume, getUserWorkouts } from "../../api/workoutService";
import { DailyVolumeData, Workout } from "../../api/types";

const { width, height } = Dimensions.get("window");

export function Home() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [dailyData, setDailyData] = useState<DailyVolumeData[]>([]);
  const [prevWeekAvg, setPrevWeekAvg] = useState<number>(0);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data on initial mount
  useEffect(() => {
    fetchData();
  }, []);

  // Refetch data every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchDailyVolume(), fetchRecentWorkouts()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyVolume = async () => {
    if (!user?.userId) return;

    try {
      // Fetch 2 weeks of daily data (14 days)
      const data = await getDailyVolume(user.userId, 2, 'SUNDAY');

      // Split: current week (last 7 days) and previous week (days -14 to -7)
      const currentWeek = data.slice(-7);
      const previousWeek = data.slice(-14, -7);

      setDailyData(currentWeek);

      // Calculate previous week's average daily volume
      if (previousWeek.length > 0) {
        const sum = previousWeek.reduce(
          (acc, day) => acc + day.totalVolumeLbs,
          0
        );
        setPrevWeekAvg(sum / 7);
      }
    } catch (error) {
      console.error("Error fetching daily volume:", error);
    }
  };

  const fetchRecentWorkouts = async () => {
    if (!user?.userId) return;

    try {
      const workouts = await getUserWorkouts(user.userId);
      // Get the 3 most recent workouts
      const recent = workouts.slice(0, 3);
      setRecentWorkouts(recent);
    } catch (error) {
      console.error("Error fetching recent workouts:", error);
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toFixed(0);
  };

  const getBarChartData = () => {
    if (dailyData.length === 0) return [];

    return dailyData.map((item, index) => ({
      value: item.totalVolumeLbs,
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][index],
      frontColor: '#3B82F6',
      gradientColor: '#60A5FA',
    }));
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
          <Text style={styles.chartTitle}>Daily Volume (lbs)</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976d2" />
            </View>
          ) : dailyData.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={{ color: '#666' }}>No workout data available</Text>
            </View>
          ) : (
            <BarChart
              data={getBarChartData()}
              width={width - 64}
              height={220}
              barWidth={30}
              noOfSections={4}
              barBorderRadius={4}
              frontColor="#3B82F6"
              isAnimated
              animationDuration={500}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor="#e0e0e0"
              yAxisTextStyle={{ color: '#666' }}
              formatYLabel={(value: string) => formatVolume(Number(value))}
              showReferenceLine1={prevWeekAvg > 0}
              referenceLine1Position={prevWeekAvg}
              referenceLine1Config={{
                color: '#888888',
                dashWidth: 4,
                dashGap: 4,
                labelText: 'Prev Week Avg',
                labelTextStyle: { color: '#666', fontSize: 10 },
              }}
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
          {recentWorkouts.length > 0 ? (
            recentWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.workoutId}
                style={styles.activityCard}
                onPress={() => {
                  navigation.getParent()?.navigate("DetailedHistory", {
                    workoutId: workout.workoutId,
                  });
                }}
              >
                <Text style={styles.cardTitle}>{workout.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {workout.datePerformed}
                  {workout.durationMin && ` • ${workout.durationMin} min`}
                  {workout.bodyTag && ` • ${workout.bodyTag}`}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.activityCard}>
              <Text style={styles.cardSubtitle}>No recent workouts</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

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
  const [allDailyData, setAllDailyData] = useState<DailyVolumeData[]>([]);
  const [prevWeekAvg, setPrevWeekAvg] = useState<number>(0);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -1 = previous week, etc.
  const [weekDateRange, setWeekDateRange] = useState<string>('');

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
      // Fetch all workout data (weeks = 0 means fetch all from first workout)
      const data = await getDailyVolume(user.userId, 0, 'SUNDAY');
      setAllDailyData(data);

      // Initialize with current week (offset 0)
      updateWeekData(data, 0);
      setWeekOffset(0);
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

  const getVisibleWeek = (allData: DailyVolumeData[], offset: number) => {
    const totalDays = allData.length;
    const weeksAvailable = Math.floor(totalDays / 7);
    const clampedOffset = Math.max(-(weeksAvailable - 1), Math.min(0, offset));
    const endIndex = totalDays + (clampedOffset * 7);
    const startIndex = endIndex - 7;
    return allData.slice(startIndex, endIndex);
  };

  const getPreviousWeekAverage = (allData: DailyVolumeData[], offset: number) => {
    const totalDays = allData.length;
    const prevWeekEndIndex = totalDays + (offset * 7) - 7;
    const prevWeekStartIndex = prevWeekEndIndex - 7;
    if (prevWeekStartIndex < 0) return 0;
    const prevWeek = allData.slice(prevWeekStartIndex, prevWeekEndIndex);
    const sum = prevWeek.reduce((acc, day) => acc + day.totalVolumeLbs, 0);
    return sum / 7;
  };

  const getWeekDateRange = (weekData: DailyVolumeData[]) => {
    if (weekData.length === 0) return '';
    // Parse dates as local dates to avoid timezone issues
    const [startYear, startMonth, startDay] = weekData[0].date.split('-').map(Number);
    const [endYear, endMonth, endDay] = weekData[weekData.length - 1].date.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const updateWeekData = (data: DailyVolumeData[], offset: number) => {
    const visible = getVisibleWeek(data, offset);
    const avg = getPreviousWeekAverage(data, offset);
    const range = getWeekDateRange(visible);
    setDailyData(visible);
    setPrevWeekAvg(avg);
    setWeekDateRange(range);
  };

  const goToPreviousWeek = () => {
    const newOffset = weekOffset - 1;
    setWeekOffset(newOffset);
    updateWeekData(allDailyData, newOffset);
  };

  const goToNextWeek = () => {
    const newOffset = weekOffset + 1;
    setWeekOffset(newOffset);
    updateWeekData(allDailyData, newOffset);
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
      frontColor: '#007AFF',
      gradientColor: '#5AC8FA',
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
      gap: 12,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      alignSelf: "center",
      letterSpacing: -0.5,
      color: "#1a1a1a",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginTop: 4,
      color: "#333",
      letterSpacing: -0.3,
    },
    chart: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "white",
      width: "100%",
      borderRadius: 16,
      marginVertical: 8,
      paddingVertical: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#333",
      marginBottom: 2,
      alignSelf: "center",
      letterSpacing: 0.3,
    },
    loadingContainer: {
      height: 220,
      justifyContent: "center",
      alignItems: "center",
    },
    activityCards: {
      gap: 10,
      paddingBottom: 20,
    },
    activityCard: {
      backgroundColor: "white",
      padding: 14,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 3,
      color: "#1a1a1a",
    },
    cardSubtitle: {
      fontSize: 13,
      color: "#777",
      fontWeight: "400",
    },
    activityCardsTitle: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    seeAllButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    seeAllText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#007AFF",
    },
    weekNavigation: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginTop: 6,
      marginBottom: 12,
    },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: "#f5f5f5",
      justifyContent: "center",
      alignItems: "center",
    },
    navButtonDisabled: {
      backgroundColor: "#fafafa",
      opacity: 0.4,
    },
    navButtonText: {
      color: "#333",
      fontSize: 18,
      fontWeight: "600",
    },
    weekRangeText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#666",
      flex: 1,
      textAlign: "center",
      marginHorizontal: 12,
      letterSpacing: 0.2,
    },
    prevWeekAvgContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      marginBottom: 4,
    },
    refLineIndicator: {
      width: 20,
      height: 2,
      backgroundColor: "#FF6B6B",
      marginRight: 8,
    },
    prevWeekAvgText: {
      fontSize: 12,
      color: "#888",
      fontWeight: "400",
      letterSpacing: 0.1,
    },
  });

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Activity</Text>

        <View style={styles.chart}>
          <Text style={styles.chartTitle}>Daily Volume (lbs)</Text>
          <View style={styles.weekNavigation}>
            <TouchableOpacity
              onPress={goToPreviousWeek}
              disabled={weekOffset <= -(Math.floor(allDailyData.length / 7) - 1)}
              style={[
                styles.navButton,
                weekOffset <= -(Math.floor(allDailyData.length / 7) - 1) && styles.navButtonDisabled
              ]}
            >
              <Text style={styles.navButtonText}>←</Text>
            </TouchableOpacity>

            <Text style={styles.weekRangeText}>{weekDateRange}</Text>

            <TouchableOpacity
              onPress={goToNextWeek}
              disabled={weekOffset >= 0}
              style={[styles.navButton, weekOffset >= 0 && styles.navButtonDisabled]}
            >
              <Text style={styles.navButtonText}>→</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : dailyData.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={{ color: '#666' }}>No workout data available</Text>
            </View>
          ) : (
            <BarChart
              key={`chart-${weekOffset}-${dailyData[0]?.date}`}
              data={getBarChartData()}
              width={width - 80}
              height={220}
              barWidth={34}
              spacing={6}
              initialSpacing={12}
              endSpacing={12}
              disableScroll={true}
              noOfSections={3}
              barBorderRadius={8}
              frontColor="#007AFF"
              isAnimated
              animationDuration={400}
              yAxisThickness={0}
              xAxisThickness={0}
              hideRules={true}
              yAxisTextStyle={{ color: '#999', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#666', fontSize: 11, fontWeight: '500' }}
              formatYLabel={(value: string) => formatVolume(Number(value))}
              showReferenceLine1={prevWeekAvg > 0}
              referenceLine1Position={prevWeekAvg}
              referenceLine1Config={{
                color: '#FF6B6B',
                thickness: 1.5,
                dashWidth: 5,
                dashGap: 5,
                labelText: '',
                labelTextStyle: { fontSize: 0 },
              }}
            />
          )}
          {prevWeekAvg > 0 && (
            <View style={styles.prevWeekAvgContainer}>
              <View style={styles.refLineIndicator} />
              <Text style={styles.prevWeekAvgText}>
                Previous Week Avg: {formatVolume(prevWeekAvg)} lbs/day
              </Text>
            </View>
          )}
        </View>

        <View style={styles.activityCardsTitle}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => {
              navigation.navigate("History");
            }}
          >
            <Text style={styles.seeAllText}>See All</Text>
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

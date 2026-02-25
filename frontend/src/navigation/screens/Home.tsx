import {
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart } from "react-native-gifted-charts";
import { useEffect, useState } from "react";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { getDailyVolume, getUserWorkouts } from "../../api/workoutService";
import { DailyVolumeData, Workout } from "../../api/types";
import { parseLocalDate } from "../../utils/date";
import { useTrackTab } from "../../hooks/useTrackTab";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  History: undefined;
  DetailedHistory: {
    workoutId: string;
    caption?: string;
    workoutName?: string;
  };
};

export function Home() {
  useTrackTab("Home");

  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [dailyData, setDailyData] = useState<DailyVolumeData[]>([]);
  const [allDailyData, setAllDailyData] = useState<DailyVolumeData[]>([]);
  const [prevWeekAvg, setPrevWeekAvg] = useState<number>(0);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [weekDateRange, setWeekDateRange] = useState<string>("");

  // Derived values for hero card
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const weeklyTotal = dailyData.reduce((sum, d) => sum + d.totalVolumeLbs, 0);

  const thisWeekCount = (() => {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    sunday.setHours(0, 0, 0, 0);
    return recentWorkouts.filter(
      (w) => parseLocalDate(w.datePerformed) >= sunday
    ).length;
  })();

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    fetchData();
  }, []);

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
      const data = await getDailyVolume(user.userId, 0, "SUNDAY");
      setAllDailyData(data);
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
    const endIndex = totalDays + clampedOffset * 7;
    const startIndex = endIndex - 7;
    return allData.slice(startIndex, endIndex);
  };

  const getPreviousWeekAverage = (
    allData: DailyVolumeData[],
    offset: number
  ) => {
    const totalDays = allData.length;
    const prevWeekEndIndex = totalDays + offset * 7 - 7;
    const prevWeekStartIndex = prevWeekEndIndex - 7;
    if (prevWeekStartIndex < 0) return 0;
    const prevWeek = allData.slice(prevWeekStartIndex, prevWeekEndIndex);
    const sum = prevWeek.reduce((acc, day) => acc + day.totalVolumeLbs, 0);
    return sum / 7;
  };

  const getWeekDateRange = (weekData: DailyVolumeData[]) => {
    if (weekData.length === 0) return "";
    const [startYear, startMonth, startDay] = weekData[0].date
      .split("-")
      .map(Number);
    const [endYear, endMonth, endDay] = weekData[weekData.length - 1].date
      .split("-")
      .map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    return `${startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
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
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toFixed(0);
  };

  const getBarChartData = () => {
    if (dailyData.length === 0) return [];
    return dailyData.map((item, index) => ({
      value: item.totalVolumeLbs,
      label: ["S", "M", "T", "W", "T", "F", "S"][index],
      frontColor: "#007AFF",
      gradientColor: "#5AC8FA",
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
      paddingBottom: 20,
    },
    // ── Hero Card ──
    heroCard: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 4,
      overflow: "hidden",
    },
    greeting: {
      fontSize: 22,
      fontWeight: "700",
      color: isDarkMode ? "#FFFFFF" : "#1A3A5C",
      letterSpacing: -0.3,
    },
    todayLabel: {
      fontSize: 13,
      color: isDarkMode ? "rgba(255,255,255,0.55)" : "rgba(0,48,100,0.5)",
      marginTop: 2,
      marginBottom: 14,
      fontWeight: "500",
    },
    heroStats: {
      flexDirection: "row",
      alignItems: "center",
    },
    heroStatChip: {
      flex: 1,
      backgroundColor: "rgba(0,122,255,0.08)",
      borderRadius: 12,
      padding: 10,
      alignItems: "center",
    },
    heroStatChipDark: {
      backgroundColor: "rgba(255,255,255,0.10)",
    },
    heroStatValue: {
      fontSize: 18,
      fontWeight: "800",
      color: isDarkMode ? "#FFFFFF" : "#007AFF",
      letterSpacing: -0.5,
    },
    heroStatLabel: {
      fontSize: 9,
      fontWeight: "600",
      letterSpacing: 0.5,
      color: isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,48,100,0.5)",
      marginTop: 2,
      textTransform: "uppercase",
    },
    heroStatDivider: {
      width: 12,
    },
    // ── Chart ──
    chart: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDarkMode ? "#1A1A1A" : "white",
      width: "100%",
      borderRadius: 20,
      marginVertical: 4,
      paddingVertical: 16,
      shadowColor: "#007AFF",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.14 : 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: isDarkMode ? "#FFF" : "#333",
      marginBottom: 2,
      alignSelf: "center",
      letterSpacing: 0.3,
    },
    loadingContainer: {
      height: 220,
      justifyContent: "center",
      alignItems: "center",
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
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? "#2A2A2A" : "#f0f0f0",
      justifyContent: "center",
      alignItems: "center",
    },
    navButtonDisabled: {
      opacity: 0.35,
    },
    navButtonText: {
      color: isDarkMode ? "#FFF" : "#333",
      fontSize: 18,
      fontWeight: "600",
    },
    weekRangeText: {
      fontSize: 13,
      fontWeight: "600",
      color: isDarkMode ? "#DDD" : "#555",
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
      color: isDarkMode ? "#AAA" : "#888",
      fontWeight: "400",
      letterSpacing: 0.1,
    },
    // ── Recent Activity ──
    activityCardsTitle: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: isDarkMode ? "#FFF" : "#1a1a1a",
      letterSpacing: -0.3,
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
    activityCards: {
      gap: 10,
      paddingBottom: 20,
    },
    activityCard: {
      backgroundColor: isDarkMode ? "#1A1A1A" : "white",
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 14,
      shadowColor: "#007AFF",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.12 : 0.06,
      shadowRadius: 8,
      elevation: 3,
      overflow: "hidden",
      paddingRight: 16,
      paddingVertical: 14,
    },
    cardAccentBar: {
      width: 3,
      alignSelf: "stretch",
      borderRadius: 2,
      marginRight: 12,
    },
    cardLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDarkMode ? "#1C3A5C" : "#F0F4FF",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    cardIconText: {
      fontSize: 20,
    },
    cardInfo: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 3,
      color: isDarkMode ? "#FFF" : "#1a1a1a",
    },
    cardSubtitle: {
      fontSize: 13,
      color: isDarkMode ? "#888" : "#777",
      fontWeight: "400",
    },
    emptyCard: {
      backgroundColor: isDarkMode ? "#1A1A1A" : "white",
      padding: 14,
      borderRadius: 14,
    },
    emptyCardText: {
      fontSize: 13,
      color: isDarkMode ? "#666" : "#999",
    },
  });

  return (
    <ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* ── Hero Header Card ── */}
        <LinearGradient
          colors={
            isDarkMode
              ? ["#0A2A4A", "#051828"]
              : ["#E8F2FF", "#F5F9FF"]
          }
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.greeting}>
            {getGreeting()}
            {user?.username ? `, ${user.username}` : ""}
          </Text>
          <Text style={styles.todayLabel}>{todayLabel}</Text>
          {!loading && (
            <View style={styles.heroStats}>
              <View
                style={[
                  styles.heroStatChip,
                  isDarkMode && styles.heroStatChipDark,
                ]}
              >
                <Text style={styles.heroStatValue}>
                  {formatVolume(weeklyTotal)} lbs
                </Text>
                <Text style={styles.heroStatLabel}>VOLUME THIS WEEK</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View
                style={[
                  styles.heroStatChip,
                  isDarkMode && styles.heroStatChipDark,
                ]}
              >
                <Text style={styles.heroStatValue}>{thisWeekCount}</Text>
                <Text style={styles.heroStatLabel}>WORKOUTS THIS WEEK</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* ── Volume Chart Card ── */}
        <View style={styles.chart}>
          <Text style={styles.chartTitle}>Volume Tracker</Text>
          <View style={styles.weekNavigation}>
            <TouchableOpacity
              onPress={goToPreviousWeek}
              disabled={
                weekOffset <= -(Math.floor(allDailyData.length / 7) - 1)
              }
              style={[
                styles.navButton,
                weekOffset <= -(Math.floor(allDailyData.length / 7) - 1) &&
                  styles.navButtonDisabled,
              ]}
            >
              <Text style={styles.navButtonText}>←</Text>
            </TouchableOpacity>

            <Text style={styles.weekRangeText}>{weekDateRange}</Text>

            <TouchableOpacity
              onPress={goToNextWeek}
              disabled={weekOffset >= 0}
              style={[
                styles.navButton,
                weekOffset >= 0 && styles.navButtonDisabled,
              ]}
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
              <Text style={{ color: "#666" }}>No workout data available</Text>
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
              yAxisTextStyle={{
                color: isDarkMode ? "#FFF" : "#999",
                fontSize: 10,
              }}
              xAxisLabelTextStyle={{
                color: isDarkMode ? "#FFF" : "#666",
                fontSize: 11,
                fontWeight: "500",
              }}
              formatYLabel={(value: string) => formatVolume(Number(value))}
              showReferenceLine1={prevWeekAvg > 0}
              referenceLine1Position={prevWeekAvg}
              referenceLine1Config={{
                color: "#FF6B6B",
                thickness: 1.5,
                dashWidth: 5,
                dashGap: 5,
                labelText: "",
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

        {/* ── Recent Activity ── */}
        <View style={styles.activityCardsTitle}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate("History")}
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
                activeOpacity={0.7}
                onPress={() => {
                  navigation.getParent()?.navigate("DetailedHistory", {
                    workoutId: workout.workoutId,
                  });
                }}
              >
                <View
                  style={[
                    styles.cardAccentBar,
                    { backgroundColor: "#007AFF" },
                  ]}
                />
                <View style={styles.cardLeft}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>🏋️</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{workout.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {parseLocalDate(workout.datePerformed).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDarkMode ? "#555" : "#C7C7CC"}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No recent workouts</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

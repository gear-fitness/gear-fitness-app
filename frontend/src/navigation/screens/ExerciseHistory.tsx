import { Text } from "@react-navigation/elements";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";

import {
  getExerciseHistory,
  ExerciseHistory as ExerciseHistoryType,
  ExerciseSession,
} from "../../api/exerciseService";
import {
  formatPrimaryBodyParts,
  renderBodyParts,
} from "../../utils/exerciseUtils";

const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 24, right: 20, bottom: 30, left: 50 };

type TimeScope = "1m" | "3m" | "1y" | "all";
type ChartType = "pr" | "volume" | "session_max";

const TIME_SCOPES: { key: TimeScope; label: string }[] = [
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "ALL" },
];

const CHART_TITLES: Record<ChartType, string> = {
  pr: "PR Over Time",
  volume: "Session Volume Over Time",
  session_max: "Heaviest Weight Per Session",
};

const CHART_UNITS: Record<ChartType, string> = {
  pr: "lbs",
  volume: "total lbs",
  session_max: "lbs",
};

export function ExerciseHistory() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const exercise = route.params?.exercise;
  const isDark = useColorScheme() === "dark";
  const chartPagerRef = useRef<FlatList>(null);

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    card: isDark ? "#1c1c1e" : "#f7f7f7",
    accent: isDark ? "#fff" : "#000",
    pr: "#FFD700",
    chartGrid: isDark ? "#333" : "#e0e0e0",
    prLine: "#FFD700",
    prDotColor: "#FFD700",
    volumeLine: "#34C759",
    volumeDotColor: "#34C759",
    sessionMaxLine: isDark ? "#fff" : "#000",
    sessionMaxDotColor: isDark ? "#fff" : "#000",
    scopeActive: isDark ? "#fff" : "#000",
    scopeInactive: isDark ? "#1c1c1e" : "#f0f0f0",
    scopeTextActive: isDark ? "#000" : "#fff",
    scopeTextInactive: isDark ? "#aaa" : "#666",
  };

  const CHART_COLORS: Record<ChartType, { line: string; dot: string }> = {
    pr: { line: colors.prLine, dot: colors.prDotColor },
    volume: { line: colors.volumeLine, dot: colors.volumeDotColor },
    session_max: {
      line: colors.sessionMaxLine,
      dot: colors.sessionMaxDotColor,
    },
  };

  const [history, setHistory] = useState<ExerciseHistoryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeScope, setTimeScope] = useState<TimeScope>("all");
  const [activeChartIndex, setActiveChartIndex] = useState(0);

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 70;

  const chartTypes: ChartType[] = ["pr", "session_max", "volume"];
  const activeChart = chartTypes[activeChartIndex];

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getExerciseHistory(exercise.exerciseId);
        setHistory(data);
      } catch (err) {
        console.error("Failed to load exercise history:", err);
        setError("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [exercise.exerciseId]);

  // Filter sessions by time scope
  const scopedSessions = useMemo(() => {
    if (!history) return [];
    const now = new Date();
    let cutoff: Date | null = null;

    if (timeScope === "1m") {
      cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
    } else if (timeScope === "3m") {
      cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 3);
    } else if (timeScope === "1y") {
      cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    }

    return history.sessions.filter((s) => {
      if (cutoff) {
        const d = new Date(s.datePerformed + "T00:00:00");
        return d >= cutoff;
      }
      return true;
    });
  }, [history, timeScope]);

  // Helper: get max weight from a session
  const getSessionMax = (session: ExerciseSession): number => {
    const weights = session.sets
      .filter((s) => s.weightLbs != null)
      .map((s) => s.weightLbs!);
    if (weights.length === 0) return 0;
    return Math.max(...weights);
  };

  // Chart data: PR over time (running max — only goes up)
  const prChartData = useMemo(() => {
    if (scopedSessions.length === 0) return [];
    const chronological = [...scopedSessions].reverse();
    let runningMax = 0;
    return chronological
      .map((session) => {
        const sessionMax = getSessionMax(session);
        if (sessionMax > runningMax) runningMax = sessionMax;
        return { date: session.datePerformed, value: runningMax };
      })
      .filter((d) => d.value > 0);
  }, [scopedSessions]);

  // Chart data: session max (heaviest weight that day — goes up AND down)
  const sessionMaxChartData = useMemo(() => {
    if (scopedSessions.length === 0) return [];
    return [...scopedSessions]
      .reverse()
      .map((session) => ({
        date: session.datePerformed,
        value: getSessionMax(session),
      }))
      .filter((d) => d.value > 0);
  }, [scopedSessions]);

  // Chart data: volume
  const volumeChartData = useMemo(() => {
    if (scopedSessions.length === 0) return [];
    return [...scopedSessions]
      .reverse()
      .map((session) => {
        const totalVolume = session.sets.reduce(
          (sum, s) => sum + (s.weightLbs || 0) * (s.reps || 0),
          0,
        );
        return { date: session.datePerformed, value: totalVolume };
      })
      .filter((d) => d.value > 0);
  }, [scopedSessions]);

  // Derive best volume set
  const bestVolume = useMemo(() => {
    if (!history) return null;
    let best = 0;
    history.sessions.forEach((session) => {
      session.sets.forEach((s) => {
        if (s.weightLbs && s.reps) {
          const vol = s.weightLbs * s.reps;
          if (vol > best) best = vol;
        }
      });
    });
    return best > 0 ? best : null;
  }, [history]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDateFull = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatVolume = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return `${v}`;
  };

  // Handle chart page change
  const onChartScroll = (e: any) => {
    const pageIndex = Math.round(e.nativeEvent.contentOffset.x / chartWidth);
    setActiveChartIndex(Math.min(pageIndex, chartTypes.length - 1));
  };

  // Render a single chart
  const renderChart = (
    data: { date: string; value: number }[],
    type: ChartType,
  ) => {
    if (data.length < 2) {
      return (
        <View
          style={[
            styles.chartPlaceholder,
            { width: chartWidth, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.chartPlaceholderText, { color: colors.subtle }]}>
            Need at least 2 sessions to show chart
          </Text>
        </View>
      );
    }

    const { line: lineColor, dot: dotColor } = CHART_COLORS[type];

    const drawWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
    const drawHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

    const values = data.map((d) => d.value);
    const minV = Math.floor(Math.min(...values) * 0.9);
    const maxV = Math.ceil(Math.max(...values) * 1.1);
    const range = maxV - minV || 1;

    const points = data.map((d, i) => {
      const x = CHART_PADDING.left + (i / (data.length - 1)) * drawWidth;
      const y =
        CHART_PADDING.top +
        drawHeight -
        ((d.value - minV) / range) * drawHeight;
      return { x, y, ...d };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

    const yTicks = Array.from({ length: 5 }, (_, i) => {
      const val = minV + (range * i) / 4;
      const y =
        CHART_PADDING.top + drawHeight - ((val - minV) / range) * drawHeight;
      return { val: Math.round(val), y };
    });

    const xIndices =
      data.length <= 3
        ? data.map((_, i) => i)
        : [0, Math.floor(data.length / 2), data.length - 1];
    const xLabels = xIndices
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((i) => ({
        label: formatDate(data[i].date),
        x: points[i].x,
      }));

    return (
      <View style={{ width: chartWidth }}>
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          {yTicks.map((tick, i) => (
            <Line
              key={`grid-${i}`}
              x1={CHART_PADDING.left}
              y1={tick.y}
              x2={chartWidth - CHART_PADDING.right}
              y2={tick.y}
              stroke={colors.chartGrid}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}
          {yTicks.map((tick, i) => (
            <SvgText
              key={`ylabel-${i}`}
              x={CHART_PADDING.left - 8}
              y={tick.y + 4}
              fontSize={11}
              fill={colors.subtle}
              textAnchor="end"
            >
              {type === "volume" ? formatVolume(tick.val) : tick.val}
            </SvgText>
          ))}
          {xLabels.map((label, i) => (
            <SvgText
              key={`xlabel-${i}`}
              x={label.x}
              y={CHART_HEIGHT - 5}
              fontSize={11}
              fill={colors.subtle}
              textAnchor="middle"
            >
              {label.label}
            </SvgText>
          ))}
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill={dotColor} />
          ))}
        </Svg>
      </View>
    );
  };

  const renderSession = (session: ExerciseSession, index: number) => {
    const hasPr = session.sets.some((s) => s.isPr);

    return (
      <View
        key={session.workoutId + index}
        style={[styles.sessionCard, { backgroundColor: colors.card }]}
      >
        <View style={styles.sessionHeader}>
          <View>
            <Text style={[styles.sessionDate, { color: colors.text }]}>
              {formatDateFull(session.datePerformed)}
            </Text>
            <Text style={[styles.sessionWorkout, { color: colors.subtle }]}>
              {session.workoutName}
            </Text>
          </View>
          {hasPr && (
            <View style={styles.prBadge}>
              <Text style={styles.prBadgeText}>PR</Text>
            </View>
          )}
        </View>

        <View style={styles.setsTable}>
          <View style={styles.setsHeaderRow}>
            <Text
              style={[
                styles.setsHeaderCell,
                styles.setNumCol,
                { color: colors.subtle },
              ]}
            >
              SET
            </Text>
            <Text
              style={[
                styles.setsHeaderCell,
                styles.weightCol,
                { color: colors.subtle },
              ]}
            >
              WEIGHT
            </Text>
            <Text
              style={[
                styles.setsHeaderCell,
                styles.xCol,
                { color: colors.subtle },
              ]}
            >
              X
            </Text>
            <Text
              style={[
                styles.setsHeaderCell,
                styles.repsCol,
                { color: colors.subtle },
              ]}
            >
              REPS
            </Text>
          </View>

          {session.sets.map((set) => (
            <View key={set.setNumber} style={styles.setRow}>
              <Text
                style={[
                  styles.setCell,
                  styles.setNumCol,
                  { color: colors.subtle },
                ]}
              >
                {set.setNumber}
              </Text>
              <Text
                style={[
                  styles.setCell,
                  styles.weightCol,
                  { color: colors.text },
                ]}
              >
                {set.weightLbs != null ? `${set.weightLbs} lbs` : "—"}
              </Text>
              <Text
                style={[styles.setCell, styles.xCol, { color: colors.text }]}
              >
                x
              </Text>
              <View style={[styles.repsContainer, styles.repsCol]}>
                <Text style={[styles.setCell, { color: colors.text }]}>
                  {set.reps}
                </Text>
                {set.isPr && <Text style={styles.prDot}>🏆</Text>}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.bg },
        ]}
        edges={["bottom"]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.bg },
        ]}
        edges={["bottom"]}
      >
        <Text style={[styles.errorText, { color: colors.subtle }]}>
          {error}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backLink, { color: colors.accent }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const chartPages: {
    key: ChartType;
    data: { date: string; value: number }[];
  }[] = [
    { key: "pr", data: prChartData },
    { key: "session_max", data: sessionMaxChartData },
    { key: "volume", data: volumeChartData },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["bottom"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>
            {history?.exerciseName || exercise.name}
          </Text>
          <Text style={[styles.bodyPart, { color: colors.accent }]}>
            {renderBodyParts(history.bodyParts, colors.subtle, colors.accent)}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {history?.totalSessions || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtle }]}>
              Sessions
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {history?.personalRecordLbs
                ? `${history.personalRecordLbs}`
                : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtle }]}>
              PR (lbs)
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {bestVolume ? bestVolume.toLocaleString() : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subtle }]}>
              Best Vol
            </Text>
          </View>
        </View>

        {/* Time Scope Buttons */}
        <View style={styles.scopeRow}>
          {TIME_SCOPES.map((scope) => (
            <TouchableOpacity
              key={scope.key}
              style={[
                styles.scopeButton,
                {
                  backgroundColor:
                    timeScope === scope.key
                      ? colors.scopeActive
                      : colors.scopeInactive,
                },
              ]}
              onPress={() => setTimeScope(scope.key)}
            >
              <Text
                style={[
                  styles.scopeButtonText,
                  {
                    color:
                      timeScope === scope.key
                        ? colors.scopeTextActive
                        : colors.scopeTextInactive,
                  },
                ]}
              >
                {scope.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Card */}
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <View style={styles.chartTitleRow}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {CHART_TITLES[activeChart]}
            </Text>
            <Text style={[styles.chartUnit, { color: colors.subtle }]}>
              {CHART_UNITS[activeChart]}
            </Text>
          </View>

          {/* Swipeable Charts */}
          <FlatList
            ref={chartPagerRef}
            data={chartPages}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onChartScroll}
            renderItem={({ item }) => renderChart(item.data, item.key)}
            getItemLayout={(_, index) => ({
              length: chartWidth,
              offset: chartWidth * index,
              index,
            })}
          />

          {/* Page Dots */}
          <View style={styles.pageDots}>
            {chartTypes.map((type, i) => (
              <View
                key={type}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      activeChartIndex === i
                        ? CHART_COLORS[type].line
                        : colors.border,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              History
            </Text>
          </View>

          {scopedSessions.length > 0 ? (
            scopedSessions.map((session, i) => renderSession(session, i))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.subtle }]}>
                No history yet. Complete a workout with this exercise to see
                your progress!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  titleSection: {
    marginVertical: 20,
  },

  exerciseName: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },

  bodyPart: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
  },

  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  scopeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  scopeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },

  scopeButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },

  chartCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    overflow: "hidden",
  },

  chartTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
  },

  chartUnit: {
    fontSize: 12,
    fontWeight: "600",
  },

  chartPlaceholder: {
    height: CHART_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },

  chartPlaceholderText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  pageDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  historySection: {
    marginBottom: 20,
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  sessionDate: {
    fontSize: 16,
    fontWeight: "700",
  },

  sessionWorkout: {
    fontSize: 13,
    marginTop: 2,
  },

  prBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  prBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
  },

  setsTable: {},

  setsHeaderRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  setsHeaderCell: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  setRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },

  setCell: {
    fontSize: 16,
  },

  setNumCol: {
    width: 40,
  },

  weightCol: {
    width: 50,
  },

  xCol: {
    width: 20,
    textAlign: "center",
  },

  repsCol: {
    width: 50,
  },

  repsContainer: {
    flexDirection: "row",
    gap: 6,
  },

  prDot: {
    fontSize: 14,
  },

  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },

  backLink: {
    fontSize: 16,
    fontWeight: "600",
  },
});

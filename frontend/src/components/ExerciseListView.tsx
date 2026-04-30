import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { Exercise } from "../api/exerciseService";
import { useExerciseFilter } from "../hooks/useExerciseFilter";
import { ExerciseFilterBar } from "./ExerciseFilterBar";
import { ExerciseCard } from "./ExerciseCard";

interface ExerciseListViewProps {
  exercises: Exercise[];
  onExercisePress: (exercise: Exercise) => void;
  onCreateExercise?: () => void;
  ListFooterComponent?: React.ReactElement;
  loading?: boolean;
}

const SKELETON_ROW_COUNT = 6;

function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

function ExerciseCardSkeleton({ skeletonColor }: { skeletonColor: string }) {
  const opacity = useSkeletonPulse();
  return (
    <Animated.View
      style={[styles.skeletonCard, { borderColor: skeletonColor, opacity }]}
    >
      <View style={styles.skeletonInfo}>
        <View
          style={[
            styles.skeletonBlock,
            { width: "55%", height: 16, backgroundColor: skeletonColor },
          ]}
        />
        <View
          style={[
            styles.skeletonBlock,
            {
              width: "35%",
              height: 12,
              marginTop: 8,
              backgroundColor: skeletonColor,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

export function ExerciseListView({
  exercises,
  onExercisePress,
  onCreateExercise,
  ListFooterComponent,
  loading = false,
}: ExerciseListViewProps) {
  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#000" : "#fff",
    text: isDark ? "#fff" : "#000",
    subtle: isDark ? "#aaa" : "#666",
    border: isDark ? "#333" : "#e0e0e0",
    skeleton: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  };

  const {
    searchQuery,
    setSearchQuery,
    selectedBodyPart,
    setSelectedBodyPart,
    bodyParts,
    sections,
  } = useExerciseFilter(exercises);

  const footer = (
    <>
      {onCreateExercise && (
        <TouchableOpacity
          onPress={onCreateExercise}
          style={[styles.createButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.createButtonText, { color: colors.subtle }]}>
            + Create Custom Exercise
          </Text>
          <Text style={[styles.createButtonHint, { color: colors.border }]}>
            Don't see your exercise? Add it here
          </Text>
        </TouchableOpacity>
      )}
      {ListFooterComponent}
    </>
  );

  return (
    <>
      <View style={{ paddingHorizontal: 16 }}>
        <ExerciseFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          bodyParts={bodyParts}
          selectedBodyPart={selectedBodyPart}
          onSelectBodyPart={setSelectedBodyPart}
        />
      </View>

      {loading ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <ExerciseCardSkeleton key={i} skeletonColor={colors.skeleton} />
          ))}
        </View>
      ) : (
        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(item) => item.exerciseId}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          stickySectionHeadersEnabled
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={[styles.sectionHeader, { backgroundColor: colors.bg }]}
            >
              <Text
                style={[styles.sectionHeaderText, { color: colors.subtle }]}
              >
                {title}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.subtle }]}>
                {sections.find((s) => s.title === title)?.data.length || 0}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ExerciseCard
              exercise={item}
              onPress={() => onExercisePress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListFooterComponent={footer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No exercises found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtle }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  createButton: {
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 4,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  createButtonHint: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },

  skeletonList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  skeletonCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  skeletonInfo: {
    flexDirection: "column",
  },
  skeletonBlock: {
    borderRadius: 4,
  },
});

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Button, Host, Image, Menu } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import { Text } from "../../components/Text";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { deleteRoutine, getUserRoutines } from "../../api/routineService";
import { Routine } from "../../api/types";
import { formatDayAbbrev } from "../../utils/days";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useTrackTab } from "../../hooks/useTrackTab";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { useTier } from "../../hooks/useTier";

const CARD_RADIUS = 24;

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

function RoutineCardSkeleton({
  surface,
  border,
  skeleton,
  glassAvailable,
}: {
  surface: string;
  border: string;
  skeleton: string;
  glassAvailable: boolean;
}) {
  const opacity = useSkeletonPulse();
  const inner = (
    <View style={styles.cardContent}>
      <Animated.View
        style={{
          width: "60%",
          height: 22,
          borderRadius: 6,
          backgroundColor: skeleton,
          opacity,
        }}
      />
      <Animated.View
        style={{
          width: 140,
          height: 11,
          borderRadius: 3,
          backgroundColor: skeleton,
          opacity,
        }}
      />
    </View>
  );
  return (
    <View style={styles.shadowWrapper}>
      {glassAvailable ? (
        <GlassView style={styles.card} glassEffectStyle="regular">
          {inner}
        </GlassView>
      ) : (
        <View
          style={[
            styles.card,
            styles.cardFallback,
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          {inner}
        </View>
      )}
    </View>
  );
}

// Native options menu on the card's 3-dot button, matching the calorie
// tracker's CameraLogMenu: on iOS a real SwiftUI Menu anchored to the ellipsis
// icon, elsewhere a plain button. Both paths end at the caller's confirm
// alert, so the destructive menu row is safe to tap.
function RoutineCardMenu({
  color,
  onDeletePress,
}: {
  color: string;
  onDeletePress: () => void;
}) {
  if (Platform.OS !== "ios") {
    return (
      <TouchableOpacity
        accessibilityLabel="More options"
        hitSlop={10}
        style={styles.dotsBtn}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onDeletePress();
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={color} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.dotsBtn} accessibilityLabel="More options">
      <Host style={styles.menuHost}>
        <Menu
          label={
            <Image
              systemName="ellipsis"
              size={17}
              color={color}
              modifiers={[frame({ width: 28, height: 28 })]}
            />
          }
        >
          <Button
            label="Delete Routine"
            systemImage="trash"
            role="destructive"
            onPress={onDeletePress}
          />
        </Menu>
      </Host>
    </View>
  );
}

export function RoutineList() {
  useTrackTab("RoutineList");
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const glassAvailable = isLiquidGlassAvailable();
  const insets = useSafeAreaInsets();
  const { atLeast } = useTier();
  const isPlus = atLeast("PLUS");

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserRoutines();
      setRoutines(data);
    } catch (err) {
      console.error("Failed to fetch routines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [fetchRoutines]),
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteRoutine(id);
      setRoutines((prev) => prev.filter((r) => r.routineId !== id));
    } catch {
      fetchRoutines();
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Routine",
      "Are you sure you want to delete this routine?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(id),
        },
      ],
    );
  };

  const renderCard = ({ item }: { item: Routine }) => {
    const dayLabel =
      item.scheduledDays.length > 0
        ? item.scheduledDays.map(formatDayAbbrev).join(", ")
        : "";

    // The pressable is a child of the glass, not a sibling under it: children
    // mount into the effect view's contentView, the surface UIKit routes
    // touches through. The pressable also must not wrap the glass, since a
    // glass effect under an alpha-animating ancestor renders as nothing.
    //
    // The dots menu is a sibling of the pressable, not a child: an RN
    // touchable ancestor claims taps through the JS responder system, which
    // leaves the SwiftUI Menu opening only on long press.
    const cardInner = (
      <>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() =>
            navigation.navigate("RoutineDetail", {
              routineId: item.routineId,
            })
          }
          activeOpacity={0.7}
        >
          <Text
            style={[styles.cardTitle, { color: colors.text }]}
            maxFontSizeMultiplier={1}
          >
            {item.name}
          </Text>
          {dayLabel !== "" && (
            <Text
              style={[styles.dayLabel, { color: colors.secondary }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {dayLabel.toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
        <RoutineCardMenu
          color={colors.secondary}
          onDeletePress={() => confirmDelete(item.routineId)}
        />
      </>
    );

    return (
      <View style={styles.shadowWrapper}>
        {glassAvailable ? (
          <GlassView style={styles.card} glassEffectStyle="regular">
            {cardInner}
          </GlassView>
        ) : (
          <View
            style={[
              styles.card,
              styles.cardFallback,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {cardInner}
          </View>
        )}
      </View>
    );
  };

  const handleAddPress = () => {
    if (!isPlus && routines.length >= 3) {
      navigation.navigate("PlusUpsell", {
        feature: "Create unlimited routines with Plus",
      });
      return;
    }
    navigation.navigate("CreateRoutine");
  };

  const renderAddCard = () => (
    <TouchableOpacity
      style={[styles.addCard, { borderColor: colors.dashedBorder }]}
      onPress={handleAddPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.addCardPlus, { color: colors.dashedBorder }]}>
        +
      </Text>
    </TouchableOpacity>
  );

  const ListHeader = (
    <>
      <Text
        style={[
          styles.heroTitle,
          { color: colors.text, marginTop: insets.top + 60 },
        ]}
      >
        Routines
      </Text>
      {renderAddCard()}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        style={[styles.container, { backgroundColor: colors.appBg }]}
      >
        <FloatingCloseButton direction="left" accessibilityLabel="Back" />
        <View style={styles.listContent}>
          {ListHeader}
          {[0, 1, 2].map((i) => (
            <RoutineCardSkeleton
              key={i}
              surface={colors.surface}
              border={colors.cardBorder}
              skeleton={colors.skeleton}
              glassAvailable={glassAvailable}
            />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[styles.container, { backgroundColor: colors.appBg }]}
    >
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      <FlatList
        data={routines}
        keyExtractor={(item) => item.routineId}
        renderItem={renderCard}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 14,
  },
  shadowWrapper: {
    borderRadius: CARD_RADIUS,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  card: {
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  cardFallback: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardContent: {
    padding: 20,
    height: 120,
    justifyContent: "center",
    gap: 6,
  },
  dotsBtn: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  menuHost: {
    width: 28,
    height: 28,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  addCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 2,
    borderStyle: "dashed",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  addCardPlus: {
    fontSize: 48,
    fontWeight: "200",
    lineHeight: 56,
  },
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Linking,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useNutrition } from "../../../../context/NutritionContext";
import { createCustomFood } from "../../../../api/nutritionService";
import { FoodLogEntry } from "../../../../api/types";
import { BottomSheet } from "../../../../components/BottomSheet";
import { MacroRing } from "./MacroRing";
import { faviconOf, hostOf } from "./sources";

/**
 * Everything the food journal knows about one logged line: the created
 * entries (one per parsed food), Sonar's reasoning + confidence, the sources it
 * cited, and whether the parse was replayed from cache.
 */
export interface AiLineDetail {
  entries: FoodLogEntry[];
  reasoning: string;
  confidence: number;
  sourceUrls: string[];
  fromCache: boolean;
}

const round = (n: number | null | undefined) => Math.round(n ?? 0);
const round1 = (n: number | null | undefined) => Math.round((n ?? 0) * 10) / 10;

// Parsed descriptions carry portion details in parens — "Ribeye steak (112 g,
// 1 serving, cooked)". The item row shows just the name; the thought-process
// paragraph already covers the portion assumptions.
const foodNameOf = (description: string): string => {
  const name = description.split("(")[0].trim();
  return name || description;
};

// Smooth the per-item / references expand so it eases instead of snapping,
// matching CalorieTracker's collapse toggles (~220ms easeInEaseOut). On Android
// LayoutAnimation needs UIManager.setLayoutAnimationEnabledExperimental, which
// CalorieTracker already enables app-wide, so we don't repeat it here.
const animateExpand = () =>
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      220,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ),
  );

/** Confidence bucket → label + color, mirroring the recording's "Very High". */
function confidenceLabel(c: number): { label: string; color: string } {
  if (c >= 85) return { label: "Very High", color: "#22C55E" };
  if (c >= 70) return { label: "High", color: "#22C55E" };
  if (c >= 50) return { label: "Moderate", color: "#F59E0B" };
  if (c >= 30) return { label: "Low", color: "#F59E0B" };
  return { label: "Very Low", color: "#EF4444" };
}

/**
 * Tap-to-reveal detail for one AI-logged food line: total + macro summary,
 * a per-item breakdown (each expandable to its own macros), "Gear's thought
 * process" (confidence ring + reasoning + edit affordance), and the web sources
 * Sonar cited. Mirrors the layout in the calorie-tracker screen recording.
 */
export function NutritionDetailSheet({
  visible,
  foodText,
  detail,
  onClose,
  onClosed,
  onEditEntry,
}: {
  visible: boolean;
  foodText: string;
  detail: AiLineDetail | null;
  onClose: () => void;
  onClosed?: () => void;
  /** Open the shared edit sheet for one of this line's food entries. */
  onEditEntry: (entry: FoodLogEntry) => void;
}) {
  const t = useThemeColors();
  const { summary } = useNutrition();
  const goal = summary?.goal;
  const [menuOpen, setMenuOpen] = useState(false);
  // The sheet is content-sized, so cap the scroll area to a slice of the screen
  // (a percentage would resolve against the auto height and never scroll).
  // Read live so it stays correct across iPad rotation / split view.
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = windowHeight * 0.82;

  // Resolve liquid-glass support once; every card + header circle falls back to
  // a plain surface when it's unavailable (older iOS / Android).
  const glassAvailable = isLiquidGlassAvailable();

  // Reset the ⋯ menu whenever the sheet is hidden so it never reopens stale.
  if (!visible && menuOpen) setMenuOpen(false);

  // Retain the last non-null detail (and its heading) through BottomSheet's
  // close animation: the caller nulls detail on close, so rendering from the
  // held copy keeps the content intact while the sheet slides down instead of
  // leaving an empty sliver.
  const lastDetailRef = useRef<AiLineDetail | null>(null);
  if (detail) lastDetailRef.current = detail;
  const heldDetail = detail ?? lastDetailRef.current;

  const lastFoodTextRef = useRef<string>("");
  if (detail) lastFoodTextRef.current = foodText;
  const heldFoodText = lastFoodTextRef.current;

  const totals = useMemo(() => {
    const e = heldDetail?.entries ?? [];
    return {
      calories: e.reduce((s, x) => s + (x.calories ?? 0), 0),
      proteinG: e.reduce((s, x) => s + (x.proteinG ?? 0), 0),
      carbsG: e.reduce((s, x) => s + (x.carbsG ?? 0), 0),
      fatG: e.reduce((s, x) => s + (x.fatG ?? 0), 0),
    };
  }, [heldDetail]);

  // "Save to Favorites": snapshot this line (its typed text + summed nutrition) as
  // a reusable custom food. Once saved, the menu item reads as a receipt for
  // the rest of this viewing; a fresh open can save again (e.g. after edits).
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealSaved, setMealSaved] = useState(false);
  useEffect(() => {
    if (visible) setMealSaved(false);
  }, [visible]);

  const saveAsMeal = async () => {
    if (!heldDetail || savingMeal || mealSaved) return;
    setSavingMeal(true);
    try {
      await createCustomFood({
        description: heldFoodText.trim() || "Saved meal",
        calories: totals.calories,
        proteinG: totals.proteinG,
        carbsG: totals.carbsG,
        fatG: totals.fatG,
      });
      setMealSaved(true);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch (err) {
      console.error("Failed to save meal:", err);
      Alert.alert("Couldn't save meal", "Something went wrong — try again.");
    } finally {
      setSavingMeal(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      backdropOpacity={0.5}
      bodyDrag={false}
    >
      {heldDetail && (
        <>
          <ScrollView
            style={{ maxHeight: sheetMaxHeight }}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={[styles.eyebrow, { color: t.text }]}>
                Nutrition Details
              </Text>
              <View style={styles.headerBtns}>
                <CircleButton
                  icon="ellipsis-horizontal"
                  glass={glassAvailable}
                  t={t}
                  onPress={() => setMenuOpen((o) => !o)}
                />
                <CircleButton
                  icon="close"
                  glass={glassAvailable}
                  t={t}
                  onPress={onClose}
                />
              </View>
            </View>

            <Text style={[styles.title, { color: t.text }]}>
              {heldFoodText}
            </Text>

            {/* Total + macro summary — the primary glass card. */}
            <GlassCard
              glass={glassAvailable}
              t={t}
              radius={20}
              style={styles.summaryCard}
            >
              <MacroSummary
                calories={totals.calories}
                carbsG={totals.carbsG}
                fatG={totals.fatG}
                proteinG={totals.proteinG}
                goal={goal}
                t={t}
              />
            </GlassCard>

            {/* Items */}
            {heldDetail.entries.length > 0 && (
              <>
                <Text style={[styles.section, { color: t.secondary }]}>
                  Items
                </Text>
                {heldDetail.entries.map((entry) => (
                  <ItemCard
                    key={entry.entryId}
                    entry={entry}
                    goal={goal}
                    glass={glassAvailable}
                    t={t}
                    onEdit={() => onEditEntry(entry)}
                  />
                ))}
              </>
            )}

            {/* Gear's thought process */}
            {(heldDetail.reasoning?.trim() || heldDetail.confidence > 0) && (
              <>
                <Text style={[styles.section, { color: t.secondary }]}>
                  Gear's thought process:
                </Text>
                <GlassCard
                  glass={glassAvailable}
                  t={t}
                  radius={16}
                  style={styles.card}
                >
                  {heldDetail.confidence > 0 && (
                    <View style={styles.confBlock}>
                      <View style={styles.confHeader}>
                        <Text
                          style={[styles.confCaption, { color: t.secondary }]}
                        >
                          Confidence level
                        </Text>
                        <Text
                          style={[
                            styles.confLabel,
                            {
                              color: confidenceLabel(heldDetail.confidence)
                                .color,
                            },
                          ]}
                        >
                          {confidenceLabel(heldDetail.confidence).label} ·{" "}
                          {heldDetail.confidence}%
                        </Text>
                      </View>
                      <ConfidenceBar value={heldDetail.confidence} />
                    </View>
                  )}
                  {!!heldDetail.reasoning?.trim() && (
                    <Text style={[styles.reasoning, { color: t.text }]}>
                      {heldDetail.reasoning.trim()}
                    </Text>
                  )}
                  {heldDetail.entries.length > 0 && (
                    <TouchableOpacity
                      onPress={() => onEditEntry(heldDetail.entries[0])}
                      style={styles.editLink}
                    >
                      <Ionicons name="pencil" size={13} color={t.secondary} />
                      <Text
                        style={[styles.editLinkText, { color: t.secondary }]}
                      >
                        Something off? Click to edit
                      </Text>
                    </TouchableOpacity>
                  )}
                </GlassCard>
              </>
            )}

            {/* References */}
            {heldDetail.sourceUrls.length > 0 && (
              <>
                <Text style={[styles.section, { color: t.secondary }]}>
                  References
                </Text>
                <References
                  urls={heldDetail.sourceUrls}
                  glass={glassAvailable}
                  t={t}
                />
              </>
            )}
          </ScrollView>

          {/* ⋯ menu popover */}
          {menuOpen && (
            <>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setMenuOpen(false)}
              />
              <MenuPopover t={t}>
                <MenuItem
                  icon={mealSaved ? "checkmark" : "bookmark-outline"}
                  label={
                    savingMeal
                      ? "Saving…"
                      : mealSaved
                        ? "Saved to Favorites"
                        : "Save to Favorites"
                  }
                  t={t}
                  onPress={saveAsMeal}
                />
                <MenuItem
                  icon="create-outline"
                  label="Edit Nutrition"
                  t={t}
                  last
                  onPress={() => {
                    setMenuOpen(false);
                    if (heldDetail?.entries.length)
                      onEditEntry(heldDetail.entries[0]);
                  }}
                />
              </MenuPopover>
            </>
          )}
        </>
      )}
    </BottomSheet>
  );
}

/**
 * A rounded card matching the calorie tracker's glass cards: a translucent
 * GlassView fill where liquid glass is available, falling back to a plain
 * surface card otherwise. `radius` keeps the primary summary card (20) and the
 * smaller item/reasoning/reference cards (16) reading as one family.
 */
function GlassCard({
  glass,
  t,
  radius,
  style,
  children,
}: {
  glass: boolean;
  t: Theme;
  radius: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: StyleSheet.hairlineWidth,
          overflow: "hidden",
          backgroundColor: glass ? "transparent" : t.cardBg,
          borderColor: glass ? "transparent" : t.cardBorder,
        },
        style,
      ]}
    >
      {glass && (
        <GlassView
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
          glassEffectStyle="regular"
        />
      )}
      {children}
    </View>
  );
}

/**
 * A round header button: a translucent glass circle where liquid glass is
 * available (matching CalorieTracker's circleGlass), a plain surface circle
 * otherwise. Icon centered, ~32pt.
 */
function CircleButton({
  icon,
  glass,
  t,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  glass: boolean;
  t: Theme;
  onPress: () => void;
}) {
  if (glass) {
    return (
      <GlassView style={styles.circleGlass}>
        <TouchableOpacity
          onPress={onPress}
          hitSlop={8}
          style={styles.circleBtn}
        >
          <Ionicons name={icon} size={22} color={t.secondary} />
        </TouchableOpacity>
      </GlassView>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      style={[styles.closeBtn, { backgroundColor: t.surface }]}
    >
      <Ionicons name={icon} size={22} color={t.secondary} />
    </TouchableOpacity>
  );
}

/**
 * The ⋯ dropdown, fading + scaling in (~150ms) on mount instead of popping.
 * Keeps the shadowed surface look; glass would clip its shadow behind overflow.
 */
function MenuPopover({ t, children }: { t: Theme; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [anim]);
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  return (
    <Animated.View
      style={[
        styles.menu,
        {
          backgroundColor: t.cardBg,
          borderColor: t.cardBorder,
          opacity: anim,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function MenuItem({
  icon,
  label,
  t,
  last,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  t: Theme;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !last && {
          borderBottomColor: t.separator,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={t.text} />
      <Text style={[styles.menuLabel, { color: t.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

type Theme = ReturnType<typeof useThemeColors>;
type Goal =
  | {
      calorieGoal?: number;
      carbsG?: number;
      fatG?: number;
      proteinG?: number;
    }
  | null
  | undefined;

const pctOfGoal = (value: number, g?: number) =>
  g && g > 0 ? Math.round((value / g) * 100) : 0;

/**
 * The calorie ring + Carbs/Fat/Protein stat row, matching the macro section in
 * the Edit Nutrition sheet. Percentages are the share of the daily goal.
 */
function MacroSummary({
  calories,
  carbsG,
  fatG,
  proteinG,
  goal,
  t,
  showCalorieRing = true,
}: {
  calories: number;
  carbsG: number;
  fatG: number;
  proteinG: number;
  goal: Goal;
  t: Theme;
  /** Item cards drop the big calorie ring and center just the three macros. */
  showCalorieRing?: boolean;
}) {
  return (
    <View style={styles.macroRow}>
      {showCalorieRing && (
        <MacroRing
          label="Calories"
          value={round(calories)}
          goal={goal?.calorieGoal ?? 0}
          size={92}
        />
      )}
      <View style={styles.macroStats}>
        <MacroStat
          label="Carbs"
          labelColor={t.isDark ? "#FACC15" : "#EAB308"}
          grams={round1(carbsG)}
          pct={pctOfGoal(carbsG, goal?.carbsG)}
          t={t}
        />
        <MacroStat
          label="Fat"
          labelColor={t.isDark ? "#BF5AF2" : "#AF52DE"}
          grams={round1(fatG)}
          pct={pctOfGoal(fatG, goal?.fatG)}
          t={t}
        />
        <MacroStat
          label="Protein"
          labelColor={t.isDark ? "#FF375F" : "#F43F5E"}
          grams={round1(proteinG)}
          pct={pctOfGoal(proteinG, goal?.proteinG)}
          t={t}
        />
      </View>
    </View>
  );
}

function MacroStat({
  label,
  labelColor,
  grams,
  pct,
  t,
}: {
  label: string;
  /** Macro identity color for the label word (yellow/purple/pink-red). */
  labelColor: string;
  grams: number;
  pct: number;
  t: Theme;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statPct, { color: t.secondary }]}>{pct}%</Text>
      <Text style={[styles.statGrams, { color: t.text }]}>{grams} g</Text>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

/** One parsed food, tappable to reveal its own macro breakdown. */
function ItemCard({
  entry,
  goal,
  glass,
  t,
  onEdit,
}: {
  entry: FoodLogEntry;
  goal: Goal;
  glass: boolean;
  t: Theme;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassCard glass={glass} t={t} radius={16} style={styles.card}>
      <TouchableOpacity
        style={styles.itemHeader}
        activeOpacity={0.7}
        onPress={() => {
          animateExpand();
          setOpen((o) => !o);
        }}
      >
        <Text style={[styles.itemName, { color: t.text }]} numberOfLines={1}>
          {foodNameOf(entry.description)}
        </Text>
        <View style={styles.itemRight}>
          <Text style={[styles.itemCal, { color: t.secondary }]}>
            {round(entry.calories)} cal
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={t.secondary}
          />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={styles.itemBody}>
          <MacroSummary
            calories={entry.calories ?? 0}
            carbsG={entry.carbsG ?? 0}
            fatG={entry.fatG ?? 0}
            proteinG={entry.proteinG ?? 0}
            goal={goal}
            t={t}
            showCalorieRing={false}
          />
          <TouchableOpacity onPress={onEdit} style={styles.editLink}>
            <Ionicons name="pencil" size={13} color={t.secondary} />
            <Text style={[styles.editLinkText, { color: t.secondary }]}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </GlassCard>
  );
}

/**
 * Horizontal 0–100 confidence gauge. The fill eases in from empty on mount
 * (600ms ease-out, matching the macro rings' entry animation) in the same
 * red/amber/green as the bucket label; the track is the fill at low alpha.
 */
function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(value / 100, 1));
  const { color } = confidenceLabel(value);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      // Percentage width can't run on the native driver; the bar is tiny, so
      // a JS-driven tween is imperceptible.
      useNativeDriver: false,
    }).start();
  }, [anim, pct]);
  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  return (
    <View style={[styles.confTrack, { backgroundColor: color + "33" }]}>
      <Animated.View
        style={[styles.confFill, { width, backgroundColor: color }]}
      />
    </View>
  );
}

/** Collapsible list of cited web sources; each row opens the URL. */
function References({
  urls,
  glass,
  t,
}: {
  urls: string[];
  glass: boolean;
  t: Theme;
}) {
  const [open, setOpen] = useState(false);
  return (
    <GlassCard glass={glass} t={t} radius={16} style={styles.card}>
      <TouchableOpacity
        style={styles.itemHeader}
        activeOpacity={0.7}
        onPress={() => {
          animateExpand();
          setOpen((o) => !o);
        }}
      >
        <FaviconStack urls={urls} />
        <View style={styles.itemRight}>
          <Text style={[styles.refCount, { color: t.secondary }]}>
            {urls.length} {urls.length === 1 ? "source" : "sources"}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={t.secondary}
          />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={styles.refList}>
          {urls.map((url, i) => (
            <TouchableOpacity
              key={`${url}-${i}`}
              style={[styles.refRow, { backgroundColor: t.surface }]}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(url).catch(() => {})}
            >
              <Favicon url={url} size={18} />
              <Text
                style={[styles.refUrl, { color: "#2F6FED" }]}
                numberOfLines={1}
              >
                {hostOf(url)}
              </Text>
              <Ionicons
                name="arrow-up"
                size={14}
                color={t.secondary}
                style={styles.refArrow}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

/** Overlapping favicons — a compact "who did we read" glyph row. */
function FaviconStack({ urls }: { urls: string[] }) {
  const shown = urls.slice(0, 4);
  return (
    <View style={styles.stack}>
      {shown.map((url, i) => (
        <View
          key={`${url}-${i}`}
          style={[
            styles.stackItem,
            { marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i },
          ]}
        >
          <Favicon url={url} size={22} ring />
        </View>
      ))}
    </View>
  );
}

/** A single favicon that quietly hides itself if the icon fails to load. */
function Favicon({
  url,
  size,
  ring,
}: {
  url: string;
  size: number;
  ring?: boolean;
}) {
  const t = useThemeColors();
  const [failed, setFailed] = useState(false);
  const style = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: t.surface,
    },
    ring ? { borderWidth: 1.5, borderColor: t.cardBg } : null,
  ];
  if (failed) {
    return <View style={[...style, styles.faviconFallback]} />;
  }
  return (
    <Image
      source={{ uri: faviconOf(url) }}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: { fontSize: 15, fontWeight: "600" },
  headerBtns: { flexDirection: "row", gap: 10 },
  // Glass header circle (matches CalorieTracker's circleGlass) + its icon slot.
  circleGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  circleBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  // Fallback circle when liquid glass is unavailable.
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    position: "absolute",
    top: 52,
    right: 20,
    minWidth: 210,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLabel: { fontSize: 16, fontWeight: "500" },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 8,
    marginBottom: 14,
  },
  // Border/radius/overflow are owned by GlassCard; these just set the padding.
  summaryCard: { padding: 18 },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  macroStats: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: { alignItems: "center" },
  statPct: { fontSize: 14, fontWeight: "600" },
  statGrams: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  // Weighted so the macro identity colors read clearly at this size.
  statLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  section: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 22,
    marginBottom: 10,
    textTransform: "none",
  },
  // Border/radius/overflow are owned by GlassCard; these set padding + rhythm.
  card: {
    padding: 16,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: { fontSize: 16, fontWeight: "400", flex: 1, marginRight: 10 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemCal: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  refCount: { fontSize: 15 },
  itemBody: { marginTop: 14 },
  confBlock: { marginBottom: 12 },
  confHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  confCaption: { fontSize: 13 },
  confLabel: { fontSize: 14, fontWeight: "700" },
  confTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  confFill: { height: 8, borderRadius: 4 },
  reasoning: { fontSize: 15, lineHeight: 22 },
  editLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
  },
  editLinkText: { fontSize: 14, fontWeight: "600" },
  refList: { marginTop: 12, gap: 8 },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  refUrl: { flex: 1, fontSize: 14, fontWeight: "500" },
  refArrow: { transform: [{ rotate: "45deg" }] },
  stack: { flexDirection: "row", alignItems: "center" },
  stackItem: {},
  faviconFallback: {},
});

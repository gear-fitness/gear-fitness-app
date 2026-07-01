import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useThemeColors } from "../../../../hooks/useThemeColors";
import { useNutrition } from "../../../../context/NutritionContext";
import { FoodLogEntry } from "../../../../api/types";
import { BottomSheet } from "../../../../components/BottomSheet";
import { MacroRing } from "./MacroRing";
import { faviconOf, hostOf } from "./sources";

/**
 * Everything the AI Smart Journal knows about one logged line: the created
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

// The sheet is content-sized, so cap the scroll area to a slice of the screen
// (a percentage would resolve against the auto height and never scroll).
const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.82;

const round = (n: number | null | undefined) => Math.round(n ?? 0);
const round1 = (n: number | null | undefined) => Math.round((n ?? 0) * 10) / 10;

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

  // Reset the ⋯ menu whenever the sheet is hidden so it never reopens stale.
  if (!visible && menuOpen) setMenuOpen(false);

  const totals = useMemo(() => {
    const e = detail?.entries ?? [];
    return {
      calories: e.reduce((s, x) => s + (x.calories ?? 0), 0),
      proteinG: e.reduce((s, x) => s + (x.proteinG ?? 0), 0),
      carbsG: e.reduce((s, x) => s + (x.carbsG ?? 0), 0),
      fatG: e.reduce((s, x) => s + (x.fatG ?? 0), 0),
    };
  }, [detail]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      backdropOpacity={0.5}
      bodyDrag={false}
    >
      {detail && (
        <>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.eyebrow, { color: t.text }]}>
              Nutrition Details
            </Text>
            <View style={styles.headerBtns}>
              <TouchableOpacity
                onPress={() => setMenuOpen((o) => !o)}
                hitSlop={8}
                style={[styles.closeBtn, { backgroundColor: t.surface }]}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={t.secondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={8}
                style={[styles.closeBtn, { backgroundColor: t.surface }]}
              >
                <Ionicons name="close" size={18} color={t.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.title, { color: t.text }]}>{foodText}</Text>

          {/* Total + macro summary */}
          <View style={[styles.summaryCard, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}>
            <MacroSummary
              calories={totals.calories}
              carbsG={totals.carbsG}
              fatG={totals.fatG}
              proteinG={totals.proteinG}
              goal={goal}
              t={t}
            />
          </View>

          {/* Items */}
          {detail.entries.length > 0 && (
            <>
              <Text style={[styles.section, { color: t.secondary }]}>Items</Text>
              {detail.entries.map((entry) => (
                <ItemCard
                  key={entry.entryId}
                  entry={entry}
                  goal={goal}
                  t={t}
                  onEdit={() => onEditEntry(entry)}
                />
              ))}
            </>
          )}

          {/* Gear's thought process */}
          {(detail.reasoning?.trim() || detail.confidence > 0) && (
            <>
              <Text style={[styles.section, { color: t.secondary }]}>
                Gear's thought process:
              </Text>
              <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}>
                {detail.confidence > 0 && (
                  <View style={styles.confRow}>
                    <ConfidenceRing value={detail.confidence} />
                    <View style={styles.confMeta}>
                      <Text style={[styles.confCaption, { color: t.secondary }]}>
                        Confidence level
                      </Text>
                      <Text
                        style={[
                          styles.confLabel,
                          { color: confidenceLabel(detail.confidence).color },
                        ]}
                      >
                        {confidenceLabel(detail.confidence).label}
                      </Text>
                    </View>
                  </View>
                )}
                {!!detail.reasoning?.trim() && (
                  <Text style={[styles.reasoning, { color: t.text }]}>
                    {detail.reasoning.trim()}
                  </Text>
                )}
                {detail.entries.length > 0 && (
                  <TouchableOpacity
                    onPress={() => onEditEntry(detail.entries[0])}
                    style={styles.editLink}
                  >
                    <Ionicons name="pencil" size={13} color="#7C6BF5" />
                    <Text style={styles.editLinkText}>
                      Something off? Click to edit
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* References */}
          {detail.sourceUrls.length > 0 && (
            <>
              <Text style={[styles.section, { color: t.secondary }]}>
                References
              </Text>
              <References urls={detail.sourceUrls} t={t} />
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
            <View
              style={[
                styles.menu,
                { backgroundColor: t.cardBg, borderColor: t.cardBorder },
              ]}
            >
              <MenuItem
                icon="create-outline"
                label="Edit Nutrition"
                t={t}
                last
                onPress={() => {
                  setMenuOpen(false);
                  if (detail?.entries.length) onEditEntry(detail.entries[0]);
                }}
              />
            </View>
          </>
        )}
        </>
      )}
    </BottomSheet>
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
        !last && { borderBottomColor: t.separator, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={t.text} />
      <Text style={[styles.menuLabel, { color: t.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

type Theme = ReturnType<typeof useThemeColors>;
type Goal = {
  calorieGoal?: number;
  carbsG?: number;
  fatG?: number;
  proteinG?: number;
} | null | undefined;

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
}: {
  calories: number;
  carbsG: number;
  fatG: number;
  proteinG: number;
  goal: Goal;
  t: Theme;
}) {
  return (
    <View style={styles.macroRow}>
      <MacroRing
        label="cal"
        value={round(calories)}
        goal={goal?.calorieGoal ?? 0}
        size={92}
      />
      <View style={styles.macroStats}>
        <MacroStat
          label="Carbs"
          grams={round1(carbsG)}
          pct={pctOfGoal(carbsG, goal?.carbsG)}
          t={t}
        />
        <MacroStat
          label="Fat"
          grams={round1(fatG)}
          pct={pctOfGoal(fatG, goal?.fatG)}
          t={t}
        />
        <MacroStat
          label="Protein"
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
  grams,
  pct,
  t,
}: {
  label: string;
  grams: number;
  pct: number;
  t: Theme;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statPct, { color: t.secondary }]}>{pct}%</Text>
      <Text style={[styles.statGrams, { color: t.text }]}>{grams} g</Text>
      <Text style={[styles.statLabel, { color: t.secondary }]}>{label}</Text>
    </View>
  );
}

/** One parsed food, tappable to reveal its own macro breakdown. */
function ItemCard({
  entry,
  goal,
  t,
  onEdit,
}: {
  entry: FoodLogEntry;
  goal: Goal;
  t: Theme;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}>
      <TouchableOpacity
        style={styles.itemHeader}
        activeOpacity={0.7}
        onPress={() => setOpen((o) => !o)}
      >
        <Text style={[styles.itemName, { color: t.text }]} numberOfLines={1}>
          {entry.description}
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
          />
          <TouchableOpacity onPress={onEdit} style={styles.editLink}>
            <Ionicons name="pencil" size={13} color="#7C6BF5" />
            <Text style={styles.editLinkText}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/** Circular gauge showing the raw 0–100 confidence in its center. */
function ConfidenceRing({ value }: { value: number }) {
  const size = 52;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(value / 100, 1));
  const center = size / 2;
  const { color } = confidenceLabel(value);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color + "33"}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          strokeLinecap="round"
          rotation={-90}
          originX={center}
          originY={center}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

/** Collapsible list of cited web sources; each row opens the URL. */
function References({ urls, t }: { urls: string[]; t: Theme }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.card, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}>
      <TouchableOpacity
        style={styles.itemHeader}
        activeOpacity={0.7}
        onPress={() => setOpen((o) => !o)}
      >
        <FaviconStack urls={urls} />
        <View style={styles.itemRight}>
          <Text style={[styles.itemCal, { color: t.secondary }]}>
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
              <Text style={[styles.refUrl, { color: "#2F6FED" }]} numberOfLines={1}>
                {hostOf(url)}
              </Text>
              <Ionicons name="arrow-up" size={14} color={t.secondary} style={styles.refArrow} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
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
          style={[styles.stackItem, { marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }]}
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
    { width: size, height: size, borderRadius: size / 2, backgroundColor: t.surface },
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
  scroll: { maxHeight: SHEET_MAX_HEIGHT },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: { fontSize: 15, fontWeight: "600" },
  headerBtns: { flexDirection: "row", gap: 10 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    position: "absolute",
    top: 44,
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
  title: { fontSize: 26, fontWeight: "800", marginTop: 10, marginBottom: 16 },
  summaryCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
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
  statLabel: { fontSize: 12, marginTop: 4 },
  section: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 22,
    marginBottom: 10,
    textTransform: "none",
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: { fontSize: 16, fontWeight: "600", flex: 1, marginRight: 10 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemCal: { fontSize: 15, fontVariant: ["tabular-nums"] },
  itemBody: { marginTop: 14 },
  confRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  confMeta: { justifyContent: "center" },
  confCaption: { fontSize: 13 },
  confLabel: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: { fontSize: 16, fontWeight: "800" },
  reasoning: { fontSize: 15, lineHeight: 22 },
  editLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
  },
  editLinkText: { fontSize: 14, fontWeight: "600", color: "#7C6BF5" },
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import PagerView from "react-native-pager-view";
import Svg, { Path } from "react-native-svg";

import { Text, TextInput, FontScaleProvider } from "../../components/Text";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { useThemeColors } from "../../hooks/useThemeColors";
import { useUnitPreference } from "../../context/UnitPreferenceContext";
import { useBarLoaderConfig } from "../../hooks/useBarLoaderConfig";
import { LBS_PER_KG, WeightUnit } from "../../utils/weight";
import {
  StackPlate,
  computeLoadout,
  denomsFor,
  expandPlates,
  formatNumber,
  plateColor,
  reverseTotal,
} from "../../utils/plateMath";
import { BarbellDiagram } from "../../components/BarLoader/BarbellDiagram";
import { PlateStepper } from "../../components/BarLoader/PlateStepper";
import { BarbellsSheet } from "../../components/BarLoader/BarbellsSheet";
import { InventorySheet } from "../../components/BarLoader/InventorySheet";
import { BarShareCard } from "../../components/BarLoader/BarShareCard";
// Deferred with the Calculators page below.
// import { CalculatorsTab } from "../../components/BarLoader/CalculatorsTab";
import { GlassCard } from "../../components/BarLoader/GlassCard";
import { DualReadout } from "../../components/BarLoader/DualReadout";
import {
  BarLoaderTab,
  barLoaderSession,
} from "../../components/BarLoader/sessionStore";

type Tab = BarLoaderTab;

// Page order for the swipeable pager; index <-> tab key.
const TABS: { key: Tab; label: string }[] = [
  { key: "calculate", label: "CALCULATE" },
  { key: "reverse", label: "REVERSE" },
  // Deferred for a later release; re-enable together with the
  // commented-out Calculators pager page below.
  // { key: "calculators", label: "CALCULATORS" },
];

/** Mini loaded-barbell glyph for the header buttons. */
function BarbellGlyph({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12h18M7 6v12M10.5 8.5v7M13.5 8.5v7M17 6v12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BarLoader() {
  const route = useRoute();
  const t = useThemeColors();
  const glassAvailable = isLiquidGlassAvailable();
  const { weightUnit } = useUnitPreference();
  const {
    config,
    activeBar,
    setActiveBar,
    addBar,
    updateBar,
    deleteBar,
    setPlatePairs,
    setCollar,
    resetInventory,
  } = useBarLoaderConfig();

  const initialWeightLbs = (route.params as { initialWeightLbs?: number })
    ?.initialWeightLbs;

  // Working state seeds from the in-memory session store so it survives
  // leaving and re-entering the screen mid-workout (it resets only when
  // the app process dies). An explicit initialWeightLbs param wins over
  // the remembered input.
  const [unit, setUnit] = useState<WeightUnit>(
    barLoaderSession.unit ?? weightUnit,
  );
  const [tab, setTab] = useState<Tab>(barLoaderSession.tab);
  const [weightInput, setWeightInput] = useState(() => {
    if (initialWeightLbs == null || initialWeightLbs <= 0) {
      return barLoaderSession.weightInput;
    }
    const value =
      weightUnit === "kg" ? initialWeightLbs / LBS_PER_KG : initialWeightLbs;
    return formatNumber(Math.round(value * 10) / 10);
  });
  // One side's reverse-mode plates in tap order, bottom of the stack
  // first, so each added plate lands on the right end of the drawing.
  // Plates carry their own unit, so kg and lb plates can be mixed and
  // the stack survives a unit toggle.
  const [reverseStack, setReverseStack] = useState<StackPlate[]>(
    barLoaderSession.reverseStack,
  );

  useEffect(() => {
    barLoaderSession.unit = unit;
    barLoaderSession.tab = tab;
    barLoaderSession.weightInput = weightInput;
    barLoaderSession.reverseStack = reverseStack;
  }, [unit, tab, weightInput, reverseStack]);
  const [barbellsVisible, setBarbellsVisible] = useState(false);
  const [inventoryVisible, setInventoryVisible] = useState(false);

  const shareCardRef = useRef<View>(null);
  const pagerRef = useRef<PagerView>(null);
  // PagerView reads initialPage once, at mount; capture the restored tab.
  const initialPageRef = useRef(
    Math.max(
      0,
      TABS.findIndex(({ key }) => key === barLoaderSession.tab),
    ),
  );

  const barWeight = unit === "kg" ? activeBar.weightKg : activeBar.weightLbs;
  const collar = unit === "kg" ? config.collarKg : config.collarLbs;
  const inventory = unit === "kg" ? config.kgInventory : config.lbInventory;

  const target = parseFloat(weightInput);
  const hasTarget = Number.isFinite(target) && target > 0;

  const loadout = useMemo(
    () =>
      computeLoadout(
        hasTarget ? target : 0,
        unit,
        barWeight,
        collar,
        inventory,
      ),
    [hasTarget, target, unit, barWeight, collar, inventory],
  );

  const calcPlates = useMemo(
    () => expandPlates(loadout.platesPerSide, unit),
    [loadout.platesPerSide, unit],
  );

  const emptyTotal = barWeight + 2 * collar;
  const calcTotal = hasTarget ? loadout.achievedTotal : emptyTotal;
  const revTotal = reverseTotal(reverseStack, barWeight, collar, unit);

  // The share card mirrors whichever page is showing.
  const sharePlates = tab === "reverse" ? reverseStack : calcPlates;
  const shareTotal = tab === "reverse" ? revTotal : calcTotal;

  // Reverse-stack plates carry their own unit, so the stack survives a
  // unit toggle; only the readout's math changes.
  const switchUnit = (next: WeightUnit) => {
    if (next === unit) return;
    Haptics.selectionAsync().catch(() => {});
    setUnit(next);
  };

  const goToPage = (index: number) => {
    if (TABS[index].key === tab) return;
    Haptics.selectionAsync().catch(() => {});
    pagerRef.current?.setPage(index);
  };

  const handleShare = async () => {
    try {
      const node = shareCardRef.current;
      if (!node) return;
      const uri = await captureRef(node, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing unavailable", "Sharing is not available here.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share loaded bar",
      });
    } catch (e) {
      console.warn("Bar share failed:", e);
    }
  };

  // Used by the deferred Calculators page (commented out below): sends a
  // computed weight to the Calculate tab.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLoadBar = (weight: number) => {
    setWeightInput(formatNumber(weight));
    pagerRef.current?.setPage(0);
  };

  const winW = Dimensions.get("window").width;
  const diagramWidth = winW - 40;

  // Steppers for one unit's denominations; rendered twice so kg and lb
  // plates can be mixed on the same bar. Adding pushes onto the top of
  // the stack; removing unloads the top-most plate of that denomination
  // and unit.
  const renderReverseSteppers = (gridUnit: WeightUnit) =>
    denomsFor(gridUnit).map((denom) => {
      const count = reverseStack.filter(
        (p) => p.denom === denom && p.unit === gridUnit,
      ).length;
      return (
        <PlateStepper
          key={`${gridUnit}-${denom}`}
          denom={denom}
          unit={gridUnit}
          count={count}
          onChange={(next) =>
            setReverseStack((s) => {
              if (next > count) return [...s, { denom, unit: gridUnit }];
              for (let i = s.length - 1; i >= 0; i--) {
                if (s[i].denom === denom && s[i].unit === gridUnit) {
                  return [...s.slice(0, i), ...s.slice(i + 1)];
                }
              }
              return s;
            })
          }
        />
      );
    });

  /**
   * Chrome shared by the Calculate and Reverse pages: active bar chip,
   * diagram card with reset + share, unit toggle, dual readout. Plain
   * render function (not a component) so pages stay simple views.
   */
  const renderChrome = (
    plates: StackPlate[],
    total: number,
    onReset: () => void,
  ) => (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setBarbellsVisible(true)}
        style={styles.barChip}
      >
        <Text style={[styles.barChipText, { color: t.secondary }]}>
          {activeBar.name.toUpperCase()} {"·"} {formatNumber(barWeight)}{" "}
          {unit.toUpperCase()}
        </Text>
        <Ionicons name="chevron-down" size={12} color={t.secondary} />
      </TouchableOpacity>

      <View style={styles.diagramWrap}>
        <BarbellDiagram
          plates={plates}
          barWeight={barWeight}
          collarPerSide={collar}
          width={diagramWidth}
          height={240}
        />
        <TouchableOpacity
          accessibilityLabel="Reset"
          activeOpacity={0.7}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onReset();
          }}
          style={[
            styles.resetPill,
            {
              backgroundColor: glassAvailable ? "transparent" : t.surface,
              borderColor: glassAvailable ? "transparent" : t.cardBorder,
            },
          ]}
        >
          {glassAvailable && (
            <GlassView
              style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
              glassEffectStyle="regular"
              isInteractive
            />
          )}
          <Text style={[styles.resetPillText, { color: t.text }]}>RESET</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Share loaded bar"
          activeOpacity={0.7}
          onPress={handleShare}
          style={[
            styles.shareBtn,
            {
              backgroundColor: glassAvailable ? "transparent" : t.surface,
              borderColor: glassAvailable ? "transparent" : t.cardBorder,
            },
          ]}
        >
          {glassAvailable && (
            <GlassView
              style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
              glassEffectStyle="regular"
              isInteractive
            />
          )}
          <Ionicons name="share-outline" size={18} color={t.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.unitToggle, { backgroundColor: t.unitToggleBg }]}>
        {(["kg", "lbs"] as WeightUnit[]).map((u) => (
          <TouchableOpacity
            key={u}
            activeOpacity={0.7}
            onPress={() => switchUnit(u)}
            style={[
              styles.unitBtn,
              u === unit && { backgroundColor: t.unitBtnActiveBg },
            ]}
          >
            <Text
              style={[
                styles.unitBtnText,
                { color: u === unit ? t.text : t.secondary },
              ]}
            >
              {u.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.readoutWrap}>
        <DualReadout
          total={total}
          unit={unit}
          textColor={t.text}
          mutedColor={t.secondary}
        />
      </View>
    </>
  );

  return (
    <FontScaleProvider max={1}>
      <SafeAreaView style={[styles.container, { backgroundColor: t.appBg }]}>
        {/* Header */}
        <View style={styles.header}>
          <FloatingCloseButton inline direction="left" />
          <Text style={[styles.title, { color: t.text }]}>Bar Loader</Text>
          <View style={styles.navRow}>
            <TouchableOpacity
              accessibilityLabel="Barbells"
              activeOpacity={0.7}
              onPress={() => setBarbellsVisible(true)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: glassAvailable ? "transparent" : t.cardBg,
                  borderColor: glassAvailable ? "transparent" : t.cardBorder,
                },
              ]}
            >
              {glassAvailable && (
                <GlassView
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
                  glassEffectStyle="regular"
                  isInteractive
                />
              )}
              <BarbellGlyph color={t.text} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Inventory"
              activeOpacity={0.7}
              onPress={() => setInventoryVisible(true)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: glassAvailable ? "transparent" : t.cardBg,
                  borderColor: glassAvailable ? "transparent" : t.cardBorder,
                },
              ]}
            >
              {glassAvailable && (
                <GlassView
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
                  glassEffectStyle="regular"
                  isInteractive
                />
              )}
              <MaterialCommunityIcons name="tune" size={20} color={t.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sub-tabs */}
        <View style={styles.tabsRow}>
          {TABS.map(({ key, label }, index) => {
            const active = key === tab;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.7}
                onPress={() => goToPage(index)}
                style={styles.tabBtn}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? t.text : t.secondary },
                  ]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.tabUnderline,
                    { backgroundColor: active ? t.text : "transparent" },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Swipeable pager, one page per tab (mirrors the Social screen).
            The native pager arbitrates horizontal swipe against the pages'
            vertical scrolling and the chip rows' horizontal scrolling. */}
        <PagerView
          ref={pagerRef}
          style={styles.flex1}
          initialPage={initialPageRef.current}
          onPageSelected={(e) => {
            const next = TABS[e.nativeEvent.position]?.key ?? "calculate";
            setTab(next);
          }}
        >
          <View key="calculate" style={styles.flex1} collapsable={false}>
            <ScrollView
              contentContainerStyle={styles.scrollBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {renderChrome(calcPlates, calcTotal, () => setWeightInput(""))}

              <View style={styles.targetRow}>
                <TextInput
                  value={weightInput}
                  onChangeText={setWeightInput}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={t.secondary}
                  maxLength={7}
                  selectTextOnFocus
                  style={[
                    styles.targetInput,
                    { color: t.text, borderColor: t.border },
                  ]}
                />
                <Text style={[styles.targetUnit, { color: t.secondary }]}>
                  {unit.toUpperCase()}
                </Text>
              </View>

              {hasTarget && !loadout.exact && (
                <Text style={[styles.closestNote, { color: t.secondary }]}>
                  {target <= emptyTotal
                    ? "Below the bar's weight"
                    : `Closest with your plates: ${formatNumber(
                        loadout.achievedTotal,
                      )} ${unit}`}
                </Text>
              )}

              {hasTarget && loadout.platesPerSide.length > 0 && (
                <GlassCard style={styles.perSideCard}>
                  <Text style={[styles.perSideTitle, { color: t.secondary }]}>
                    PER SIDE
                  </Text>
                  {loadout.platesPerSide.map((p) => {
                    const color = plateColor(p.denom, unit);
                    return (
                      <View
                        key={p.denom}
                        style={[
                          styles.perSideRow,
                          { borderTopColor: t.separator },
                        ]}
                      >
                        <View
                          style={[
                            styles.plateDot,
                            { backgroundColor: color.bg },
                          ]}
                        />
                        <Text style={[styles.perSideDenom, { color: t.text }]}>
                          {formatNumber(p.denom)} {unit}
                        </Text>
                        <Text
                          style={[styles.perSideCount, { color: t.secondary }]}
                        >
                          x {p.count}
                        </Text>
                      </View>
                    );
                  })}
                </GlassCard>
              )}
            </ScrollView>
          </View>

          <View key="reverse" style={styles.flex1} collapsable={false}>
            <ScrollView
              contentContainerStyle={styles.scrollBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderChrome(reverseStack, revTotal, () => setReverseStack([]))}

              <View style={styles.reverseGrid}>
                {renderReverseSteppers(unit)}
              </View>
            </ScrollView>
          </View>

          {/* Calculators page, deferred for a later release. Re-enable by
              uncommenting this page, the CalculatorsTab import, and the
              TABS entry above.
          <View key="calculators" style={styles.flex1} collapsable={false}>
            <ScrollView
              contentContainerStyle={styles.scrollBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <CalculatorsTab unit={unit} onLoadBar={handleLoadBar} />
            </ScrollView>
          </View>
          */}
        </PagerView>

        {/* Offscreen capture target for sharing */}
        <View style={styles.shareCardHost} pointerEvents="none">
          <BarShareCard
            ref={shareCardRef}
            plates={sharePlates}
            unit={unit}
            barWeight={barWeight}
            collarPerSide={collar}
            total={shareTotal}
          />
        </View>

        <BarbellsSheet
          visible={barbellsVisible}
          onClose={() => setBarbellsVisible(false)}
          bars={config.bars}
          activeBarId={activeBar.id}
          onSelect={setActiveBar}
          onAdd={addBar}
          onUpdate={updateBar}
          onDelete={deleteBar}
        />
        <InventorySheet
          visible={inventoryVisible}
          onClose={() => setInventoryVisible(false)}
          unit={unit}
          onUnitChange={switchUnit}
          inventory={inventory}
          collarPerSide={collar}
          onSetPairs={(denom, pairs) => setPlatePairs(unit, denom, pairs)}
          onSetCollar={(perSide) => setCollar(unit, perSide)}
          onReset={() => resetInventory(unit)}
        />
      </SafeAreaView>
    </FontScaleProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
    textAlign: "left",
  },
  navRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabsRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  tabUnderline: {
    height: 2,
    borderRadius: 1,
    alignSelf: "stretch",
    marginHorizontal: 18,
  },
  scrollBody: {
    paddingBottom: 32,
  },
  barChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 10,
  },
  barChipText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  diagramWrap: {
    alignItems: "center",
  },
  resetPill: {
    position: "absolute",
    top: 12,
    right: 12,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  resetPillText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  shareBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  unitToggle: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    marginTop: 14,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: "center",
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  readoutWrap: {
    marginTop: 14,
    marginBottom: 14,
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  targetInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  targetUnit: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  closestNote: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 10,
  },
  perSideCard: {
    padding: 18,
    marginTop: 14,
  },
  perSideTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  perSideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  plateDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  perSideDenom: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  perSideCount: {
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  reverseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  shareCardHost: {
    position: "absolute",
    left: -1000,
    top: 0,
  },
});

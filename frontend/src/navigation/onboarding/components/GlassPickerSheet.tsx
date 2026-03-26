import React, { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface PickerColumnProps {
  items: string[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  flex?: number;
  visible?: boolean;
}

export function PickerColumn({
  items,
  selectedIndex,
  onIndexChange,
  flex = 1,
  visible = true,
}: PickerColumnProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex, visible, items.length]);

  const updateIndexFromOffset = (offsetY: number) => {
    const idx = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    onIndexChange(clamped);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateIndexFromOffset(e.nativeEvent.contentOffset.y);
  };

  const handleDragEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateIndexFromOffset(e.nativeEvent.contentOffset.y);
  };

  return (
    <View style={[styles.column, { flex }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleDragEnd}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const diff = Math.abs(i - selectedIndex);
          return (
            <View key={i} style={styles.item}>
              <Text
                style={[
                  styles.itemText,
                  diff === 0 && styles.itemCenter,
                  diff === 1 && styles.itemNear,
                  diff > 1 && styles.itemFar,
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.highlight, styles.highlightFallback]} pointerEvents="none" />
      <View style={styles.fadeMaskTop} pointerEvents="none" />
      <View style={styles.fadeMaskBottom} pointerEvents="none" />
    </View>
  );
}

interface GlassPickerSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  headerContent?: React.ReactNode;
  pickerContent?: React.ReactNode;
  children?: React.ReactNode;
  rightAction?: { label: string; onPress: () => void };
}

export function GlassPickerSheet({
  visible,
  title,
  onClose,
  headerContent,
  pickerContent,
  children,
  rightAction,
}: GlassPickerSheetProps) {
  const content = pickerContent ?? children;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetTop}>
            <Text style={styles.sheetTitle}>{title}</Text>
            {rightAction && (
              <Pressable onPress={rightAction.onPress}>
                <Text style={styles.doneText}>{rightAction.label}</Text>
              </Pressable>
            )}
          </View>
          {headerContent ? <View style={styles.headerSlot}>{headerContent}</View> : null}
          <View style={styles.pickerRow}>{content}</View>
          <Pressable onPress={rightAction?.onPress ?? onClose}>
            <View style={[styles.sheetBtn, styles.sheetBtnFallback]}>
              <Text style={styles.sheetBtnText}>Done</Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface SegmentControlProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

export function SegmentControl({ options, selected, onSelect }: SegmentControlProps) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          style={[styles.segOption, selected === opt.value && styles.segOptionActive]}
        >
          <Text
            style={[
              styles.segText,
              selected === opt.value && styles.segTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    height: PICKER_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  highlight: {
    position: "absolute",
    left: 8,
    right: 8,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderRadius: 16,
    zIndex: 4,
    elevation: 4,
    pointerEvents: "none",
  },
  highlightFallback: {
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  fadeMaskTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 3,
    backgroundColor: "transparent",
    // Visual fade effect using borderBottomWidth trick not available in RN;
    // keep transparent — white sheet bg provides natural contrast
  },
  fadeMaskBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 3,
    backgroundColor: "transparent",
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 18,
    color: "#C7C7CC",
  },
  itemCenter: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0D0D0D",
  },
  itemNear: {
    fontSize: 21,
    fontWeight: "500",
    color: "#3A3A3A",
  },
  itemFar: {
    fontSize: 16,
    color: "#C7C7CC",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 99,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D0D0D",
  },
  doneText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0D0D0D",
  },
  headerSlot: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  pickerRow: {
    flexDirection: "row",
    height: PICKER_HEIGHT,
    alignItems: "stretch",
  },
  sheetBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  sheetBtnFallback: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  sheetBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.07)",
    borderRadius: 999,
    padding: 3,
  },
  segOption: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
  },
  segOptionActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8E8E93",
  },
  segTextActive: {
    color: "#0D0D0D",
  },
});

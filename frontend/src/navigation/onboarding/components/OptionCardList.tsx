import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import { useOnboardingColors } from "./useOnboardingColors";

export interface OptionItem<V extends string | number> {
  value: V;
  label: string;
  hint?: string;
  emoji?: string;
  /** SF Symbol name, rendered in place of an emoji for a cleaner look. */
  icon?: string;
}

interface OptionCardListProps<V extends string | number> {
  options: OptionItem<V>[];
  selected?: V | V[];
  onSelect: (v: V) => void;
  multi?: boolean;
  /** Cards stretch to fill the available height (good for 3-5 options).
   *  Set false for longer, fixed-height lists; wrap the step body in a
   *  scroll container when the list can overflow. */
  fill?: boolean;
  /** Compact, top-aligned cards with lighter borders — a cleaner look
   *  than the full-height fill cards. Overrides `fill`. */
  minimal?: boolean;
}

/** Single- or multi-select card list — the core intake control,
 *  styled after GenderCardList. */
export function OptionCardList<V extends string | number>({
  options,
  selected,
  onSelect,
  multi = false,
  fill = true,
  minimal = false,
}: OptionCardListProps<V>) {
  const colors = useOnboardingColors();

  const isSelected = (v: V) =>
    multi ? Array.isArray(selected) && selected.includes(v) : selected === v;

  const cards = options.map((opt) => {
    const active = isSelected(opt.value);
    return (
      <Pressable
        key={String(opt.value)}
        style={[
          styles.card,
          minimal
            ? styles.cardMinimal
            : fill
              ? styles.cardFill
              : styles.cardFixed,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
          active && {
            backgroundColor: colors.accent,
            borderColor: colors.accent,
          },
        ]}
        onPress={() => onSelect(opt.value)}
      >
        {opt.icon ? (
          <SymbolView
            name={opt.icon as React.ComponentProps<typeof SymbolView>["name"]}
            size={22}
            tintColor={active ? colors.accentText : colors.accent}
            style={styles.icon}
            resizeMode="scaleAspectFit"
          />
        ) : opt.emoji ? (
          <Text
            style={[
              styles.emoji,
              { color: active ? colors.accentText : colors.accent },
            ]}
          >
            {opt.emoji}
          </Text>
        ) : null}
        <View style={styles.cardText}>
          <Text
            style={[
              styles.cardName,
              { color: active ? colors.accentText : colors.text },
            ]}
          >
            {opt.label}
          </Text>
          {opt.hint && (
            <Text
              style={[
                styles.cardHint,
                {
                  color: active
                    ? colors.isDark
                      ? "rgba(0,0,0,0.5)"
                      : "rgba(255,255,255,0.6)"
                    : colors.secondary,
                },
              ]}
            >
              {opt.hint}
            </Text>
          )}
        </View>
        {active && (
          <View
            style={[styles.checkCircle, { backgroundColor: colors.accentText }]}
          >
            <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>
          </View>
        )}
      </Pressable>
    );
  });

  if (minimal) {
    return <View style={styles.minimalList}>{cards}</View>;
  }

  if (!fill) {
    return <View style={styles.fixedList}>{cards}</View>;
  }

  return <View style={styles.list}>{cards}</View>;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    gap: 10,
  },
  fixedList: {
    gap: 10,
    paddingBottom: 4,
  },
  minimalList: {
    gap: 10,
    paddingTop: 4,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cardFill: {
    flex: 1,
    minHeight: 64,
  },
  cardFixed: {
    minHeight: 72,
    paddingVertical: 16,
  },
  cardMinimal: {
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 24,
    width: 26,
    textAlign: "center",
    marginRight: 14,
  },
  icon: {
    width: 26,
    height: 26,
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardName: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cardHint: {
    fontSize: 13,
    marginTop: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 13,
    fontWeight: "700",
  },
});

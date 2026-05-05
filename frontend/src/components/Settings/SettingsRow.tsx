import React from "react";
import {
  ColorValue,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type SettingsCellPosition = "single" | "first" | "middle" | "last";

type BaseCellProps = {
  label: string;
  textColor: ColorValue;
  secondaryTextColor: ColorValue;
  cardColor: ColorValue;
  separatorColor: ColorValue;
  position: SettingsCellPosition;
};

type SettingsValueCellProps = BaseCellProps & {
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
};

type SettingsToggleCellProps = BaseCellProps & {
  value: boolean;
  onValueChange: (next: boolean) => void;
};

type SettingsDestructiveCellProps = Omit<
  BaseCellProps,
  "label" | "secondaryTextColor" | "textColor"
> & {
  title: string;
  destructiveColor: ColorValue;
  onPress: () => void;
};

export function SettingsSectionContainer({
  children,
  cardColor,
  separatorColor,
  position,
}: {
  children: React.ReactNode;
  cardColor: ColorValue;
  separatorColor: ColorValue;
  position: SettingsCellPosition;
}) {
  const radius =
    position === "single"
      ? styles.radiusAll
      : position === "first"
        ? styles.radiusTop
        : position === "last"
          ? styles.radiusBottom
          : null;

  return (
    <View
      style={[styles.sectionContainer, { backgroundColor: cardColor }, radius]}
    >
      {children}
      {position !== "last" && position !== "single" ? (
        <View style={[styles.separator, { backgroundColor: separatorColor }]} />
      ) : null}
    </View>
  );
}

export function SettingsValueCell({
  label,
  value,
  onPress,
  showArrow = true,
  textColor,
  secondaryTextColor,
  cardColor,
  separatorColor,
  position,
}: SettingsValueCellProps) {
  return (
    <SettingsSectionContainer
      cardColor={cardColor}
      separatorColor={separatorColor}
      position={position}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.65 : 1}
        style={styles.row}
      >
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        <View style={styles.right}>
          {!!value && (
            <Text style={[styles.value, { color: secondaryTextColor }]}>
              {value}
            </Text>
          )}
          {showArrow ? (
            <Text style={[styles.chevron, { color: secondaryTextColor }]}>
              ›
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </SettingsSectionContainer>
  );
}

export function SettingsToggleCell({
  label,
  value,
  onValueChange,
  textColor,
  cardColor,
  separatorColor,
  position,
}: SettingsToggleCellProps) {
  return (
    <SettingsSectionContainer
      cardColor={cardColor}
      separatorColor={separatorColor}
      position={position}
    >
      <View style={styles.row}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        <View style={styles.switchWrap}>
          <Switch value={value} onValueChange={onValueChange} />
        </View>
      </View>
    </SettingsSectionContainer>
  );
}

export function SettingsDestructiveCell({
  title,
  onPress,
  destructiveColor,
  cardColor,
  separatorColor,
  position,
}: SettingsDestructiveCellProps) {
  return (
    <SettingsSectionContainer
      cardColor={cardColor}
      separatorColor={separatorColor}
      position={position}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.65}
        style={styles.rowCenter}
      >
        <Text style={[styles.destructiveText, { color: destructiveColor }]}>
          {title}
        </Text>
      </TouchableOpacity>
    </SettingsSectionContainer>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginHorizontal: 20,
    overflow: "hidden",
  },
  radiusAll: {
    borderRadius: 12,
  },
  radiusTop: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  radiusBottom: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  row: {
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCenter: {
    minHeight: 50,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  switchWrap: {
    height: 31,
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  value: {
    fontSize: 16,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 22,
    marginTop: -1,
  },
  destructiveText: {
    fontSize: 17,
    fontWeight: "500",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14,
  },
});

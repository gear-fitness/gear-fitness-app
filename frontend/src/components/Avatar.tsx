import React from "react";
import {
  View,
  Image,
  ImageStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";

type Props = {
  username: string;
  profilePictureUrl?: string | null;
  size: number;
  style?: ViewStyle;
  onPress?: () => void;
};

export function Avatar({
  username,
  profilePictureUrl,
  size,
  style,
  onPress,
}: Props) {
  const { colors } = useTheme();

  const inner = profilePictureUrl ? (
    <Image
      source={{ uri: profilePictureUrl }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style as ImageStyle,
      ]}
    />
  ) : (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.background,
          fontSize: size * 0.43,
          fontWeight: "600",
          includeFontPadding: false,
        }}
      >
        {username.charAt(0).toUpperCase()}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

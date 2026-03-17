import React from "react";
import { View, Image, ImageStyle, ViewStyle } from "react-native";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";

type Props = {
  username: string;
  profilePictureUrl?: string | null;
  size: number;
  style?: ViewStyle;
};

export function Avatar({ username, profilePictureUrl, size, style }: Props) {
  const { colors } = useTheme();

  if (profilePictureUrl) {
    return (
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
    );
  }

  return (
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
          color: "#fff",
          fontSize: size * 0.43,
          fontWeight: "600",
          includeFontPadding: false,
        }}
      >
        {username.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

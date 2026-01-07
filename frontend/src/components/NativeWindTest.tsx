import React from "react";
import { View, Text } from "react-native";

export function NativeWindTest() {
  return (
    <View className="p-4 bg-primary rounded-lg m-4">
      <Text className="text-white text-lg font-bold">
        NativeWind Test
      </Text>
      <Text className="text-white text-sm mt-2">
        If you see a blue box with white text, NativeWind is working!
      </Text>
    </View>
  );
}

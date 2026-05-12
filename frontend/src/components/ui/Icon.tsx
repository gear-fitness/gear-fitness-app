import { Platform } from "react-native";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const SYMBOL_TO_IONICON: Record<string, IoniconName> = {
  "play.fill": "play",
  "pause.fill": "pause",
  "note.text": "document-text",
  "square.and.pencil": "create",
  "chart.xyaxis.line": "analytics",
  "chevron.up": "chevron-up",
  "chevron.down": "chevron-down",
};

type Props = {
  name: SymbolViewProps["name"];
  size: number;
  tintColor?: string;
  weight?: SymbolViewProps["weight"];
  androidName?: IoniconName;
};

export function Icon({ name, size, tintColor, weight, androidName }: Props) {
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={name}
        size={size}
        tintColor={tintColor}
        weight={weight}
      />
    );
  }

  const ionName = androidName ?? SYMBOL_TO_IONICON[name as string];
  if (!ionName) return null;
  return <Ionicons name={ionName} size={size} color={tintColor} />;
}

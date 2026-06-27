import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  StyleProp,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { usePresignedImage } from "../hooks/usePresignedImage";

type Props = {
  imageKey?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  showLoader?: boolean;
};

export function PresignedImage({
  imageKey,
  style,
  resizeMode = "cover",
  showLoader = true,
}: Props) {
  const { colors } = useTheme();
  const uri = usePresignedImage(imageKey);
  // Track decode/network failures so a broken url shows the placeholder instead
  // of rendering nothing. Reset whenever the url changes (e.g. a refreshed
  // presigned url) so a recovered image gets another chance to load.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        {showLoader && !failed ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : null}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}

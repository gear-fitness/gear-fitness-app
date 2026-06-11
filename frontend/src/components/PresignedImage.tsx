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

  if (!uri) {
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
        {showLoader ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : null}
      </View>
    );
  }

  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}

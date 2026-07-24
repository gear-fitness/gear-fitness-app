import { useEffect, useState } from "react";
import { Image, ImageStyle, StyleProp, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { usePresignedImage } from "../hooks/usePresignedImage";
import { Spinner } from "./Spinner";

type Props = {
  imageKey?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  showLoader?: boolean;
};

// After this long without a resolved url, drop the spinner and keep the
// static placeholder. The spinner animates on the UI thread every frame, and
// a resolution that keeps failing (retried with backoff in usePresignedImage)
// would otherwise leave it running for the life of the card.
const SPINNER_TIMEOUT_MS = 12_000;

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

  // A still-loading image shows the spinner only for a bounded time; if the
  // url arrives later (retry succeeded), the image swaps in regardless.
  const [spinnerTimedOut, setSpinnerTimedOut] = useState(false);
  useEffect(() => {
    if (uri) return;
    setSpinnerTimedOut(false);
    const timer = setTimeout(
      () => setSpinnerTimedOut(true),
      SPINNER_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [uri, imageKey]);

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
        {showLoader && !failed && !spinnerTimedOut ? (
          <Spinner size="small" color={colors.text} />
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

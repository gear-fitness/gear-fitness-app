import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  ImageStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useCachedAvatarUri } from "../hooks/useCachedAvatarUri";

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
  // profilePictureUrl is an S3 key under the secure-s3 image model. The hook
  // resolves it to a renderable URI: a locally-cached file when one exists
  // (offline-safe), otherwise a freshly presigned url. Returns null when the
  // key can't be resolved (e.g. offline with no cached copy) so we fall back
  // to the initials avatar below.
  const resolvedUri = useCachedAvatarUri(profilePictureUrl);
  const [loadFailed, setLoadFailed] = useState(false);

  // Reset failure state when the URI changes — a new resolution attempt
  // shouldn't carry over the previous failure.
  useEffect(() => {
    setLoadFailed(false);
  }, [resolvedUri]);

  const inner =
    resolvedUri && !loadFailed ? (
      <Image
        source={{ uri: resolvedUri }}
        onError={() => setLoadFailed(true)}
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

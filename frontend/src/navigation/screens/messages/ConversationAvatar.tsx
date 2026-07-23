import { StyleSheet, View, ViewStyle } from "react-native";
import { Avatar } from "../../../components/Avatar";
import { ConversationType } from "../../../api/messageService";
import { useDmTheme } from "./dmTheme";

/** Just enough of a member to render their face. */
export type AvatarMember = {
  username: string;
  profilePictureUrl?: string | null;
};

type Props = {
  size: number;
  type: ConversationType;
  /** A custom group photo (S3 key), if one was set. Overrides the stack. */
  imageKey?: string | null;
  /** Other participants (excluding me). Groups stack the first two. */
  members: AvatarMember[];
  /** Initials fallback when there's no photo and nobody to stack. */
  fallbackName: string;
  style?: ViewStyle;
};

/**
 * The avatar for a conversation. 1:1s (and groups with a custom photo) render a
 * single cached {@link Avatar}. A group with no custom photo stacks its first two
 * members' pictures, Instagram-style — each face is just a smaller cached Avatar,
 * so this adds no new image loading (and inherits the initials fallback for
 * members without a picture).
 */
export function ConversationAvatar({
  size,
  type,
  imageKey,
  members,
  fallbackName,
  style,
}: Props) {
  const t = useDmTheme();

  const stack =
    type === "GROUP" && !imageKey && members.length >= 2;

  if (!stack) {
    // DIRECT, a group with a custom photo, or a degenerate <2-member group.
    const single =
      type === "GROUP" && imageKey
        ? { username: fallbackName, profilePictureUrl: imageKey }
        : (members[0] ?? { username: fallbackName, profilePictureUrl: null });
    return (
      <Avatar
        username={single.username}
        profilePictureUrl={single.profilePictureUrl}
        size={size}
        style={style}
      />
    );
  }

  // Two faces overlapping within the same size×size footprint: back one pinned
  // top-left, front one bottom-right with a bg-coloured ring so it reads as a
  // clean cut-out over the back face.
  const sub = Math.round(size * 0.66);
  const ring = Math.max(2, Math.round(size * 0.04));
  const [back, front] = members;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Avatar
        username={back.username}
        profilePictureUrl={back.profilePictureUrl}
        size={sub}
        style={styles.back}
      />
      <View
        style={[
          styles.frontRing,
          { backgroundColor: t.bg, padding: ring, borderRadius: (sub + ring * 2) / 2 },
        ]}
      >
        <Avatar
          username={front.username}
          profilePictureUrl={front.profilePictureUrl}
          size={sub}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  frontRing: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
});

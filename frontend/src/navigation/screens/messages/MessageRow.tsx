import { useCallback } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { Text } from "../../../components/Text";
import { Avatar } from "../../../components/Avatar";
import { PresignedImage } from "../../../components/PresignedImage";
import { Message } from "../../../api/messageService";
import { clockTime } from "./conversationDisplay";
import { useDmTheme } from "./dmTheme";

// Local message with optimistic-send status flags. Shared with MessageThread,
// which owns the list and the optimistic send/reconcile logic.
export type UIMessage = Message & {
  pending?: boolean;
  failed?: boolean;
  failReason?: string;
};

// How far the list slides left to reveal exact send times, in px. Exported so
// the thread's pan gesture clamps to the same distance the reveal is sized for.
export const REVEAL_WIDTH = 64;

const AVATAR_SIZE = 28;

type Props = {
  item: UIMessage;
  mine: boolean;
  showSender: boolean;
  isRunEnd: boolean;
  runWithOlder: boolean;
  showSession: boolean;
  sessionText: string;
  showSeen: boolean;
  // One shared value drives the whole list, so every row reveals its timestamp
  // together (Instagram behaviour) — all on the native thread, no setState.
  panX: SharedValue<number>;
};

export function MessageRow({
  item,
  mine,
  showSender,
  isRunEnd,
  runWithOlder,
  showSession,
  sessionText,
  showSeen,
  panX,
}: Props) {
  const t = useDmTheme();
  const navigation = useNavigation() as any;

  // Content slides left with the swipe; the revealed time fades in behind it.
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value }],
  }));
  const timeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, -panX.value / REVEAL_WIDTH),
  }));

  const openImage = useCallback(() => {
    navigation.navigate("ImageViewer", {
      photos: item.mediaKeys,
      initialIndex: 0,
    });
  }, [navigation, item.mediaKeys]);

  const hasMedia = !item.deleted && (item.mediaKeys?.length ?? 0) > 0;

  return (
    <View style={[styles.messageBlock, runWithOlder ? null : styles.runStart]}>
      {showSession ? (
        <View style={styles.sessionRow}>
          <Text style={[styles.sessionText, { color: t.textFaint }]}>
            {sessionText}
          </Text>
        </View>
      ) : null}
      {showSender ? (
        <Text style={[styles.senderName, { color: t.textMuted }]}>
          {item.senderUsername}
        </Text>
      ) : null}

      <View style={styles.revealWrap}>
        {/* Exact send time, pinned to the right edge, revealed on swipe-left.
            A flex wrapper centers it vertically on both platforms (Text's
            textAlignVertical is Android-only). */}
        <Animated.View style={[styles.revealTimeCol, timeStyle]}>
          <Text
            style={[styles.revealTimeText, { color: t.textFaint }]}
            numberOfLines={1}
          >
            {clockTime(item.createdAt)}
          </Text>
        </Animated.View>

        <Animated.View style={slideStyle}>
          <View
            style={[
              styles.bubbleRow,
              { justifyContent: mine ? "flex-end" : "flex-start" },
            ]}
          >
            {/* Received messages carry the sender's avatar on the left, shown
                once at the bottom of a run; a spacer keeps the run aligned. */}
            {!mine ? (
              isRunEnd ? (
                <Avatar
                  username={item.senderUsername}
                  profilePictureUrl={item.senderProfilePictureUrl}
                  size={AVATAR_SIZE}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarSpacer} />
              )
            ) : null}

            <View
              style={[
                styles.bubble,
                hasMedia
                  ? styles.bubbleMedia
                  : mine
                    ? { backgroundColor: t.bubbleOut }
                    : { backgroundColor: t.bubbleIn },
                !hasMedia && isRunEnd
                  ? mine
                    ? styles.tailRight
                    : styles.tailLeft
                  : null,
                item.failed ? styles.bubbleFailed : null,
              ]}
            >
              {item.deleted ? (
                <Text
                  style={[
                    styles.deletedText,
                    { color: mine ? t.bubbleOutText : t.textMuted },
                  ]}
                >
                  Message deleted
                </Text>
              ) : (
                <>
                  {hasMedia ? (
                    <TouchableOpacity activeOpacity={0.9} onPress={openImage}>
                      <PresignedImage
                        imageKey={item.mediaKeys[0]}
                        style={styles.messageImage}
                      />
                    </TouchableOpacity>
                  ) : null}
                  {item.content ? (
                    <Text
                      style={[
                        styles.bubbleText,
                        {
                          color: hasMedia
                            ? t.text
                            : mine
                              ? t.bubbleOutText
                              : t.bubbleInText,
                          marginTop: hasMedia ? 6 : 0,
                        },
                      ]}
                    >
                      {item.content}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </View>

          {item.failed ? (
            <Text style={[styles.failedText, { color: t.danger }]}>
              {item.failReason ?? "Not delivered"}
            </Text>
          ) : null}
          {showSeen ? (
            <Text style={[styles.metaText, { color: t.textFaint }]}>Seen</Text>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  messageBlock: {
    marginTop: 2,
  },
  // First message of a run gets the breathing room; the rest stay tight.
  runStart: {
    marginTop: 10,
  },
  sessionRow: {
    alignItems: "center",
    paddingVertical: 14,
  },
  sessionText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.1,
    marginLeft: AVATAR_SIZE + 6 + 12,
    marginBottom: 3,
  },
  revealWrap: {
    position: "relative",
    justifyContent: "center",
  },
  revealTimeCol: {
    position: "absolute",
    right: 2,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  revealTimeText: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  avatar: {
    marginRight: 6,
  },
  avatarSpacer: {
    width: AVATAR_SIZE,
    marginRight: 6,
  },
  bubble: {
    maxWidth: "76%",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
  },
  tailRight: {
    borderBottomRightRadius: 5,
  },
  tailLeft: {
    borderBottomLeftRadius: 5,
  },
  bubbleFailed: {
    opacity: 0.6,
  },
  bubbleText: {
    fontSize: 15.5,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  // No padding/background: the photo itself is the bubble.
  bubbleMedia: {
    padding: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 16,
  },
  deletedText: {
    fontStyle: "italic",
    fontSize: 15,
  },
  failedText: {
    fontSize: 11,
    letterSpacing: -0.1,
    alignSelf: "flex-end",
    marginTop: 3,
  },
  metaText: {
    fontSize: 11,
    letterSpacing: -0.1,
    alignSelf: "flex-end",
    marginTop: 3,
  },
});

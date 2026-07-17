import { StyleProp, TextProps, TextStyle } from "react-native";
import { Text } from "./Text";
import { useNavigation } from "@react-navigation/native";

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onTextLayout?: TextProps["onTextLayout"];
  /** Color for @mention segments. */
  mentionColor?: string;
  /** Override mention tap behavior; defaults to navigating to the profile. */
  onPressMention?: (username: string) => void;
}

type Segment =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; username: string };

// Usernames are ^[a-z0-9._]+$ (min 3). No lookbehind (Hermes compatibility) —
// the preceding character is checked manually so emails (foo@bar) aren't linked.
const MENTION_RE = /@([a-zA-Z0-9._]{3,})/g;
const WORD_CHAR = /[a-zA-Z0-9._]/;

export function parseMentions(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((match = MENTION_RE.exec(text)) !== null) {
    const start = match.index;
    const before = start > 0 ? text[start - 1] : " ";
    if (WORD_CHAR.test(before)) continue; // part of a longer token / email
    if (start > last) {
      segments.push({ type: "text", value: text.slice(last, start) });
    }
    segments.push({ type: "mention", value: match[0], username: match[1] });
    last = start + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return segments;
}

export function MentionableText({
  text,
  style,
  numberOfLines,
  onTextLayout,
  mentionColor = "#3b82f6",
  onPressMention,
}: Props) {
  const navigation = useNavigation() as any;

  const handlePress = (username: string) => {
    // Usernames are canonically lowercase; normalize so a manually-typed
    // "@Kobe" still resolves to the right profile.
    const normalized = username.toLowerCase();
    if (onPressMention) onPressMention(normalized);
    else navigation.push("UserProfile", { username: normalized });
  };

  const segments = parseMentions(text);

  return (
    <Text style={style} numberOfLines={numberOfLines} onTextLayout={onTextLayout}>
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <Text
            key={i}
            style={{ color: mentionColor, fontWeight: "600" }}
            onPress={() => handlePress(seg.username)}
            suppressHighlighting
          >
            {seg.value}
          </Text>
        ) : (
          <Text key={i}>{seg.value}</Text>
        ),
      )}
    </Text>
  );
}

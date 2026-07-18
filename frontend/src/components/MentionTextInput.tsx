import { useEffect, useRef, useState } from "react";
import {
  View,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from "react-native";
import { Text, TextInput } from "./Text";
import { useTheme } from "@react-navigation/native";
import { searchUsers } from "../api/userService";
import { SearchUserResult } from "../api/types";
import { Avatar } from "./Avatar";

type Props = Omit<TextInputProps, "onChangeText" | "value"> & {
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
};

const WORD_CHAR = /[a-zA-Z0-9._]/;
// Keep the popover small so it doesn't blanket the form above the field.
const MAX_SUGGESTIONS = 4;

/** The active `@token` the cursor is currently inside, if any. */
function activeToken(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  let i = cursor - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "@") {
      const before = i > 0 ? text[i - 1] : " ";
      if (WORD_CHAR.test(before)) return null;
      return { start: i, query: text.slice(i + 1, cursor) };
    }
    if (!WORD_CHAR.test(ch)) return null;
    i--;
  }
  return null;
}

/**
 * TextInput with @mention autocomplete. Detects the @token under the cursor,
 * searches users (debounced, reusing the existing search API), and shows a
 * dropdown above the input; selecting inserts `@username `.
 */
export function MentionTextInput({
  value,
  onChangeText,
  style,
  containerStyle,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [cursor, setCursor] = useState(0);
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id so a slow earlier search can't overwrite a newer one's results.
  const reqIdRef = useRef(0);
  // Set right after inserting a mention so the search effect doesn't re-detect
  // the just-completed token and reopen the dropdown (which would let repeated
  // taps concatenate the same name over and over).
  const justInsertedRef = useRef(false);

  useEffect(() => {
    if (justInsertedRef.current) {
      justInsertedRef.current = false;
      return;
    }
    const token = activeToken(value, cursor);
    if (!token || token.query.length < 1) {
      setOpen(false);
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const reqId = ++reqIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchUsers(token.query);
        if (reqId !== reqIdRef.current) return; // a newer search superseded this
        setResults(r.slice(0, MAX_SUGGESTIONS));
        setOpen(r.length > 0);
      } catch {
        if (reqId !== reqIdRef.current) return;
        setResults([]);
        setOpen(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, cursor]);

  const onSelectionChange = (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    // Ignore the selection event caused by our own insertion; the cursor is
    // already tracked, and honoring the native event can re-trigger detection.
    if (justInsertedRef.current) return;
    setCursor(e.nativeEvent.selection.start);
  };

  const insert = (username: string) => {
    const token = activeToken(value, cursor);
    if (!token) return;
    const before = value.slice(0, token.start);
    const after = value.slice(cursor);
    const mention = `@${username} `;
    justInsertedRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setOpen(false);
    setResults([]);
    setCursor((before + mention).length);
    onChangeText(`${before}${mention}${after}`);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {open && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {results.map((u) => (
            <TouchableOpacity
              key={u.userId}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => insert(u.username)}
            >
              <Avatar
                username={u.username}
                profilePictureUrl={u.profilePictureUrl}
                size={24}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowUser, { color: colors.text }]}>
                  @{u.username}
                </Text>
                {u.displayName ? (
                  <Text
                    style={[styles.rowName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {u.displayName}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TextInput
        {...rest}
        style={style}
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={onSelectionChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  dropdown: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 4,
    // Read as a floating popover above the surrounding form content.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rowText: {
    marginLeft: 10,
    flex: 1,
  },
  rowUser: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowName: {
    fontSize: 12,
    opacity: 0.6,
  },
});

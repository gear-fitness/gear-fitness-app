import React from "react";
import { FlatList, StyleSheet, View, useColorScheme } from "react-native";
import { Text } from "../../components/Text";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedPost } from "../../api/socialFeedApi";
import { FeedPostCard } from "../../components/FeedPostCard";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";
import { MINI_PLAYER_HEIGHT } from "../../components/WorkoutPlayer";
import { useTrackTab } from "../../hooks/useTrackTab";

/**
 * Lists every post for a single day. Reached from the Profile activity grid
 * when a tapped circle has more than one workout post — a single-post day goes
 * straight to PostDetail instead. The posts are handed in via route params
 * (already loaded on the Profile screen), so this screen does no fetching.
 */
export function DayPosts() {
  const navigation = useNavigation() as any;
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  useTrackTab("DayPosts");

  const posts: FeedPost[] = route.params?.posts ?? [];
  const dateLabel: string = route.params?.dateLabel ?? "";

  const t = isDark
    ? {
        bg: "#0a0a0a",
        text: "#fff",
        textMuted: "rgba(255,255,255,0.55)",
        border: "rgba(255,255,255,0.08)",
      }
    : {
        bg: "#fafafa",
        text: "#000",
        textMuted: "rgba(0,0,0,0.5)",
        border: "rgba(0,0,0,0.08)",
      };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FloatingCloseButton direction="left" accessibilityLabel="Back" />
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: t.bg,
            borderBottomColor: t.border,
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <View style={styles.side} />
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: t.text }]}>Workouts</Text>
          {dateLabel ? (
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              {dateLabel} · {posts.length}
            </Text>
          ) : null}
        </View>
        <View style={styles.side} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.postId)}
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
            onOpenComments={(postId) =>
              navigation.navigate("Comments", { postId })
            }
          />
        )}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: MINI_PLAYER_HEIGHT + 30,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 32,
    height: 32,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
    fontVariant: ["tabular-nums"],
  },
});

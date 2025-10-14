import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
} from "react-native";
import { Text } from "@react-navigation/elements";

/** 1) DATA TYPES + DUMMY TEMPLATE */
type Stat = { label: string; value: string };
type PostCard = {
  id: string;
  userName: string;
  date: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  mapThumbUrl: string;
  stats: Stat[];
  rating: number;
  likes: number;
  liked: boolean;
  comments: string[];
  isFollowed: boolean;
};

const TEMPLATE: Omit<PostCard, "id"> = {
  userName: "Example Name",
  date: "Example Date",
  title: "Example Workout",
  subtitle: "Workout info",
  imageUrl:
    "https://i0.wp.com/www.strengthlog.com/wp-content/uploads/2020/11/Arnold-Schwarzenegger-Chest-Muscles-3.jpg?w=995&ssl=1",
  mapThumbUrl:
    "https://i0.wp.com/www.strengthlog.com/wp-content/uploads/2020/11/Arnold-Schwarzenegger-Chest-Muscles-3.jpg?w=995&ssl=1",
  stats: [
    { label: "Length", value: "1.11 mi" },
    { label: "Elev. gain", value: "20 ft" },
    { label: "Time", value: "45m" },
  ],
  rating: 4,
  likes: 0,
  liked: false,
  comments: ["Nice work!", "Huge PR 🔥"],
  isFollowed: false,
};

/** 2) SMALL COMPONENTS */
const StarRating = ({ value }: { value: number }) => {
  const solid = "★".repeat(value);
  const empty = "☆".repeat(5 - value);
  return (
    <Text style={styles.rating}>
      {solid}
      {empty}
    </Text>
  );
};

const TabBar = ({
  active,
  setActive,
}: {
  active: "Local" | "Following";
  setActive: (tab: "Local" | "Following") => void;
}) => (
  <View style={styles.tabBar}>
    {(["Local", "Following"] as const).map((tab) => (
      <TouchableOpacity key={tab} onPress={() => setActive(tab)}>
        <Text style={[styles.tab, active === tab && styles.tabActive]}>
          {tab}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

/** 3) CARD VIEW */
const PostCardView = ({
  post,
  onLike,
  onToggleFollow,
  onAddComment,
}: {
  post: PostCard;
  onLike: (id: string) => void;
  onToggleFollow: (userName: string) => void;
  onAddComment: (id: string, text: string) => void;
}) => {
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <View style={styles.card}>
      {/* user row */}
      <View style={styles.userRow}>
        <View style={styles.avatarFallback}>
          <Text style={{ fontWeight: "700" }}>
            {post.userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{post.userName}</Text>
          <Text style={styles.dateText}>{post.date}</Text>
        </View>
        <Pressable onPress={() => onToggleFollow(post.userName)}>
          <Text style={[styles.follow, post.isFollowed && styles.following]}>
            {post.isFollowed ? "Following" : "Follow"}
          </Text>
        </Pressable>
        <Pressable style={{ marginLeft: 12 }}>
          <Text style={{ fontSize: 18 }}>•••</Text>
        </Pressable>
      </View>

      {/* image */}
      <View style={styles.heroWrap}>
        <Image source={{ uri: post.imageUrl }} style={styles.hero} />
        <Pressable style={styles.recapPill}>
          <Text style={styles.recapPlay}>▶</Text>
          <Text style={styles.recapText}>Recap</Text>
        </Pressable>
        <Image source={{ uri: post.mapThumbUrl }} style={styles.mapThumb} />
      </View>

      {/* titles */}
      <View style={styles.titleBlock}>
        <Text style={styles.cardTitle}>{post.title}</Text>
        <Text style={styles.cardSubtitle}>{post.subtitle}</Text>
      </View>

      {/* stats */}
      <View style={styles.statsRow}>
        {post.stats.map((s) => (
          <View key={s.label} style={styles.statCell}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
          </View>
        ))}
      </View>

      {/* actions */}
      <View style={styles.actionsRow}>
        <StarRating value={post.rating} />
        <View style={{ flex: 1 }} />
        <Pressable style={styles.actionBtn} onPress={() => onLike(post.id)}>
          <Text style={styles.actionText}>
            {post.liked ? "♥" : "♡"} Like ({post.likes})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { marginLeft: 16 }]}
          onPress={() => setShowComments((s) => !s)}
        >
          <Text style={styles.actionText}>💬 {post.comments.length}</Text>
        </Pressable>
      </View>

      {/* comments */}
      {showComments && (
        <View style={styles.commentsWrap}>
          {post.comments.map((c, i) => (
            <View key={i} style={styles.commentRow}>
              <View style={styles.commentAvatar} />
              <Text style={styles.commentText}>{c}</Text>
            </View>
          ))}

          <View style={styles.commentInputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment..."
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={() => {
                const text = draft.trim();
                if (!text) return;
                onAddComment(post.id, text);
                setDraft("");
              }}
            />
            <Pressable
              style={styles.sendBtn}
              onPress={() => {
                const text = draft.trim();
                if (!text) return;
                onAddComment(post.id, text);
                setDraft("");
              }}
            >
              <Text style={{ fontWeight: "700" }}>Send</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

/** 4) MAIN SCREEN */
export function Social() {
  const [activeTab, setActiveTab] = useState<"Local" | "Following">("Local");

  // just 5 fixed posts
  const [posts, setPosts] = useState<PostCard[]>([
    {
      ...TEMPLATE,
      id: "1",
      userName: "Arnold",
      imageUrl:
        "https://hips.hearstapps.com/hmg-prod/images/body-builder-actor-and-future-governor-of-california-arnold-news-photo-1686584660.jpg",
      mapThumbUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnS_ZEUtDfrocdF3MFX2JLPMVPAvR6kYQVmg&s",
    },
    {
      ...TEMPLATE,
      id: "2",
      userName: "Chris",
      imageUrl:
        "https://substackcdn.com/image/fetch/$s_!vHIc!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F2dd9e8fc-8177-4229-8424-916ccfdf87aa_1280x720.jpeg",
      mapThumbUrl:
        "https://upload.wikimedia.org/wikipedia/commons/7/73/Chris_Bumstead_on_Gymshark.jpg",
    },
    {
      ...TEMPLATE,
      id: "3",
      userName: "Ronnie",
      imageUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQimSiiP83aoqcC1K9jx7m_LjNtuT1NOrSBkmrlN_NwfgQcfVvp87NvNkrEXVNbMjZi_PfO_yt0",
      mapThumbUrl:
        "https://i2.wp.com/www.filminquiry.com/wp-content/uploads/2018/08/ronnie-coleman-king.jpg?fit=1050%2C700&ssl=1",
    },
    {
      ...TEMPLATE,
      id: "4",
      userName: "Kobe",
      imageUrl:
        "https://m.media-amazon.com/images/I/71aNzvSYkUL._UF894,1000_QL80_.jpg",
      mapThumbUrl:
        "https://s3.amazonaws.com/mcdbookimages/authors/images/000/000/082/reg/200068052.jpg?1533221870",
    },
    {
      ...TEMPLATE,
      id: "5",
      userName: "Zyzz",
      imageUrl: "https://miro.medium.com/1*ljSnRGg9vPVQwTg-sj5_0Q.jpeg",
      mapThumbUrl:
        "https://www.greatestphysiques.com/wp-content/uploads/2016/10/81264752_1407282767.jpg",
    },
  ]);

  const handleLike = (id: string) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1,
            }
          : p
      )
    );

  const handleToggleFollow = (userName: string) =>
    setPosts((prev) => {
      const isFollowed = prev.some(
        (p) => p.userName === userName && p.isFollowed
      );
      const next = !isFollowed;
      return prev.map((p) =>
        p.userName === userName ? { ...p, isFollowed: next } : p
      );
    });

  const handleAddComment = (id: string, text: string) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, comments: [...p.comments, text] } : p
      )
    );

  const data = useMemo(() => {
    const source =
      activeTab === "Following" ? posts.filter((p) => p.isFollowed) : posts;
    return activeTab === "Following" ? source.slice().reverse() : source;
  }, [activeTab, posts]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Latest</Text>
        <TouchableOpacity>
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <TabBar active={activeTab} setActive={setActiveTab} />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCardView
            post={item}
            onLike={handleLike}
            onToggleFollow={handleToggleFollow}
            onAddComment={handleAddComment}
          />
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          activeTab === "Following" ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text style={{ opacity: 0.6 }}>
                You’re not following anyone yet.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

/** 5) STYLES */
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  tab: {
    marginRight: 22,
    paddingBottom: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  tabActive: { borderBottomWidth: 2 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  userName: { fontWeight: "700" },
  dateText: { fontSize: 12 },
  follow: { fontWeight: "700" },
  following: { opacity: 0.8, textDecorationLine: "underline" },
  heroWrap: { position: "relative" },
  hero: { width: "100%", height: 260 },
  recapPill: {
    position: "absolute",
    right: 14,
    top: 14,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    opacity: 0.95,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recapPlay: { marginRight: 8 },
  recapText: { fontWeight: "700" },
  mapThumb: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  titleBlock: { paddingHorizontal: 16, paddingTop: 14 },
  cardTitle: { fontSize: 20, fontWeight: "800" },
  cardSubtitle: { marginTop: 4 },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12 },
  statCell: { marginRight: 24 },
  statLabel: { fontSize: 12, marginBottom: 2 },
  statValue: { fontWeight: "700" },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rating: { marginRight: 10 },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontWeight: "600" },
  commentsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  commentAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  commentText: { flex: 1, lineHeight: 18 },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
});

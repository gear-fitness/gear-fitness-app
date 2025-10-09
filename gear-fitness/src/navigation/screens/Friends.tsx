import { Text } from "@react-navigation/elements";
import { StyleSheet, View, FlatList } from "react-native";
import { useState } from "react";

type Post = {
  id: string;
  user: string;
  content: string;
};

export function Friends() {
  const [data, setData] = useState<Post[]>(
    Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      user: `User${i + 1}`,
      content: `This is a mock post #${i + 1}. Just some placeholder text.`,
    }))
  );

  const loadMore = () => {
    const newData = Array.from({ length: 10 }, (_, i) => ({
      id: `${data.length + i + 1}`,
      user: `User${data.length + i + 1}`,
      content: `Another generated post #${data.length + i + 1}.`,
    }));
    setData([...data, ...newData]);
  };

  const renderItem = ({ item }: { item: Post }) => (
    <View style={styles.post}>
      <Text style={styles.user}>{item.user}</Text>
      <Text style={styles.content}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  post: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    paddingVertical: 12,
  },
  user: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
});

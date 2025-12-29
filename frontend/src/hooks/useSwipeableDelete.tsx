import { useRef } from "react";
import { Alert, Animated, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import trashIcon from "../assets/trash.png";

interface UseSwipeableDeleteConfig {
  onDelete: (id: string) => void;
  deleteTitle: string;
  deleteMessage: string;
}

export function useSwipeableDelete({
  onDelete,
  deleteTitle,
  deleteMessage,
}: UseSwipeableDeleteConfig) {
  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());

  const closeSwipe = (id: string) => {
    swipeRefs.current.get(id)?.close();
  };

  const confirmDelete = (id: string) => {
    Alert.alert(deleteTitle, deleteMessage, [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => closeSwipe(id),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete(id);
          closeSwipe(id);
        },
      },
    ]);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    id: string
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
      extrapolate: "clamp",
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.deleteBackground}
        onPress={() => confirmDelete(id)}
        activeOpacity={0.9}
      >
        <Animated.View style={{ transform: [{ translateX }, { scale }] }}>
          <Image
            source={trashIcon}
            style={{ width: 26, height: 26, tintColor: "#fff" }}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const getSwipeableProps = (id: string) => ({
    ref: (r: Swipeable | null) => {
      if (r) swipeRefs.current.set(id, r);
    },
    overshootRight: false,
    rightThreshold: 40,
    onSwipeableWillOpen: () => confirmDelete(id),
    renderRightActions: (
      prog: Animated.AnimatedInterpolation<number>,
      drag: Animated.AnimatedInterpolation<number>
    ) => renderRightActions(prog, drag, id),
  });

  return { getSwipeableProps, swipeRefs, closeSwipe };
}

const styles = StyleSheet.create({
  deleteBackground: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "flex-end",
    width: "100%",
    paddingRight: 20,
    flex: 1,
  },
});

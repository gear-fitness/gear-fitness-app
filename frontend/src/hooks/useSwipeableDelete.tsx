import React, { useRef } from "react";
import { Alert, TouchableOpacity, Image, StyleSheet } from "react-native";
import { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, {
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import trashIcon from "../assets/trash.png";

interface UseSwipeableDeleteConfig {
  onDelete: (id: string) => void;
  deleteTitle: string;
  deleteMessage: string;
}

function DeleteAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [80, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.7, 1]) },
    ],
  }));

  return (
    <TouchableOpacity
      style={styles.deleteBackground}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Reanimated.View style={animatedStyle}>
        <Image
          source={trashIcon}
          style={{ width: 26, height: 26, tintColor: "#fff" }}
        />
      </Reanimated.View>
    </TouchableOpacity>
  );
}

export function useSwipeableDelete({
  onDelete,
  deleteTitle,
  deleteMessage,
}: UseSwipeableDeleteConfig) {
  const swipeRefs = useRef<
    Map<string, React.RefObject<SwipeableMethods | null>>
  >(new Map());

  const getRefForId = (id: string) => {
    let ref = swipeRefs.current.get(id);
    if (!ref) {
      ref = React.createRef<SwipeableMethods | null>();
      swipeRefs.current.set(id, ref);
    }
    return ref;
  };

  const closeSwipe = (id: string) => {
    swipeRefs.current.get(id)?.current?.close();
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

  const getSwipeableProps = (id: string) => ({
    ref: getRefForId(id),
    overshootRight: false,
    rightThreshold: 40,
    onSwipeableWillOpen: () => confirmDelete(id),
    renderRightActions: (
      progress: SharedValue<number>,
      _drag: SharedValue<number>,
    ) => <DeleteAction progress={progress} onPress={() => confirmDelete(id)} />,
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

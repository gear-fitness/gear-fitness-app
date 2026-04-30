import { useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type RootStackParamList = {
  ImageViewer: {
    photos: string[];
    initialIndex: number;
  };
};

type Props = NativeStackScreenProps<RootStackParamList, "ImageViewer">;

const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 800;

export function ImageViewer({ route }: Props) {
  const { photos, initialIndex } = route.params;
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const translateY = useSharedValue(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index !== activeIndex) setActiveIndex(index);
  };

  const dismiss = () => navigation.goBack();

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-12, 12])
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldDismiss =
        Math.abs(e.translationY) > DISMISS_THRESHOLD ||
        Math.abs(e.velocityY) > DISMISS_VELOCITY;
      if (shouldDismiss) {
        const direction = e.translationY >= 0 ? 1 : -1;
        translateY.value = withTiming(
          direction * height,
          { duration: 200 },
          () => {
            runOnJS(dismiss)();
          },
        );
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 180 });
      }
    });

  const carouselStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateY.value),
      [0, height * 0.6],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateY.value),
      [0, 80],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents="none"
      />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.carousel, carouselStyle]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            contentOffset={{ x: initialIndex * width, y: 0 }}
            scrollEnabled={photos.length > 1}
          >
            {photos.map((uri, i) => (
              <View
                key={`${uri}-${i}`}
                style={{
                  width,
                  height,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  source={{ uri }}
                  style={{ width, height }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      <Animated.View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8 },
          chromeStyle,
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={12}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {photos.length > 1 && (
        <Animated.View
          style={[
            styles.counterWrap,
            { paddingBottom: insets.bottom + 16 },
            chromeStyle,
          ]}
          pointerEvents="none"
        >
          <Text style={styles.counterText}>
            {activeIndex + 1} / {photos.length}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  carousel: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
  },
  closeButton: {
    padding: 8,
  },
  counterWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  counterText: {
    color: "#fff",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
});

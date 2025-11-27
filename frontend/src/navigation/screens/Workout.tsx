import { Text } from "@react-navigation/elements";
import { StyleSheet, View, TouchableOpacity, Animated } from "react-native";
import { useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "react-native";

export function Workout() {
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleStartPress = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate("ExerciseSelect");
    });
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "black" : "white" },
      ]}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity style={styles.startButton} onPress={handleStartPress}>
          <Text style={styles.startText}>START</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Blue circle
  startButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#007AFF", // Blue
    justifyContent: "center",
    alignItems: "center",
  },

  startText: {
    color: "white",
    fontSize: 32,
    fontWeight: "800",
  },
});

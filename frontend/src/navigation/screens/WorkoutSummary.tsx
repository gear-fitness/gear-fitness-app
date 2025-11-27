import { SafeAreaView } from "react-native-safe-area-context";
import { Text, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";

export function WorkoutSummary() {
  const isDark = useColorScheme() === "dark";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
    >
      <Text style={[styles.text, { color: isDark ? "#fff" : "#000" }]}>
        Workout Summary
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  text: {
    fontSize: 28,
    fontWeight: "700",
  },
});

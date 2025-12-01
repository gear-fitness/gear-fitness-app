import { SafeAreaView } from "react-native-safe-area-context";
import { Text, StyleSheet, useColorScheme } from "react-native";

export function WorkoutComplete() {
  const isDark = useColorScheme() === "dark";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
    >
      <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
        Workout Complete
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
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
});

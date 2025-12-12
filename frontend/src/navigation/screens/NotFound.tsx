import { Text, Button } from "@react-navigation/elements";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

export function NotFound() {
  const navigation = useNavigation<any>(); // <- FIX TYPING

  return (
    <View style={styles.container}>
      <Text>404</Text>

      <Button onPress={() => navigation.navigate("HomeTabs")}>
        Go to Home
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
});

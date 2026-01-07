import { Text, Button } from "@react-navigation/elements";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";

export function NotFound() {
  const navigation = useNavigation<any>(); // <- FIX TYPING

  return (
    <View className="flex-1 justify-center items-center gap-5">
      <Text>404</Text>

      <Button onPress={() => navigation.navigate("HomeTabs")}>
        Go to Home
      </Button>
    </View>
  );
}

import { useEffect } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";

export function AuthLoadingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const navigation = useNavigation();
  const { isLoading, isAuthenticated, authError, retryAuth } = useAuth();

  useEffect(() => {
    if (!isLoading && !authError) {
      // Auth initialization complete without error
      navigation.reset({
        index: 0,
        routes: [{ name: isAuthenticated ? "HomeTabs" : "Login" }],
      });
    }
  }, [isLoading, isAuthenticated, authError, navigation]);

  // Show error state with retry option
  if (authError && !isLoading) {
    return (
      <View className="flex-1 justify-center items-center px-5 bg-white dark:bg-black">
        <Image
          source={
            isDark
              ? require("../../../assets/GearLogo.png")
              : require("../../../assets/GearLogoInverse.png")
          }
          className="w-30 h-30 mb-5"
        />
        <Text className="text-base text-center mb-5 text-black dark:text-white">
          {authError}
        </Text>
        <TouchableOpacity
          className="py-3 px-8 rounded-lg mb-3 bg-primary active:opacity-80"
          onPress={retryAuth}
        >
          <Text className="text-white text-base font-semibold">Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="py-3 px-8"
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: "Login" }] })
          }
        >
          <Text className="text-primary text-base font-semibold">
            Go to Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading state
  return (
    <View className="flex-1 justify-center items-center px-5 bg-white dark:bg-black">
      <Image
        source={
          isDark
            ? require("../../../assets/GearLogo.png")
            : require("../../../assets/GearLogoInverse.png")
        }
        className="w-30 h-30 mb-5"
      />
      <ActivityIndicator
        size="large"
        color="#007AFF"
        className="mt-5"
      />
    </View>
  );
}

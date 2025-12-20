import { useEffect } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";

export function AuthLoadingScreen() {
  const { colors, dark } = useTheme();
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image
          source={
            dark
              ? require("../../../assets/GearLogo.png")
              : require("../../../assets/GearLogoInverse.png")
          }
          style={styles.logo}
        />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {authError}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={retryAuth}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: "Login" }] })
          }
        >
          <Text style={[styles.loginText, { color: colors.primary }]}>
            Go to Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading state
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={
          dark
            ? require("../../../assets/GearLogo.png")
            : require("../../../assets/GearLogoInverse.png")
        }
        style={styles.logo}
      />
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  loginText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

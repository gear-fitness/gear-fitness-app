import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { useNavigation, useTheme } from "@react-navigation/native";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthApiError, loginWithGoogle } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";

/**
 * @deprecated
 * This screen is no longer registered in navigation.
 * Use `OnboardingScreen` as the only unauthenticated entrypoint.
 * Planned removal: next cleanup release after migration stabilizes.
 */
export function LoginScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { login } = useAuth();
  const handleGoogleSIgnIn = async () => {
    try {
      const respone = await GoogleSignin.signIn();
      if (isSuccessResponse(respone)) {
        const { idToken } = respone.data;

        if (!idToken) {
          throw new Error("No ID token received from Google");
        }

        const { token, refreshToken } = await loginWithGoogle(idToken, "sign_in");

        await login(token, refreshToken);

        navigation.reset({
          index: 0,
          routes: [{ name: "HomeTabs" }],
        });
      }
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "ACCOUNT_NOT_FOUND") {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
        return;
      }
      console.error("Google Sign-In error:", error);
    }
  };

  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 40,
    },
    googleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      elevation: 3,
    },
    googleLogo: {
      width: 24,
      height: 24,
      marginRight: 10,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "500",
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Ready to hop on Gear?
      </Text>
      <TouchableOpacity
        style={[
          styles.googleButton,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
        onPress={handleGoogleSIgnIn}
      >
        <Image
          source={{
            uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/480px-Google_%22G%22_logo.svg.png",
          }}
          style={styles.googleLogo}
        />
        <Text style={[styles.buttonText, { color: colors.text }]}>
          Sign in with Google
        </Text>
      </TouchableOpacity>
    </View>
  );
}

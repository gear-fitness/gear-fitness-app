import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { useNavigation, useTheme } from "@react-navigation/native";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loginWithGoogle } from "../../api/authService";
import { useAuth } from "../../context/AuthContext";

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { login } = useAuth();
  const handleGoogleSIgnIn = async () => {
    try {
      console.log("Google Sign-In initiated");
      const respone = await GoogleSignin.signIn();
      console.log("Google Sign-In successful:", respone);
      if (isSuccessResponse(respone)) {
        const { idToken, user } = respone.data;

        if (!idToken) {
          throw new Error("No ID token received from Google");
        }

        const { token, newUser } = await loginWithGoogle(idToken);

        // Store this token for future API calls
        await login(token);

        const { name, email, photo } = user;
        console.log("User Info:", { name, email, photo });
        console.log("Is new user:", newUser);

        // Navigate to profile setup if new user, otherwise go to home
        if (newUser) {
          navigation.navigate("SignUpProfile");
        } else {
          navigation.navigate("HomeTabs");
        }
      }
    } catch (error) {
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

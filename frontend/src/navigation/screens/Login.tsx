import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { useNavigation, useTheme } from "@react-navigation/native";
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export function LoginScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const handleGoogleSIgnIn = async () => {
    try {
      console.log("Google Sign-In initiated");
      const respone = await GoogleSignin.signIn();
      console.log("Google Sign-In successful:", respone);
      if (isSuccessResponse(respone)) {
        const { idToken, user } = respone.data;
        const backendResponse = await fetch(
          //INSERT YOUR BACKEND URL HERE (e.g., localhost or your server's IP) spring boot server
          "http://10.54.49.13:8080/api/auth/google",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          }
        );
        const { token, user: userData } = await backendResponse.json();
        // Store this token for future API calls
        await AsyncStorage.setItem("authToken", token);
        const { name, email, photo } = user;
        console.log("User Info:", { name, email, photo });
        navigation.navigate("HomeTabs");
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

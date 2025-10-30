import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
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

const { width, height } = Dimensions.get("window");

export function LoginScreen() {
  const navigation = useNavigation();
  const handleGoogleSIgnIn = async () => {
    try {
      console.log("Google Sign-In initiated");
      const respone = await GoogleSignin.signIn();
      console.log("Google Sign-In successful:", respone);
      if (isSuccessResponse(respone)) {
        const { idToken, user } = respone.data;
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
      backgroundColor: "#f9f9f9",
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#333",
      marginBottom: 40,
    },
    googleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "white",
      borderWidth: 1,
      borderColor: "#ddd",
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
      color: "#333",
      fontWeight: "500",
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ready to hop on Gear?</Text>
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSIgnIn}
      >
        <Image
          source={{
            uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/480px-Google_%22G%22_logo.svg.png",
          }}
          style={styles.googleLogo}
        />
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

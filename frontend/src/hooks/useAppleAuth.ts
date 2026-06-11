import { useState, useCallback } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { Alert } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import {
  AuthApiError,
  loginWithApple,
  AppleSignUpProfile,
  AppleAuthIntent,
} from "../api/authService";

interface UseAppleAuthOptions {
  // Called for sign_up to gather profile data
  buildProfile?: () => AppleSignUpProfile;
  // Called after successful sign-up to handle photo upload etc.
  onPostSignUp?: () => Promise<void>;
  // Where to navigate after successful auth
  onComplete?: () => Promise<void>;
}

export function useAppleAuth(
  intent: AppleAuthIntent,
  opts: UseAppleAuthOptions = {},
) {
  const { login } = useAuth();
  const navigation = useNavigation();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleAppleAuth = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      const result = await loginWithApple({
        identityToken: credential.identityToken,
        appleUserId: credential.user,
        email: credential.email,
        firstName: credential.fullName?.givenName,
        lastName: credential.fullName?.familyName,
        intent,
        profile: intent === "sign_up" ? opts.buildProfile?.() : undefined,
      });

      // ── Soft-deleted account: prompt to restore ────────────────
      if (result.accountPendingDeletion) {
        setIsSigningIn(false);
        Alert.alert(
          "Restore account?",
          "This account is scheduled for deletion. Would you like to restore it?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Restore",
              onPress: async () => {
                setIsSigningIn(true);
                try {
                  const restored = await loginWithApple({
                    identityToken: credential.identityToken!,
                    appleUserId: credential.user,
                    intent: "sign_in",
                    confirmRestore: true,
                  });
                  if (!restored.token || !restored.refreshToken) {
                    throw new Error("Missing tokens in restore response");
                  }
                  await login(restored.token, restored.refreshToken);
                  await opts.onComplete?.();
                } catch (err) {
                  console.error("Apple restore failed:", err);
                  Alert.alert(
                    "Couldn't restore account",
                    "Please try signing in again.",
                  );
                } finally {
                  setIsSigningIn(false);
                }
              },
            },
          ],
        );
        return;
      }
      // ── End soft-delete handling ───────────────────────────────

      if (!result.token || !result.refreshToken) {
        throw new Error("Missing tokens in login response");
      }

      await login(result.token, result.refreshToken);

      if (intent === "sign_up") {
        await opts.onPostSignUp?.();
      }
      await opts.onComplete?.();
    } catch (error: any) {
      // User canceled — not an error worth surfacing
      if (error?.code === "ERR_REQUEST_CANCELED") {
        return;
      }

      if (error instanceof AuthApiError) {
        if (intent === "sign_in" && error.code === "ACCOUNT_NOT_FOUND") {
          Alert.alert(
            "Account Not Found",
            "No account exists for this Apple ID. Please sign up first.",
            [{ text: "OK" }],
          );
          return;
        }
        if (intent === "sign_up" && error.code === "ACCOUNT_ALREADY_EXISTS") {
          Alert.alert(
            "Account Already Exists",
            "An account already exists for this Apple ID. Please sign in instead.",
            [{ text: "OK" }],
          );
          return;
        }
      }
      console.error("Apple sign-in error:", error);
      Alert.alert(
        "Sign-in Failed",
        "Something went wrong signing in with Apple. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setIsSigningIn(false);
    }
  }, [intent, isSigningIn, login, navigation, opts]);

  return { handleAppleAuth, isSigningIn };
}

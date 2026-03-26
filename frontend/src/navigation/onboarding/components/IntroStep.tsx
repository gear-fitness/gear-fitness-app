import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { GlassPrimaryButton } from "./GlassPrimaryButton";

interface IntroStepProps {
  onGetStarted: () => void;
}

export function IntroStep({ onGetStarted }: IntroStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <View style={styles.logoBox}>
          <Image
            source={require("../../../../assets/GearLogo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heading}>Ready to hop{"\n"}on Gear?</Text>
        <Text style={styles.subheading}>
          Your fitness journey starts here. Let's set up your profile in under
          a minute.
        </Text>
      </View>
      <View style={styles.footer}>
        <GlassPrimaryButton label="Get Started" onPress={onGetStarted} />
        <Text style={styles.terms}>
          By continuing you agree to our{" "}
          <Text style={styles.termsLink}>Terms</Text> and{" "}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    textAlign: "center",
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 26,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  heading: {
    fontSize: 36,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -1.2,
    lineHeight: 40,
    marginBottom: 14,
    textAlign: "center",
  },
  subheading: {
    fontSize: 15,
    color: "#8E8E93",
    lineHeight: 24,
    maxWidth: 260,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 10,
    gap: 14,
  },
  terms: {
    textAlign: "center",
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  termsLink: {
    color: "#000",
    fontWeight: "600",
  },
});

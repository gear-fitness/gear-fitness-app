import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Alert,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { OnboardingProfile } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";

interface ProfileStepProps {
  profile?: OnboardingProfile;
  onProfileChange: (p: OnboardingProfile) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function ProfileStep({
  profile,
  onProfileChange,
  onBack,
  onContinue,
}: ProfileStepProps) {
  const [name, setName] = useState(profile?.name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [photoUri, setPhotoUri] = useState(profile?.photoUri);

  const handleNameChange = (val: string) => {
    setName(val);
    onProfileChange({ name: val, username, photoUri });
  };

  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setUsername(cleaned);
    onProfileChange({ name, username: cleaned, photoUri });
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo Access Required",
        "Please allow photo library access in Settings to choose a profile photo.",
        [{ text: "OK" }]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      onProfileChange({ name, username, photoUri: uri });
    }
  };

  const initials = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={styles.screen}>
      <OnboardingTopBar progress={0.6} onBack={onBack} />
      <View style={styles.body}>
        <Text style={styles.heading}>Create your profile</Text>
        <Text style={styles.subheading}>
          This is how others will find and recognise you on Gear.
        </Text>
        <View style={styles.photoWrap}>
          <Pressable
            style={[styles.photoCircle, photoUri ? styles.photoCircleHasPhoto : undefined]}
            onPress={pickPhoto}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : initials ? (
              <Text style={styles.initials}>{initials}</Text>
            ) : (
              <Text style={styles.photoPlaceholder}>📷</Text>
            )}
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>+</Text>
            </View>
          </Pressable>
          <Pressable onPress={pickPhoto}>
            <Text style={styles.photoLabel}>
              {photoUri ? "Change photo" : "Add photo"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.inputGroup}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#C7C7CC"
              value={name}
              onChangeText={handleNameChange}
              autoComplete="off"
              autoCorrect={false}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Username</Text>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="yourhandle"
              placeholderTextColor="#C7C7CC"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
            />
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity onPress={onContinue} activeOpacity={0.8} style={styles.continueBtn}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0D0D0D",
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 5,
  },
  subheading: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 21,
    marginBottom: 24,
  },
  photoWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E5E5EA",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.18)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  photoCircleHasPhoto: {
    borderStyle: "solid",
    borderColor: "rgba(0,0,0,0.1)",
  },
  photoImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  initials: {
    fontSize: 32,
    fontWeight: "700",
    color: "#8E8E93",
  },
  photoPlaceholder: {
    fontSize: 28,
    opacity: 0.4,
  },
  photoBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#F2F2F7",
  },
  photoBadgeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  photoLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "500",
    color: "#8E8E93",
  },
  inputGroup: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: "#fff",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginLeft: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0D0D0D",
    minWidth: 96,
  },
  atSign: {
    fontSize: 15,
    color: "#C7C7CC",
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#3C3C43",
    textAlign: "right",
    height: "100%",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 10,
  },
  continueBtn: {
    height: 60,
    borderRadius: 999,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
});

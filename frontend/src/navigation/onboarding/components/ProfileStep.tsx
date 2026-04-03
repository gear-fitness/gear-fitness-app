import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { OnboardingProfile } from "../types";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";

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
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);

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

  const canContinue = name.trim().length > 0;

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={0.6} onBack={onBack} />
      <View style={shared.body}>
        <Text style={shared.heading}>Create your profile</Text>
        <Text style={shared.subheading}>
          This is how others will find and recognise you on Gear.
        </Text>
        <View style={styles.photoWrap}>
          <Pressable
            style={[
              styles.photoCircle,
              { backgroundColor: colors.photoBg },
              photoUri ? styles.photoCircleHasPhoto : undefined,
            ]}
            onPress={pickPhoto}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : initials ? (
              <Text style={[styles.initials, { color: colors.secondary }]}>{initials}</Text>
            ) : (
              <Text style={styles.photoPlaceholder}>📷</Text>
            )}
            <View style={[styles.photoBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.photoBadgeText, { color: colors.accentText }]}>+</Text>
            </View>
          </Pressable>
          <Pressable onPress={pickPhoto}>
            <Text style={[styles.photoLabel, { color: colors.secondary }]}>
              {photoUri ? "Change photo" : "Add photo"}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.inputGroup, { backgroundColor: colors.cardBg }]}>
          <View style={[styles.inputRow, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Name</Text>
            <TextInput
              style={[styles.input, { color: colors.inputText }]}
              placeholder="Your name"
              placeholderTextColor={colors.handle}
              value={name}
              onChangeText={handleNameChange}
              autoComplete="off"
              autoCorrect={false}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <View style={[styles.inputRow, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
            <Text style={[styles.atSign, { color: colors.handle }]}>@</Text>
            <TextInput
              style={[styles.input, { color: colors.inputText }]}
              placeholder="yourhandle"
              placeholderTextColor={colors.handle}
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
            />
          </View>
        </View>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onContinue}
          disabled={!canContinue}
          style={[shared.continueBtn, !canContinue && shared.continueBtnDisabled]}
        >
          <Text style={shared.continueBtnText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photoWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  photoCircleHasPhoto: {
    borderStyle: "solid",
  },
  photoImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  initials: {
    fontSize: 32,
    fontWeight: "700",
  },
  photoPlaceholder: {
    fontSize: 28,
    opacity: 0.4,
  },
  photoBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  photoBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  photoLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "500",
  },
  inputGroup: {
    borderRadius: 20,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "500",
    minWidth: 96,
  },
  atSign: {
    fontSize: 15,
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    textAlign: "right",
    height: "100%",
  },
});

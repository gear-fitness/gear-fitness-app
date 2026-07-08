import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { openCamera } from "../../../utils/inAppCamera";
import { cropImageToSquare } from "../../../utils/image";
import { PhotoSourceMenu } from "../../../components/PhotoSourceMenu";
import { StepProps } from "../stepProps";
import { OnboardingTopBar } from "./OnboardingTopBar";
import { useOnboardingColors } from "./useOnboardingColors";
import { makeOnboardingStyles } from "./makeOnboardingStyles";
import { AvatarWithCameraOverlay } from "../../../components/AvatarWithCameraOverlay";

export function ProfilePhotoStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const navigation = useNavigation();
  const colors = useOnboardingColors();
  const shared = useMemo(() => makeOnboardingStyles(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [photoUri, setPhotoUri] = useState(draft.profile?.photoUri);

  // Name comes from the earlier "What's your name?" step or, for social
  // sign-ups, the provider credential. It may be empty (skipped / not
  // provided), in which case initials are simply blank.
  const name = draft.profile?.name ?? "";
  const initials = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const applyPhoto = async (uri: string) => {
    // Camera captures are full-frame; square them off to match the 1:1 crop
    // the library picker's editing step produces. No-op for square images.
    const squared = await cropImageToSquare(uri);
    const manipulated = await ImageManipulator.manipulateAsync(
      squared,
      [{ resize: { width: 300 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    setPhotoUri(manipulated.uri);
    updateDraft({ profile: { ...draft.profile, photoUri: manipulated.uri } });
  };

  const takePhoto = async () => {
    const result = await openCamera(navigation, {
      library: { allowsEditing: true, aspect: [1, 1], quality: 0.8 },
    });
    const uri = result?.uris[0];
    if (uri) await applyPhoto(uri);
  };

  const chooseFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo Access Required",
        "Please allow photo library access in Settings to choose a profile photo.",
        [{ text: "OK" }],
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
      await applyPhoto(result.assets[0].uri);
    }
  };

  return (
    <View style={shared.screen}>
      <OnboardingTopBar progress={progress} onBack={onBack} />
      <View style={styles.center}>
        <Text style={[shared.heading, styles.heading]}>
          Add a profile photo
        </Text>
        <Text style={[shared.subheading, styles.sub]}>
          Help your friends recognize you on Gear.
        </Text>
        <PhotoSourceMenu
          width={120}
          height={120}
          accessibilityLabel={photoUri ? "Change photo" : "Add photo"}
          onTakePhoto={takePhoto}
          onChooseFromLibrary={chooseFromLibrary}
          style={styles.photoCircle}
        >
          <AvatarWithCameraOverlay size={120}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : initials ? (
              <Text style={[styles.initials, { color: colors.secondary }]}>
                {initials}
              </Text>
            ) : (
              <Text style={styles.photoPlaceholder}>📷</Text>
            )}
          </AvatarWithCameraOverlay>
        </PhotoSourceMenu>
        <Text style={[styles.photoLabel, { color: colors.secondary }]}>
          {photoUri ? "Change photo" : "Add photo"}
        </Text>
      </View>
      <View style={shared.footer}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            shared.continueBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={shared.continueBtnText}>
            {photoUri ? "Continue" : "Skip for now"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useOnboardingColors>) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    heading: {
      textAlign: "center",
      marginBottom: 6,
    },
    sub: {
      textAlign: "center",
      maxWidth: 300,
      marginBottom: 32,
    },
    photoCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.photoBg,
      alignItems: "center",
      justifyContent: "center",
    },
    photoImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    initials: {
      fontSize: 40,
      fontWeight: "700",
    },
    photoPlaceholder: {
      fontSize: 32,
      opacity: 0.4,
    },
    photoLabel: {
      marginTop: 16,
      fontSize: 14,
      fontWeight: "500",
    },
    pressed: {
      opacity: 0.75,
    },
  });

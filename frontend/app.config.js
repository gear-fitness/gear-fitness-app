const IS_DEV = process.env.APP_VARIANT === "development";

export default {
  expo: {
    name: IS_DEV ? "Gear (Dev)" : "Gear Fitness",
    slug: "gear-fitness",
    version: "1.0.2",
    orientation: "portrait",
    icon: IS_DEV ? "./assets/GearLogoInverse.png" : "./assets/GearLogo.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    scheme: "gearfitness",
    ios: {
      supportsTablet: true,
      usesAppleSignIn: true,
      bundleIdentifier: IS_DEV
        ? "com.gearfitness.dev.build"
        : "com.gearfitness",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          "Allow Gear Fitness to access your photos to set a profile picture and log food from photos of your meals.",
        NSUserNotificationsUsageDescription:
          "Gear Fitness sends reminders to finish your workouts and keep your training streak going.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/GearLogo.png",
        backgroundColor: "#ffffff",
      },
      package: "com.gearfitness",
      usesCleartextTraffic: false,
    },
    web: {
      favicon: "./assets/GearLogo.png",
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            // GoogleSignIn (~> 9.0) pulls AppCheckCore, a Swift pod that
            // depends on GoogleUtilities and RecaptchaInterop. Those don't
            // define modules, so under static libraries CocoaPods can't import
            // them from Swift and pod install fails. These Google pods float
            // and CNG doesn't commit Podfile.lock, so a newer upstream release
            // started tripping this on cloud builds. Give them modular headers.
            extraPods: [
              { name: "GoogleUtilities", modular_headers: true },
              { name: "RecaptchaInterop", modular_headers: true },
            ],
          },
        },
      ],
      [
        "expo-dev-client",
        {
          addGeneratedScheme: !!IS_DEV,
        },
      ],
      "expo-asset",
      "expo-font",
      "expo-video",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./assets/GearLogoInverse.png",
          imageWidth: 210,
          dark: {
            backgroundColor: "#000000",
            image: "./assets/GearLogo.png",
          },
        },
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme:
            "com.googleusercontent.apps.637676049223-rfl13bv4l2lqs2ncdjvah95g0d01f076",
        },
      ],
      "expo-secure-store",
      "expo-notifications",
      "expo-apple-authentication",
      "@react-native-community/datetimepicker",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow Gear Fitness to access your photos to set a profile picture and log food from photos of your meals.",
        },
      ],
      [
        "react-native-vision-camera",
        {
          cameraPermissionText:
            "Allow Gear Fitness to use the camera to take photos for your workout posts and profile picture, and to log food by photo or barcode.",
          // Photos only. Skip the microphone/location permissions so App
          // Store review doesn't see unused entitlements.
          enableMicrophonePermission: false,
          enableLocation: false,
        },
      ],
      [
        "expo-media-library",
        {
          photosPermission:
            "Allow Gear Fitness to save workout share cards to your photo library.",
          savePhotosPermission:
            "Allow Gear Fitness to save workout share cards to your photo library.",
          isAccessMediaLocationEnabled: false,
        },
      ],
      "expo-sharing",
      [
        "@kingstinct/react-native-healthkit",
        {
          NSHealthShareUsageDescription:
            "Gear Fitness reads your height, weight, and date of birth to personalize your workouts.",
          NSHealthUpdateUsageDescription:
            "Gear Fitness updates your height and weight in Apple Health when you change them in the app.",
        },
      ],
      // Temporarily disabled — the plugin embeds an absolute local path into
      // the generated Xcode project, which breaks EAS cloud builds. Re-enable
      // once that's resolved (pin to a known-good version and bisect).
      // [
      //   "expo-widgets",
      //   {
      //     widgets: [
      //       {
      //         name: "MyWidget",
      //         displayName: "My Widget",
      //         description: "A sample home screen widget",
      //         supportedFamilies: ["systemSmall", "systemMedium", "systemLarge"],
      //       },
      //     ],
      //   },
      // ],
    ],
    extra: {
      eas: {
        projectId: "2aad5a1f-e92c-49a5-b1c9-d183e140377e",
      },
    },
    owner: "gear-fitness",
  },
};

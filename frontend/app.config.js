const IS_DEV = process.env.APP_VARIANT === "development";

export default {
  expo: {
    name: IS_DEV ? "Gear (Dev)" : "Gear Fitness",
    slug: "gear-fitness",
    version: "1.0.0",
    orientation: "portrait",
    icon: IS_DEV ? "./assets/GearLogoDev.png" : "./assets/GearLogo.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    scheme: "gearfitness",
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV
        ? "com.gearfitness.dev.build"
        : "com.gearfitness",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          "Allow Gear Fitness to access your photos to set a profile picture.",
        NSAppTransportSecurity: {
          NSExceptionDomains: {
            "gear-fitness.us-west-2.elasticbeanstalk.com": {
              NSExceptionAllowsInsecureHTTPLoads: true,
            },
          },
        },
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/GearLogo.png",
        backgroundColor: "#ffffff",
      },
      package: "com.gearfitness",
      usesCleartextTraffic: true,
    },
    web: {
      favicon: "./assets/GearLogo.png",
    },
    plugins: [
      [
        "expo-dev-client",
        {
          addGeneratedScheme: !!IS_DEV,
        },
      ],
      "expo-asset",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./assets/GearLogoInverse.png",
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
      "@react-native-community/datetimepicker",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow Gear Fitness to access your photos to set a profile picture.",
        },
      ],
      [
        "@kingstinct/react-native-healthkit",
        {
          NSHealthShareUsageDescription:
            "Gear Fitness reads your height, weight, and date of birth to personalize your workouts.",
        },
      ],
      [
        "expo-widgets",
        {
          widgets: [
            {
              name: "MyWidget",
              displayName: "My Widget",
              description: "A sample home screen widget",
              supportedFamilies: ["systemSmall", "systemMedium", "systemLarge"],
            },
          ],
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "2aad5a1f-e92c-49a5-b1c9-d183e140377e",
      },
    },
    owner: "gear-fitness",
  },
};

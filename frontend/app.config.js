module.exports = {
  expo: {
    name: "gear-fitness",
    slug: "gear-fitness",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/GearLogo.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    scheme: "gearfitness",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gearfitness",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSExceptionDomains: {
            [process.env.EXPO_PUBLIC_API_DOMAIN]: {
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
          iosUrlScheme: process.env.EXPO_PUBLIC_IOS_URL_SCHEME,
        },
      ],
      "expo-secure-store",
    ],
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      },
    },
    owner: "gear-fitness",
  },
};

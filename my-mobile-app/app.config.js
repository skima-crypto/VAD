import 'dotenv/config';

export default {
  expo: {
    name: "VAD App",
    slug: "my-mobile-app",
    version: "1.0.0",
    orientation: "portrait",

    cli: {
      appVersionSource: "remote",
    },

    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],

    ios: {
      bundleIdentifier: "com.mine.vadapp",
      // iOS does not require permission declarations like Android
      infoPlist: {
        NSCameraUsageDescription: "This app requires camera access to take photos.",
        NSMicrophoneUsageDescription: "This app requires microphone access to record audio.",
        NSPhotoLibraryUsageDescription: "This app requires photo library access to store media.",
      },
    },

    android: {
      package: "com.mine.vadapp",
      versionCode: 1,
      permissions: [
        "INTERNET",
        "CAMERA",               // Camera access
        "RECORD_AUDIO",         // Microphone access
        "READ_EXTERNAL_STORAGE", // Read storage access
        "WRITE_EXTERNAL_STORAGE", // Write storage access
        "ACCESS_FINE_LOCATION",  // Location access
        "ACCESS_COARSE_LOCATION", // Coarse location access
        "VIBRATE",              // Vibration access (useful for feedback)
        "FOREGROUND_SERVICE",   // For background services
      ],
    },

    plugins: ["react-native-google-mobile-ads"],

    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

      eas: {
        projectId: "01e6250a-1ffa-4f6d-839c-940a486d0f3c",
      },
    },
  },
};

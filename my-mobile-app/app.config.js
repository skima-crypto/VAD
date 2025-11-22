import 'dotenv/config';

export default {
  expo: {
    name: "VAD App",
    slug: "my-mobile-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    platforms: ["ios", "android", "web"],

    android: {
      package: "com.skima.vadapp",  // <<< ADD THIS
      versionCode: 1
    },

    ios: {
      bundleIdentifier: "com.skima.vadapp" // optional but recommended
    },

    plugins: [
      [
        "expo-ads-admob",
        {
          androidAppId: process.env.ANDROID_ADMOB_APP_ID,
          iosAppId: process.env.IOS_ADMOB_APP_ID,
        },
      ],
    ],

    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      eas: {
        projectId: "your-project-id-here"
      }
    },
  },
};

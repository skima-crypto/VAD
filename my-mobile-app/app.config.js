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
      // Remove config.googleMobileAdsAppId
    },

    android: {
      package: "com.mine.vadapp",
      versionCode: 1,
      // Remove config.googleMobileAdsAppId
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

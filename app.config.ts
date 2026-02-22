import { ConfigContext, ExpoConfig } from "expo/config";

const EAS_PROJECT_ID = "7269c1c1-fbc7-48c5-8aa2-ca72cb9ba322";
const PROJECT_SLUG = "converx";
const OWNER = "mohhussbit";

// App production config
const APP_NAME = "ConverX – Currency Converter";
const BUNDLE_IDENTIFIER = `com.${OWNER}.${PROJECT_SLUG}`;
const PACKAGE_NAME = `com.${OWNER}.${PROJECT_SLUG}`;
const ICON = "./assets/images/ios-prod.png";
const ADAPTIVE_ICON = "./assets/images/android-prod.png";
const SCHEME = PROJECT_SLUG;

type AppEnvironment = "development" | "preview" | "production";

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = (process.env.APP_ENV as AppEnvironment) || "preview";
  console.log("⚙️ Building app for environment:", appEnv);

  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(appEnv);

  return {
    ...config,
    name,
    version: "1.0.0",
    slug: PROJECT_SLUG,
    orientation: "portrait",
    icon,
    scheme,
    owner: OWNER,

    ios: {
      supportsTablet: true,
      bundleIdentifier,
      icon: {
        dark: "./assets/images/ios-dark.png",
        light: "./assets/images/ios-prod.png",
        tinted: "./assets/images/ios-tinted.png",
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: "#ffffff",
      },
      package: packageName,
      softwareKeyboardLayoutMode: "pan",
      googleServicesFile: "./google-services.json",
    },

    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      enableBsdiffPatchSupport: true
    },

    runtimeVersion: {
      policy: "appVersion",
    },

    extra: {
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },

    web: {
      bundler: "metro",
      output: "server",
      favicon: "./assets/images/ios-prod.png",
    },

    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            image: "./assets/images/splash-icon.png",
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "react-native-edge-to-edge",
        {
          android: {
            parentTheme: "Light",
            enforceNavigationBarContrast: false,
          },
        },
      ],
      [
        "expo-build-properties",
        {
          // android: {
          //   enableMinifyInReleaseBuilds: true,
          //   enableShrinkResourcesInReleaseBuilds: true,
          //   extraProguardRules: `
          //     -dontwarn com.google.firebase.ktx.**
          //   `,
          // },
          ios: {
            ccacheEnabled: true,
          },
         // buildReactNativeFromSource: true,
         // useHermesV1: true
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: PROJECT_SLUG,
          organization: "mohhussbit",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/splash-icon.png",
          color: "#069140",
          defaultChannel: "default",
          sounds: ["./assets/sounds/update.wav"],
          enableBackgroundRemoteNotifications: true,
        },
      ],
      "expo-router",
      "expo-background-task",
      "expo-font",
      "./plugins/scrollbar-color.js",
      "./plugins/customize.js",
    ],

    experiments: {
      buildCacheProvider: "eas",
    },
  };
};

export const getDynamicAppConfig = (environment: AppEnvironment) => {
  if (environment === "development") {
    return {
      name: `${APP_NAME} Development`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
      packageName: `${PACKAGE_NAME}.dev`,
      icon: "./assets/images/ios-dev.png",
      adaptiveIcon: "./assets/images/android-dev.png",
      scheme: `${SCHEME}-dev`,
    };
  }

  return {
    name: APP_NAME,
    bundleIdentifier: BUNDLE_IDENTIFIER,
    packageName: PACKAGE_NAME,
    icon: ICON,
    adaptiveIcon: ADAPTIVE_ICON,
    scheme: SCHEME,
  };
};

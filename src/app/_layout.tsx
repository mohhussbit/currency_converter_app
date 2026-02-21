import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import usePinnedRateNotifications from "@/hooks/usePinnedRateNotifications";
import { Colors } from "@/constants/Colors";
import { handleExpoUpdateMetadata } from "@/utils/expoUpdateMetadata";
import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import { Stack, useNavigationContainerRef } from "expo-router";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableFreeze } from "react-native-screens";
import { sentryConfig } from "sentry.config";
import { vexo } from "vexo-analytics";

enableFreeze(true);

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

// Initialize Sentry
Sentry.init(sentryConfig);

// Handle OTA update metadata (for tracking builds/updates)
handleExpoUpdateMetadata();

// Initialize analytics
vexo(process.env.EXPO_PUBLIC_VEXO_API_KEY);

// Configure foreground notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  initialRouteName: "index",
};

const AppStack = () => {
  const { colors } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="history" />
        <Stack.Screen name="pinned-rate-notification" />
        <Stack.Screen name="help" />
      </Stack>
    </GestureHandlerRootView>
  );
};

const RootLayout = () => {
  const navigationRef = useNavigationContainerRef();

  usePinnedRateNotifications();


  // Register custom Android channel (with sound, vibration, lights, etc.)
  useEffect(() => {
    Notifications.setNotificationChannelAsync("currency-converter-updates", {
      name: "Currency Converter Updates",
      description: "Notifications for app updates and important announcements",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "update.wav",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Colors.primary,
      enableLights: true,
      enableVibrate: true,
    });
  }, []);

  // Hook Sentry into navigation container
  useEffect(() => {
    if (navigationRef?.current) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default Sentry.wrap(RootLayout);

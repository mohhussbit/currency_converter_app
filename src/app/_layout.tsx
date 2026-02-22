import React, { useEffect } from "react";

import { StyleSheet } from "react-native";

import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import { Stack, useNavigationContainerRef } from "expo-router";

import * as Sentry from "@sentry/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableFreeze } from "react-native-screens";
import { sentryConfig } from "sentry.config";
import { vexo } from "vexo-analytics";

import { Colors } from "@/constants/Colors";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import usePinnedRateNotifications from "@/hooks/usePinnedRateNotifications";
import useRateAlerts from "@/hooks/useRateAlerts";
import useRetentionReminders from "@/hooks/useRetentionReminders";
import { handleExpoUpdateMetadata } from "@/utils/expoUpdateMetadata";

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
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(main)" />
    </Stack>
  );
};

const RootLayout = () => {
  const navigationRef = useNavigationContainerRef();

  usePinnedRateNotifications();
  useRateAlerts();
  useRetentionReminders();

  // Register custom Android channel (with sound, vibration, lights, etc.)
  useEffect(() => {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
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
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AppStack />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

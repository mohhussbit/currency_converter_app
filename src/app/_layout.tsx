import React, { useEffect } from "react";

import { isRunningInExpoGo } from "expo";
import * as Notifications from "expo-notifications";
import { Stack, useNavigationContainerRef } from "expo-router";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import * as Sentry from "@sentry/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableFreeze } from "react-native-screens";
import { StyleSheet } from "react-native-unistyles";
import { sentryConfig } from "sentry.config";

import { Colors } from "@/constants/Colors";
import { ThemeProvider } from "@/context/ThemeContext";
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
//vexo(process.env.EXPO_PUBLIC_VEXO_API_KEY);

// Configure foreground notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const AppStack = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={false}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={true}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
};

const RootLayout = () => {
  const navigationRef = useNavigationContainerRef();

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

  let [fontsLoaded] = useFonts({
    Regular: Inter_400Regular,
    Medium: Inter_500Medium,
    SemiBold: Inter_600SemiBold,
    Bold: Inter_700Bold,
    Black: Inter_900Black,
  });

  if (!fontsLoaded) return null;

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

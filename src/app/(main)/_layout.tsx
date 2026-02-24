import { Stack } from "expo-router";

import { useTheme } from "@/context/ThemeContext";

export default function MainLayout() {
  const { colors } = useTheme();
  return (
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
      <Stack.Screen name="rate-alerts" />
      <Stack.Screen name="help" />
    </Stack>
  );
}

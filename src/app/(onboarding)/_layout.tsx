import React from "react";

import { Stack } from "expo-router";

const OnboardingLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="notification-prompt" />
    </Stack>
  );
};

export default OnboardingLayout;

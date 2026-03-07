import React, { createContext, PropsWithChildren, useContext, useMemo } from "react";

import { Color } from "expo-router";

import { Platform, useColorScheme, type ColorValue } from "react-native";

import { SystemBars } from "react-native-edge-to-edge";

import type { ThemeColors } from "@/types/theme";

type ResolvedColorScheme = "light" | "dark";

interface ThemeContextType {
  colors: ThemeColors;
  colorScheme: ResolvedColorScheme;
  isDark: boolean;
}

type FallbackPalette = {
  primary: string;
  secondary: string;
  accent: string;
  onPrimary: string;
  onSecondary: string;
  onAccent: string;
  primaryContainer: string;
  secondaryContainer: string;
  accentContainer: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  gray: {
    500: string;
    400: string;
    300: string;
    200: string;
    100: string;
    50: string;
  };
};

const lightFallback: FallbackPalette = {
  primary: "#FF8811",
  secondary: "#158C8A",
  accent: "#C28600",
  onPrimary: "#FFFFFF",
  onSecondary: "#FFFFFF",
  onAccent: "#141414",
  primaryContainer: "#FFE2C4",
  secondaryContainer: "#D3EFEF",
  accentContainer: "#FAE6A8",
  background: "#FFF8F0",
  card: "#F8F1E8",
  text: "#141414",
  border: "#D7CBBB",
  notification: "#C62828",
  gray: {
    500: "#7A6F66",
    400: "#A79A8D",
    300: "#D7CBBB",
    200: "#EFE5D8",
    100: "#F8F1E8",
    50: "#FFF8F0",
  },
};

const darkFallback: FallbackPalette = {
  ...lightFallback,
  primaryContainer: "#5A2D03",
  secondaryContainer: "#114444",
  accentContainer: "#574100",
  background: "#1F1B18",
  card: "#2E2823",
  text: "#FFF8F0",
  border: "#4A4139",
  gray: {
    500: "#CFC2B4",
    400: "#AFA295",
    300: "#7E7267",
    200: "#4A4139",
    100: "#2E2823",
    50: "#1F1B18",
  },
};

const pickColor = (
  iosColor: ColorValue,
  androidColor: ColorValue,
  fallbackColor: ColorValue,
): ColorValue =>
  Platform.select<ColorValue>({
    ios: iosColor,
    android: androidColor,
    default: fallbackColor,
  }) ?? fallbackColor;

const buildThemeColors = (colorScheme: ResolvedColorScheme): ThemeColors => {
  const fallback = colorScheme === "dark" ? darkFallback : lightFallback;

  return {
    primary: pickColor(Color.ios.systemOrange, Color.android.dynamic.primary, fallback.primary),
    secondary: pickColor(Color.ios.systemTeal, Color.android.dynamic.secondary, fallback.secondary),
    accent: pickColor(Color.ios.systemYellow, Color.android.dynamic.tertiary, fallback.accent),
    onPrimary: pickColor("#FFFFFF", Color.android.dynamic.onPrimary, fallback.onPrimary),
    onSecondary: pickColor(Color.ios.systemBackground, Color.android.dynamic.onSecondary, fallback.onSecondary),
    onAccent: pickColor(Color.ios.label, Color.android.dynamic.onTertiary, fallback.onAccent),
    primaryContainer: pickColor(
      Color.ios.systemOrange,
      Color.android.dynamic.primaryContainer,
      fallback.primaryContainer,
    ),
    onPrimaryContainer: pickColor(
      "#FFFFFF",
      Color.android.dynamic.onPrimaryContainer,
      fallback.text,
    ),
    secondaryContainer: pickColor(
      Color.ios.systemTeal,
      Color.android.dynamic.secondaryContainer,
      fallback.secondaryContainer,
    ),
    onSecondaryContainer: pickColor(
      Color.ios.systemBackground,
      Color.android.dynamic.onSecondaryContainer,
      fallback.text,
    ),
    accentContainer: pickColor(
      Color.ios.systemYellow,
      Color.android.dynamic.tertiaryContainer,
      fallback.accentContainer,
    ),
    onAccentContainer: pickColor(
      Color.ios.label,
      Color.android.dynamic.onTertiaryContainer,
      fallback.text,
    ),
    background: pickColor(
      Color.ios.systemBackground,
      Color.android.dynamic.background,
      fallback.background,
    ),
    card: pickColor(
      Color.ios.secondarySystemBackground,
      Color.android.dynamic.surfaceContainer,
      fallback.card,
    ),
    text: pickColor(Color.ios.label, Color.android.dynamic.onBackground, fallback.text),
    border: pickColor(Color.ios.separator, Color.android.dynamic.outlineVariant, fallback.border),
    notification: pickColor(Color.ios.systemRed, Color.android.dynamic.error, fallback.notification),
    gray: {
      500: pickColor(
        Color.ios.secondaryLabel,
        Color.android.dynamic.onSurfaceVariant,
        fallback.gray[500],
      ),
      400: pickColor(Color.ios.tertiaryLabel, Color.android.dynamic.outline, fallback.gray[400]),
      300: pickColor(
        Color.ios.quaternaryLabel,
        Color.android.dynamic.outlineVariant,
        fallback.gray[300],
      ),
      200: pickColor(
        Color.ios.systemGray4,
        Color.android.dynamic.surfaceContainerHigh,
        fallback.gray[200],
      ),
      100: pickColor(
        Color.ios.systemGray5,
        Color.android.dynamic.surfaceContainerLow,
        fallback.gray[100],
      ),
      50: pickColor(
        Color.ios.systemGray6,
        Color.android.dynamic.surfaceContainerLowest,
        fallback.gray[50],
      ),
    },
  };
};

const DEFAULT_SCHEME: ResolvedColorScheme = "light";

export const ThemeContext = createContext<ThemeContextType>({
  colors: buildThemeColors(DEFAULT_SCHEME),
  colorScheme: DEFAULT_SCHEME,
  isDark: false,
});

export const ThemeProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const rawColorScheme = useColorScheme();
  const colorScheme: ResolvedColorScheme = rawColorScheme === "dark" ? "dark" : "light";

  const value = useMemo<ThemeContextType>(
    () => ({
      colors: buildThemeColors(colorScheme),
      colorScheme,
      isDark: colorScheme === "dark",
    }),
    [colorScheme],
  );

  return (
    <>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
      <SystemBars style={colorScheme === "dark" ? "light" : "dark"} />
    </>
  );
};

export const useTheme = () => useContext(ThemeContext);


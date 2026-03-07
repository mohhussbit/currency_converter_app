import { StyleSheet } from "react-native-unistyles";

import { Colors, DarkColors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Fonts, Typography } from "@/constants/Typography";

// Base spacing unit
export const BASE_GAP = 5;

// Real-estate app theme
const lightTheme = {
  colors: Colors,
  fonts: Fonts,
  spacing: Spacing,
  typography: Typography,
} as const;

const darkTheme = {
  colors: DarkColors,
  fonts: Fonts,
  spacing: Spacing,
  typography: Typography,
} as const;

const appThemes = { light: lightTheme, dark: darkTheme };

const breakpoints = { phone: 0, largePhone: 400, tablet: 768 } as const;

type AppThemes = typeof appThemes;
type AppBreakpoints = typeof breakpoints;

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  settings: { initialTheme: "light" },
  themes: appThemes,
  breakpoints,
});

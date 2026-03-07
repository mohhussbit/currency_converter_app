import type { ColorValue } from "react-native";

export interface ThemeColors {
  primary: ColorValue;
  secondary: ColorValue;
  accent: ColorValue;
  onPrimary: ColorValue;
  onSecondary: ColorValue;
  onAccent: ColorValue;
  primaryContainer: ColorValue;
  onPrimaryContainer: ColorValue;
  secondaryContainer: ColorValue;
  onSecondaryContainer: ColorValue;
  accentContainer: ColorValue;
  onAccentContainer: ColorValue;
  background: ColorValue;
  card: ColorValue;
  text: ColorValue;
  border: ColorValue;
  notification: ColorValue;
  gray: {
    500: ColorValue;
    400: ColorValue;
    300: ColorValue;
    200: ColorValue;
    100: ColorValue;
    50: ColorValue;
  };
}

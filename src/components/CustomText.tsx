import React, { ReactNode } from "react";

import { StyleProp, Text, TextProps, TextStyle } from "react-native";

import { StyleSheet } from "react-native-unistyles";

import { Typography } from "@/constants/Typography";

type Variant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "h7" | "body" | "small" | "tiny";

interface CustomTextProps extends Omit<TextProps, "style" | "children"> {
  variant?: Variant;
  fontSize?: number;
  color?: string;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
}

const CustomText = ({
  variant = "body",
  fontSize,
  color,
  style,
  children,
  ...props
}: CustomTextProps) => {
  return (
    <Text style={[styles.text(variant, fontSize, color), style]} {...props}>
      {children}
    </Text>
  );
};

export default CustomText;

const styles = StyleSheet.create((theme) => ({
  text: (variant: Variant, fontSize?: number, color?: string) => {
    const resolvedFontSize = fontSize ?? Typography.fontSize[variant] ?? Typography.fontSize.body;

    const resolvedLineHeight = fontSize
      ? Math.round(resolvedFontSize * 1.35)
      : (Typography.lineHeight[variant] ?? Typography.lineHeight.body);

    return {
      fontSize: resolvedFontSize,
      lineHeight: resolvedLineHeight,
      color: color ?? theme.colors.onBackground,
    };
  },
}));

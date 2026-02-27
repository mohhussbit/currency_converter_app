import React, { ReactNode } from "react";

import { StyleProp, Text, TextProps, TextStyle } from "react-native";

import { Typography } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";

type Variant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "h7" | "body" | "small" | "tiny";

type FontWeight = keyof typeof Typography.fontWeight;

interface CustomTextProps extends Omit<TextProps, "style" | "children"> {
  variant?: Variant;
  fontWeight?: FontWeight;
  fontSize?: number;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
}

const CustomText = ({
  variant = "body",
  fontWeight = "light",
  fontSize,
  style,
  children,
  ...props
}: CustomTextProps) => {
  const { colors } = useTheme();

  const textStyle = () => {
    const resolvedFontSize = fontSize ?? Typography.fontSize[variant] ?? Typography.fontSize.body;
    const fallbackLineHeight = Typography.lineHeight[variant] ?? Typography.lineHeight.body;
    const resolvedLineHeight = fontSize ? Math.round(resolvedFontSize * 1.35) : fallbackLineHeight;

    return {
      fontSize: resolvedFontSize,
      lineHeight: resolvedLineHeight,
      color: colors.text,
      fontWeight: Typography.fontWeight[fontWeight],
    };
  };

  return (
    <Text style={[textStyle(), style]} {...props}>
      {children}
    </Text>
  );
};

export default CustomText;

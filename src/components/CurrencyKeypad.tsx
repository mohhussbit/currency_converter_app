import AnimatedTouchable from "@/components/AnimatedTouchable";
import AnimatedEntrance from "@/components/AnimatedEntrance";
import CustomText from "@/components/CustomText";
import { KEYPAD_ROWS } from "@/constants/currencyConverter";
import { Colors } from "@/constants/Colors";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import type { ThemeColors } from "@/types/theme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { View } from "react-native";

interface CurrencyKeypadProps {
  colors: ThemeColors;
  activeExpressionDisplay: string;
  onKeyPress: (key: string) => void;
}

interface KeypadButtonsProps {
  colors: ThemeColors;
  onKeyPress: (key: string) => void;
}

const operatorKeys = new Set(["+", "-", "x", "/"]);

const keypadButtonSheenColors: [string, string, string] = [
  "rgba(255, 255, 255, 0.34)",
  "rgba(255, 255, 255, 0.08)",
  "transparent",
];

const getKeyGradientColors = (
  key: string,
  colors: ThemeColors
): [string, string, string] => {
  if (key === "=") {
    return [Colors.primary, "#FFA646", Colors.primary];
  }
  if (key === "C") {
    return [Colors.accent, "#F8DF99", Colors.accent];
  }
  if (operatorKeys.has(key)) {
    return [Colors.primary, "#FF9B34", Colors.primary];
  }

  return [colors.gray[200], colors.gray[100], colors.gray[200]];
};

const getKeyTextColor = (key: string, colors: ThemeColors) => {
  if (key === "C") {
    return Colors.black;
  }
  if (key === "=" || operatorKeys.has(key)) {
    return Colors.white;
  }

  return colors.text;
};

const KeypadButtonsComponent: React.FC<KeypadButtonsProps> = ({
  colors,
  onKeyPress,
}) => (
  <>
    {KEYPAD_ROWS.map((row, rowIndex) => (
      <View key={`row-${rowIndex}`} style={styles.keypadRow}>
        {row.map((key) => {
          const isAction = key === "C" || key === "=";
          const isOperatorKey = operatorKeys.has(key);
          const keyGradientColors = getKeyGradientColors(key, colors);
          const keyTextColor = getKeyTextColor(key, colors);

          return (
            <AnimatedTouchable
              key={`${rowIndex}-${key}`}
              style={[
                styles.keypadButton,
                { borderColor: colors.gray[300] },
                isOperatorKey && styles.operatorKey,
                isAction && styles.actionKey,
              ]}
              onPress={() => onKeyPress(key)}
              activeOpacity={0.85}
              haptic={isAction ? "light" : "selection"}
              pressScale={0.97}
            >
              <LinearGradient
                colors={keyGradientColors}
                start={{ x: 0.05, y: 0 }}
                end={{ x: 0.95, y: 1 }}
                style={styles.keypadButtonGradient}
              >
                <LinearGradient
                  colors={keypadButtonSheenColors}
                  start={{ x: 0.15, y: 0.02 }}
                  end={{ x: 0.9, y: 0.96 }}
                  style={styles.keypadButtonSheen}
                />
                <CustomText
                  variant="h5"
                  fontWeight="semibold"
                  style={{ color: keyTextColor }}
                >
                  {key}
                </CustomText>
              </LinearGradient>
            </AnimatedTouchable>
          );
        })}
      </View>
    ))}
  </>
);

const KeypadButtons = React.memo(KeypadButtonsComponent);

const CurrencyKeypad: React.FC<CurrencyKeypadProps> = ({
  colors,
  activeExpressionDisplay,
  onKeyPress,
}) => {
  const keypadContainerColors = useMemo<[string, string, string]>(
    () => [`${colors.card}F5`, `${colors.gray[100]}C0`, `${colors.card}F5`],
    [colors.card, colors.gray]
  );
  const keypadContainerShineColors = useMemo<[string, string, string]>(
    () => ["rgba(255, 255, 255, 0.24)", "transparent", "rgba(255, 255, 255, 0.08)"],
    []
  );

  return (
    <AnimatedEntrance
      style={[
        styles.keypadContainer,
        { borderColor: colors.border },
      ]}
      delay={120}
      distance={12}
    >
      <LinearGradient
        colors={keypadContainerColors}
        start={{ x: 0, y: 0.04 }}
        end={{ x: 1, y: 1 }}
        style={styles.keypadContainerGradient}
      />
      <LinearGradient
        colors={keypadContainerShineColors}
        start={{ x: 0.1, y: 0.02 }}
        end={{ x: 0.9, y: 0.96 }}
        style={styles.keypadContainerSheen}
      />
      <CustomText
        variant="tiny"
        fontWeight="medium"
        style={[styles.pendingOperationText, { color: colors.gray[400] }]}
      >
        {activeExpressionDisplay}
      </CustomText>
      <KeypadButtons colors={colors} onKeyPress={onKeyPress} />
    </AnimatedEntrance>
  );
};

export default React.memo(CurrencyKeypad);

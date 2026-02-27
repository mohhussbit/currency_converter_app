import React from "react";

import { TouchableOpacity, View } from "react-native";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { KEYPAD_ROWS } from "@/constants/currencyConverter";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import type { ThemeColors } from "@/types/theme";

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

const getKeyBackgroundColor = (key: string, colors: ThemeColors): string => {
  if (key === "=") {
    return Colors.primary;
  }
  if (key === "C") {
    return Colors.accent;
  }
  if (operatorKeys.has(key)) {
    return Colors.primary;
  }

  return colors.gray[100];
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

const KeypadButtonsComponent: React.FC<KeypadButtonsProps> = ({ colors, onKeyPress }) => (
  <>
    {KEYPAD_ROWS.map((row, rowIndex) => (
      <View key={`row-${rowIndex}`} style={styles.keypadRow}>
        {row.map((key) => {
          const isAction = key === "C" || key === "=";
          const isOperatorKey = operatorKeys.has(key);
          const keyBackgroundColor = getKeyBackgroundColor(key, colors);
          const keyTextColor = getKeyTextColor(key, colors);

          return (
            <TouchableOpacity
              key={`${rowIndex}-${key}`}
              style={[
                styles.keypadButton,
                { borderColor: colors.gray[300] },
                isOperatorKey && styles.operatorKey,
                isAction && styles.actionKey,
              ]}
              onPress={() => onKeyPress(key)}
              activeOpacity={0.85}
            >
              <View style={[styles.keypadButtonGradient, { backgroundColor: keyBackgroundColor }]}>
                <CustomText variant="h5" fontWeight="semibold" style={{ color: keyTextColor }}>
                  {key}
                </CustomText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    ))}
  </>
);

const KeypadButtons = KeypadButtonsComponent;

const CurrencyKeypad: React.FC<CurrencyKeypadProps> = ({
  colors,
  activeExpressionDisplay,
  onKeyPress,
}) => {
  return (
    <View
      style={[
        styles.keypadContainer,
        { borderColor: colors.border },
        { backgroundColor: colors.card },
      ]}
    >
      <CustomText
        variant="tiny"
        fontWeight="medium"
        style={[styles.pendingOperationText, { color: colors.gray[400] }]}
      >
        {activeExpressionDisplay}
      </CustomText>
      <KeypadButtons colors={colors} onKeyPress={onKeyPress} />
    </View>
  );
};

export default CurrencyKeypad;

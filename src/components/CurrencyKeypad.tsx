import AnimatedTouchable from "@/components/AnimatedTouchable";
import AnimatedEntrance from "@/components/AnimatedEntrance";
import CustomText from "@/components/CustomText";
import { KEYPAD_ROWS } from "@/constants/currencyConverter";
import { Colors } from "@/constants/Colors";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import type { ThemeColors } from "@/types/theme";
import React from "react";
import { View } from "react-native";

interface CurrencyKeypadProps {
  colors: ThemeColors;
  activeExpressionDisplay: string;
  onKeyPress: (key: string) => void;
}

const CurrencyKeypad: React.FC<CurrencyKeypadProps> = ({
  colors,
  activeExpressionDisplay,
  onKeyPress,
}) => {
  return (
    <AnimatedEntrance
      style={[
        styles.keypadContainer,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      delay={120}
      distance={12}
    >
      <CustomText
        variant="tiny"
        fontWeight="medium"
        style={[styles.pendingOperationText, { color: colors.gray[400] }]}
      >
        {activeExpressionDisplay}
      </CustomText>

      {KEYPAD_ROWS.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.keypadRow}>
          {row.map((key) => {
            const isAction = key === "C" || key === "=";
            const isOperatorKey =
              key === "+" || key === "-" || key === "x" || key === "/";

            return (
              <AnimatedTouchable
                key={`${rowIndex}-${key}`}
                style={[
                  styles.keypadButton,
                  { borderColor: colors.gray[300], backgroundColor: colors.gray[100] },
                  isOperatorKey && styles.operatorKey,
                  isAction && styles.actionKey,
                ]}
                onPress={() => onKeyPress(key)}
                activeOpacity={0.85}
                haptic={isAction ? "light" : "selection"}
                pressScale={0.97}
              >
                <CustomText
                  variant="h5"
                  fontWeight="semibold"
                  style={{ color: isOperatorKey ? Colors.white : colors.text }}
                >
                  {key}
                </CustomText>
              </AnimatedTouchable>
            );
          })}
        </View>
      ))}
    </AnimatedEntrance>
  );
};

export default React.memo(CurrencyKeypad);

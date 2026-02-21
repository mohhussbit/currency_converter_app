import AnimatedTouchable from "@/components/AnimatedTouchable";
import AnimatedEntrance from "@/components/AnimatedEntrance";
import CustomText from "@/components/CustomText";
import { MAX_ROWS } from "@/constants/currencyConverter";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import type { Currency } from "@/services/currencyService";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import type { ThemeColors } from "@/types/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import CountryFlag from "react-native-country-flag";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

interface CurrencyPanelProps {
  colors: ThemeColors;
  isCompactLayout: boolean;
  activeCode: string;
  selectedCodes: string[];
  selectedCurrencies: Currency[];
  rowValues: Record<string, string>;
  activeExpressionDisplay: string;
  favoriteCurrencyCodes: string[];
  onSwap: () => void;
  onQuickMenu: () => void;
  onRemoveRow: (index: number) => void;
  onToggleFavoriteCurrency: (code: string) => void;
  onOpenCurrencySelector: (index: number) => void;
  onSelectRow: (code: string) => void;
  onCopyFieldValue: (value: string) => void | Promise<void>;
  onAddCurrency: () => void;
}

const CurrencyPanel: React.FC<CurrencyPanelProps> = ({
  colors,
  isCompactLayout,
  activeCode,
  selectedCodes,
  selectedCurrencies,
  rowValues,
  activeExpressionDisplay,
  favoriteCurrencyCodes,
  onSwap,
  onQuickMenu,
  onRemoveRow,
  onToggleFavoriteCurrency,
  onOpenCurrencySelector,
  onSelectRow,
  onCopyFieldValue,
  onAddCurrency,
}) => {
  return (
    <AnimatedEntrance
      style={[
        styles.currencyPanel,
        isCompactLayout && styles.currencyPanelCompact,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      delay={70}
      distance={10}
    >
      <View style={styles.currencyPanelHeader}>
        <CustomText
          variant="h6"
          fontWeight="medium"
          style={{ color: colors.gray[400] }}
        >
          Selected field: {activeCode}
        </CustomText>
        <View style={styles.currencyPanelActions}>
          {selectedCodes.length === 2 ? (
            <AnimatedTouchable
              onPress={onSwap}
              activeOpacity={0.8}
              hitSlop={8}
              haptic="selection"
            >
              <Ionicons
                name="swap-vertical-outline"
                size={Spacing.iconSize}
                color={Colors.primary}
              />
            </AnimatedTouchable>
          ) : null}
          <AnimatedTouchable
            onPress={onQuickMenu}
            activeOpacity={0.8}
            hitSlop={8}
            haptic="selection"
          >
            <Ionicons
              name="ellipsis-vertical"
              size={Spacing.iconSize}
              color={colors.gray[500]}
            />
          </AnimatedTouchable>
        </View>
      </View>

      <View style={styles.currencyRows}>
        {selectedCurrencies.map((currency, index) => {
          const isActive = currency.code === activeCode;
          const value = rowValues[currency.code];
          const displayValue = isActive ? activeExpressionDisplay : value;
          const copyValue = displayValue || (isActive ? "0" : "");
          const isFavorite = favoriteCurrencyCodes.includes(currency.code);
          const valueTextColor = isActive
            ? Colors.white
            : displayValue
              ? colors.text
              : colors.gray[400];

          return (
            <Animated.View
              key={currency.code}
              layout={LinearTransition.duration(150)}
              entering={FadeIn.duration(130)}
              exiting={FadeOut.duration(100)}
            >
              <Swipeable
                renderLeftActions={() => (
                  <View style={styles.swipeActions}>
                    <AnimatedTouchable
                      style={[
                        styles.swipeDeleteAction,
                        isCompactLayout && styles.swipeDeleteActionCompact,
                      ]}
                      onPress={() => onRemoveRow(index)}
                      activeOpacity={0.85}
                      haptic="warning"
                    >
                      <Ionicons name="close" size={18} color={Colors.white} />
                    </AnimatedTouchable>
                    <AnimatedTouchable
                      style={[
                        styles.swipeFavoriteAction,
                        isFavorite && styles.swipeFavoriteActionActive,
                        isCompactLayout && styles.swipeFavoriteActionCompact,
                      ]}
                      onPress={() => onToggleFavoriteCurrency(currency.code)}
                      activeOpacity={0.85}
                      haptic="light"
                    >
                      <Ionicons
                        name={isFavorite ? "star" : "star-outline"}
                        size={16}
                        color={Colors.black}
                      />
                    </AnimatedTouchable>
                  </View>
                )}
                friction={1.2}
                leftThreshold={12}
                dragOffsetFromLeftEdge={2}
                overshootLeft={false}
                overshootRight={false}
              >
                <View
                  style={[
                    styles.currencyRow,
                    isCompactLayout && styles.currencyRowCompact,
                    {
                      borderColor: isActive ? Colors.primary : colors.gray[300],
                      backgroundColor: isActive ? Colors.primary : colors.card,
                    },
                  ]}
                >
                  <View style={styles.swipeHint} pointerEvents="none">
                    {[0, 1, 2, 3].map((dotIndex) => (
                      <View
                        key={`${currency.code}-dot-${dotIndex}`}
                        style={[styles.swipeHintDot, isActive && styles.swipeHintDotActive]}
                      />
                    ))}
                  </View>

                  <AnimatedTouchable
                    style={[
                      styles.currencyCodeButton,
                      isCompactLayout && styles.currencyCodeButtonCompact,
                    ]}
                    onPress={() => onOpenCurrencySelector(index)}
                    activeOpacity={0.8}
                    haptic="selection"
                  >
                    <CountryFlag
                      isoCode={currency.flag}
                      size={isCompactLayout ? 20 : Spacing.flagIconSize}
                      style={styles.flagIcon}
                    />
                    <CustomText
                      variant={isCompactLayout ? "h6" : "h5"}
                      fontWeight="semibold"
                      style={{ color: isActive ? Colors.white : colors.text }}
                    >
                      {currency.code}
                    </CustomText>
                  </AnimatedTouchable>

                  <AnimatedTouchable
                    style={[
                      styles.valueFieldButton,
                      isCompactLayout && styles.valueFieldButtonCompact,
                      {
                        borderColor: isActive ? "rgba(255,255,255,0.6)" : colors.gray[300],
                        backgroundColor: isActive
                          ? "rgba(255,255,255,0.12)"
                          : colors.gray[100],
                      },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => onSelectRow(currency.code)}
                    onLongPress={() => onCopyFieldValue(copyValue)}
                    delayLongPress={280}
                    haptic="selection"
                    longPressHaptic="success"
                  >
                    <CustomText
                      variant={isCompactLayout ? "h6" : "h5"}
                      fontWeight={isActive ? "semibold" : "medium"}
                      numberOfLines={1}
                      style={{ color: valueTextColor }}
                    >
                      {displayValue || (isActive ? "0" : "-")}
                    </CustomText>
                  </AnimatedTouchable>
                </View>
              </Swipeable>
            </Animated.View>
          );
        })}
      </View>

      {selectedCodes.length < MAX_ROWS ? (
        <AnimatedTouchable
          style={[
            styles.addCurrencyButton,
            isCompactLayout && styles.addCurrencyButtonCompact,
            { borderColor: colors.gray[300] },
          ]}
          onPress={onAddCurrency}
          activeOpacity={0.8}
          haptic="light"
        >
          <Ionicons name="add" size={16} color={Colors.primary} />
          <CustomText
            variant="h6"
            fontWeight="medium"
            style={{ color: Colors.primary }}
          >
            Add Currency ({selectedCodes.length}/{MAX_ROWS})
          </CustomText>
        </AnimatedTouchable>
      ) : null}
    </AnimatedEntrance>
  );
};

export default React.memo(CurrencyPanel);

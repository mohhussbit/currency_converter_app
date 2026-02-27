import React from "react";

import { TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import CountryFlag from "react-native-country-flag";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { MAX_ROWS } from "@/constants/currencyConverter";
import { Spacing } from "@/constants/Spacing";
import type { Currency } from "@/services/currencyService";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import type { ThemeColors } from "@/types/theme";

interface CurrencyPanelProps {
  colors: ThemeColors;
  isCompactLayout: boolean;
  activeCode: string;
  selectedCodes: string[];
  selectedCurrencies: Currency[];
  rowValues: Record<string, string>;
  activeExpressionDisplay: string;
  favoriteCurrencyCodes: string[];
  onRemoveRow: (index: number) => void;
  onToggleFavoriteCurrency: (code: string) => void;
  onOpenCurrencySelector: (index: number) => void;
  onSelectRow: (code: string) => void;
  onCopyFieldValue: (value: string) => void | Promise<void>;
  onAddCurrency: () => void;
}

interface CurrencyRowItemProps {
  colors: ThemeColors;
  isCompactLayout: boolean;
  currency: Currency;
  index: number;
  isActive: boolean;
  displayValue?: string;
  copyValue: string;
  isFavorite: boolean;
  onRemoveRow: (index: number) => void;
  onToggleFavoriteCurrency: (code: string) => void;
  onOpenCurrencySelector: (index: number) => void;
  onSelectRow: (code: string) => void;
  onCopyFieldValue: (value: string) => void | Promise<void>;
}

interface CurrencyRowCodeButtonProps {
  colors: ThemeColors;
  isCompactLayout: boolean;
  isActive: boolean;
  currency: Currency;
  onPress: () => void;
  testID: string;
}

const getRowBackgroundColor = (isActive: boolean, colors: ThemeColors): string =>
  isActive ? Colors.primary : colors.card;

const getValueFieldBackgroundColor = (isActive: boolean, colors: ThemeColors): string =>
  isActive ? "rgba(255, 255, 255, 0.2)" : colors.gray[100];

const CurrencyRowCodeButtonComponent: React.FC<CurrencyRowCodeButtonProps> = ({
  colors,
  isCompactLayout,
  isActive,
  currency,
  onPress,
  testID,
}) => (
  <TouchableOpacity
    style={[styles.currencyCodeButton, isCompactLayout && styles.currencyCodeButtonCompact]}
    onPress={onPress}
    activeOpacity={0.8}
    testID={testID}
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
  </TouchableOpacity>
);

const CurrencyRowCodeButton = CurrencyRowCodeButtonComponent;

interface CurrencyRowValueButtonProps {
  colors: ThemeColors;
  isCompactLayout: boolean;
  isActive: boolean;
  displayValue?: string;
  onPress: () => void;
  onLongPress: () => void;
}

const CurrencyRowValueButtonComponent: React.FC<CurrencyRowValueButtonProps> = ({
  colors,
  isCompactLayout,
  isActive,
  displayValue,
  onPress,
  onLongPress,
}) => {
  const valueFieldBackgroundColor = () => getValueFieldBackgroundColor(isActive, colors);

  const valueTextColor = isActive ? Colors.white : displayValue ? colors.text : colors.gray[400];

  return (
    <TouchableOpacity
      style={[
        styles.valueFieldButton,
        isCompactLayout && styles.valueFieldButtonCompact,
        {
          borderColor: isActive ? "rgba(255,255,255,0.68)" : colors.gray[300],
          backgroundColor: valueFieldBackgroundColor(),
        },
      ]}
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
    >
      <CustomText
        variant={isCompactLayout ? "h6" : "h5"}
        fontWeight={isActive ? "semibold" : "medium"}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={isCompactLayout ? 0.82 : 0.64}
        ellipsizeMode="tail"
        style={{ color: valueTextColor, textAlign: "right" }}
      >
        {displayValue || (isActive ? "0" : "-")}
      </CustomText>
    </TouchableOpacity>
  );
};

const CurrencyRowValueButton = CurrencyRowValueButtonComponent;

const CurrencyRowItemComponent: React.FC<CurrencyRowItemProps> = ({
  colors,
  isCompactLayout,
  currency,
  index,
  isActive,
  displayValue,
  copyValue,
  isFavorite,
  onRemoveRow,
  onToggleFavoriteCurrency,
  onOpenCurrencySelector,
  onSelectRow,
  onCopyFieldValue,
}) => {
  const rowBackgroundColor = () => getRowBackgroundColor(isActive, colors);

  const handleRemoveRow = () => {
    onRemoveRow(index);
  };

  const handleToggleFavoriteCurrency = () => {
    onToggleFavoriteCurrency(currency.code);
  };

  const handleOpenCurrencySelector = () => {
    onOpenCurrencySelector(index);
  };

  const handleSelectRow = () => {
    onSelectRow(currency.code);
  };

  const handleCopyFieldValue = () => {
    onCopyFieldValue(copyValue);
  };

  const renderLeftActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeDeleteAction, isCompactLayout && styles.swipeDeleteActionCompact]}
        onPress={handleRemoveRow}
        activeOpacity={0.85}
      >
        <Ionicons name="close" size={18} color={Colors.white} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.swipeFavoriteAction,
          isFavorite && styles.swipeFavoriteActionActive,
          isCompactLayout && styles.swipeFavoriteActionCompact,
        ]}
        onPress={handleToggleFavoriteCurrency}
        activeOpacity={0.85}
      >
        <Ionicons name={isFavorite ? "star" : "star-outline"} size={16} color={Colors.black} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View
      layout={LinearTransition.duration(150)}
      entering={FadeIn.duration(130)}
      exiting={FadeOut.duration(100)}
    >
      <Swipeable
        renderLeftActions={renderLeftActions}
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
              backgroundColor: rowBackgroundColor(),
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

          <CurrencyRowCodeButton
            colors={colors}
            isCompactLayout={isCompactLayout}
            isActive={isActive}
            currency={currency}
            onPress={handleOpenCurrencySelector}
            testID={`currency-row-code-${index}`}
          />
          <CurrencyRowValueButton
            colors={colors}
            isCompactLayout={isCompactLayout}
            isActive={isActive}
            displayValue={displayValue}
            onPress={handleSelectRow}
            onLongPress={handleCopyFieldValue}
          />
        </View>
      </Swipeable>
    </Animated.View>
  );
};

interface CurrencyPanelHeaderProps {
  activeCode: string;
  colors: ThemeColors;
}

const CurrencyPanelHeaderComponent: React.FC<CurrencyPanelHeaderProps> = ({
  activeCode,
  colors,
}) => (
  <View style={styles.currencyPanelHeader}>
    <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[400] }}>
      Selected field: {activeCode}
    </CustomText>
  </View>
);

const CurrencyPanelHeader = CurrencyPanelHeaderComponent;

interface AddCurrencyButtonProps {
  selectedCodesLength: number;
  isCompactLayout: boolean;
  colors: ThemeColors;
  onAddCurrency: () => void;
}

const AddCurrencyButtonComponent: React.FC<AddCurrencyButtonProps> = ({
  selectedCodesLength,
  isCompactLayout,
  colors,
  onAddCurrency,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.addCurrencyButton,
        isCompactLayout && styles.addCurrencyButtonCompact,
        {
          borderColor: colors.gray[300],
          backgroundColor: colors.gray[100],
        },
      ]}
      onPress={onAddCurrency}
      activeOpacity={0.8}
      testID="add-currency-button"
    >
      <Ionicons name="add" size={16} color={Colors.primary} />
      <CustomText variant="h6" fontWeight="medium" style={{ color: Colors.primary }}>
        Add Currency ({selectedCodesLength}/{MAX_ROWS})
      </CustomText>
    </TouchableOpacity>
  );
};

const AddCurrencyButton = AddCurrencyButtonComponent;

const CurrencyPanel: React.FC<CurrencyPanelProps> = ({
  colors,
  isCompactLayout,
  activeCode,
  selectedCodes,
  selectedCurrencies,
  rowValues,
  activeExpressionDisplay,
  favoriteCurrencyCodes,
  onRemoveRow,
  onToggleFavoriteCurrency,
  onOpenCurrencySelector,
  onSelectRow,
  onCopyFieldValue,
  onAddCurrency,
}) => {
  const favoriteCodeSet = () => new Set(favoriteCurrencyCodes);

  const selectedCodesLength = selectedCodes.length;

  return (
    <View
      style={[
        styles.currencyPanel,
        isCompactLayout && styles.currencyPanelCompact,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
      ]}
    >
      <CurrencyPanelHeader activeCode={activeCode} colors={colors} />

      <View style={styles.currencyRows}>
        {selectedCurrencies.map((currency, index) => {
          const isActive = currency.code === activeCode;
          const value = rowValues[currency.code];
          const displayValue = isActive ? activeExpressionDisplay : value;
          const copyValue = displayValue || (isActive ? "0" : "");
          const isFavorite = favoriteCodeSet().has(currency.code);

          return (
            <CurrencyRowItemComponent
              key={currency.code}
              colors={colors}
              isCompactLayout={isCompactLayout}
              currency={currency}
              index={index}
              isActive={isActive}
              displayValue={displayValue}
              copyValue={copyValue}
              isFavorite={isFavorite}
              onRemoveRow={onRemoveRow}
              onToggleFavoriteCurrency={onToggleFavoriteCurrency}
              onOpenCurrencySelector={onOpenCurrencySelector}
              onSelectRow={onSelectRow}
              onCopyFieldValue={onCopyFieldValue}
            />
          );
        })}
      </View>

      {selectedCodesLength < MAX_ROWS ? (
        <AddCurrencyButton
          selectedCodesLength={selectedCodesLength}
          isCompactLayout={isCompactLayout}
          colors={colors}
          onAddCurrency={onAddCurrency}
        />
      ) : null}
    </View>
  );
};

export default CurrencyPanel;

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
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo } from "react";
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
}

const panelSheenColors: [string, string, string] = [
  "rgba(255, 255, 255, 0.22)",
  "transparent",
  "rgba(255, 255, 255, 0.08)",
];

const rowSheenColors: [string, string, string] = [
  "rgba(255, 255, 255, 0.28)",
  "transparent",
  "rgba(255, 255, 255, 0.08)",
];

const valueFieldSheenColors: [string, string, string] = [
  "rgba(255, 255, 255, 0.2)",
  "transparent",
  "rgba(255, 255, 255, 0.06)",
];

const addButtonSheenColors: [string, string, string] = [
  "rgba(255, 255, 255, 0.24)",
  "transparent",
  "rgba(255, 255, 255, 0.08)",
];

const getRowGradientColors = (
  isActive: boolean,
  colors: ThemeColors
): [string, string, string] =>
  isActive
    ? [Colors.primary, "#FFA646", Colors.primary]
    : [colors.card, colors.gray[100], colors.card];

const getValueFieldGradientColors = (
  isActive: boolean,
  colors: ThemeColors
): [string, string, string] =>
  isActive
    ? ["rgba(255, 255, 255, 0.28)", "rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.22)"]
    : [colors.gray[200], colors.gray[100], colors.gray[200]];

const CurrencyRowCodeButtonComponent: React.FC<CurrencyRowCodeButtonProps> = ({
  colors,
  isCompactLayout,
  isActive,
  currency,
  onPress,
}) => (
  <AnimatedTouchable
    style={[
      styles.currencyCodeButton,
      isCompactLayout && styles.currencyCodeButtonCompact,
    ]}
    onPress={onPress}
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
);

const CurrencyRowCodeButton = React.memo(CurrencyRowCodeButtonComponent);

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
  const valueFieldGradientColors = useMemo(
    () => getValueFieldGradientColors(isActive, colors),
    [colors, isActive]
  );
  const valueTextColor = isActive
    ? Colors.white
    : displayValue
      ? colors.text
      : colors.gray[400];

  return (
    <AnimatedTouchable
      style={[
        styles.valueFieldButton,
        isCompactLayout && styles.valueFieldButtonCompact,
        {
          borderColor: isActive ? "rgba(255,255,255,0.68)" : colors.gray[300],
        },
      ]}
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      haptic="selection"
      longPressHaptic="success"
    >
      <LinearGradient
        pointerEvents="none"
        colors={valueFieldGradientColors}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.valueFieldButtonGradient}
      />
      <LinearGradient
        pointerEvents="none"
        colors={valueFieldSheenColors}
        start={{ x: 0.1, y: 0.05 }}
        end={{ x: 0.92, y: 0.96 }}
        style={styles.valueFieldButtonSheen}
      />
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
    </AnimatedTouchable>
  );
};

const CurrencyRowValueButton = React.memo(CurrencyRowValueButtonComponent);

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
  const rowGradientColors = useMemo(
    () => getRowGradientColors(isActive, colors),
    [colors, isActive]
  );
  const handleRemoveRow = useCallback(() => {
    onRemoveRow(index);
  }, [index, onRemoveRow]);

  const handleToggleFavoriteCurrency = useCallback(() => {
    onToggleFavoriteCurrency(currency.code);
  }, [currency.code, onToggleFavoriteCurrency]);

  const handleOpenCurrencySelector = useCallback(() => {
    onOpenCurrencySelector(index);
  }, [index, onOpenCurrencySelector]);

  const handleSelectRow = useCallback(() => {
    onSelectRow(currency.code);
  }, [currency.code, onSelectRow]);

  const handleCopyFieldValue = useCallback(() => {
    onCopyFieldValue(copyValue);
  }, [copyValue, onCopyFieldValue]);

  const renderLeftActions = useCallback(
    () => (
      <View style={styles.swipeActions}>
        <AnimatedTouchable
          style={[
            styles.swipeDeleteAction,
            isCompactLayout && styles.swipeDeleteActionCompact,
          ]}
          onPress={handleRemoveRow}
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
          onPress={handleToggleFavoriteCurrency}
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
    ),
    [handleRemoveRow, handleToggleFavoriteCurrency, isCompactLayout, isFavorite]
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
            },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={rowGradientColors}
            start={{ x: 0.04, y: 0 }}
            end={{ x: 0.96, y: 1 }}
            style={styles.currencyRowGradient}
          />
          <LinearGradient
            pointerEvents="none"
            colors={rowSheenColors}
            start={{ x: 0.08, y: 0.04 }}
            end={{ x: 0.92, y: 0.96 }}
            style={styles.currencyRowSheen}
          />
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

const areCurrencyRowItemPropsEqual = (
  previous: CurrencyRowItemProps,
  next: CurrencyRowItemProps
) =>
  previous.colors === next.colors &&
  previous.isCompactLayout === next.isCompactLayout &&
  previous.currency === next.currency &&
  previous.index === next.index &&
  previous.isActive === next.isActive &&
  previous.displayValue === next.displayValue &&
  previous.copyValue === next.copyValue &&
  previous.isFavorite === next.isFavorite &&
  previous.onRemoveRow === next.onRemoveRow &&
  previous.onToggleFavoriteCurrency === next.onToggleFavoriteCurrency &&
  previous.onOpenCurrencySelector === next.onOpenCurrencySelector &&
  previous.onSelectRow === next.onSelectRow &&
  previous.onCopyFieldValue === next.onCopyFieldValue;

const CurrencyRowItem = React.memo(
  CurrencyRowItemComponent,
  areCurrencyRowItemPropsEqual
);

interface CurrencyPanelHeaderProps {
  activeCode: string;
  selectedCodesLength: number;
  colors: ThemeColors;
  onSwap: () => void;
  onQuickMenu: () => void;
}

const CurrencyPanelHeaderComponent: React.FC<CurrencyPanelHeaderProps> = ({
  activeCode,
  selectedCodesLength,
  colors,
  onSwap,
  onQuickMenu,
}) => (
  <View style={styles.currencyPanelHeader}>
    <CustomText
      variant="h6"
      fontWeight="medium"
      style={{ color: colors.gray[400] }}
    >
      Selected field: {activeCode}
    </CustomText>
    <View style={styles.currencyPanelActions}>
      {selectedCodesLength === 2 ? (
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
);

const CurrencyPanelHeader = React.memo(CurrencyPanelHeaderComponent);

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
  const addButtonGradientColors = useMemo<[string, string, string]>(
    () => [colors.gray[200], colors.gray[100], colors.gray[200]],
    [colors.gray]
  );

  return (
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
      <LinearGradient
        pointerEvents="none"
        colors={addButtonGradientColors}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.addCurrencyButtonGradient}
      />
      <LinearGradient
        pointerEvents="none"
        colors={addButtonSheenColors}
        start={{ x: 0.1, y: 0.05 }}
        end={{ x: 0.9, y: 0.96 }}
        style={styles.addCurrencyButtonSheen}
      />
      <Ionicons name="add" size={16} color={Colors.primary} />
      <CustomText
        variant="h6"
        fontWeight="medium"
        style={{ color: Colors.primary }}
      >
        Add Currency ({selectedCodesLength}/{MAX_ROWS})
      </CustomText>
    </AnimatedTouchable>
  );
};

const AddCurrencyButton = React.memo(AddCurrencyButtonComponent);

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
  const favoriteCodeSet = useMemo(
    () => new Set(favoriteCurrencyCodes),
    [favoriteCurrencyCodes]
  );
  const panelGradientColors = useMemo<[string, string, string]>(
    () => [`${colors.card}F8`, `${colors.gray[100]}CE`, `${colors.card}F8`],
    [colors.card, colors.gray]
  );
  const selectedCodesLength = selectedCodes.length;

  return (
    <AnimatedEntrance
      style={[
        styles.currencyPanel,
        isCompactLayout && styles.currencyPanelCompact,
        { borderColor: colors.border },
      ]}
      delay={70}
      distance={10}
    >
      <LinearGradient
        pointerEvents="none"
        colors={panelGradientColors}
        start={{ x: 0.03, y: 0.02 }}
        end={{ x: 0.97, y: 1 }}
        style={styles.currencyPanelGradient}
      />
      <LinearGradient
        pointerEvents="none"
        colors={panelSheenColors}
        start={{ x: 0.1, y: 0.02 }}
        end={{ x: 0.9, y: 0.98 }}
        style={styles.currencyPanelSheen}
      />
      <CurrencyPanelHeader
        activeCode={activeCode}
        selectedCodesLength={selectedCodesLength}
        colors={colors}
        onSwap={onSwap}
        onQuickMenu={onQuickMenu}
      />

      <View style={styles.currencyRows}>
        {selectedCurrencies.map((currency, index) => {
          const isActive = currency.code === activeCode;
          const value = rowValues[currency.code];
          const displayValue = isActive ? activeExpressionDisplay : value;
          const copyValue = displayValue || (isActive ? "0" : "");
          const isFavorite = favoriteCodeSet.has(currency.code);

          return (
            <CurrencyRowItem
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
    </AnimatedEntrance>
  );
};

export default React.memo(CurrencyPanel);

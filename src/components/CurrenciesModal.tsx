import AnimatedTouchable from "@/components/AnimatedTouchable";
import AnimatedEntrance from "@/components/AnimatedEntrance";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Currency } from "@/services/currencyService";
import { styles } from "@/styles/components/CurrenciesModal.styles";
import { Ionicons } from "@expo/vector-icons";
import { LegendList, LegendListRenderItemProps } from "@legendapp/list";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CountryFlag from "react-native-country-flag";

const COUNTRY_NAME_OVERRIDES: Record<string, string> = {
  EU: "Eurozone",
  IMF: "International Monetary Fund",
};

const modalSheenColors: [string, string, string] = [
  "rgba(255, 255, 255, 0.22)",
  "transparent",
  "rgba(255, 255, 255, 0.08)",
];

const searchSheenColors: [string, string, string] = [
  "rgba(255, 255, 255, 0.2)",
  "transparent",
  "rgba(255, 255, 255, 0.06)",
];

const CURRENCY_ROW_HEIGHT = 62;

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

interface CurrenciesModalProps {
  visible: boolean;
  onClose: () => void;
  currencies: Currency[];
  onCurrenciesSelect: (currency: Currency) => void;
  pinnedCurrencyCodes: string[];
  recentCurrencyCodes: string[];
  onTogglePinCurrency: (currencyCode: string) => void;
}

interface CurrencyRowItemProps {
  currency: Currency;
  colors: ReturnType<typeof useTheme>["colors"];
  countryName: string;
  isPinned: boolean;
  onPressCurrency: (currency: Currency) => void;
  onLongPressCurrency: (currencyCode: string) => void;
}

const CurrencyRowItemComponent: React.FC<CurrencyRowItemProps> = ({
  currency,
  colors,
  countryName,
  isPinned,
  onPressCurrency,
  onLongPressCurrency,
}) => {
  const subtitle = useMemo(
    () =>
      [currency.name, currency.symbol || null, countryName || null]
        .filter(Boolean)
        .join(" | "),
    [countryName, currency.name, currency.symbol]
  );
  const rowBackgroundColor = isPinned ? `${Colors.accent}2F` : `${colors.gray[100]}CC`;
  const handlePress = useCallback(() => {
    onPressCurrency(currency);
  }, [currency, onPressCurrency]);
  const handleLongPress = useCallback(() => {
    onLongPressCurrency(currency.code);
  }, [currency.code, onLongPressCurrency]);

  return (
    <AnimatedTouchable
      style={[
        styles.currencyItem,
        {
          borderColor: isPinned ? `${Colors.accent}84` : colors.gray[300],
          backgroundColor: rowBackgroundColor,
        },
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={280}
      haptic="selection"
      longPressHaptic="medium"
    >
      <CountryFlag
        isoCode={currency.flag}
        size={25}
        style={styles.flagIcon}
      />
      <View style={styles.currencyInfo}>
        <CustomText
          variant="h5"
          fontWeight="medium"
          style={{ color: colors.text }}
        >
          {currency.code}
        </CustomText>
        <CustomText
          variant="h6"
          fontWeight="medium"
          numberOfLines={1}
          style={{ color: colors.gray[400] }}
        >
          {subtitle}
        </CustomText>
      </View>
      {isPinned ? (
        <Ionicons name="star" size={16} color={Colors.primary} />
      ) : null}
    </AnimatedTouchable>
  );
};

const areCurrencyRowItemPropsEqual = (
  previous: CurrencyRowItemProps,
  next: CurrencyRowItemProps
) =>
  previous.currency === next.currency &&
  previous.colors === next.colors &&
  previous.countryName === next.countryName &&
  previous.isPinned === next.isPinned &&
  previous.onPressCurrency === next.onPressCurrency &&
  previous.onLongPressCurrency === next.onLongPressCurrency;

const CurrencyRowItem = React.memo(
  CurrencyRowItemComponent,
  areCurrencyRowItemPropsEqual
);

const CurrenciesModalComponent = ({
  visible,
  onClose,
  currencies,
  onCurrenciesSelect,
  pinnedCurrencyCodes,
  recentCurrencyCodes,
  onTogglePinCurrency,
}: CurrenciesModalProps) => {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const longPressCodeRef = useRef<string | null>(null);
  const modalGradientColors = useMemo<[string, string, string]>(
    () => [`${colors.card}FA`, `${colors.gray[100]}D2`, `${colors.card}FA`],
    [colors.card, colors.gray]
  );
  const searchGradientColors = useMemo<[string, string, string]>(
    () => [colors.gray[200], colors.background, colors.gray[200]],
    [colors.background, colors.gray]
  );

  const regionDisplayNames = useMemo(() => {
    if (typeof Intl.DisplayNames !== "function") {
      return null;
    }

    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);

  const currenciesByCode = useMemo(() => {
    const map = new Map<string, Currency>();
    currencies.forEach((currency) => map.set(currency.code, currency));
    return map;
  }, [currencies]);

  const normalizedPinnedCodes = useMemo(
    () =>
      [...new Set(pinnedCurrencyCodes.map((code) => code.toUpperCase().trim()))]
        .filter((code) => code.length > 0),
    [pinnedCurrencyCodes]
  );

  const normalizedRecentCodes = useMemo(
    () =>
      [...new Set(recentCurrencyCodes.map((code) => code.toUpperCase().trim()))]
        .filter((code) => code.length > 0),
    [recentCurrencyCodes]
  );

  const pinnedCodeSet = useMemo(
    () => new Set(normalizedPinnedCodes),
    [normalizedPinnedCodes]
  );

  const recentIndexMap = useMemo(
    () => new Map(normalizedRecentCodes.map((code, index) => [code, index])),
    [normalizedRecentCodes]
  );

  const countryNameMap = useMemo(() => {
    const map = new Map<string, string>();

    currencies.forEach((currency) => {
      const regionCode = currency.flag.toUpperCase();
      if (COUNTRY_NAME_OVERRIDES[regionCode]) {
        map.set(currency.code, COUNTRY_NAME_OVERRIDES[regionCode]);
        return;
      }

      if (!regionDisplayNames || !/^[A-Z]{2}$/.test(regionCode)) {
        map.set(currency.code, "");
        return;
      }

      const regionName = regionDisplayNames.of(regionCode);
      map.set(currency.code, regionName ?? "");
    });

    return map;
  }, [currencies, regionDisplayNames]);

  const normalizedSearchTerm = useMemo(
    () => normalizeSearchText(deferredSearchTerm),
    [deferredSearchTerm]
  );
  const isSearching = normalizedSearchTerm.length > 0;

  const searchableCurrencies = useMemo(
    () =>
      currencies.map((currency) => {
        const countryName = countryNameMap.get(currency.code) || "";
        const searchableValue = normalizeSearchText(
          `${currency.code} ${currency.name} ${currency.symbol || ""} ${countryName} ${currency.flag}`
        );

        return { currency, searchableValue };
      }),
    [currencies, countryNameMap]
  );

  const filteredCurrencies = useMemo(() => {
    if (!normalizedSearchTerm) {
      return currencies;
    }

    return searchableCurrencies
      .filter(({ searchableValue }) =>
        searchableValue.includes(normalizedSearchTerm)
      )
      .map(({ currency }) => currency);
  }, [currencies, normalizedSearchTerm, searchableCurrencies]);

  const pinnedCurrencies = useMemo(
    () =>
      normalizedPinnedCodes
        .map((code) => currenciesByCode.get(code))
        .filter((currency): currency is Currency => Boolean(currency)),
    [normalizedPinnedCodes, currenciesByCode]
  );

  const recentCurrencies = useMemo(
    () =>
      normalizedRecentCodes
        .map((code) => currenciesByCode.get(code))
        .filter(
          (currency): currency is Currency => {
            if (!currency) {
              return false;
            }
            return !pinnedCodeSet.has(currency.code);
          }
        ),
    [normalizedRecentCodes, currenciesByCode, pinnedCodeSet]
  );

  const allCurrencies = useMemo(() => {
    const excludedCodes = new Set<string>();
    pinnedCurrencies.forEach((currency) => excludedCodes.add(currency.code));
    recentCurrencies.forEach((currency) => excludedCodes.add(currency.code));

    return currencies.filter((currency) => !excludedCodes.has(currency.code));
  }, [currencies, pinnedCurrencies, recentCurrencies]);

  const searchResults = useMemo(
    () =>
      [...filteredCurrencies].sort((first, second) => {
        const firstPinned = pinnedCodeSet.has(first.code);
        const secondPinned = pinnedCodeSet.has(second.code);
        if (firstPinned !== secondPinned) {
          return firstPinned ? -1 : 1;
        }

        const firstRecentIndex = recentIndexMap.get(first.code);
        const secondRecentIndex = recentIndexMap.get(second.code);
        if (
          typeof firstRecentIndex === "number" &&
          typeof secondRecentIndex === "number"
        ) {
          return firstRecentIndex - secondRecentIndex;
        }
        if (typeof firstRecentIndex === "number") {
          return -1;
        }
        if (typeof secondRecentIndex === "number") {
          return 1;
        }

        return first.code.localeCompare(second.code);
      }),
    [filteredCurrencies, pinnedCodeSet, recentIndexMap]
  );

  const listData = isSearching ? searchResults : allCurrencies;

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      onCurrenciesSelect(currency);
      setSearchTerm("");
    },
    [onCurrenciesSelect]
  );

  const handleCurrencyItemLongPress = useCallback(
    (currencyCode: string) => {
      longPressCodeRef.current = currencyCode;
      onTogglePinCurrency(currencyCode);
    },
    [onTogglePinCurrency]
  );

  const handleCurrencyItemPress = useCallback(
    (currency: Currency) => {
      if (longPressCodeRef.current === currency.code) {
        longPressCodeRef.current = null;
        return;
      }

      longPressCodeRef.current = null;
      handleCurrencySelect(currency);
    },
    [handleCurrencySelect]
  );

  const renderCurrencyRow = useCallback(
    (currency: Currency) => {
      const isPinned = pinnedCodeSet.has(currency.code);
      const countryName = countryNameMap.get(currency.code) || "";

      return (
        <CurrencyRowItem
          currency={currency}
          colors={colors}
          countryName={countryName}
          isPinned={isPinned}
          onPressCurrency={handleCurrencyItemPress}
          onLongPressCurrency={handleCurrencyItemLongPress}
        />
      );
    },
    [
      colors,
      countryNameMap,
      handleCurrencyItemLongPress,
      handleCurrencyItemPress,
      pinnedCodeSet,
    ]
  );

  const renderCurrencyItem = useCallback(
    ({ item }: LegendListRenderItemProps<Currency>) => renderCurrencyRow(item),
    [renderCurrencyRow]
  );

  const renderSection = useCallback(
    (title: string, items: Currency[]) => (
      <View style={styles.sectionContainer}>
        <CustomText
          variant="h6"
          fontWeight="semibold"
          style={{ color: colors.gray[500] }}
        >
          {title}
        </CustomText>
        <View style={styles.sectionList}>
          {items.map((currency) => (
            <View key={`${title}-${currency.code}`} style={styles.sectionCurrencyItemWrap}>
              {renderCurrencyRow(currency)}
            </View>
          ))}
        </View>
      </View>
    ),
    [colors.gray, renderCurrencyRow]
  );

  const hasPinned = pinnedCurrencies.length > 0;
  const hasRecent = recentCurrencies.length > 0;

  const listHeaderComponent = useMemo(() => {
    if (isSearching) {
      return null;
    }

    if (!hasPinned && !hasRecent) {
      return null;
    }

    return (
      <View style={styles.sectionsWrapper}>
        {hasPinned ? renderSection("Pinned", pinnedCurrencies) : null}
        {hasRecent ? renderSection("Recent", recentCurrencies) : null}
        <CustomText
          variant="h6"
          fontWeight="semibold"
          style={[styles.allCurrenciesLabel, { color: colors.gray[500] }]}
        >
          All Currencies
        </CustomText>
      </View>
    );
  }, [colors.gray, hasPinned, hasRecent, isSearching, pinnedCurrencies, recentCurrencies, renderSection]);

  const listEmptyComponent = useMemo(() => {
    if (!isSearching || listData.length > 0) {
      return null;
    }

    return (
      <View style={styles.emptyState}>
        <CustomText
          variant="h6"
          fontWeight="medium"
          style={{ color: colors.gray[400] }}
        >
          No currency found.
        </CustomText>
        <CustomText
          variant="tiny"
          fontWeight="medium"
          style={{ color: colors.gray[400] }}
        >
          Search by country, code, or symbol.
        </CustomText>
      </View>
    );
  }, [colors.gray, isSearching, listData.length]);

  const renderItemSeparator = useCallback(
    () => <View style={styles.currencyItemSeparator} />,
    []
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <TouchableWithoutFeedback>
            <AnimatedEntrance
              style={[styles.modalContent, { backgroundColor: "transparent" }]}
              delay={20}
              distance={10}
              scaleFrom={0.98}
              trigger={visible}
            >
              <LinearGradient
                pointerEvents="none"
                colors={modalGradientColors}
                start={{ x: 0.03, y: 0.02 }}
                end={{ x: 0.97, y: 1 }}
                style={styles.modalContentGradient}
              />
              <LinearGradient
                pointerEvents="none"
                colors={modalSheenColors}
                start={{ x: 0.1, y: 0.04 }}
                end={{ x: 0.9, y: 0.98 }}
                style={styles.modalContentSheen}
              />
              <View style={styles.header}>
                <CustomText
                  variant="h4"
                  fontWeight="bold"
                  style={{ color: colors.text }}
                >
                  Select Currency
                </CustomText>
                <AnimatedTouchable onPress={onClose} hitSlop={10} haptic="light">
                  <Ionicons
                    name="close"
                    size={Spacing.iconSize}
                    color={colors.text}
                  />
                </AnimatedTouchable>
              </View>

              <View
                style={[
                  styles.searchContainer,
                  { borderColor: colors.gray[300] },
                ]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={searchGradientColors}
                  start={{ x: 0.05, y: 0 }}
                  end={{ x: 0.95, y: 1 }}
                  style={styles.searchContainerGradient}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={searchSheenColors}
                  start={{ x: 0.1, y: 0.04 }}
                  end={{ x: 0.92, y: 0.96 }}
                  style={styles.searchContainerSheen}
                />
                <Ionicons
                  name="search"
                  size={Spacing.iconSize}
                  color={colors.gray[400]}
                  style={styles.searchIcon}
                />
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search by country, code, or symbol"
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholderTextColor={colors.gray[400]}
                />
                {searchTerm ? (
                  <AnimatedTouchable
                    onPress={() => setSearchTerm("")}
                    style={styles.clearButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    haptic="selection"
                  >
                    <Ionicons
                      name="close-circle"
                      size={Spacing.iconSize}
                      color={colors.gray[400]}
                    />
                  </AnimatedTouchable>
                ) : null}
              </View>

              <CustomText
                variant="tiny"
                fontWeight="medium"
                style={[styles.helperText, { color: colors.gray[400] }]}
              >
                Long press any currency to pin or unpin it.
              </CustomText>

              <LegendList
                data={listData}
                renderItem={renderCurrencyItem}
                keyExtractor={(item) => item.code}
                ItemSeparatorComponent={renderItemSeparator}
                contentContainerStyle={styles.currenciesList}
                ListHeaderComponent={listHeaderComponent}
                ListEmptyComponent={listEmptyComponent}
                keyboardShouldPersistTaps="handled"
                indicatorStyle="black"
                showsVerticalScrollIndicator={true}
                estimatedItemSize={CURRENCY_ROW_HEIGHT}
                drawDistance={420}
                recycleItems={true}
              />
            </AnimatedEntrance>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const arePropsEqual = (
  previous: CurrenciesModalProps,
  next: CurrenciesModalProps
) => {
  if (!previous.visible && !next.visible) {
    return true;
  }

  return (
    previous.visible === next.visible &&
    previous.onClose === next.onClose &&
    previous.onCurrenciesSelect === next.onCurrenciesSelect &&
    previous.onTogglePinCurrency === next.onTogglePinCurrency &&
    previous.currencies === next.currencies &&
    previous.pinnedCurrencyCodes === next.pinnedCurrencyCodes &&
    previous.recentCurrencyCodes === next.recentCurrencyCodes
  );
};

export default React.memo(CurrenciesModalComponent, arePropsEqual);

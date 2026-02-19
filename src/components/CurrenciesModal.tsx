import AnimatedTouchable from "@/components/AnimatedTouchable";
import AnimatedEntrance from "@/components/AnimatedEntrance";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { Currency } from "@/services/currencyService";
import { styles } from "@/styles/components/CurrenciesModal.styles";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
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
  const longPressCodeRef = useRef<string | null>(null);

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
    () => normalizeSearchText(searchTerm),
    [searchTerm]
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
      const subtitleParts = [
        currency.name,
        currency.symbol || null,
        countryName || null,
      ].filter(Boolean);

      return (
        <AnimatedTouchable
          style={styles.currencyItem}
          onPress={() => handleCurrencyItemPress(currency)}
          onLongPress={() => handleCurrencyItemLongPress(currency.code)}
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
              {subtitleParts.join(" | ")}
            </CustomText>
          </View>
          {isPinned ? (
            <Ionicons name="star" size={16} color={Colors.primary} />
          ) : null}
        </AnimatedTouchable>
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
    ({ item }: { item: Currency }) => renderCurrencyRow(item),
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
            <View key={`${title}-${currency.code}`}>{renderCurrencyRow(currency)}</View>
          ))}
        </View>
      </View>
    ),
    [colors.gray, renderCurrencyRow]
  );

  const listHeaderComponent = useMemo(() => {
    if (isSearching) {
      return null;
    }

    const hasPinned = pinnedCurrencies.length > 0;
    const hasRecent = recentCurrencies.length > 0;

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
  }, [colors.gray, isSearching, pinnedCurrencies, recentCurrencies, renderSection]);

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <AnimatedEntrance
              style={[styles.modalContent, { backgroundColor: colors.card }]}
              delay={20}
              distance={10}
              scaleFrom={0.98}
              trigger={visible}
            >
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
                  { backgroundColor: colors.background },
                ]}
              >
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

              <FlatList
                data={listData}
                renderItem={renderCurrencyItem}
                keyExtractor={(item) => item.code}
                contentContainerStyle={styles.currenciesList}
                ListHeaderComponent={listHeaderComponent}
                ListEmptyComponent={listEmptyComponent}
                keyboardShouldPersistTaps="handled"
                indicatorStyle="black"
                showsVerticalScrollIndicator={true}
                initialNumToRender={24}
                maxToRenderPerBatch={24}
                windowSize={10}
                removeClippedSubviews={true}
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

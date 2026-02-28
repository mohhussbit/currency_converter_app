import React, { useRef, useState } from "react";

import { Modal, TextInput, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LegendList, LegendListRenderItemProps } from "@legendapp/list";
import CountryFlag from "react-native-country-flag";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Currency } from "@/services/currencyService";
import { styles } from "@/styles/components/CurrenciesModal.styles";
import type { ThemeColors } from "@/types/theme";

const COUNTRY_NAME_OVERRIDES: Record<string, string> = {
  EU: "Eurozone",
  IMF: "International Monetary Fund",
};

const CURRENCY_ROW_HEIGHT = 62;
const DEFAULT_PIN_TOGGLE_DELAY_LONG_PRESS_MS = 260;

export interface PreparedCurrencyEntry {
  currency: Currency;
  countryName: string;
  searchableValue: string;
}

export interface PreparedCurrencyData {
  entries: PreparedCurrencyEntry[];
  byCode: Map<string, PreparedCurrencyEntry>;
}

const regionDisplayNames =
  typeof Intl.DisplayNames === "function"
    ? (() => {
        try {
          return new Intl.DisplayNames(["en"], { type: "region" });
        } catch {
          return null;
        }
      })()
    : null;

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const getCountryName = (currency: Currency): string => {
  const regionCode = currency.flag.toUpperCase();
  if (COUNTRY_NAME_OVERRIDES[regionCode]) {
    return COUNTRY_NAME_OVERRIDES[regionCode];
  }

  if (!regionDisplayNames || !/^[A-Z]{2}$/.test(regionCode)) {
    return "";
  }

  return regionDisplayNames.of(regionCode) ?? "";
};

export const buildPreparedCurrencyData = (currencies: Currency[]): PreparedCurrencyData => {
  const entries = currencies.map((currency) => {
    const countryName = getCountryName(currency);
    const searchableValue = normalizeSearchText(
      `${currency.code} ${currency.name} ${currency.symbol || ""} ${countryName} ${currency.flag}`,
    );

    return {
      currency,
      countryName,
      searchableValue,
    };
  });

  const byCode = new Map<string, PreparedCurrencyEntry>();
  entries.forEach((entry) => byCode.set(entry.currency.code, entry));

  const preparedData: PreparedCurrencyData = {
    entries,
    byCode,
  };
  return preparedData;
};

interface CurrenciesModalProps {
  colors: ThemeColors;
  visible: boolean;
  onClose: () => void;
  preparedCurrencyData: PreparedCurrencyData;
  onCurrenciesSelect: (currency: Currency) => void;
  pinnedCurrencyCodes: string[];
  recentCurrencyCodes: string[];
  onTogglePinCurrency: (currencyCode: string) => void;
  pinToggleDelayLongPressMs?: number;
}

interface CurrencyRowItemProps {
  currency: Currency;
  colors: ThemeColors;
  countryName: string;
  isPinned: boolean;
  onPressCurrency: (currency: Currency) => void;
  onLongPressCurrency: (currencyCode: string) => void;
  pinToggleDelayLongPressMs: number;
}

const CurrencyRowItemComponent: React.FC<CurrencyRowItemProps> = ({
  currency,
  colors,
  countryName,
  isPinned,
  onPressCurrency,
  onLongPressCurrency,
  pinToggleDelayLongPressMs,
}) => {
  const subtitle = [currency.name, currency.symbol || null, countryName || null]
    .filter(Boolean)
    .join(" | ");
  const rowBackgroundColor = isPinned ? `${Colors.accent}2F` : `${colors.gray[100]}CC`;

  return (
    <TouchableOpacity
      style={[
        styles.currencyItem,
        {
          borderColor: isPinned ? `${Colors.accent}84` : colors.gray[300],
          backgroundColor: rowBackgroundColor,
        },
      ]}
      onPress={() => onPressCurrency(currency)}
      onLongPress={() => onLongPressCurrency(currency.code)}
      delayLongPress={pinToggleDelayLongPressMs}
      testID={`currency-option-${currency.code}`}
    >
      <CountryFlag isoCode={currency.flag} size={25} style={styles.flagIcon} />
      <View style={styles.currencyInfo}>
        <CustomText variant="h5" fontWeight="medium" style={{ color: colors.text }}>
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
      {isPinned ? <Ionicons name="star" size={16} color={Colors.primary} /> : null}
    </TouchableOpacity>
  );
};

const CurrencyRowItem = CurrencyRowItemComponent;

const CurrenciesModalComponent = ({
  colors,
  visible,
  onClose,
  preparedCurrencyData,
  onCurrenciesSelect,
  pinnedCurrencyCodes,
  recentCurrencyCodes,
  onTogglePinCurrency,
  pinToggleDelayLongPressMs = DEFAULT_PIN_TOGGLE_DELAY_LONG_PRESS_MS,
}: CurrenciesModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const longPressCodeRef = useRef<string | null>(null);

  const normalizedPinnedCodes = [
    ...new Set(pinnedCurrencyCodes.map((code) => code.toUpperCase().trim())),
  ].filter((code) => code.length > 0);
  const normalizedRecentCodes = [
    ...new Set(recentCurrencyCodes.map((code) => code.toUpperCase().trim())),
  ].filter((code) => code.length > 0);
  const pinnedCodeSet = new Set(normalizedPinnedCodes);
  const recentIndexMap = new Map(normalizedRecentCodes.map((code, index) => [code, index]));
  const normalizedSearchTerm = visible ? normalizeSearchText(searchTerm) : "";
  const isSearching = normalizedSearchTerm.length > 0;

  const filteredCurrencies = !normalizedSearchTerm
    ? preparedCurrencyData.entries.map((entry) => entry.currency)
    : preparedCurrencyData.entries
        .filter((entry) => entry.searchableValue.includes(normalizedSearchTerm))
        .map((entry) => entry.currency);

  const pinnedCurrencies = normalizedPinnedCodes
    .map((code) => preparedCurrencyData.byCode.get(code)?.currency)
    .filter((currency): currency is Currency => Boolean(currency));

  const recentCurrencies = normalizedRecentCodes
    .map((code) => preparedCurrencyData.byCode.get(code)?.currency)
    .filter((currency): currency is Currency => {
      if (!currency) {
        return false;
      }
      return !pinnedCodeSet.has(currency.code);
    });

  const excludedCodes = new Set<string>([...normalizedPinnedCodes, ...normalizedRecentCodes]);
  const allCurrencies = preparedCurrencyData.entries
    .map((entry) => entry.currency)
    .filter((currency) => !excludedCodes.has(currency.code));

  const searchResults = [...filteredCurrencies].sort((first, second) => {
    const firstPinned = pinnedCodeSet.has(first.code);
    const secondPinned = pinnedCodeSet.has(second.code);
    if (firstPinned !== secondPinned) {
      return firstPinned ? -1 : 1;
    }

    const firstRecentIndex = recentIndexMap.get(first.code);
    const secondRecentIndex = recentIndexMap.get(second.code);
    if (typeof firstRecentIndex === "number" && typeof secondRecentIndex === "number") {
      return firstRecentIndex - secondRecentIndex;
    }
    if (typeof firstRecentIndex === "number") {
      return -1;
    }
    if (typeof secondRecentIndex === "number") {
      return 1;
    }

    return first.code.localeCompare(second.code);
  });

  const listData = visible ? (isSearching ? searchResults : allCurrencies) : [];

  const handleCurrencySelect = (currency: Currency) => {
    longPressCodeRef.current = null;
    onCurrenciesSelect(currency);
    setSearchTerm("");
  };

  const handleCurrencyItemLongPress = (currencyCode: string) => {
    longPressCodeRef.current = currencyCode;
    onTogglePinCurrency(currencyCode);
  };

  const handleCurrencyItemPress = (currency: Currency) => {
    if (longPressCodeRef.current === currency.code) {
      longPressCodeRef.current = null;
      return;
    }

    longPressCodeRef.current = null;
    handleCurrencySelect(currency);
  };

  const handleClose = () => {
    longPressCodeRef.current = null;
    setSearchTerm("");
    onClose();
  };

  const renderCurrencyRow = (currency: Currency) => {
    const isPinned = pinnedCodeSet.has(currency.code);
    const countryName = preparedCurrencyData.byCode.get(currency.code)?.countryName || "";

    return (
      <CurrencyRowItem
        currency={currency}
        colors={colors}
        countryName={countryName}
        isPinned={isPinned}
        onPressCurrency={handleCurrencyItemPress}
        onLongPressCurrency={handleCurrencyItemLongPress}
        pinToggleDelayLongPressMs={pinToggleDelayLongPressMs}
      />
    );
  };

  const renderCurrencyItem = ({ item }: LegendListRenderItemProps<Currency>) =>
    renderCurrencyRow(item);

  const renderSection = (title: string, items: Currency[]) => (
    <View style={styles.sectionContainer}>
      <CustomText variant="h6" fontWeight="semibold" style={{ color: colors.gray[500] }}>
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
  );

  const hasPinned = pinnedCurrencies.length > 0;
  const hasRecent = recentCurrencies.length > 0;

  let listHeaderComponent: React.ReactElement | null = null;
  if (!isSearching && (hasPinned || hasRecent)) {
    listHeaderComponent = (
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
  }

  let listEmptyComponent: React.ReactElement | null = null;
  if (isSearching && listData.length === 0) {
    listEmptyComponent = (
      <View style={styles.emptyState}>
        <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[400] }}>
          No currency found.
        </CustomText>
        <CustomText variant="tiny" fontWeight="medium" style={{ color: colors.gray[400] }}>
          Search by country, code, or symbol.
        </CustomText>
      </View>
    );
  }

  const renderItemSeparator = () => <View style={styles.currencyItemSeparator} />;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View
        style={[styles.modalOverlay, { backgroundColor: "rgba(0, 0, 0, 0.36)" }]}
        testID="currency-modal-overlay"
      >
        <View
          style={[styles.modalContent, { backgroundColor: colors.card }]}
          testID="currency-modal-content"
        >
          <View style={styles.header}>
            <CustomText variant="h4" fontWeight="bold" style={{ color: colors.text }}>
              Select Currency
            </CustomText>
            <TouchableOpacity onPress={handleClose} hitSlop={10} testID="currency-modal-close">
              <Ionicons name="close" size={Spacing.iconSize} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.searchContainer,
              {
                borderColor: colors.gray[300],
                backgroundColor: colors.gray[100],
              },
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
              testID="currency-modal-search-input"
            />
            {searchTerm ? (
              <TouchableOpacity
                onPress={() => setSearchTerm("")}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={Spacing.iconSize} color={colors.gray[400]} />
              </TouchableOpacity>
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
            showsVerticalScrollIndicator
            estimatedItemSize={CURRENCY_ROW_HEIGHT}
            drawDistance={220}
            recycleItems
          />
        </View>
      </View>
    </Modal>
  );
};

export default CurrenciesModalComponent;

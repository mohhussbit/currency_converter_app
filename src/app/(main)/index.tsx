import React, { useEffect, useRef, useState } from "react";

import { Alert, BackHandler, Platform, Share, ToastAndroid, View } from "react-native";

import Constants from "expo-constants";
import { Color, router, useFocusEffect, useLocalSearchParams } from "expo-router";

import Clipboard from "@react-native-clipboard/clipboard";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import CurrenciesModal, { buildPreparedCurrencyData } from "@/components/CurrenciesModal";
import CurrencyConverterHeader from "@/components/CurrencyConverterHeader";
import CurrencyKeypad from "@/components/CurrencyKeypad";
import CurrencyPanel from "@/components/CurrencyPanel";
import {
  DEBOUNCE_DELAY,
  DEFAULT_CODES,
  MAX_ACTIVE_INPUT_LENGTH,
  MAX_RECENT_CURRENCIES,
  MAX_ROWS,
  MIN_ROWS,
  RECENT_CURRENCY_CODES_KEY,
} from "@/constants/currencyConverter";
import { useTheme } from "@/context/ThemeContext";
import { Currency, fetchCurrencies, fetchGlobalExchangeRates } from "@/services/currencyService";
import { trackCurrencyCheckActivity } from "@/services/retentionReminderService";
import { getStoredValues, saveSecurely } from "@/store/storage";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import {
  areCodeListsEqual,
  evaluateExpression,
  formatExpressionDisplay,
  formatInput,
  formatNumber,
  isOperator,
  normalizeCodeList,
  normalizeCodes,
  parseStoredTimestamp,
  prependCurrencyCode,
  sanitizeAndLimitExpression,
} from "@/utils/currencyConverterUtils";
import { triggerHaptic } from "@/utils/haptics";

interface ConversionHistoryEntry {
  fromCurrency: string;
  toCurrency: string;
  fromFlag: string;
  toFlag: string;
  amount: string;
  convertedAmount: string;
  timestamp: number;
}

const LAST_AMOUNT_SAVE_DEBOUNCE_MS = 900;
const DUPLICATE_TRACKING_WINDOW_MS = 3000;
type IdleTaskHandle = number | ReturnType<typeof setTimeout>;

const idleCallbackScheduler = globalThis as typeof globalThis & {
  requestIdleCallback?: (callback: () => void) => IdleTaskHandle;
  cancelIdleCallback?: (handle: IdleTaskHandle) => void;
};

const scheduleIdleTask = (task: () => void): IdleTaskHandle => {
  if (typeof idleCallbackScheduler.requestIdleCallback === "function") {
    return idleCallbackScheduler.requestIdleCallback(task);
  }
  return setTimeout(task, 1);
};

const cancelIdleTask = (handle: IdleTaskHandle) => {
  if (typeof idleCallbackScheduler.cancelIdleCallback === "function") {
    idleCallbackScheduler.cancelIdleCallback(handle);
    return;
  }
  clearTimeout(handle);
};

const parseJsonWithFallback = <T,>(
  rawValue: string | null | undefined,
  fallback: T,
  errorMessage: string,
): T => {
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(errorMessage, error);
    return fallback;
  }
};

const fetchCurrencyDataSafely = async () => {
  try {
    const [fetchedCurrencies, fetchedRates] = await Promise.all([
      fetchCurrencies(),
      fetchGlobalExchangeRates(),
    ]);
    return { fetchedCurrencies, fetchedRates };
  } catch (error) {
    console.error("Error syncing currency data:", error);
    return {
      fetchedCurrencies: null as Currency[] | null,
      fetchedRates: null as Record<string, number> | null,
    };
  }
};

const getCachedConversionHistorySafely = (cacheRef: {
  current: ConversionHistoryEntry[] | null;
}): ConversionHistoryEntry[] => {
  if (cacheRef.current) {
    return cacheRef.current;
  }

  const storedHistory = getStoredValues(["conversionHistory"]);
  const parsedHistory = parseJsonWithFallback<unknown>(
    storedHistory.conversionHistory,
    [],
    "Error reading conversion history:",
  );
  cacheRef.current = Array.isArray(parsedHistory)
    ? (parsedHistory as ConversionHistoryEntry[])
    : [];
  return cacheRef.current;
};

const copyToClipboardSafely = async (value: string) => {
  try {
    if (Platform.OS === "web") {
      await navigator.clipboard.writeText(value);
    } else {
      Clipboard.setString(value);
    }
    return true;
  } catch (error) {
    console.error("Failed to copy field value:", error);
    return false;
  }
};

const CurrencyConverterScreen = () => {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const searchParams = useLocalSearchParams<{
    fromCurrency?: string;
    toCurrency?: string;
    amount?: string;
  }>();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [selectedCodes, setSelectedCodes] = useState<string[]>([...DEFAULT_CODES]);
  const [activeCode, setActiveCode] = useState<string>(DEFAULT_CODES[0]);
  const [expression, setExpression] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [favoriteCurrencyCodes, setFavoriteCurrencyCodes] = useState<string[]>([]);
  const [recentCurrencyCodes, setRecentCurrencyCodes] = useState<string[]>([]);

  const conversionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversionIdleTaskRef = useRef<IdleTaskHandle | null>(null);
  const deeplinkProcessedRef = useRef(false);
  const lastBackPressRef = useRef(0);
  const modalRowIndexRef = useRef<number | null>(null);
  const conversionHistoryCacheRef = useRef<ConversionHistoryEntry[] | null>(null);
  const lastTrackedConversionRef = useRef<{
    signature: string;
    timestamp: number;
  } | null>(null);

  const currenciesByCode = new Map<string, Currency>();
  currencies.forEach((currency) => currenciesByCode.set(currency.code, currency));
  const preparedCurrencyData = buildPreparedCurrencyData(currencies);

  const selectedCurrencies = selectedCodes
    .map((code) => currenciesByCode.get(code))
    .filter((currency): currency is Currency => Boolean(currency));

  const appName = Constants.expoConfig?.name || "ConverX - Currency Converter";

  const isCompactLayout = selectedCodes.length >= 4;

  useEffect(() => {
    const stored = getStoredValues([
      "currencies",
      "exchangeRates",
      "lastExchangeRatesFetch",
      "selectedCurrencyCodes",
      "activeCurrencyCode",
      "favoriteCurrencyCodes",
      RECENT_CURRENCY_CODES_KEY,
      "lastFromCurrency",
      "lastToCurrency",
      "lastAmount",
    ]);

    const parsedCurrencies = parseJsonWithFallback<Currency[]>(
      stored.currencies,
      [],
      "Error parsing stored currencies:",
    );
    if (parsedCurrencies.length > 0) {
      setCurrencies(parsedCurrencies);
    }

    const parsedExchangeRates = parseJsonWithFallback<Record<string, number>>(
      stored.exchangeRates,
      {},
      "Error parsing stored exchange rates:",
    );
    if (Object.keys(parsedExchangeRates).length > 0) {
      setExchangeRates(parsedExchangeRates);
    }

    if (stored.lastExchangeRatesFetch) {
      const stamp = Number(stored.lastExchangeRatesFetch);
      if (Number.isFinite(stamp)) {
        setLastUpdatedAt(stamp);
      }
    }

    let initialCodes: string[] = [...DEFAULT_CODES];
    const parsedSelectedCodes = parseJsonWithFallback<unknown>(
      stored.selectedCurrencyCodes,
      null,
      "Error parsing selected currency codes:",
    );
    if (Array.isArray(parsedSelectedCodes) && parsedSelectedCodes.length > 0) {
      initialCodes = parsedSelectedCodes.map((code) => String(code).toUpperCase());
    } else if (stored.lastFromCurrency || stored.lastToCurrency) {
      initialCodes = [
        stored.lastFromCurrency || DEFAULT_CODES[0],
        stored.lastToCurrency || DEFAULT_CODES[1],
      ];
    }

    const uniqueCodes = [...new Set(initialCodes)].slice(0, MAX_ROWS);
    if (uniqueCodes.length > 0) {
      setSelectedCodes(uniqueCodes);
      setActiveCode(uniqueCodes[0]);
    }

    if (stored.activeCurrencyCode) {
      setActiveCode(stored.activeCurrencyCode.toUpperCase());
    }

    const parsedFavoriteCurrencyCodes = parseJsonWithFallback<unknown>(
      stored.favoriteCurrencyCodes,
      [],
      "Error parsing favorite currencies:",
    );
    if (stored.favoriteCurrencyCodes) {
      setFavoriteCurrencyCodes(normalizeCodeList(parsedFavoriteCurrencyCodes));
    }

    const parsedRecentCurrencyCodes = parseJsonWithFallback<unknown>(
      stored[RECENT_CURRENCY_CODES_KEY],
      [],
      "Error parsing recent currencies:",
    );
    if (stored[RECENT_CURRENCY_CODES_KEY]) {
      setRecentCurrencyCodes(
        normalizeCodeList(parsedRecentCurrencyCodes).slice(0, MAX_RECENT_CURRENCIES),
      );
    }

    if (stored.lastAmount) {
      setExpression(sanitizeAndLimitExpression(stored.lastAmount));
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      const { fetchedCurrencies, fetchedRates } = await fetchCurrencyDataSafely();

      if (isCancelled) {
        return;
      }

      if (fetchedCurrencies && fetchedCurrencies.length > 0) {
        setCurrencies(fetchedCurrencies);
      }
      if (fetchedRates && Object.keys(fetchedRates).length > 0) {
        setExchangeRates(fetchedRates);

        const stored = getStoredValues(["lastExchangeRatesFetch"]);
        const lastFetchedAt = parseStoredTimestamp(stored.lastExchangeRatesFetch);
        if (lastFetchedAt) {
          setLastUpdatedAt(lastFetchedAt);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  useFocusEffect(() => {
    trackCurrencyCheckActivity().catch((error) => {
      console.error("Failed to track retention reminder activity:", error);
    });
  });

  useEffect(() => {
    if (!currencies.length) {
      return;
    }

    const normalized = normalizeCodes(selectedCodes, currencies);
    if (normalized.join(",") !== selectedCodes.join(",")) {
      setSelectedCodes(normalized);
      return;
    }

    if (!normalized.includes(activeCode)) {
      setActiveCode(normalized[0]);
    }
  }, [currencies, selectedCodes, activeCode]);

  useEffect(() => {
    if (!currencies.length) {
      return;
    }

    const availableCodes = new Set(currencies.map((currency) => currency.code));

    setFavoriteCurrencyCodes((previous) => {
      const next = previous.filter((code) => availableCodes.has(code));
      return areCodeListsEqual(previous, next) ? previous : next;
    });

    setRecentCurrencyCodes((previous) => {
      const next = previous
        .filter((code) => availableCodes.has(code))
        .slice(0, MAX_RECENT_CURRENCIES);
      return areCodeListsEqual(previous, next) ? previous : next;
    });
  }, [currencies]);

  useEffect(() => {
    if (!currencies.length || deeplinkProcessedRef.current) {
      return;
    }

    let nextCodes = [...selectedCodes];
    let nextExpression = expression;

    if (searchParams.fromCurrency) {
      const found = currencies.find(
        ({ code }) => code.toLowerCase() === searchParams.fromCurrency?.toLowerCase(),
      );
      if (found) {
        nextCodes[0] = found.code;
        setActiveCode(found.code);
      }
    }

    if (searchParams.toCurrency) {
      const found = currencies.find(
        ({ code }) => code.toLowerCase() === searchParams.toCurrency?.toLowerCase(),
      );
      if (found) {
        if (nextCodes.length < 2) {
          nextCodes.push(found.code);
        } else {
          nextCodes[1] = found.code;
        }
      }
    }

    if (searchParams.amount) {
      nextExpression = sanitizeAndLimitExpression(searchParams.amount);
    }

    setSelectedCodes(normalizeCodes(nextCodes, currencies));
    setExpression(sanitizeAndLimitExpression(nextExpression));
    deeplinkProcessedRef.current = true;
  }, [
    currencies,
    selectedCodes,
    expression,
    searchParams.fromCurrency,
    searchParams.toCurrency,
    searchParams.amount,
  ]);

  useEffect(() => {
    if (!selectedCodes.length) {
      return;
    }

    const values: { key: string; value: string }[] = [
      { key: "selectedCurrencyCodes", value: JSON.stringify(selectedCodes) },
      { key: "activeCurrencyCode", value: activeCode },
    ];

    if (selectedCodes[0]) {
      values.push({ key: "lastFromCurrency", value: selectedCodes[0] });
    }
    if (selectedCodes[1]) {
      values.push({ key: "lastToCurrency", value: selectedCodes[1] });
    }

    saveSecurely(values);
  }, [selectedCodes, activeCode]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      saveSecurely([{ key: "lastAmount", value: expression }]);
    }, LAST_AMOUNT_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [expression]);

  useEffect(() => {
    saveSecurely([
      {
        key: "favoriteCurrencyCodes",
        value: JSON.stringify([...new Set(favoriteCurrencyCodes)]),
      },
    ]);
  }, [favoriteCurrencyCodes]);

  useEffect(() => {
    saveSecurely([
      {
        key: RECENT_CURRENCY_CODES_KEY,
        value: JSON.stringify([...new Set(recentCurrencyCodes)]),
      },
    ]);
  }, [recentCurrencyCodes]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isModalVisible) {
        setIsModalVisible(false);
        modalRowIndexRef.current = null;
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      if (Platform.OS === "android") {
        ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
      }
      lastBackPressRef.current = now;
      return true;
    });
    return () => backHandler.remove();
  }, [isModalVisible]);

  const resolvedAmount = evaluateExpression(expression);

  const rowValues: Record<string, string> = {};
  const activeRate = exchangeRates[activeCode];

  selectedCurrencies.forEach((currency) => {
    if (currency.code === activeCode) {
      rowValues[currency.code] = expression;
      return;
    }

    if (resolvedAmount === null || !activeRate) {
      rowValues[currency.code] = "";
      return;
    }

    const targetRate = exchangeRates[currency.code];
    if (!targetRate) {
      rowValues[currency.code] = "";
      return;
    }

    rowValues[currency.code] = formatNumber(resolvedAmount * (targetRate / activeRate));
  });

  const activeExpressionDisplay = formatExpressionDisplay(expression);

  useEffect(() => {
    const localCurrenciesByCode = new Map<string, Currency>();
    currencies.forEach((currency) => localCurrenciesByCode.set(currency.code, currency));
    const localSelectedCurrencies = selectedCodes
      .map((code) => localCurrenciesByCode.get(code))
      .filter((currency): currency is Currency => Boolean(currency));

    const fromCurrency = localCurrenciesByCode.get(activeCode);
    const toCurrency =
      localSelectedCurrencies.find((currency) => currency.code !== activeCode) || null;

    if (!fromCurrency || !toCurrency || resolvedAmount === null) {
      return;
    }

    const fromRate = exchangeRates[fromCurrency.code];
    const toRate = exchangeRates[toCurrency.code];
    if (!fromRate || !toRate) {
      return;
    }

    if (conversionTimeoutRef.current) {
      clearTimeout(conversionTimeoutRef.current);
    }
    if (conversionIdleTaskRef.current !== null) {
      cancelIdleTask(conversionIdleTaskRef.current);
      conversionIdleTaskRef.current = null;
    }

    conversionTimeoutRef.current = setTimeout(() => {
      conversionIdleTaskRef.current = scheduleIdleTask(() => {
        void (async () => {
          const conversionRate = toRate / fromRate;
          const rawConverted = resolvedAmount * conversionRate;
          const hasValidPositiveAmounts = resolvedAmount > 0 && rawConverted > 0;
          if (!hasValidPositiveAmounts) {
            return;
          }

          const conversionSignature = [
            fromCurrency.code,
            toCurrency.code,
            resolvedAmount.toFixed(6),
            rawConverted.toFixed(6),
          ].join("|");
          const now = Date.now();
          const recentlyTracked = lastTrackedConversionRef.current;
          if (
            recentlyTracked &&
            recentlyTracked.signature === conversionSignature &&
            now - recentlyTracked.timestamp < DUPLICATE_TRACKING_WINDOW_MS
          ) {
            return;
          }
          lastTrackedConversionRef.current = {
            signature: conversionSignature,
            timestamp: now,
          };

          const history = getCachedConversionHistorySafely(conversionHistoryCacheRef);
          const updatedHistory = [
            {
              fromCurrency: fromCurrency.code,
              toCurrency: toCurrency.code,
              fromFlag: fromCurrency.flag,
              toFlag: toCurrency.flag,
              amount: formatNumber(resolvedAmount),
              convertedAmount: formatNumber(rawConverted),
              timestamp: Date.now(),
            },
            ...history,
          ].slice(0, 50);
          conversionHistoryCacheRef.current = updatedHistory;

          saveSecurely([
            { key: "conversionHistory", value: JSON.stringify(updatedHistory) },
            { key: "lastConvertedAmount", value: formatNumber(rawConverted) },
          ]);
        })();
      });
    }, DEBOUNCE_DELAY);

    return () => {
      if (conversionTimeoutRef.current) {
        clearTimeout(conversionTimeoutRef.current);
      }
      if (conversionIdleTaskRef.current !== null) {
        cancelIdleTask(conversionIdleTaskRef.current);
        conversionIdleTaskRef.current = null;
      }
    };
  }, [activeCode, currencies, selectedCodes, exchangeRates, resolvedAmount]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleCopyFieldValue = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      triggerHaptic("warning");
      showAlert("Nothing to copy", "This field is empty.");
      return;
    }

    const copySucceeded = await copyToClipboardSafely(trimmed);
    if (!copySucceeded) {
      triggerHaptic("error");
      showAlert("Copy failed", "Unable to copy value right now.");
      return;
    }

    if (Platform.OS === "android") {
      ToastAndroid.show("Value copied", ToastAndroid.SHORT);
    }
    triggerHaptic("success");
  };

  const handleToggleFavoriteCurrency = (currencyCode: string) => {
    setFavoriteCurrencyCodes((previous) => {
      const normalized = currencyCode.toUpperCase();
      return previous.includes(normalized)
        ? previous.filter((code) => code !== normalized)
        : [...previous, normalized];
    });
  };

  const handleKeyPress = (key: string) => {
    if (key === "C") {
      setExpression("");
      return;
    }

    if (key === "<") {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }

    if (key === "=" || key === "%") {
      setExpression((prevValue) => {
        const prev = sanitizeAndLimitExpression(prevValue);
        const evaluated = evaluateExpression(prev);
        if (evaluated === null) {
          return prev;
        }
        const nextValue = key === "=" ? formatInput(evaluated) : formatInput(evaluated / 100);
        return sanitizeAndLimitExpression(nextValue);
      });
      return;
    }

    setExpression((prevValue) => {
      const prev = sanitizeAndLimitExpression(prevValue);
      const withLimit = (nextValue: string) =>
        nextValue.length <= MAX_ACTIVE_INPUT_LENGTH ? nextValue : prev;

      if (key === ".") {
        const currentToken = prev.split(/[+\-*/]/).pop() || "";
        if (currentToken.includes(".")) {
          return prev;
        }
        if (!prev || isOperator(prev[prev.length - 1])) {
          return withLimit(`${prev}0.`);
        }
        return withLimit(`${prev}.`);
      }

      if (key === "+" || key === "-" || key === "x" || key === "/") {
        const operator = key === "x" ? "*" : key;
        if (!prev) {
          return operator === "-" ? operator : prev;
        }
        if (isOperator(prev[prev.length - 1])) {
          return withLimit(`${prev.slice(0, -1)}${operator}`);
        }
        if (prev.endsWith(".")) {
          return prev;
        }
        return withLimit(`${prev}${operator}`);
      }

      if (key === "00") {
        if (!prev || prev === "0") {
          return "0";
        }
        return withLimit(`${prev}00`);
      }

      if (prev === "0") {
        return withLimit(key);
      }

      return withLimit(`${prev}${key}`);
    });
  };

  const handleSelectRow = (code: string) => {
    if (code === activeCode) {
      return;
    }

    setActiveCode(code);
    setExpression(sanitizeAndLimitExpression((rowValues[code] || "").replace(/,/g, "")));
  };

  const handleRemoveRow = (index: number) => {
    const currentSelectedCodes = selectedCodes;
    if (currentSelectedCodes.length <= MIN_ROWS) {
      showAlert("At least two currencies", "Keep at least two rows.");
      return;
    }

    const removedCode = currentSelectedCodes[index];
    const nextCodes = currentSelectedCodes.filter((_, rowIndex) => rowIndex !== index);
    setSelectedCodes(nextCodes);

    if (removedCode === activeCode) {
      const nextActive = nextCodes[0];
      if (!nextActive) {
        return;
      }
      setActiveCode(nextActive);
      setExpression(sanitizeAndLimitExpression((rowValues[nextActive] || "").replace(/,/g, "")));
    }
  };

  const handleAddCurrency = () => {
    if (selectedCodes.length >= MAX_ROWS) {
      showAlert("Limit reached", `Maximum ${MAX_ROWS} currencies.`);
      return;
    }
    modalRowIndexRef.current = null;
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    modalRowIndexRef.current = null;
  };

  const handleOpenCurrencySelector = (index: number) => {
    modalRowIndexRef.current = index;
    setIsModalVisible(true);
  };

  const handleOpenSettings = () => {
    router.push("/settings");
  };

  const handleCurrencySelect = (currency: Currency) => {
    const code = currency.code.toUpperCase();
    const currentSelectedCodes = selectedCodes;
    const currentActiveCode = activeCode;
    const currentRowValues = rowValues;
    const modalRowIndex = modalRowIndexRef.current;

    if (modalRowIndex === null) {
      if (currentSelectedCodes.includes(code)) {
        setActiveCode(code);
        setExpression(sanitizeAndLimitExpression((currentRowValues[code] || "").replace(/,/g, "")));
        setRecentCurrencyCodes((previous) =>
          prependCurrencyCode(previous, code, MAX_RECENT_CURRENCIES),
        );
        closeModal();
        return;
      }
      setSelectedCodes((previous) => {
        if (previous.includes(code)) {
          return previous;
        }
        return [...previous, code].slice(0, MAX_ROWS);
      });
    } else {
      const duplicateIndex = currentSelectedCodes.indexOf(code);
      if (duplicateIndex !== -1 && duplicateIndex !== modalRowIndex) {
        showAlert("Currency exists", "Pick a different currency.");
        return;
      }
      setSelectedCodes((previous) => {
        const next = [...previous];
        next[modalRowIndex] = code;
        return next;
      });
      if (currentSelectedCodes[modalRowIndex] === currentActiveCode) {
        setActiveCode(code);
      }
    }

    setRecentCurrencyCodes((previous) =>
      prependCurrencyCode(previous, code, MAX_RECENT_CURRENCIES),
    );
    closeModal();
  };

  const handleShare = async () => {
    const currentActiveCode = activeCode;
    const currentAppName = appName;
    const currentResolvedAmount = resolvedAmount;
    const currentRowValues = rowValues;
    const currentSelectedCurrencies = selectedCurrencies;
    const webUrl = "https://converx.expo.app";
    const activeCurrency =
      currentSelectedCurrencies.find((currency) => currency.code === currentActiveCode) || null;

    if (!activeCurrency || currentResolvedAmount === null || currentSelectedCurrencies.length < 2) {
      const appMessage = `Try ${currentAppName} for fast currency conversion.\nWeb: ${webUrl}`;
      if (Platform.OS === "web") {
        navigator.share({ title: currentAppName, text: appMessage, url: webUrl });
      } else {
        Share.share({ title: currentAppName, message: appMessage, url: webUrl });
      }
      return;
    }

    const lines = currentSelectedCurrencies
      .filter((currency) => currency.code !== currentActiveCode)
      .map((currency) => `${currency.code}: ${currentRowValues[currency.code] || "N/A"}`)
      .join("\n");

    const message = `Currency Conversion\n\n${formatNumber(
      currentResolvedAmount,
    )} ${currentActiveCode}\n${lines}\n\nCalculated with ${currentAppName}\nWeb: ${webUrl}`;

    if (Platform.OS === "web") {
      navigator.share({ title: `${currentAppName} Result`, text: message }).catch(() => {
        navigator.clipboard
          .writeText(message)
          .then(() => showAlert("Copied", "Conversion copied to clipboard."))
          .catch(() => showAlert("Share", message));
      });
    } else {
      Share.share({ title: `${currentAppName} Result`, message, url: webUrl });
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: Color.android.dynamic.surface,
          paddingTop: top,
          paddingBottom: bottom,
        },
      ]}
    >
      <CurrencyConverterHeader onShare={handleShare} lastUpdatedAt={lastUpdatedAt} />

      <View style={styles.mainContent}>
        <CurrencyPanel
          colors={colors}
          isCompactLayout={isCompactLayout}
          activeCode={activeCode}
          selectedCodes={selectedCodes}
          selectedCurrencies={selectedCurrencies}
          rowValues={rowValues}
          activeExpressionDisplay={activeExpressionDisplay}
          favoriteCurrencyCodes={favoriteCurrencyCodes}
          onRemoveRow={handleRemoveRow}
          onToggleFavoriteCurrency={handleToggleFavoriteCurrency}
          onOpenCurrencySelector={handleOpenCurrencySelector}
          onSelectRow={handleSelectRow}
          onCopyFieldValue={handleCopyFieldValue}
          onAddCurrency={handleAddCurrency}
        />
        <CurrencyKeypad
          colors={colors}
          activeExpressionDisplay={activeExpressionDisplay}
          onKeyPress={handleKeyPress}
        />
      </View>

      <CurrenciesModal
        colors={colors}
        visible={isModalVisible}
        preparedCurrencyData={preparedCurrencyData}
        onClose={closeModal}
        onCurrenciesSelect={handleCurrencySelect}
        pinnedCurrencyCodes={favoriteCurrencyCodes}
        recentCurrencyCodes={recentCurrencyCodes}
        onTogglePinCurrency={handleToggleFavoriteCurrency}
        pinToggleDelayLongPressMs={260}
      />
    </View>
  );
};

export default CurrencyConverterScreen;

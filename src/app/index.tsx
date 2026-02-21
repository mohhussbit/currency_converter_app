import CurrenciesModal from "@/components/CurrenciesModal";
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
import {
  Currency,
  fetchCurrencies,
  fetchGlobalExchangeRates,
} from "@/services/currencyService";
import { getStoredValues, saveSecurely } from "@/store/storage";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import {
  areCodeListsEqual,
  evaluateExpression,
  formatExpressionDisplay,
  formatInput,
  formatLastUpdated,
  formatNumber,
  isOperator,
  normalizeCodeList,
  normalizeCodes,
  parseStoredTimestamp,
  prependCurrencyCode,
  sanitizeAndLimitExpression,
} from "@/utils/currencyConverterUtils";
import { triggerHaptic } from "@/utils/haptics";
import Clipboard from "@react-native-clipboard/clipboard";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  Share,
  ToastAndroid,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [modalRowIndex, setModalRowIndex] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [favoriteCurrencyCodes, setFavoriteCurrencyCodes] = useState<string[]>(
    []
  );
  const [recentCurrencyCodes, setRecentCurrencyCodes] = useState<string[]>([]);

  const conversionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversionIdleTaskRef = useRef<IdleTaskHandle | null>(null);
  const deeplinkProcessedRef = useRef(false);
  const lastBackPressRef = useRef(0);
  const selectedCodesRef = useRef<string[]>(selectedCodes);
  const activeCodeRef = useRef(activeCode);
  const rowValuesRef = useRef<Record<string, string>>({});
  const conversionHistoryCacheRef = useRef<ConversionHistoryEntry[] | null>(null);
  const lastTrackedConversionRef = useRef<{
    signature: string;
    timestamp: number;
  } | null>(null);
  const shareContextRef = useRef<{
    activeCode: string;
    appName: string;
    currenciesByCode: Map<string, Currency>;
    resolvedAmount: number | null;
    rowValues: Record<string, string>;
    selectedCurrencies: Currency[];
  }>({
    activeCode,
    appName: "",
    currenciesByCode: new Map<string, Currency>(),
    resolvedAmount: null,
    rowValues: {},
    selectedCurrencies: [],
  });

  const currenciesByCode = useMemo(() => {
    const map = new Map<string, Currency>();
    currencies.forEach((currency) => map.set(currency.code, currency));
    return map;
  }, [currencies]);

  const selectedCurrencies = useMemo(
    () =>
      selectedCodes
        .map((code) => currenciesByCode.get(code))
        .filter((currency): currency is Currency => Boolean(currency)),
    [selectedCodes, currenciesByCode]
  );
  selectedCodesRef.current = selectedCodes;
  activeCodeRef.current = activeCode;

  const appName = useMemo(
    () => Constants.expoConfig?.name || "ConverX - Currency Converter",
    []
  );
  const isCompactLayout = selectedCodes.length >= 4;

  const getCachedConversionHistory = useCallback((): ConversionHistoryEntry[] => {
    if (conversionHistoryCacheRef.current) {
      return conversionHistoryCacheRef.current;
    }

    try {
      const storedHistory = getStoredValues(["conversionHistory"]);
      if (!storedHistory.conversionHistory) {
        conversionHistoryCacheRef.current = [];
        return conversionHistoryCacheRef.current;
      }

      const parsed = JSON.parse(storedHistory.conversionHistory);
      conversionHistoryCacheRef.current = Array.isArray(parsed) ? parsed : [];
      return conversionHistoryCacheRef.current;
    } catch (error) {
      console.error("Error reading conversion history:", error);
      conversionHistoryCacheRef.current = [];
      return conversionHistoryCacheRef.current;
    }
  }, []);

  const syncCurrencyData = useCallback(
    async (isCancelled?: () => boolean) => {
      try {
        const [fetchedCurrencies, fetchedRates] = await Promise.all([
          fetchCurrencies(),
          fetchGlobalExchangeRates(),
        ]);

        if (isCancelled?.()) {
          return;
        }

        if (fetchedCurrencies?.length) {
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
      } catch (error) {
        console.error("Error syncing currency data:", error);
      }
    },
    []
  );

  useEffect(() => {
    try {
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

      if (stored.currencies) {
        setCurrencies(JSON.parse(stored.currencies));
      }

      if (stored.exchangeRates) {
        setExchangeRates(JSON.parse(stored.exchangeRates));
      }

      if (stored.lastExchangeRatesFetch) {
        const stamp = Number(stored.lastExchangeRatesFetch);
        if (Number.isFinite(stamp)) {
          setLastUpdatedAt(stamp);
        }
      }

      let initialCodes: string[] = [...DEFAULT_CODES];
      if (stored.selectedCurrencyCodes) {
        const parsed = JSON.parse(stored.selectedCurrencyCodes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialCodes = parsed.map((code) => String(code).toUpperCase());
        }
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

      if (stored.favoriteCurrencyCodes) {
        try {
          const parsed = JSON.parse(stored.favoriteCurrencyCodes);
          setFavoriteCurrencyCodes(normalizeCodeList(parsed));
        } catch (error) {
          console.error("Error parsing favorite currencies:", error);
        }
      }

      if (stored[RECENT_CURRENCY_CODES_KEY]) {
        try {
          const parsed = JSON.parse(stored[RECENT_CURRENCY_CODES_KEY]);
          setRecentCurrencyCodes(
            normalizeCodeList(parsed).slice(0, MAX_RECENT_CURRENCIES)
          );
        } catch (error) {
          console.error("Error parsing recent currencies:", error);
        }
      }

      if (stored.lastAmount) {
        setExpression(sanitizeAndLimitExpression(stored.lastAmount));
      }
    } catch (error) {
      console.error("Error loading stored values:", error);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      await syncCurrencyData(() => isCancelled);
    })();

    return () => {
      isCancelled = true;
    };
  }, [syncCurrencyData]);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

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
        ({ code }) => code.toLowerCase() === searchParams.fromCurrency?.toLowerCase()
      );
      if (found) {
        nextCodes[0] = found.code;
        setActiveCode(found.code);
      }
    }

    if (searchParams.toCurrency) {
      const found = currencies.find(
        ({ code }) => code.toLowerCase() === searchParams.toCurrency?.toLowerCase()
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
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
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
      }
    );
    return () => backHandler.remove();
  }, []);

  const resolvedAmount = useMemo(() => evaluateExpression(expression), [expression]);

  const rowValues = useMemo(() => {
    const values: Record<string, string> = {};
    const activeRate = exchangeRates[activeCode];

    selectedCurrencies.forEach((currency) => {
      if (currency.code === activeCode) {
        values[currency.code] = expression;
        return;
      }

      if (resolvedAmount === null || !activeRate) {
        values[currency.code] = "";
        return;
      }

      const targetRate = exchangeRates[currency.code];
      if (!targetRate) {
        values[currency.code] = "";
        return;
      }

      values[currency.code] = formatNumber(resolvedAmount * (targetRate / activeRate));
    });

    return values;
  }, [selectedCurrencies, exchangeRates, activeCode, expression, resolvedAmount]);

  const lastUpdatedLabel = useMemo(
    () => formatLastUpdated(lastUpdatedAt),
    [lastUpdatedAt, tick]
  );
  const activeExpressionDisplay = useMemo(
    () => formatExpressionDisplay(expression),
    [expression]
  );
  rowValuesRef.current = rowValues;
  shareContextRef.current = {
    activeCode,
    appName,
    currenciesByCode,
    resolvedAmount,
    rowValues,
    selectedCurrencies,
  };

  useEffect(() => {
    const fromCurrency = currenciesByCode.get(activeCode);
    const toCurrency =
      selectedCurrencies.find((currency) => currency.code !== activeCode) || null;

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
          try {
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

            const history = getCachedConversionHistory();
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
          } catch (error) {
            console.error("Error tracking conversion side effects:", error);
          }
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
  }, [
    activeCode,
    currenciesByCode,
    selectedCurrencies,
    exchangeRates,
    resolvedAmount,
    getCachedConversionHistory,
  ]);

  const showAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const handleCopyFieldValue = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        triggerHaptic("warning");
        showAlert("Nothing to copy", "This field is empty.");
        return;
      }

      try {
        if (Platform.OS === "web") {
          await navigator.clipboard.writeText(trimmed);
        } else {
          Clipboard.setString(trimmed);
        }

        if (Platform.OS === "android") {
          ToastAndroid.show("Value copied", ToastAndroid.SHORT);
        }
        triggerHaptic("success");
      } catch (error) {
        console.error("Failed to copy field value:", error);
        triggerHaptic("error");
        showAlert("Copy failed", "Unable to copy value right now.");
      }
    },
    [showAlert]
  );

  const handleToggleFavoriteCurrency = useCallback((currencyCode: string) => {
    setFavoriteCurrencyCodes((previous) => {
      const normalized = currencyCode.toUpperCase();
      return previous.includes(normalized)
        ? previous.filter((code) => code !== normalized)
        : [...previous, normalized];
    });
  }, []);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === "C") {
        setExpression("");
        return;
      }

      if (key === "<") {
        setExpression((prev) => prev.slice(0, -1));
        return;
      }

      if (key === "=") {
        if (resolvedAmount !== null) {
          setExpression(formatInput(resolvedAmount));
        }
        return;
      }

      if (key === "%") {
        if (resolvedAmount !== null) {
          setExpression(formatInput(resolvedAmount / 100));
        }
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
    },
    [resolvedAmount]
  );

  const handleSelectRow = useCallback(
    (code: string) => {
      if (code === activeCode) {
        return;
      }
      setActiveCode(code);
      setExpression(
        sanitizeAndLimitExpression((rowValues[code] || "").replace(/,/g, ""))
      );
    },
    [activeCode, rowValues]
  );

  const handleSwap = useCallback(() => {
    if (selectedCodes.length !== 2) {
      return;
    }

    const [firstCode, secondCode] = selectedCodes;
    const firstValue = (rowValues[firstCode] || "").replace(/,/g, "");
    const secondValue = (rowValues[secondCode] || "").replace(/,/g, "");

    setSelectedCodes([secondCode, firstCode]);

    if (activeCode === firstCode) {
      setActiveCode(secondCode);
      setExpression(sanitizeAndLimitExpression(secondValue));
    } else if (activeCode === secondCode) {
      setActiveCode(firstCode);
      setExpression(sanitizeAndLimitExpression(firstValue));
    }
  }, [selectedCodes, activeCode, rowValues]);

  const handleRemoveRow = useCallback(
    (index: number) => {
      if (selectedCodes.length <= MIN_ROWS) {
        showAlert("At least two currencies", "Keep at least two rows.");
        return;
      }

      const removedCode = selectedCodes[index];
      const nextCodes = selectedCodes.filter((_, rowIndex) => rowIndex !== index);
      setSelectedCodes(nextCodes);

      if (removedCode === activeCode) {
        const nextActive = nextCodes[0];
        setActiveCode(nextActive);
        setExpression(
          sanitizeAndLimitExpression((rowValues[nextActive] || "").replace(/,/g, ""))
        );
      }
    },
    [selectedCodes, activeCode, rowValues, showAlert]
  );

  const handleAddCurrency = useCallback(() => {
    if (selectedCodes.length >= MAX_ROWS) {
      showAlert("Limit reached", `Maximum ${MAX_ROWS} currencies.`);
      return;
    }
    setModalRowIndex(null);
    setIsModalVisible(true);
  }, [selectedCodes.length, showAlert]);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
    setModalRowIndex(null);
  }, []);

  const handleOpenCurrencySelector = useCallback((index: number) => {
    setModalRowIndex(index);
    setIsModalVisible(true);
  }, []);

  const handleOpenSettings = useCallback(() => {
    router.push("/settings");
  }, []);

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      const code = currency.code.toUpperCase();
      const currentSelectedCodes = selectedCodesRef.current;
      const currentActiveCode = activeCodeRef.current;
      const currentRowValues = rowValuesRef.current;

      if (modalRowIndex === null) {
        if (currentSelectedCodes.includes(code)) {
          setActiveCode(code);
          setExpression(
            sanitizeAndLimitExpression(
              (currentRowValues[code] || "").replace(/,/g, "")
            )
          );
          setRecentCurrencyCodes((previous) =>
            prependCurrencyCode(previous, code, MAX_RECENT_CURRENCIES)
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
        prependCurrencyCode(previous, code, MAX_RECENT_CURRENCIES)
      );
      closeModal();
    },
    [modalRowIndex, closeModal, showAlert]
  );

  const handleShare = useCallback(async () => {
    const {
      activeCode: currentActiveCode,
      appName: currentAppName,
      currenciesByCode: currentCurrenciesByCode,
      resolvedAmount: currentResolvedAmount,
      rowValues: currentRowValues,
      selectedCurrencies: currentSelectedCurrencies,
    } = shareContextRef.current;
    const webUrl = "https://convertly.expo.app";
    const activeCurrency = currentCurrenciesByCode.get(currentActiveCode);

    if (
      !activeCurrency ||
      currentResolvedAmount === null ||
      currentSelectedCurrencies.length < 2
    ) {
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
      currentResolvedAmount
    )} ${currentActiveCode}\n${lines}\n\nCalculated with ${currentAppName}\nWeb: ${webUrl}`;

    if (Platform.OS === "web") {
      navigator
        .share({ title: `${currentAppName} Result`, text: message })
        .catch(() => {
          navigator.clipboard
            .writeText(message)
            .then(() => showAlert("Copied", "Conversion copied to clipboard."))
            .catch(() => showAlert("Share", message));
        });
    } else {
      Share.share({ title: `${currentAppName} Result`, message, url: webUrl });
    }
  }, [showAlert]);

  const handleQuickMenu = useCallback(() => {
    if (Platform.OS === "web") {
      showAlert("Quick menu", "History and help are available from settings.");
      return;
    }
    Alert.alert("Quick menu", "Choose an action", [
      { text: "History", onPress: () => router.navigate("/history") },
      { text: "Help", onPress: () => router.navigate("/help") },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [showAlert]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: top + 10,
          paddingBottom: bottom + 8,
        },
      ]}
    >
      <CurrencyConverterHeader
        appName={appName}
        lastUpdatedLabel={lastUpdatedLabel}
        colors={colors}
        onShare={handleShare}
        onOpenSettings={handleOpenSettings}
      />

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
          onSwap={handleSwap}
          onQuickMenu={handleQuickMenu}
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
        visible={isModalVisible}
        currencies={currencies}
        onClose={closeModal}
        onCurrenciesSelect={handleCurrencySelect}
        pinnedCurrencyCodes={favoriteCurrencyCodes}
        recentCurrencyCodes={recentCurrencyCodes}
        onTogglePinCurrency={handleToggleFavoriteCurrency}
      />
    </View>
  );
};

export default CurrencyConverterScreen;

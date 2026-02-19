import AdminLoginModal from "@/components/AdminLoginModal";
import CurrenciesModal from "@/components/CurrenciesModal";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { useConversionBatching } from "@/hooks/useConversionBatching";
import { useVersion } from "@/hooks/useVersion";
import {
  Currency,
  fetchCurrencies,
  fetchGlobalExchangeRates,
  registerBackgroundTask,
} from "@/services/currencyService";
import { getStoredValues, saveSecurely } from "@/store/storage";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import { PushTokenManager } from "@/utils/pushTokenManager";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  Share,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import CountryFlag from "react-native-country-flag";
import {
  GestureEvent,
  PanGestureHandler,
  PanGestureHandlerEventPayload,
  State,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEBOUNCE_DELAY = 500;
const MIN_ROWS = 2;
const MAX_ROWS = 5;
const DEFAULT_CODES = ["USD", "KES"] as const;
const KEYPAD_ROWS = [
  ["C", "<", "%", "/"],
  ["7", "8", "9", "x"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["00", "0", ".", "="],
];

const formatNumber = (num: number): string =>
  num.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatInput = (num: number): string => {
  const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
  return `${rounded}`;
};

const isOperator = (value: string) =>
  value === "+" || value === "-" || value === "*" || value === "/";

const sanitizeAmount = (value: string) => {
  let next = value.replace(/[^0-9.]/g, "");
  const parts = next.split(".");
  if (parts.length > 2) {
    next = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  if (next.includes(".")) {
    const [whole, decimal] = next.split(".");
    next = `${whole}.${(decimal || "").slice(0, 3)}`;
  }
  return next;
};

const sanitizeExpression = (value: string) =>
  value
    .replace(/x/g, "*")
    .replace(/[^0-9+\-*/.]/g, "")
    .replace(/\/{2,}/g, "/");

const formatNumericToken = (token: string) => {
  if (token === "") {
    return "";
  }

  const [rawWhole = "", rawDecimal = ""] = token.split(".");
  const wholePart = rawWhole === "" ? "0" : rawWhole;
  const groupedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (token.endsWith(".")) {
    return `${groupedWhole}.`;
  }

  return token.includes(".") ? `${groupedWhole}.${rawDecimal}` : groupedWhole;
};

const formatExpressionDisplay = (rawValue: string) => {
  if (!rawValue) {
    return "0";
  }

  const expression = rawValue.replace(/\*/g, "x");
  const tokens = expression.split(/([+\-/x])/);

  return tokens
    .map((token) =>
      /^[0-9]*\.?[0-9]*$/.test(token) ? formatNumericToken(token) : token
    )
    .join("");
};

const evaluateExpression = (expression: string): number | null => {
  if (!expression) {
    return null;
  }

  let safeExpression = sanitizeExpression(expression);
  while (
    safeExpression.length &&
    (isOperator(safeExpression[safeExpression.length - 1]) ||
      safeExpression.endsWith("."))
  ) {
    safeExpression = safeExpression.slice(0, -1);
  }

  if (!safeExpression) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${safeExpression});`)();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

const normalizeCodes = (codes: string[], currencies: Currency[]) => {
  const available = new Set(currencies.map((currency) => currency.code));
  const unique = [...new Set(codes.map((code) => code.toUpperCase()))].filter(
    (code) => available.has(code)
  );
  const next = [...unique];

  for (const fallback of DEFAULT_CODES) {
    if (next.length >= MIN_ROWS) {
      break;
    }
    if (available.has(fallback) && !next.includes(fallback)) {
      next.push(fallback);
    }
  }

  if (next.length < MIN_ROWS) {
    for (const currency of currencies) {
      if (!next.includes(currency.code)) {
        next.push(currency.code);
      }
      if (next.length >= MIN_ROWS) {
        break;
      }
    }
  }

  return next.slice(0, MAX_ROWS);
};

const formatLastUpdated = (timestamp: number | null) => {
  if (!timestamp) {
    return "Last updated unavailable";
  }

  const diff = Date.now() - timestamp;
  if (diff < 60_000) {
    return "Last updated just now";
  }

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) {
    return `Last updated ${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Last updated ${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `Last updated ${days} day${days === 1 ? "" : "s"} ago`;
};

const CurrencyConverterScreen = () => {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const { getCachedDownloadUrl } = useVersion();
  const { addConversion } = useConversionBatching();
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
  const [lastBackPress, setLastBackPress] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const [secretSequence, setSecretSequence] = useState<string[]>([]);

  const conversionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deeplinkProcessedRef = useRef(false);

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

  const appName = useMemo(
    () => Constants.expoConfig?.name || "ConverX - Currency Converter",
    []
  );
  const isCompactLayout = selectedCodes.length === MAX_ROWS;

  useEffect(() => {
    try {
      const stored = getStoredValues([
        "currencies",
        "exchangeRates",
        "lastExchangeRatesFetch",
        "selectedCurrencyCodes",
        "activeCurrencyCode",
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

      if (stored.lastAmount) {
        setExpression(sanitizeAmount(stored.lastAmount));
      }
    } catch (error) {
      console.error("Error loading stored values:", error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const fetchedCurrencies = await fetchCurrencies();
      if (fetchedCurrencies) {
        setCurrencies(fetchedCurrencies);
      }

      const rates = await fetchGlobalExchangeRates();
      if (rates) {
        const now = Date.now();
        setExchangeRates(rates);
        setLastUpdatedAt(now);
        saveSecurely([{ key: "lastExchangeRatesFetch", value: `${now}` }]);
      }
    })();
  }, []);

  useEffect(() => {
    registerBackgroundTask();
  }, []);

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
      nextExpression = sanitizeAmount(searchParams.amount);
    }

    setSelectedCodes(normalizeCodes(nextCodes, currencies));
    setExpression(nextExpression);
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
      { key: "lastAmount", value: expression },
    ];

    if (selectedCodes[0]) {
      values.push({ key: "lastFromCurrency", value: selectedCodes[0] });
    }
    if (selectedCodes[1]) {
      values.push({ key: "lastToCurrency", value: selectedCodes[1] });
    }

    saveSecurely(values);
  }, [selectedCodes, activeCode, expression]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          BackHandler.exitApp();
          return true;
        }
        if (Platform.OS === "android") {
          ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        }
        setLastBackPress(now);
        return true;
      }
    );
    return () => backHandler.remove();
  }, [lastBackPress]);

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

    conversionTimeoutRef.current = setTimeout(async () => {
      const conversionRate = toRate / fromRate;
      const rawConverted = resolvedAmount * conversionRate;

      const { deviceId, deviceInfo } =
        await PushTokenManager.initializeDeviceTracking();

      addConversion({
        deviceId,
        deviceInfo,
        fromCurrency: fromCurrency.code,
        toCurrency: toCurrency.code,
        originalAmount: resolvedAmount,
        convertedAmount: rawConverted,
        exchangeRate: conversionRate,
        fromRate,
        toRate,
        fromFlag: fromCurrency.flag,
        toFlag: toCurrency.flag,
        formattedAmount: formatNumber(resolvedAmount),
        formattedConverted: formatNumber(rawConverted),
        timestamp: new Date().toISOString(),
      });

      const storedHistory = getStoredValues(["conversionHistory"]);
      const history = storedHistory.conversionHistory
        ? JSON.parse(storedHistory.conversionHistory)
        : [];

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

      saveSecurely([
        { key: "conversionHistory", value: JSON.stringify(updatedHistory) },
        { key: "lastConvertedAmount", value: formatNumber(rawConverted) },
      ]);
    }, DEBOUNCE_DELAY);

    return () => {
      if (conversionTimeoutRef.current) {
        clearTimeout(conversionTimeoutRef.current);
      }
    };
  }, [
    activeCode,
    currenciesByCode,
    selectedCurrencies,
    exchangeRates,
    resolvedAmount,
    addConversion,
  ]);

  const showAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
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
        const prev = sanitizeExpression(prevValue);

        if (key === ".") {
          const currentToken = prev.split(/[+\-*/]/).pop() || "";
          if (currentToken.includes(".")) {
            return prev;
          }
          if (!prev || isOperator(prev[prev.length - 1])) {
            return `${prev}0.`;
          }
          return `${prev}.`;
        }

        if (key === "+" || key === "-" || key === "x" || key === "/") {
          const operator = key === "x" ? "*" : key;
          if (!prev) {
            return operator === "-" ? operator : prev;
          }
          if (isOperator(prev[prev.length - 1])) {
            return `${prev.slice(0, -1)}${operator}`;
          }
          if (prev.endsWith(".")) {
            return prev;
          }
          return `${prev}${operator}`;
        }

        if (key === "00") {
          if (!prev || prev === "0") {
            return "0";
          }
          return `${prev}00`;
        }

        if (prev === "0") {
          return key;
        }

        return `${prev}${key}`;
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
      setExpression((rowValues[code] || "").replace(/,/g, ""));
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
      setExpression(secondValue);
    } else if (activeCode === secondCode) {
      setActiveCode(firstCode);
      setExpression(firstValue);
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
        setExpression((rowValues[nextActive] || "").replace(/,/g, ""));
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

  const handleCurrencySelect = useCallback(
    (currency: Currency) => {
      const code = currency.code.toUpperCase();

      if (modalRowIndex === null) {
        if (selectedCodes.includes(code)) {
          setActiveCode(code);
          setExpression((rowValues[code] || "").replace(/,/g, ""));
          closeModal();
          return;
        }
        setSelectedCodes((prev) => [...prev, code].slice(0, MAX_ROWS));
      } else {
        const duplicateIndex = selectedCodes.indexOf(code);
        if (duplicateIndex !== -1 && duplicateIndex !== modalRowIndex) {
          showAlert("Currency exists", "Pick a different currency.");
          return;
        }
        setSelectedCodes((prev) => {
          const next = [...prev];
          next[modalRowIndex] = code;
          return next;
        });
        if (selectedCodes[modalRowIndex] === activeCode) {
          setActiveCode(code);
        }
      }

      closeModal();
    },
    [
      modalRowIndex,
      selectedCodes,
      activeCode,
      rowValues,
      closeModal,
      showAlert,
    ]
  );

  const handleShare = useCallback(async () => {
    const webUrl = "https://convertly.expo.app";
    const downloadUrl = await getCachedDownloadUrl();
    const activeCurrency = currenciesByCode.get(activeCode);

    if (!activeCurrency || resolvedAmount === null || selectedCurrencies.length < 2) {
      const appMessage = `Try ${appName} for fast currency conversion.\nWeb: ${webUrl}\nDownload: ${downloadUrl}`;
      if (Platform.OS === "web") {
        navigator.share({ title: appName, text: appMessage, url: webUrl });
      } else {
        Share.share({ title: appName, message: appMessage, url: webUrl });
      }
      return;
    }

    const lines = selectedCurrencies
      .filter((currency) => currency.code !== activeCode)
      .map((currency) => `${currency.code}: ${rowValues[currency.code] || "N/A"}`)
      .join("\n");

    const message = `Currency Conversion\n\n${formatNumber(
      resolvedAmount
    )} ${activeCode}\n${lines}\n\nCalculated with ${appName}\nWeb: ${webUrl}\nDownload: ${downloadUrl}`;

    if (Platform.OS === "web") {
      navigator
        .share({ title: `${appName} Result`, text: message })
        .catch(() => {
          navigator.clipboard
            .writeText(message)
            .then(() => showAlert("Copied", "Conversion copied to clipboard."))
            .catch(() => showAlert("Share", message));
        });
    } else {
      Share.share({ title: `${appName} Result`, message, url: webUrl });
    }
  }, [
    getCachedDownloadUrl,
    appName,
    currenciesByCode,
    activeCode,
    resolvedAmount,
    selectedCurrencies,
    rowValues,
    showAlert,
  ]);

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

  const handleGesture = useCallback(
    ({ nativeEvent }: GestureEvent<PanGestureHandlerEventPayload>) => {
      if (nativeEvent.state !== State.END) {
        return;
      }

      const { translationX, translationY } = nativeEvent;
      let direction = "";

      if (Math.abs(translationX) > Math.abs(translationY)) {
        direction = translationX > 0 ? "right" : "left";
      } else {
        direction = translationY > 0 ? "down" : "up";
      }

      const nextSequence = [...secretSequence, direction].slice(-5);
      setSecretSequence(nextSequence);

      if (nextSequence.join(" ") === "up up down left right") {
        setSecretSequence([]);
        setIsAdminModalVisible(true);
      }
    },
    [secretSequence]
  );

  return (
    <PanGestureHandler onHandlerStateChange={handleGesture}>
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
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <CustomText variant={isCompactLayout ? "h4" : "h3"} fontWeight="bold">
              {appName}
            </CustomText>
            <CustomText
              variant="h6"
              fontWeight="medium"
              style={{ color: colors.gray[400] }}
            >
              {lastUpdatedLabel}
            </CustomText>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.8} hitSlop={10}>
              <Ionicons
                name="share-social-outline"
                size={Spacing.iconSize}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              activeOpacity={0.8}
              hitSlop={10}
            >
              <Ionicons
                name="settings-outline"
                size={Spacing.iconSize}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mainContent}>
          <View
            style={[
              styles.currencyPanel,
              isCompactLayout && styles.currencyPanelCompact,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
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
                <TouchableOpacity onPress={handleSwap} activeOpacity={0.8} hitSlop={8}>
                  <Ionicons
                    name="swap-vertical-outline"
                    size={Spacing.iconSize}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={handleQuickMenu} activeOpacity={0.8} hitSlop={8}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={Spacing.iconSize}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.currencyRows}>
            {selectedCurrencies.map((currency, index) => {
              const isActive = currency.code === activeCode;
              const value = rowValues[currency.code];
              const displayValue = isActive ? activeExpressionDisplay : value;
              const valueTextColor = isActive
                ? Colors.white
                : displayValue
                ? colors.text
                : colors.gray[400];

              return (
                <View
                  key={currency.code}
                  style={[
                    styles.currencyRow,
                    isCompactLayout && styles.currencyRowCompact,
                    {
                      borderColor: isActive ? Colors.primary : colors.gray[300],
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.currencyCodeButton,
                      isCompactLayout && styles.currencyCodeButtonCompact,
                    ]}
                    onPress={() => {
                      setModalRowIndex(index);
                      setIsModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <CountryFlag
                      isoCode={currency.flag}
                      size={isCompactLayout ? 20 : Spacing.flagIconSize}
                      style={styles.flagIcon}
                    />
                    <CustomText variant={isCompactLayout ? "h6" : "h5"} fontWeight="semibold">
                      {currency.code}
                    </CustomText>
                    <Ionicons
                      name="chevron-down"
                      size={isCompactLayout ? 14 : 16}
                      color={colors.gray[500]}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.valueFieldButton,
                      isCompactLayout && styles.valueFieldButtonCompact,
                      {
                        borderColor: isActive ? Colors.primary : colors.gray[300],
                        backgroundColor: isActive ? Colors.primary : colors.gray[100],
                      },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => handleSelectRow(currency.code)}
                  >
                    <CustomText
                      variant={isCompactLayout ? "h6" : "h5"}
                      fontWeight={isActive ? "semibold" : "medium"}
                      numberOfLines={1}
                      style={{ color: valueTextColor }}
                    >
                      {displayValue || (isActive ? "0" : "-")}
                    </CustomText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.removeButton,
                      isCompactLayout && styles.removeButtonCompact,
                    ]}
                    onPress={() => handleRemoveRow(index)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close"
                      size={isCompactLayout ? 16 : Spacing.iconSize}
                      color={colors.gray[500]}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {selectedCodes.length < MAX_ROWS ? (
            <TouchableOpacity
              style={[
                styles.addCurrencyButton,
                isCompactLayout && styles.addCurrencyButtonCompact,
                { borderColor: colors.gray[300] },
              ]}
              onPress={handleAddCurrency}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={Colors.primary} />
              <CustomText
                variant="h6"
                fontWeight="medium"
                style={{ color: Colors.primary }}
              >
                Add Currency ({selectedCodes.length}/{MAX_ROWS})
              </CustomText>
            </TouchableOpacity>
          ) : null}
        </View>

          <View
            style={[
              styles.keypadContainer,
              isCompactLayout && styles.keypadContainerCompact,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
          <CustomText
            variant={isCompactLayout ? "h7" : "tiny"}
            fontWeight="medium"
            style={[styles.pendingOperationText, { color: colors.gray[400] }]}
          >
            {activeExpressionDisplay}
          </CustomText>

          {KEYPAD_ROWS.map((row, rowIndex) => (
            <View
              key={`row-${rowIndex}`}
              style={[styles.keypadRow, isCompactLayout && styles.keypadRowCompact]}
            >
              {row.map((key) => {
                const isAction = key === "C" || key === "=";
                const isOperatorKey = key === "+" || key === "-" || key === "x" || key === "/";

                return (
                  <TouchableOpacity
                    key={`${rowIndex}-${key}`}
                    style={[
                      styles.keypadButton,
                      isCompactLayout && styles.keypadButtonCompact,
                      { borderColor: colors.gray[300], backgroundColor: colors.gray[100] },
                      isOperatorKey && styles.operatorKey,
                      isAction && styles.actionKey,
                    ]}
                    onPress={() => handleKeyPress(key)}
                    activeOpacity={0.85}
                  >
                    <CustomText
                      variant={isCompactLayout ? "h6" : "h5"}
                      fontWeight="semibold"
                      style={{
                        color: isOperatorKey ? Colors.white : colors.text,
                      }}
                    >
                      {key}
                    </CustomText>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          </View>
        </View>

        <CurrenciesModal
          visible={isModalVisible}
          currencies={currencies}
          onClose={closeModal}
          onCurrenciesSelect={handleCurrencySelect}
        />
        <AdminLoginModal
          visible={isAdminModalVisible}
          onClose={() => setIsAdminModalVisible(false)}
        />
      </View>
    </PanGestureHandler>
  );
};

export default CurrencyConverterScreen;

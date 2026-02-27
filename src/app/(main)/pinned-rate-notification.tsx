import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import CountryFlag from "react-native-country-flag";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CurrenciesModal from "@/components/CurrenciesModal";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import type { Currency } from "@/services/currencyService";
import { fetchCurrencies } from "@/services/currencyService";
import {
  disablePinnedRateNotification,
  enablePinnedRateNotification,
  getPinnedRateNotificationConfig,
  getPinnedRateTrendLabel,
  type PinnedRateNotificationConfig,
  refreshPinnedRateNotificationNow,
} from "@/services/pinnedRateNotificationService";
import { styles } from "@/styles/screens/PinnedRateNotificationScreen.styles";
import { triggerHaptic } from "@/utils/haptics";

type PickerTarget = "base" | "quote" | null;

const pad2 = (value: number) => `${value}`.padStart(2, "0");

const clampInteger = (raw: string, min: number, max: number, fallback: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const formatNumber = (value: number) => {
  const absolute = Math.abs(value);
  const maximumFractionDigits = absolute >= 1000 ? 0 : absolute >= 10 ? 2 : 4;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
};

const fetchPinnedCurrenciesSafely = async () => {
  try {
    const fetched = await fetchCurrencies();
    return fetched || [];
  } catch (error) {
    console.error("Failed to load currencies for pinned notifications:", error);
    return [] as Currency[];
  }
};

const enablePinnedRateNotificationSafely = async (config: PinnedRateNotificationConfig) => {
  try {
    const result = await enablePinnedRateNotification(config);
    return { result, error: null as unknown | null };
  } catch (error) {
    console.error("Failed to enable pinned rate notification:", error);
    return { result: null, error };
  }
};

const refreshPinnedRateNotificationSafely = async () => {
  try {
    const result = await refreshPinnedRateNotificationNow();
    return { result, error: null as unknown | null };
  } catch (error) {
    console.error("Failed to refresh pinned notification:", error);
    return { result: null, error };
  }
};

const disablePinnedRateNotificationSafely = async () => {
  try {
    const nextConfig = await disablePinnedRateNotification();
    return { nextConfig, error: null as unknown | null };
  } catch (error) {
    console.error("Failed to disable pinned notification:", error);
    return { nextConfig: null as PinnedRateNotificationConfig | null, error };
  }
};

const PinnedRateNotificationScreen = () => {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();

  const [config, setConfig] = useState<PinnedRateNotificationConfig>(() =>
    getPinnedRateNotificationConfig(),
  );
  const [amountInput, setAmountInput] = useState("");
  const [hourInput, setHourInput] = useState("");
  const [minuteInput, setMinuteInput] = useState("");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  useEffect(() => {
    setAmountInput(`${config.amount}`);
    setHourInput(pad2(config.refreshHour));
    setMinuteInput(pad2(config.refreshMinute));
  }, [config.amount, config.refreshHour, config.refreshMinute]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      router.back();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      const nextCurrencies = await fetchPinnedCurrenciesSafely();
      if (isCancelled) {
        return;
      }

      setCurrencies(nextCurrencies);

      if (nextCurrencies.length) {
        const availableCodes = new Set(nextCurrencies.map((currency) => currency.code));
        setConfig((previous) => {
          let baseCode = previous.baseCurrencyCode;
          let quoteCode = previous.quoteCurrencyCode;

          if (!availableCodes.has(baseCode)) {
            baseCode = nextCurrencies[0].code;
          }
          if (!availableCodes.has(quoteCode) || quoteCode === baseCode) {
            const fallbackQuote =
              nextCurrencies.find((currency) => currency.code !== baseCode)?.code || baseCode;
            quoteCode = fallbackQuote;
          }

          if (baseCode === previous.baseCurrencyCode && quoteCode === previous.quoteCurrencyCode) {
            return previous;
          }

          return {
            ...previous,
            baseCurrencyCode: baseCode,
            quoteCurrencyCode: quoteCode,
          };
        });
      }

      if (!isCancelled) {
        setIsLoadingCurrencies(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  const currenciesByCode = new Map(currencies.map((currency) => [currency.code, currency]));
  const baseCurrency = currenciesByCode.get(config.baseCurrencyCode) || null;
  const quoteCurrency = currenciesByCode.get(config.quoteCurrencyCode) || null;
  const emptyCurrencyCodes: string[] = [];
  const handleNoopTogglePin = () => undefined;
  const handleBack = () => {
    router.back();
  };
  const handleClosePicker = () => {
    setPickerTarget(null);
  };

  const latestConvertedAmount =
    config.lastRate && Number.isFinite(config.lastRate) && config.lastRate > 0
      ? config.amount * config.lastRate
      : null;

  const trendLabel = getPinnedRateTrendLabel(
    config.lastTrendDirection || "none",
    config.lastTrendPercent,
  );

  const latestUpdatedLabel = config.lastUpdatedAt
    ? new Date(config.lastUpdatedAt).toLocaleString()
    : "No daily update captured yet.";

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleChangeAmount = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const dots = sanitized.match(/\./g)?.length || 0;
    if (dots > 1) {
      return;
    }
    setAmountInput(sanitized);
  };

  const commitHourInput = () => {
    const fallback = config.refreshHour;
    const clamped = clampInteger(hourInput, 0, 23, fallback);
    setHourInput(pad2(clamped));
  };

  const commitMinuteInput = () => {
    const fallback = config.refreshMinute;
    const clamped = clampInteger(minuteInput, 0, 59, fallback);
    setMinuteInput(pad2(clamped));
  };

  const handleSelectCurrency = (currency: Currency) => {
    setConfig((previous) => {
      if (pickerTarget === "base") {
        if (currency.code === previous.quoteCurrencyCode) {
          return {
            ...previous,
            baseCurrencyCode: currency.code,
            quoteCurrencyCode: previous.baseCurrencyCode,
          };
        }
        return { ...previous, baseCurrencyCode: currency.code };
      }

      if (pickerTarget === "quote") {
        if (currency.code === previous.baseCurrencyCode) {
          return {
            ...previous,
            quoteCurrencyCode: currency.code,
            baseCurrencyCode: previous.quoteCurrencyCode,
          };
        }
        return { ...previous, quoteCurrencyCode: currency.code };
      }

      return previous;
    });
  };

  const parseDraftConfig = () => {
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        error: "Amount must be a positive number.",
      };
    }

    const refreshHour = clampInteger(hourInput, 0, 23, config.refreshHour);
    const refreshMinute = clampInteger(minuteInput, 0, 59, config.refreshMinute);

    if (config.baseCurrencyCode === config.quoteCurrencyCode) {
      return {
        error: "Choose two different currencies.",
      };
    }

    return {
      value: {
        ...config,
        amount,
        refreshHour,
        refreshMinute,
      },
    };
  };

  const handleEnableOrUpdate = async () => {
    if (Platform.OS === "web") {
      showAlert(
        "Not available on web",
        "Pinned notifications require an Android or iOS app build.",
      );
      return;
    }

    const parsed = parseDraftConfig();
    if (!parsed.value) {
      triggerHaptic("warning");
      showAlert("Invalid settings", parsed.error || "Please fix the fields.");
      return;
    }

    setIsSaving(true);
    const { result } = await enablePinnedRateNotificationSafely(parsed.value);
    setIsSaving(false);

    if (!result) {
      triggerHaptic("error");
      showAlert("Error", "Failed to configure pinned notification.");
      return;
    }

    setConfig(result.config);
    if (result.success) {
      triggerHaptic("success");
    } else {
      triggerHaptic("warning");
    }

    const summaryLine = result.summary ? `\n\n${result.summary.title}` : "";
    showAlert(
      result.success ? "Pinned notification active" : "Setup pending",
      `${result.message}${summaryLine}`,
    );
  };

  const handleRefreshNow = async () => {
    if (Platform.OS === "web") {
      showAlert(
        "Not available on web",
        "Pinned notifications require an Android or iOS app build.",
      );
      return;
    }

    setIsRefreshing(true);
    const { result } = await refreshPinnedRateNotificationSafely();
    setIsRefreshing(false);

    if (!result) {
      triggerHaptic("error");
      showAlert("Error", "Failed to refresh pinned notification.");
      return;
    }

    setConfig(result.config);
    if (result.success) {
      triggerHaptic("success");
    } else {
      triggerHaptic("warning");
    }

    const summaryLine = result.summary ? `\n\n${result.summary.title}` : "";
    showAlert(
      result.success ? "Pinned notification refreshed" : "Refresh skipped",
      `${result.message}${summaryLine}`,
    );
  };

  const handleDisable = async () => {
    setIsSaving(true);
    const { nextConfig } = await disablePinnedRateNotificationSafely();
    setIsSaving(false);

    if (!nextConfig) {
      triggerHaptic("error");
      showAlert("Error", "Failed to disable pinned notification.");
      return;
    }

    setConfig(nextConfig);
    triggerHaptic("warning");
    showAlert("Pinned notification disabled", "Daily pinned tracking was turned off.");
  };

  const renderCurrencyButton = (
    type: Exclude<PickerTarget, null>,
    label: string,
    currency: Currency | null,
  ) => (
    <View style={{ gap: Spacing.xs }}>
      <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
        {label}
      </CustomText>
      <TouchableOpacity
        style={[
          styles.currencyButton,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
        onPress={() => setPickerTarget(type)}
        activeOpacity={0.85}
        testID={`pinned-currency-button-${type}`}
      >
        <View style={styles.currencyButtonLeft}>
          {currency?.flag ? (
            <CountryFlag isoCode={currency.flag} size={24} style={styles.flagIcon} />
          ) : (
            <View
              style={[
                styles.flagIcon,
                {
                  backgroundColor: colors.gray[200],
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            />
          )}
          <View style={styles.currencyButtonText}>
            <CustomText variant="h5" fontWeight="semibold" style={{ color: colors.text }}>
              {currency?.code || "Select"}
            </CustomText>
            <CustomText variant="h7" fontWeight="medium" style={{ color: colors.gray[500] }}>
              {currency?.name || "Tap to choose currency"}
            </CustomText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray[500]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <View style={[styles.header, { paddingTop: top + 10 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} hitSlop={10} testID="pinned-back-button">
            <Ionicons name="arrow-back" size={Spacing.iconSize} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <CustomText variant="h4" fontWeight="bold" style={{ color: colors.text }}>
          Pinned Rate Alert
        </CustomText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + 12 }]}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.statusRow}>
            <CustomText variant="h5" fontWeight="semibold">
              Daily sticky tracker
            </CustomText>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: config.enabled ? `${Colors.primary}20` : colors.gray[200],
                },
              ]}
            >
              <CustomText
                variant="tiny"
                fontWeight="semibold"
                style={{
                  color: config.enabled ? Colors.primary : colors.gray[500],
                }}
              >
                {config.enabled ? "ON" : "OFF"}
              </CustomText>
            </View>
          </View>
          <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
            Keep one detailed currency conversion pinned in notifications, refreshed daily with
            increase/decrease trend.
          </CustomText>
          {Platform.OS === "web" && (
            <CustomText variant="h6" fontWeight="medium" style={{ color: Colors.primary }}>
              This feature requires Android or iOS app builds.
            </CustomText>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <CustomText variant="h5" fontWeight="semibold">
              Pair and amount
            </CustomText>
          </View>

          {renderCurrencyButton("base", "From currency", baseCurrency)}
          {renderCurrencyButton("quote", "To currency", quoteCurrency)}

          <View style={{ gap: Spacing.xs }}>
            <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
              Amount to track
            </CustomText>
            <TextInput
              value={amountInput}
              onChangeText={handleChangeAmount}
              placeholder="100"
              keyboardType="decimal-pad"
              style={[
                styles.amountInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              placeholderTextColor={colors.gray[500]}
              maxLength={20}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <CustomText variant="h5" fontWeight="semibold">
              Daily refresh time
            </CustomText>
            <CustomText variant="h7" fontWeight="medium" style={{ color: colors.gray[500] }}>
              Best effort. The operating system controls exact background timing.
            </CustomText>
          </View>

          <View style={styles.timeRow}>
            <TextInput
              value={hourInput}
              onChangeText={setHourInput}
              onBlur={commitHourInput}
              keyboardType="number-pad"
              style={[
                styles.timeInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              maxLength={2}
            />
            <CustomText variant="h5" fontWeight="semibold">
              :
            </CustomText>
            <TextInput
              value={minuteInput}
              onChangeText={setMinuteInput}
              onBlur={commitMinuteInput}
              keyboardType="number-pad"
              style={[
                styles.timeInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              maxLength={2}
            />
            <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
              24-hour local time
            </CustomText>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <CustomText variant="h5" fontWeight="semibold">
              Latest snapshot
            </CustomText>
            <CustomText variant="h7" fontWeight="medium" style={{ color: colors.gray[500] }}>
              {latestUpdatedLabel}
            </CustomText>
          </View>

          {latestConvertedAmount !== null && config.lastRate ? (
            <>
              <CustomText variant="h4" fontWeight="bold" style={{ color: Colors.primary }}>
                {formatNumber(config.amount)} {config.baseCurrencyCode} ={" "}
                {formatNumber(latestConvertedAmount)} {config.quoteCurrencyCode}
              </CustomText>
              <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
                1 {config.baseCurrencyCode} = {formatNumber(config.lastRate)}{" "}
                {config.quoteCurrencyCode}
              </CustomText>
            </>
          ) : (
            <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
              No rate captured yet. Enable and refresh once to initialize.
            </CustomText>
          )}

          <CustomText variant="h6" fontWeight="medium" style={{ color: colors.text }}>
            {trendLabel}
          </CustomText>

          <CustomText variant="tiny" fontWeight="medium" style={{ color: colors.gray[500] }}>
            Daily target: {pad2(config.refreshHour)}:{pad2(config.refreshMinute)}
          </CustomText>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: Colors.primary,
              opacity: isSaving || isRefreshing ? 0.75 : 1,
            },
          ]}
          onPress={handleEnableOrUpdate}
          disabled={isSaving || isRefreshing || isLoadingCurrencies}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <CustomText variant="h6" fontWeight="semibold" style={{ color: Colors.white }}>
              {config.enabled ? "Update Pinned Notification" : "Enable Pinned Notification"}
            </CustomText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              opacity: isSaving || isRefreshing ? 0.75 : 1,
            },
          ]}
          onPress={handleRefreshNow}
          disabled={isSaving || isRefreshing || isLoadingCurrencies}
        >
          {isRefreshing ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <CustomText variant="h6" fontWeight="semibold" style={{ color: colors.text }}>
              Refresh Now
            </CustomText>
          )}
        </TouchableOpacity>

        {config.enabled && (
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: Colors.accent,
                opacity: isSaving || isRefreshing ? 0.75 : 1,
              },
            ]}
            onPress={handleDisable}
            disabled={isSaving || isRefreshing}
          >
            <CustomText variant="h6" fontWeight="semibold" style={{ color: Colors.black }}>
              Disable Pinned Notification
            </CustomText>
          </TouchableOpacity>
        )}
      </ScrollView>

      <CurrenciesModal
        visible={pickerTarget !== null}
        onClose={handleClosePicker}
        currencies={currencies}
        onCurrenciesSelect={handleSelectCurrency}
        pinnedCurrencyCodes={emptyCurrencyCodes}
        recentCurrencyCodes={emptyCurrencyCodes}
        onTogglePinCurrency={handleNoopTogglePin}
      />
    </View>
  );
};

export default PinnedRateNotificationScreen;

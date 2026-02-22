import AnimatedEntrance from "@/components/AnimatedEntrance";
import AnimatedTouchable from "@/components/AnimatedTouchable";
import AppGradientBackground from "@/components/AppGradientBackground";
import CurrenciesModal from "@/components/CurrenciesModal";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import {
  disablePinnedRateNotification,
  enablePinnedRateNotification,
  getPinnedRateNotificationConfig,
  getPinnedRateTrendLabel,
  refreshPinnedRateNotificationNow,
  type PinnedRateNotificationConfig,
} from "@/services/pinnedRateNotificationService";
import type { Currency } from "@/services/currencyService";
import { fetchCurrencies } from "@/services/currencyService";
import { styles } from "@/styles/screens/PinnedRateNotificationScreen.styles";
import { triggerHaptic } from "@/utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import CountryFlag from "react-native-country-flag";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const PinnedRateNotificationScreen = () => {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();

  const [config, setConfig] = useState<PinnedRateNotificationConfig>(() =>
    getPinnedRateNotificationConfig()
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
      try {
        const fetched = await fetchCurrencies();
        if (isCancelled) {
          return;
        }

        const nextCurrencies = fetched || [];
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
                nextCurrencies.find((currency) => currency.code !== baseCode)?.code ||
                baseCode;
              quoteCode = fallbackQuote;
            }

            if (
              baseCode === previous.baseCurrencyCode &&
              quoteCode === previous.quoteCurrencyCode
            ) {
              return previous;
            }

            return {
              ...previous,
              baseCurrencyCode: baseCode,
              quoteCurrencyCode: quoteCode,
            };
          });
        }
      } catch (error) {
        console.error("Failed to load currencies for pinned notifications:", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingCurrencies(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  const currenciesByCode = useMemo(
    () => new Map(currencies.map((currency) => [currency.code, currency])),
    [currencies]
  );

  const baseCurrency = currenciesByCode.get(config.baseCurrencyCode) || null;
  const quoteCurrency = currenciesByCode.get(config.quoteCurrencyCode) || null;
  const emptyCurrencyCodes = useMemo<string[]>(() => [], []);
  const handleNoopTogglePin = useCallback(() => undefined, []);
  const handleBack = useCallback(() => {
    router.back();
  }, []);
  const handleClosePicker = useCallback(() => {
    setPickerTarget(null);
  }, []);

  const latestConvertedAmount = useMemo(
    () =>
      config.lastRate && Number.isFinite(config.lastRate) && config.lastRate > 0
        ? config.amount * config.lastRate
        : null,
    [config.amount, config.lastRate]
  );
  const trendLabel = useMemo(
    () =>
      getPinnedRateTrendLabel(
        config.lastTrendDirection || "none",
        config.lastTrendPercent
      ),
    [config.lastTrendDirection, config.lastTrendPercent]
  );
  const latestUpdatedLabel = useMemo(
    () =>
      config.lastUpdatedAt
        ? new Date(config.lastUpdatedAt).toLocaleString()
        : "No daily update captured yet.",
    [config.lastUpdatedAt]
  );

  const showAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const handleChangeAmount = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const dots = sanitized.match(/\./g)?.length || 0;
    if (dots > 1) {
      return;
    }
    setAmountInput(sanitized);
  }, []);

  const commitHourInput = useCallback(() => {
    const fallback = config.refreshHour;
    const clamped = clampInteger(hourInput, 0, 23, fallback);
    setHourInput(pad2(clamped));
  }, [config.refreshHour, hourInput]);

  const commitMinuteInput = useCallback(() => {
    const fallback = config.refreshMinute;
    const clamped = clampInteger(minuteInput, 0, 59, fallback);
    setMinuteInput(pad2(clamped));
  }, [config.refreshMinute, minuteInput]);

  const handleSelectCurrency = useCallback(
    (currency: Currency) => {
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
    },
    [pickerTarget]
  );

  const parseDraftConfig = useCallback(() => {
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
  }, [amountInput, config, hourInput, minuteInput]);

  const handleEnableOrUpdate = useCallback(async () => {
    if (Platform.OS === "web") {
      showAlert(
        "Not available on web",
        "Pinned notifications require an Android or iOS app build."
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
    try {
      const result = await enablePinnedRateNotification(parsed.value);
      setConfig(result.config);
      if (result.success) {
        triggerHaptic("success");
      } else {
        triggerHaptic("warning");
      }

      const summaryLine = result.summary ? `\n\n${result.summary.title}` : "";
      showAlert(
        result.success ? "Pinned notification active" : "Setup pending",
        `${result.message}${summaryLine}`
      );
    } catch (error) {
      console.error("Failed to enable pinned rate notification:", error);
      triggerHaptic("error");
      showAlert("Error", "Failed to configure pinned notification.");
    } finally {
      setIsSaving(false);
    }
  }, [parseDraftConfig, showAlert]);

  const handleRefreshNow = useCallback(async () => {
    if (Platform.OS === "web") {
      showAlert(
        "Not available on web",
        "Pinned notifications require an Android or iOS app build."
      );
      return;
    }

    setIsRefreshing(true);
    try {
      const result = await refreshPinnedRateNotificationNow();
      setConfig(result.config);
      if (result.success) {
        triggerHaptic("success");
      } else {
        triggerHaptic("warning");
      }

      const summaryLine = result.summary ? `\n\n${result.summary.title}` : "";
      showAlert(
        result.success ? "Pinned notification refreshed" : "Refresh skipped",
        `${result.message}${summaryLine}`
      );
    } catch (error) {
      console.error("Failed to refresh pinned notification:", error);
      triggerHaptic("error");
      showAlert("Error", "Failed to refresh pinned notification.");
    } finally {
      setIsRefreshing(false);
    }
  }, [showAlert]);

  const handleDisable = useCallback(async () => {
    setIsSaving(true);
    try {
      const nextConfig = await disablePinnedRateNotification();
      setConfig(nextConfig);
      triggerHaptic("warning");
      showAlert("Pinned notification disabled", "Daily pinned tracking was turned off.");
    } catch (error) {
      console.error("Failed to disable pinned notification:", error);
      triggerHaptic("error");
      showAlert("Error", "Failed to disable pinned notification.");
    } finally {
      setIsSaving(false);
    }
  }, [showAlert]);

  const renderCurrencyButton = useCallback(
    (
      type: Exclude<PickerTarget, null>,
      label: string,
      currency: Currency | null
    ) => (
      <View style={{ gap: Spacing.xs }}>
        <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
          {label}
        </CustomText>
        <AnimatedTouchable
          style={[
            styles.currencyButton,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
          onPress={() => setPickerTarget(type)}
          activeOpacity={0.85}
          haptic="light"
        >
          <View style={styles.currencyButtonLeft}>
            {currency?.flag ? (
              <CountryFlag isoCode={currency.flag} size={24} style={styles.flagIcon} />
            ) : (
              <View
                style={[
                  styles.flagIcon,
                  { backgroundColor: colors.gray[200], alignItems: "center", justifyContent: "center" },
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
        </AnimatedTouchable>
      </View>
    ),
    [colors]
  );

  return (
    <AnimatedEntrance
      style={[styles.container, { backgroundColor: "transparent" }]}
      distance={10}
      delay={20}
    >
      <AppGradientBackground />
      <View style={[styles.header, { paddingTop: top + 10 }]}>
        <View style={styles.headerLeft}>
          <AnimatedTouchable onPress={handleBack} hitSlop={10} haptic="light">
            <Ionicons name="arrow-back" size={Spacing.iconSize} color={Colors.primary} />
          </AnimatedTouchable>
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
            Keep one detailed currency conversion pinned in notifications, refreshed daily
            with increase/decrease trend.
          </CustomText>
          {Platform.OS === "web" && (
            <CustomText
              variant="h6"
              fontWeight="medium"
              style={{ color: Colors.primary }}
            >
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

        <AnimatedTouchable
          style={[
            styles.button,
            {
              backgroundColor: Colors.primary,
              opacity: isSaving || isRefreshing ? 0.75 : 1,
            },
          ]}
          onPress={handleEnableOrUpdate}
          disabled={isSaving || isRefreshing || isLoadingCurrencies}
          haptic="medium"
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <CustomText
              variant="h6"
              fontWeight="semibold"
              style={{ color: Colors.white }}
            >
              {config.enabled ? "Update Pinned Notification" : "Enable Pinned Notification"}
            </CustomText>
          )}
        </AnimatedTouchable>

        <AnimatedTouchable
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
          haptic="light"
        >
          {isRefreshing ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <CustomText variant="h6" fontWeight="semibold" style={{ color: colors.text }}>
              Refresh Now
            </CustomText>
          )}
        </AnimatedTouchable>

        {config.enabled && (
          <AnimatedTouchable
            style={[
              styles.button,
              {
                backgroundColor: Colors.accent,
                opacity: isSaving || isRefreshing ? 0.75 : 1,
              },
            ]}
            onPress={handleDisable}
            disabled={isSaving || isRefreshing}
            haptic="warning"
          >
            <CustomText
              variant="h6"
              fontWeight="semibold"
              style={{ color: Colors.black }}
            >
              Disable Pinned Notification
            </CustomText>
          </AnimatedTouchable>
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
    </AnimatedEntrance>
  );
};

export default PinnedRateNotificationScreen;

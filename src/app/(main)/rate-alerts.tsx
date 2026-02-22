import AnimatedEntrance from "@/components/AnimatedEntrance";
import AnimatedTouchable from "@/components/AnimatedTouchable";
import AppGradientBackground from "@/components/AppGradientBackground";
import CurrenciesModal from "@/components/CurrenciesModal";
import CustomText from "@/components/CustomText";
import { DEFAULT_CODES } from "@/constants/currencyConverter";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import {
  createRateAlert,
  deleteRateAlert,
  evaluateRateAlertsNow,
  getRateAlerts,
  RateAlert,
  RateAlertCondition,
  toggleRateAlertEnabled,
} from "@/services/rateAlertNotificationService";
import type { Currency } from "@/services/currencyService";
import { fetchCurrencies } from "@/services/currencyService";
import { styles } from "@/styles/screens/RateAlertsScreen.styles";
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

const emptyCurrencyCodes: string[] = [];

const formatRate = (value: number | null) =>
  value === null
    ? "N/A"
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      });

const conditionLabel = (condition: RateAlertCondition) =>
  condition === "atOrAbove" ? "At or above" : "At or below";

const RateAlertsScreen = () => {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();

  const [alerts, setAlerts] = useState<RateAlert[]>(() => getRateAlerts());
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [draftBaseCode, setDraftBaseCode] = useState<string>(DEFAULT_CODES[0]);
  const [draftQuoteCode, setDraftQuoteCode] = useState<string>(DEFAULT_CODES[1]);
  const [draftCondition, setDraftCondition] = useState<RateAlertCondition>("atOrAbove");
  const [draftTargetRate, setDraftTargetRate] = useState("");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const currenciesByCode = useMemo(
    () => new Map(currencies.map((currency) => [currency.code, currency])),
    [currencies]
  );
  const baseCurrency = currenciesByCode.get(draftBaseCode) || null;
  const quoteCurrency = currenciesByCode.get(draftQuoteCode) || null;

  const showAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

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
          const resolvedBaseCode = availableCodes.has(draftBaseCode)
            ? draftBaseCode
            : nextCurrencies[0].code;
          setDraftBaseCode(resolvedBaseCode);
          setDraftQuoteCode((previous) => {
            if (availableCodes.has(previous) && previous !== resolvedBaseCode) {
              return previous;
            }

            return (
              nextCurrencies.find((currency) => currency.code !== resolvedBaseCode)?.code ||
              nextCurrencies[0].code
            );
          });
        }
      } catch (error) {
        console.error("Failed to load currencies for rate alerts:", error);
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

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleNoopTogglePin = useCallback(() => undefined, []);
  const handleClosePicker = useCallback(() => {
    setPickerTarget(null);
  }, []);

  const handleSelectCurrency = useCallback(
    (currency: Currency) => {
      if (pickerTarget === "base") {
        setDraftBaseCode(currency.code);
        if (currency.code === draftQuoteCode) {
          setDraftQuoteCode(draftBaseCode);
        }
      } else if (pickerTarget === "quote") {
        setDraftQuoteCode(currency.code);
        if (currency.code === draftBaseCode) {
          setDraftBaseCode(draftQuoteCode);
        }
      }
    },
    [draftBaseCode, draftQuoteCode, pickerTarget]
  );

  const handleChangeTargetRate = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const dotsCount = sanitized.match(/\./g)?.length || 0;
    if (dotsCount > 1) {
      return;
    }
    setDraftTargetRate(sanitized);
  }, []);

  const handleCreateAlert = useCallback(async () => {
    const targetRate = Number(draftTargetRate);
    if (!Number.isFinite(targetRate) || targetRate <= 0) {
      triggerHaptic("warning");
      showAlert("Invalid target", "Target rate must be a positive number.");
      return;
    }
    if (draftBaseCode === draftQuoteCode) {
      triggerHaptic("warning");
      showAlert("Invalid pair", "Choose two different currencies.");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createRateAlert({
        baseCurrencyCode: draftBaseCode,
        quoteCurrencyCode: draftQuoteCode,
        targetRate,
        condition: draftCondition,
      });
      setAlerts(result.alerts);
      setDraftTargetRate("");
      triggerHaptic(result.triggeredCount > 0 ? "success" : "light");
      showAlert(
        "Rate Alert Created",
        result.triggeredCount > 0
          ? `${result.message}\n\nYour new alert already matched the current rate.`
          : "Your alert is active. A detailed notification will be sent once the target is met."
      );
    } catch (error) {
      console.error("Failed to create rate alert:", error);
      triggerHaptic("error");
      showAlert("Error", "Failed to create rate alert.");
    } finally {
      setIsCreating(false);
    }
  }, [draftBaseCode, draftCondition, draftQuoteCode, draftTargetRate, showAlert]);

  const handleToggleAlert = useCallback(
    async (alertId: string, enabled: boolean) => {
      try {
        const updated = await toggleRateAlertEnabled(alertId, enabled);
        setAlerts(updated);
      } catch (error) {
        console.error("Failed to toggle rate alert:", error);
        showAlert("Error", "Failed to update alert.");
      }
    },
    [showAlert]
  );

  const handleDeleteAlert = useCallback(
    async (alertId: string) => {
      try {
        const updated = await deleteRateAlert(alertId);
        setAlerts(updated);
        triggerHaptic("light");
      } catch (error) {
        console.error("Failed to delete rate alert:", error);
        showAlert("Error", "Failed to delete alert.");
      }
    },
    [showAlert]
  );

  const handleCheckNow = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await evaluateRateAlertsNow({ requestPermissionIfMissing: true });
      setAlerts(result.alerts);
      triggerHaptic(result.triggeredCount > 0 ? "success" : "light");
      showAlert(
        result.success ? "Rate Alerts Checked" : "Check Failed",
        result.message
      );
    } catch (error) {
      console.error("Failed to evaluate rate alerts:", error);
      triggerHaptic("error");
      showAlert("Error", "Unable to check alerts right now.");
    } finally {
      setIsChecking(false);
    }
  }, [showAlert]);

  const renderCurrencyButton = useCallback(
    (target: Exclude<PickerTarget, null>, label: string, currency: Currency | null) => (
      <View style={styles.rowItem}>
        <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
          {label}
        </CustomText>
        <AnimatedTouchable
          style={[
            styles.currencyButton,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
          onPress={() => setPickerTarget(target)}
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
                {currency?.name || "Tap to select"}
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
          Rate Alerts
        </CustomText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom + 12 }]}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <CustomText variant="h5" fontWeight="semibold">
              Create Alert
            </CustomText>
            <CustomText variant="h7" fontWeight="medium" style={{ color: colors.gray[500] }}>
              Example: Notify me when 1 USD reaches 129 KES.
            </CustomText>
          </View>

          <View style={styles.row}>
            {renderCurrencyButton("base", "Base currency", baseCurrency)}
            {renderCurrencyButton("quote", "Quote currency", quoteCurrency)}
          </View>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
                Target rate
              </CustomText>
              <TextInput
                value={draftTargetRate}
                onChangeText={handleChangeTargetRate}
                placeholder="129"
                keyboardType="decimal-pad"
                style={[
                  styles.input,
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

            <View style={styles.rowItem}>
              <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
                Trigger when rate is
              </CustomText>
              <AnimatedTouchable
                style={[
                  styles.conditionButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                onPress={() =>
                  setDraftCondition((previous) =>
                    previous === "atOrAbove" ? "atOrBelow" : "atOrAbove"
                  )
                }
                activeOpacity={0.85}
                haptic="selection"
              >
                <CustomText variant="h6" fontWeight="semibold" style={{ color: Colors.primary }}>
                  {conditionLabel(draftCondition)}
                </CustomText>
              </AnimatedTouchable>
            </View>
          </View>

          <AnimatedTouchable
            style={[
              styles.button,
              {
                backgroundColor: Colors.primary,
                opacity: isCreating || isLoadingCurrencies ? 0.75 : 1,
              },
            ]}
            onPress={handleCreateAlert}
            disabled={isCreating || isLoadingCurrencies}
            haptic="medium"
          >
            {isCreating ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <CustomText
                variant="h6"
                fontWeight="semibold"
                style={{ color: Colors.white }}
              >
                Create Rate Alert
              </CustomText>
            )}
          </AnimatedTouchable>

          <AnimatedTouchable
            style={[
              styles.button,
              styles.secondaryButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                opacity: isChecking ? 0.75 : 1,
              },
            ]}
            onPress={handleCheckNow}
            disabled={isChecking}
            haptic="light"
          >
            {isChecking ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <CustomText variant="h6" fontWeight="semibold" style={{ color: colors.text }}>
                Check Alerts Now
              </CustomText>
            )}
          </AnimatedTouchable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <CustomText variant="h5" fontWeight="semibold">
              Active Alerts ({alerts.length})
            </CustomText>
            <CustomText variant="h7" fontWeight="medium" style={{ color: colors.gray[500] }}>
              Alerts auto-disable after triggering to avoid duplicates.
            </CustomText>
          </View>

          <View style={styles.alertList}>
            {alerts.length === 0 ? (
              <CustomText variant="h6" style={{ color: colors.gray[500] }}>
                No alerts yet. Create one above.
              </CustomText>
            ) : (
              alerts.map((alert) => (
                <View
                  key={alert.id}
                  style={[
                    styles.alertItem,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  <View style={styles.alertHeader}>
                    <CustomText variant="h5" fontWeight="semibold">
                      {alert.baseCurrencyCode}/{alert.quoteCurrencyCode}
                    </CustomText>
                    <View style={styles.alertActions}>
                      <AnimatedTouchable
                        onPress={() => handleToggleAlert(alert.id, !alert.enabled)}
                        hitSlop={8}
                        haptic="selection"
                      >
                        <Ionicons
                          name={alert.enabled ? "pause-circle" : "play-circle"}
                          size={20}
                          color={alert.enabled ? Colors.primary : colors.gray[500]}
                        />
                      </AnimatedTouchable>
                      <AnimatedTouchable
                        onPress={() => handleDeleteAlert(alert.id)}
                        hitSlop={8}
                        haptic="warning"
                      >
                        <Ionicons name="trash-outline" size={18} color={Colors.accent} />
                      </AnimatedTouchable>
                    </View>
                  </View>

                  <CustomText variant="h6" style={{ color: colors.text }}>
                    Trigger {conditionLabel(alert.condition).toLowerCase()}{" "}
                    {formatRate(alert.targetRate)}
                  </CustomText>
                  <CustomText variant="h7" style={{ color: colors.gray[500] }}>
                    Last checked:{" "}
                    {alert.lastCheckedAt
                      ? `${new Date(alert.lastCheckedAt).toLocaleString()} (1 ${alert.baseCurrencyCode} = ${formatRate(
                          alert.lastCheckedRate
                        )} ${alert.quoteCurrencyCode})`
                      : "Not checked yet"}
                  </CustomText>
                  <CustomText variant="h7" style={{ color: colors.gray[500] }}>
                    Status: {alert.enabled ? "Enabled" : "Disabled"}
                    {alert.triggeredAt
                      ? ` - Triggered ${new Date(alert.triggeredAt).toLocaleString()}`
                      : ""}
                  </CustomText>
                </View>
              ))
            )}
          </View>
        </View>
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

export default RateAlertsScreen;

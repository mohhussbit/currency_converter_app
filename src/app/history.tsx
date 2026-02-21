import AnimatedEntrance from "@/components/AnimatedEntrance";
import AnimatedTouchable from "@/components/AnimatedTouchable";
import AppGradientBackground from "@/components/AppGradientBackground";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { getCurrencySymbol } from "@/services/currencyService";
import {
  deleteStoredValues,
  getStoredValues,
  saveSecurely,
} from "@/store/storage";
import { styles } from "@/styles/screens/HistoryScreen.styles";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Platform,
  View,
} from "react-native";
import CountryFlag from "react-native-country-flag";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ConversionHistory {
  fromCurrency: string;
  toCurrency: string;
  fromFlag: string;
  toFlag: string;
  amount: string;
  convertedAmount: string;
  timestamp: number;
}

const HISTORY_RETENTION_DAYS = 3;
const HISTORY_RETENTION_MS = HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

interface HistoryListItemProps {
  item: ConversionHistory;
  colors: ReturnType<typeof useTheme>["colors"];
  formatDateTime: (timestamp: number) => string;
  formatRelativeTime: (timestamp: number) => string;
  getRateText: (item: ConversionHistory) => string;
}

const HistoryListItemComponent: React.FC<HistoryListItemProps> = ({
  item,
  colors,
  formatDateTime,
  formatRelativeTime,
  getRateText,
}) => {
  const fromSymbol = getCurrencySymbol(item.fromCurrency);
  const toSymbol = getCurrencySymbol(item.toCurrency);

  return (
    <View
      style={[
        styles.historyItem,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.historyTopRow}>
        <View style={styles.currencyMetaWrap}>
          <View style={styles.flagStack}>
            <CountryFlag
              isoCode={item.fromFlag}
              size={Spacing.flagIconSize}
              style={styles.flag}
            />
            <CountryFlag
              isoCode={item.toFlag}
              size={Spacing.flagIconSize}
              style={[styles.flag, styles.flagOverlap]}
            />
          </View>

          <View style={styles.pairPillsWrap}>
            <View style={[styles.pairPill, { backgroundColor: colors.gray[100] }]}>
              <CustomText variant="h7" fontWeight="medium" style={{ color: colors.text }}>
                {item.fromCurrency}
              </CustomText>
            </View>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={colors.gray[500]}
              style={{ marginHorizontal: 2 }}
            />
            <View style={[styles.pairPill, { backgroundColor: colors.gray[100] }]}>
              <CustomText variant="h7" fontWeight="medium" style={{ color: colors.text }}>
                {item.toCurrency}
              </CustomText>
            </View>
          </View>
        </View>

        <View style={styles.timeWrap}>
          <CustomText variant="h7" fontWeight="medium" style={{ color: colors.text }}>
            {formatRelativeTime(item.timestamp)}
          </CustomText>
          <CustomText variant="tiny" style={{ color: colors.gray[500] }}>
            {formatDateTime(item.timestamp)}
          </CustomText>
        </View>
      </View>

      <View style={styles.valuesRow}>
        <View style={styles.valueColumn}>
          <CustomText variant="h7" style={{ color: colors.gray[500] }}>
            From
          </CustomText>
          <CustomText variant="h5" fontWeight="medium" style={{ color: colors.text }}>
            {fromSymbol}
            {item.amount}
          </CustomText>
        </View>

        <Ionicons
          name="swap-horizontal"
          size={18}
          color={colors.gray[500]}
          style={styles.swapIcon}
        />

        <View style={styles.valueColumnRight}>
          <CustomText variant="h7" style={{ color: colors.gray[500] }}>
            To
          </CustomText>
          <CustomText variant="h5" fontWeight="bold" style={{ color: Colors.primary }}>
            {toSymbol}
            {item.convertedAmount}
          </CustomText>
        </View>
      </View>

      <View style={[styles.rateChip, { backgroundColor: colors.gray[100] }]}>
        <Ionicons name="stats-chart-outline" size={12} color={colors.gray[500]} />
        <CustomText variant="tiny" style={{ color: colors.gray[500] }}>
          {getRateText(item)}
        </CustomText>
      </View>
    </View>
  );
};

const HistoryListItem = React.memo(HistoryListItemComponent);

const HistoryScreen = () => {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCleanupMessage, setShowCleanupMessage] = useState(false);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.push("/settings");
        return true;
      }
    );

    return () => backHandler.remove();
  }, []);

  const showError = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const pulseCleanupMessage = useCallback(() => {
    setShowCleanupMessage(true);
    setTimeout(() => setShowCleanupMessage(false), 2600);
  }, []);

  const cleanupOldHistory = useCallback(
    async (showMessage = true) => {
      setIsLoading(true);

      try {
        const storedHistory = getStoredValues(["conversionHistory"]);

        if (!storedHistory.conversionHistory) {
          setHistory([]);
          return;
        }

        let parsedHistory: ConversionHistory[] = [];
        try {
          const parsed = JSON.parse(storedHistory.conversionHistory);
          parsedHistory = Array.isArray(parsed) ? parsed : [];
        } catch (parseError) {
          console.error("Invalid stored history payload:", parseError);
          deleteStoredValues(["conversionHistory"]);
          setHistory([]);
          return;
        }

        const now = Date.now();
        const recentHistory = parsedHistory
          .filter(
            ({ timestamp }) =>
              Number.isFinite(timestamp) && now - timestamp <= HISTORY_RETENTION_MS
          )
          .sort((a, b) => b.timestamp - a.timestamp);

        if (recentHistory.length !== parsedHistory.length) {
          if (recentHistory.length === 0) {
            deleteStoredValues(["conversionHistory"]);
          } else {
            saveSecurely([
              {
                key: "conversionHistory",
                value: JSON.stringify(recentHistory),
              },
            ]);
          }

          if (showMessage) {
            pulseCleanupMessage();
          }
        }

        setHistory(recentHistory);
      } catch (error) {
        console.error("Error cleaning up history:", error);
        showError("Error", "Failed to clean history. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [pulseCleanupMessage, showError]
  );

  const doClear = useCallback(async () => {
    setIsLoading(true);
    try {
      deleteStoredValues(["conversionHistory"]);
      setHistory([]);
      pulseCleanupMessage();
    } catch (error) {
      console.error("Error clearing history:", error);
      showError("Error", "Failed to clear history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [pulseCleanupMessage, showError]);

  const handleClearHistory = useCallback(async () => {
    const message = "This will remove all saved conversions.";

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        await doClear();
      }
      return;
    }

    Alert.alert("Clear History", message, [
      { text: "Delete", style: "destructive", onPress: doClear },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [doClear]);

  useEffect(() => {
    cleanupOldHistory(false);
  }, [cleanupOldHistory]);

  const latestTimestamp = useMemo(
    () => (history.length > 0 ? history[0].timestamp : null),
    [history]
  );

  const formatDateTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  }, []);

  const formatRelativeTime = useCallback((timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, []);

  const getRateText = useCallback((item: ConversionHistory) => {
    const fromValue = Number(String(item.amount).replace(/,/g, ""));
    const toValue = Number(String(item.convertedAmount).replace(/,/g, ""));

    if (!Number.isFinite(fromValue) || !Number.isFinite(toValue) || fromValue <= 0) {
      return "Rate unavailable";
    }

    const rate = toValue / fromValue;
    const formattedRate = rate.toFixed(4).replace(/\.?(0+)$/, "");
    return `1 ${item.fromCurrency} ≈ ${formattedRate} ${item.toCurrency}`;
  }, []);

  const renderHistoryItem = useCallback(
    ({ item }: { item: ConversionHistory }) => {
      return (
        <HistoryListItem
          item={item}
          colors={colors}
          formatDateTime={formatDateTime}
          formatRelativeTime={formatRelativeTime}
          getRateText={getRateText}
        />
      );
    },
    [colors, formatDateTime, formatRelativeTime, getRateText]
  );

  const keyExtractor = useCallback(
    (item: ConversionHistory, index: number) =>
      `${item.timestamp}-${item.fromCurrency}-${item.toCurrency}-${index}`,
    []
  );

  return (
    <AnimatedEntrance
      style={[
        styles.container,
        { backgroundColor: "transparent", paddingBottom: bottom + 12 },
      ]}
      delay={20}
      distance={8}
    >
      <AppGradientBackground />
      <View style={[styles.header, { paddingTop: top + 10 }]}> 
        <View style={styles.headerSide}>
          <AnimatedTouchable
            onPress={() => router.back()}
            activeOpacity={0.8}
            hitSlop={10}
          >
            <Ionicons
              name="arrow-back"
              size={Spacing.iconSize}
              color={Colors.primary}
            />
          </AnimatedTouchable>
        </View>

        <View style={styles.headerCenter}>
          <CustomText variant="h4" fontWeight="bold" style={{ color: colors.text }}>
            History
          </CustomText>
        </View>

        <View style={styles.headerSideRight}>
          {history.length > 0 && (
            <AnimatedTouchable
              onPress={handleClearHistory}
              activeOpacity={0.8}
              hitSlop={10}
            >
              <Ionicons
                name="trash-outline"
                size={Spacing.iconSize}
                color={Colors.primary}
              />
            </AnimatedTouchable>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}> 
          <View style={styles.summaryTopRow}>
            <View>
              <CustomText variant="h6" style={{ color: colors.gray[500] }}>
                Stored conversions
              </CustomText>
              <CustomText variant="h3" fontWeight="bold" style={{ color: colors.text }}>
                {history.length}
              </CustomText>
            </View>

            <View style={styles.retentionWrap}>
              <View style={styles.retentionBadge}>
                <Ionicons name="timer-outline" size={14} color={Colors.white} />
                <CustomText variant="h7" fontWeight="medium" style={styles.retentionBadgeText}>
                  {HISTORY_RETENTION_DAYS}-day retention
                </CustomText>
              </View>
            </View>
          </View>

          <CustomText variant="h7" style={{ color: colors.gray[500] }}>
            {latestTimestamp
              ? `Latest entry: ${formatDateTime(latestTimestamp)}`
              : "No entries yet. New conversions appear here automatically."}
          </CustomText>
        </View>

        {showCleanupMessage && (
          <View style={[styles.cleanupMessage, { backgroundColor: colors.card }]}> 
            <Ionicons
              name="checkmark-circle"
              size={Spacing.iconSize}
              color={Colors.primary}
            />
            <CustomText
              variant="h6"
              fontWeight="medium"
              style={{ color: colors.text, marginLeft: 8 }}
            >
              Old history beyond 3 days was removed.
            </CustomText>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={styles.loadingContainer}
          />
        ) : history.length === 0 ? (
          <View style={styles.emptyState}> 
            <Ionicons
              name="time-outline"
              size={Spacing.iconSize + 4}
              color={colors.gray[400]}
            />
            <CustomText
              variant="h5"
              fontWeight="medium"
              style={{ color: colors.gray[500], marginTop: 10 }}
            >
              No history yet
            </CustomText>
            <CustomText
              variant="h6"
              style={{ color: colors.gray[500], marginTop: 6, textAlign: "center" }}
            >
              Converted entries are kept for 3 days and cleaned automatically.
            </CustomText>
          </View>
        ) : (
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.historyList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: bottom + 18 }} />}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={8}
            removeClippedSubviews
          />
        )}
      </View>
    </AnimatedEntrance>
  );
};

export default HistoryScreen;

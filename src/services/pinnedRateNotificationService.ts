import { DEFAULT_CODES } from "@/constants/currencyConverter";
import { fetchGlobalExchangeRates } from "@/services/currencyService";
import { getStoredValues, saveSecurely } from "@/store/storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

export type RateTrendDirection = "up" | "down" | "flat" | "none";

export interface PinnedRateNotificationConfig {
  enabled: boolean;
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  amount: number;
  refreshHour: number;
  refreshMinute: number;
  lastRate: number | null;
  lastUpdatedAt: number | null;
  lastUpdatedDayKey: string | null;
  lastTrendDirection: Exclude<RateTrendDirection, "none"> | null;
  lastTrendPercent: number | null;
}

export interface PinnedRateNotificationSummary {
  title: string;
  subtitle: string;
  body: string;
  convertedAmount: number;
  pairRate: number;
  trendDirection: RateTrendDirection;
  trendPercent: number | null;
  baseFlagEmoji: string;
  quoteFlagEmoji: string;
}

export interface PinnedRateNotificationResult {
  success: boolean;
  message: string;
  config: PinnedRateNotificationConfig;
  summary?: PinnedRateNotificationSummary;
}

const STORAGE_KEY = "pinnedRateNotificationConfig";
const CURRENCIES_CACHE_STORAGE_KEY = "currencies";
const SELECTED_CODES_STORAGE_KEY = "selectedCurrencyCodes";
const PINNED_NOTIFICATION_ID = "pinned-rate-notification";
const PINNED_CHANNEL_ID = "pinned-rate-updates";
const BACKGROUND_TASK_NAME = "pinned-rate-daily-refresh";
const BACKGROUND_MIN_INTERVAL_MINUTES = 24 * 60;
const DEFAULT_REFRESH_HOUR = 8;
const DEFAULT_REFRESH_MINUTE = 0;
const UNKNOWN_FLAG_EMOJI = "💱";

const SPECIAL_FLAG_EMOJIS: Record<string, string> = {
  IMF: "🏦",
};

const pad2 = (value: number) => `${value}`.padStart(2, "0");

const toLocalDayKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
};

const normalizeCurrencyCode = (value: unknown, fallback: string) => {
  const normalized = String(value || "")
    .toUpperCase()
    .trim();

  return normalized.length === 3 ? normalized : fallback;
};

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampInteger = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

const normalizeAmount = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const parseSelectedCodes = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => String(item || "").toUpperCase().trim())
      .filter((code) => code.length === 3);
  } catch (error) {
    console.error("Failed to parse stored selected currency codes:", error);
    return [];
  }
};

const getDefaultPairCodes = () => {
  const stored = getStoredValues([SELECTED_CODES_STORAGE_KEY]);
  const selectedCodes = parseSelectedCodes(stored[SELECTED_CODES_STORAGE_KEY]);
  const primary = selectedCodes[0] || DEFAULT_CODES[0];
  const secondary = selectedCodes[1] || DEFAULT_CODES[1];
  return primary === secondary ? [DEFAULT_CODES[0], DEFAULT_CODES[1]] : [primary, secondary];
};

const createDefaultConfig = (): PinnedRateNotificationConfig => {
  const [baseCode, quoteCode] = getDefaultPairCodes();

  return {
    enabled: false,
    baseCurrencyCode: baseCode,
    quoteCurrencyCode: quoteCode,
    amount: 100,
    refreshHour: DEFAULT_REFRESH_HOUR,
    refreshMinute: DEFAULT_REFRESH_MINUTE,
    lastRate: null,
    lastUpdatedAt: null,
    lastUpdatedDayKey: null,
    lastTrendDirection: null,
    lastTrendPercent: null,
  };
};

const normalizeConfig = (
  value: Partial<PinnedRateNotificationConfig> | null | undefined,
  fallback: PinnedRateNotificationConfig
): PinnedRateNotificationConfig => {
  const nextBase = normalizeCurrencyCode(value?.baseCurrencyCode, fallback.baseCurrencyCode);
  let nextQuote = normalizeCurrencyCode(
    value?.quoteCurrencyCode,
    fallback.quoteCurrencyCode
  );
  if (nextQuote === nextBase) {
    nextQuote = fallback.quoteCurrencyCode === nextBase ? DEFAULT_CODES[1] : fallback.quoteCurrencyCode;
  }

  const nextTrendDirection = value?.lastTrendDirection;
  const isValidTrendDirection =
    nextTrendDirection === "up" ||
    nextTrendDirection === "down" ||
    nextTrendDirection === "flat";

  return {
    enabled: Boolean(value?.enabled),
    baseCurrencyCode: nextBase,
    quoteCurrencyCode: nextQuote,
    amount: normalizeAmount(value?.amount, fallback.amount),
    refreshHour: clampInteger(value?.refreshHour, 0, 23, fallback.refreshHour),
    refreshMinute: clampInteger(value?.refreshMinute, 0, 59, fallback.refreshMinute),
    lastRate:
      value?.lastRate === null || value?.lastRate === undefined
        ? null
        : (() => {
            const parsed = parseNumber(value.lastRate, fallback.lastRate || 0);
            return parsed > 0 ? parsed : null;
          })(),
    lastUpdatedAt:
      value?.lastUpdatedAt === null || value?.lastUpdatedAt === undefined
        ? null
        : (() => {
            const parsed = parseNumber(
              value.lastUpdatedAt,
              fallback.lastUpdatedAt || 0
            );
            return parsed > 0 ? parsed : null;
          })(),
    lastUpdatedDayKey:
      typeof value?.lastUpdatedDayKey === "string" && value.lastUpdatedDayKey.length
        ? value.lastUpdatedDayKey
        : fallback.lastUpdatedDayKey,
    lastTrendDirection: isValidTrendDirection ? nextTrendDirection : fallback.lastTrendDirection,
    lastTrendPercent:
      value?.lastTrendPercent === null || value?.lastTrendPercent === undefined
        ? null
        : parseNumber(value.lastTrendPercent, fallback.lastTrendPercent || 0),
  };
};

const persistConfig = (config: PinnedRateNotificationConfig) => {
  saveSecurely([{ key: STORAGE_KEY, value: JSON.stringify(config) }]);
};

const loadStoredConfig = (): PinnedRateNotificationConfig => {
  const defaultConfig = createDefaultConfig();
  const stored = getStoredValues([STORAGE_KEY]);
  const rawValue = stored[STORAGE_KEY];

  if (!rawValue) {
    return defaultConfig;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PinnedRateNotificationConfig>;
    return normalizeConfig(parsed, defaultConfig);
  } catch (error) {
    console.error("Failed to parse pinned rate notification config:", error);
    return defaultConfig;
  }
};

const formatDisplayNumber = (value: number) => {
  const absolute = Math.abs(value);
  const maximumFractionDigits = absolute >= 1000 ? 0 : absolute >= 10 ? 2 : 4;

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
};

const formatTimeLabel = (hour: number, minute: number) => `${pad2(hour)}:${pad2(minute)}`;

const toFlagEmoji = (countryCode: string) => {
  const normalized = countryCode.toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }

  const first = normalized.codePointAt(0);
  const second = normalized.codePointAt(1);
  if (!first || !second) {
    return null;
  }

  return String.fromCodePoint(127397 + first, 127397 + second);
};

const getCachedCurrencyFlagIsoMap = () => {
  const stored = getStoredValues([CURRENCIES_CACHE_STORAGE_KEY]);
  const rawCurrencies = stored[CURRENCIES_CACHE_STORAGE_KEY];
  const map = new Map<string, string>();

  if (!rawCurrencies) {
    return map;
  }

  try {
    const parsed: unknown = JSON.parse(rawCurrencies);
    if (!Array.isArray(parsed)) {
      return map;
    }

    parsed.forEach((entry) => {
      const code = String(
        (entry as { code?: unknown } | null | undefined)?.code || ""
      )
        .toUpperCase()
        .trim();
      const flagIso = String(
        (entry as { flag?: unknown } | null | undefined)?.flag || ""
      )
        .toUpperCase()
        .trim();

      if (code.length === 3 && flagIso) {
        map.set(code, flagIso);
      }
    });
  } catch (error) {
    console.error("Failed to parse cached currencies for notification flags:", error);
  }

  return map;
};

const getCurrencyFlagEmoji = (
  currencyCode: string,
  flagIsoByCurrencyCode: Map<string, string>
) => {
  const normalizedCode = currencyCode.toUpperCase().trim();

  const specialEmoji = SPECIAL_FLAG_EMOJIS[normalizedCode];
  if (specialEmoji) {
    return specialEmoji;
  }

  const isoCode =
    flagIsoByCurrencyCode.get(normalizedCode) || normalizedCode.slice(0, 2);
  const emoji = toFlagEmoji(isoCode);
  return emoji || UNKNOWN_FLAG_EMOJI;
};

const getTrendLabel = (
  direction: RateTrendDirection,
  trendPercent: number | null
) => {
  if (trendPercent === null || direction === "none") {
    return "Baseline saved. Trend starts from the next update.";
  }

  const absPercent = Math.abs(trendPercent).toFixed(2);
  if (direction === "up") {
    return `+ Up ${absPercent}% vs previous update.`;
  }
  if (direction === "down") {
    return `- Down ${absPercent}% vs previous update.`;
  }
  return "= Unchanged vs previous update.";
};

const getCompactTrendLabel = (
  direction: RateTrendDirection,
  trendPercent: number | null
) => {
  if (trendPercent === null || direction === "none") {
    return "new";
  }

  const absPercent = Math.abs(trendPercent).toFixed(2);
  if (direction === "up") {
    return `+${absPercent}%`;
  }
  if (direction === "down") {
    return `-${absPercent}%`;
  }

  return "0.00%";
};

const formatCompactUpdatedTime = (timestamp: number | null) => {
  if (!timestamp) {
    return "pending";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const calculateTrend = (
  previousRate: number | null,
  currentRate: number
): { direction: Exclude<RateTrendDirection, "none">; percent: number | null } => {
  if (!previousRate || previousRate <= 0) {
    return { direction: "flat", percent: null };
  }

  const percent = ((currentRate - previousRate) / previousRate) * 100;
  if (Math.abs(percent) < 0.0001) {
    return { direction: "flat", percent: 0 };
  }

  return { direction: percent > 0 ? "up" : "down", percent };
};

const buildSummaryFromConfig = (
  config: PinnedRateNotificationConfig
): PinnedRateNotificationSummary | null => {
  if (!config.lastRate || !Number.isFinite(config.lastRate) || config.lastRate <= 0) {
    return null;
  }

  const flagIsoByCurrencyCode = getCachedCurrencyFlagIsoMap();
  const baseFlagEmoji = getCurrencyFlagEmoji(
    config.baseCurrencyCode,
    flagIsoByCurrencyCode
  );
  const quoteFlagEmoji = getCurrencyFlagEmoji(
    config.quoteCurrencyCode,
    flagIsoByCurrencyCode
  );
  const convertedAmount = config.amount * config.lastRate;
  const trendDirection = config.lastTrendDirection || "none";
  const trendLabel = getCompactTrendLabel(
    trendDirection,
    config.lastTrendPercent
  );
  const updatedLabel = formatCompactUpdatedTime(config.lastUpdatedAt);

  return {
    title: `${baseFlagEmoji} ${formatDisplayNumber(config.amount)} ${config.baseCurrencyCode} -> ${quoteFlagEmoji} ${formatDisplayNumber(
      convertedAmount
    )} ${config.quoteCurrencyCode}`,
    subtitle: `${config.baseCurrencyCode}/${config.quoteCurrencyCode} daily`,
    body: `${baseFlagEmoji} 1 ${config.baseCurrencyCode} = ${quoteFlagEmoji} ${formatDisplayNumber(
      config.lastRate
    )} ${config.quoteCurrencyCode} | ${trendLabel} | ${updatedLabel}`,
    convertedAmount,
    pairRate: config.lastRate,
    trendDirection,
    trendPercent: config.lastTrendPercent,
    baseFlagEmoji,
    quoteFlagEmoji,
  };
};

const ensurePermissionAsync = async (requestIfMissing: boolean) => {
  if (Platform.OS === "web") {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") {
    return true;
  }

  if (!requestIfMissing) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
};

const ensureAndroidChannelAsync = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(PINNED_CHANNEL_ID, {
    name: "Pinned Rate Tracker",
    description: "Persistent daily tracking for your selected currency pair",
    importance: Notifications.AndroidImportance.HIGH,
    showBadge: false,
    enableVibrate: false,
    sound: null,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

const publishPinnedNotificationAsync = async (
  config: PinnedRateNotificationConfig
) => {
  const summary = buildSummaryFromConfig(config);
  if (!summary) {
    throw new Error("Pinned notification cannot be published without a valid rate.");
  }

  await ensureAndroidChannelAsync();
  await Notifications.cancelScheduledNotificationAsync(PINNED_NOTIFICATION_ID).catch(
    () => undefined
  );
  await Notifications.dismissNotificationAsync(PINNED_NOTIFICATION_ID).catch(
    () => undefined
  );

  await Notifications.scheduleNotificationAsync({
    identifier: PINNED_NOTIFICATION_ID,
    content: {
      title: summary.title,
      subtitle: summary.subtitle,
      body: summary.body,
      sound: false,
      autoDismiss: false,
      sticky: Platform.OS === "android",
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        screen: "pinned-rate-notification",
        baseCurrencyCode: config.baseCurrencyCode,
        quoteCurrencyCode: config.quoteCurrencyCode,
        baseCurrencyFlagEmoji: summary.baseFlagEmoji,
        quoteCurrencyFlagEmoji: summary.quoteFlagEmoji,
      },
    },
    trigger: Platform.OS === "android" ? { channelId: PINNED_CHANNEL_ID } : null,
  });

  return summary;
};

const registerBackgroundTaskAsync = async () => {
  if (Platform.OS === "web") {
    return;
  }

  const isTaskManagerAvailable = await TaskManager.isAvailableAsync();
  if (!isTaskManagerAvailable) {
    return;
  }

  const taskStatus = await BackgroundTask.getStatusAsync();
  if (taskStatus !== BackgroundTask.BackgroundTaskStatus.Available) {
    return;
  }

  await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
    minimumInterval: BACKGROUND_MIN_INTERVAL_MINUTES,
  });
};

const unregisterBackgroundTaskAsync = async () => {
  if (Platform.OS === "web") {
    return;
  }

  const isTaskManagerAvailable = await TaskManager.isAvailableAsync();
  if (!isTaskManagerAvailable) {
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (!isRegistered) {
    return;
  }

  await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK_NAME);
};

const shouldRunDailyRefresh = (
  config: PinnedRateNotificationConfig,
  now: number,
  respectRefreshTime: boolean
) => {
  if (!config.lastRate || config.lastRate <= 0) {
    return true;
  }

  if (!config.lastUpdatedDayKey) {
    return true;
  }

  const todayKey = toLocalDayKey(now);
  if (config.lastUpdatedDayKey === todayKey) {
    return false;
  }

  if (!respectRefreshTime) {
    return true;
  }

  const nowDate = new Date(now);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const refreshMinutes = config.refreshHour * 60 + config.refreshMinute;
  return nowMinutes >= refreshMinutes;
};

const createUpdatedConfig = async (
  config: PinnedRateNotificationConfig
): Promise<PinnedRateNotificationConfig> => {
  const rates = await fetchGlobalExchangeRates();
  if (!rates) {
    throw new Error("Exchange rates are currently unavailable.");
  }

  const fromRate = rates[config.baseCurrencyCode];
  const toRate = rates[config.quoteCurrencyCode];
  if (!fromRate || !toRate) {
    throw new Error(
      `Missing exchange rate for ${config.baseCurrencyCode}/${config.quoteCurrencyCode}.`
    );
  }

  const nextPairRate = toRate / fromRate;
  const trend = calculateTrend(config.lastRate, nextPairRate);
  const updatedAt = Date.now();

  return {
    ...config,
    lastRate: nextPairRate,
    lastUpdatedAt: updatedAt,
    lastUpdatedDayKey: toLocalDayKey(updatedAt),
    lastTrendDirection: trend.direction,
    lastTrendPercent: trend.percent,
  };
};

const syncPinnedNotificationAsync = async (
  config: PinnedRateNotificationConfig,
  options?: {
    force?: boolean;
    requestPermissionIfMissing?: boolean;
    respectRefreshTime?: boolean;
  }
): Promise<PinnedRateNotificationResult> => {
  const force = Boolean(options?.force);
  const requestPermissionIfMissing = Boolean(options?.requestPermissionIfMissing);
  const respectRefreshTime = options?.respectRefreshTime !== false;

  if (!config.enabled) {
    return {
      success: false,
      message: "Pinned notification is disabled.",
      config,
    };
  }

  const hasPermission = await ensurePermissionAsync(requestPermissionIfMissing);
  if (!hasPermission) {
    return {
      success: false,
      message: "Notifications permission is required to enable pinned updates.",
      config,
    };
  }

  const now = Date.now();
  const shouldRefresh =
    force || shouldRunDailyRefresh(config, now, respectRefreshTime);
  let nextConfig = config;
  let refreshed = false;

  if (shouldRefresh) {
    try {
      nextConfig = await createUpdatedConfig(config);
      persistConfig(nextConfig);
      refreshed = true;
    } catch (error) {
      console.error("Failed to refresh pinned rate notification:", error);
      if (!config.lastRate) {
        return {
          success: false,
          message: "Unable to fetch rates yet. Open the app again when online.",
          config,
        };
      }
    }
  }

  const summary = await publishPinnedNotificationAsync(nextConfig);
  const nextRefreshAt = formatTimeLabel(nextConfig.refreshHour, nextConfig.refreshMinute);

  return {
    success: true,
    message: refreshed
      ? "Pinned notification updated with the latest daily rate."
      : shouldRefresh
        ? "Latest rates were unavailable, so the previous snapshot is still pinned."
      : `Pinned notification is active. Next refresh after ${nextRefreshAt}.`,
    config: nextConfig,
    summary,
  };
};

if (!TaskManager.isTaskDefined(BACKGROUND_TASK_NAME)) {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
      const config = loadStoredConfig();
      if (!config.enabled) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }

      const result = await syncPinnedNotificationAsync(config, {
        force: false,
        requestPermissionIfMissing: false,
        respectRefreshTime: false,
      });

      return result.success
        ? BackgroundTask.BackgroundTaskResult.Success
        : BackgroundTask.BackgroundTaskResult.Failed;
    } catch (error) {
      console.error("Pinned rate background task failed:", error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export const getPinnedRateNotificationConfig = () => loadStoredConfig();

export const initializePinnedRateNotifications = async () => {
  const config = loadStoredConfig();
  if (!config.enabled) {
    return;
  }

  try {
    await registerBackgroundTaskAsync();
    await syncPinnedNotificationAsync(config, {
      force: false,
      requestPermissionIfMissing: false,
      respectRefreshTime: false,
    });
  } catch (error) {
    console.error("Failed to initialize pinned rate notifications:", error);
  }
};

export const enablePinnedRateNotification = async (
  partialConfig: Partial<PinnedRateNotificationConfig>
): Promise<PinnedRateNotificationResult> => {
  const currentConfig = loadStoredConfig();
  const nextConfig = normalizeConfig(
    { ...currentConfig, ...partialConfig, enabled: true },
    currentConfig
  );
  persistConfig(nextConfig);

  try {
    await registerBackgroundTaskAsync();
    return await syncPinnedNotificationAsync(nextConfig, {
      force: true,
      requestPermissionIfMissing: true,
    });
  } catch (error) {
    console.error("Failed to enable pinned rate notification:", error);
    return {
      success: false,
      message: "Failed to enable pinned notification.",
      config: nextConfig,
    };
  }
};

export const refreshPinnedRateNotificationNow =
  async (): Promise<PinnedRateNotificationResult> => {
    const config = loadStoredConfig();
    return syncPinnedNotificationAsync(config, {
      force: true,
      requestPermissionIfMissing: true,
    });
  };

export const disablePinnedRateNotification = async () => {
  const currentConfig = loadStoredConfig();
  const nextConfig = normalizeConfig(
    {
      ...currentConfig,
      enabled: false,
    },
    currentConfig
  );
  persistConfig(nextConfig);

  try {
    await unregisterBackgroundTaskAsync();
  } catch (error) {
    console.error("Failed to unregister pinned rate background task:", error);
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(PINNED_NOTIFICATION_ID);
  } catch (error) {
    console.error("Failed to cancel scheduled pinned notification:", error);
  }

  try {
    await Notifications.dismissNotificationAsync(PINNED_NOTIFICATION_ID);
  } catch (error) {
    console.error("Failed to dismiss pinned notification:", error);
  }

  return nextConfig;
};

export const updatePinnedRateNotificationDraft = (
  partialConfig: Partial<PinnedRateNotificationConfig>
) => {
  const currentConfig = loadStoredConfig();
  const nextConfig = normalizeConfig(
    {
      ...currentConfig,
      ...partialConfig,
    },
    currentConfig
  );
  persistConfig(nextConfig);
  return nextConfig;
};

export const getPinnedRateTrendLabel = (
  direction: RateTrendDirection,
  percent: number | null
) => getTrendLabel(direction, percent);

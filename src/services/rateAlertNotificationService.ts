import { DEFAULT_CODES } from "@/constants/currencyConverter";
import { fetchGlobalExchangeRates } from "@/services/currencyService";
import { getStoredValues, saveSecurely } from "@/store/storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

export type RateAlertCondition = "atOrAbove" | "atOrBelow";

export interface RateAlert {
  id: string;
  enabled: boolean;
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  targetRate: number;
  condition: RateAlertCondition;
  createdAt: number;
  lastCheckedAt: number | null;
  lastCheckedRate: number | null;
  triggeredAt: number | null;
}

export interface CreateRateAlertInput {
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  targetRate: number;
  condition: RateAlertCondition;
}

export interface RateAlertEvaluationResult {
  success: boolean;
  alerts: RateAlert[];
  triggeredCount: number;
  message: string;
}

const STORAGE_KEY = "rateAlerts";
const CHANNEL_ID = "rate-alerts";
const BACKGROUND_TASK_NAME = "rate-alerts-background-check";
const BACKGROUND_MIN_INTERVAL_MINUTES = 60;

const rateFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

let rateAlertsCache: RateAlert[] | null = null;
let rateAlertChannelSetupPromise: Promise<void> | null = null;

const normalizeCode = (value: unknown, fallback: string) => {
  const normalized = String(value || "")
    .toUpperCase()
    .trim();
  return normalized.length === 3 ? normalized : fallback;
};

const normalizeCondition = (
  value: unknown,
  fallback: RateAlertCondition
): RateAlertCondition =>
  value === "atOrAbove" || value === "atOrBelow" ? value : fallback;

const normalizeTargetRate = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createDefaultAlertDraft = (): CreateRateAlertInput => ({
  baseCurrencyCode: DEFAULT_CODES[0],
  quoteCurrencyCode: DEFAULT_CODES[1],
  targetRate: 1,
  condition: "atOrAbove",
});

const normalizeAlert = (
  raw: Partial<RateAlert> | null | undefined,
  fallback: RateAlert
): RateAlert => {
  const baseCurrencyCode = normalizeCode(
    raw?.baseCurrencyCode,
    fallback.baseCurrencyCode
  );
  let quoteCurrencyCode = normalizeCode(
    raw?.quoteCurrencyCode,
    fallback.quoteCurrencyCode
  );
  if (baseCurrencyCode === quoteCurrencyCode) {
    quoteCurrencyCode =
      fallback.baseCurrencyCode === baseCurrencyCode
        ? DEFAULT_CODES[1]
        : fallback.baseCurrencyCode;
  }

  const createdAt = Number(raw?.createdAt);
  const lastCheckedAt = Number(raw?.lastCheckedAt);
  const lastCheckedRate = Number(raw?.lastCheckedRate);
  const triggeredAt = Number(raw?.triggeredAt);

  return {
    id:
      typeof raw?.id === "string" && raw.id.trim().length
        ? raw.id
        : fallback.id,
    enabled:
      typeof raw?.enabled === "boolean" ? raw.enabled : fallback.enabled,
    baseCurrencyCode,
    quoteCurrencyCode,
    targetRate: normalizeTargetRate(raw?.targetRate, fallback.targetRate),
    condition: normalizeCondition(raw?.condition, fallback.condition),
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : fallback.createdAt,
    lastCheckedAt:
      Number.isFinite(lastCheckedAt) && lastCheckedAt > 0 ? lastCheckedAt : null,
    lastCheckedRate:
      Number.isFinite(lastCheckedRate) && lastCheckedRate > 0 ? lastCheckedRate : null,
    triggeredAt: Number.isFinite(triggeredAt) && triggeredAt > 0 ? triggeredAt : null,
  };
};

const buildDefaultAlert = (input?: Partial<CreateRateAlertInput>): RateAlert => {
  const draft = createDefaultAlertDraft();
  const now = Date.now();
  const fallback: RateAlert = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    baseCurrencyCode: draft.baseCurrencyCode,
    quoteCurrencyCode: draft.quoteCurrencyCode,
    targetRate: draft.targetRate,
    condition: draft.condition,
    createdAt: now,
    lastCheckedAt: null,
    lastCheckedRate: null,
    triggeredAt: null,
  };

  return normalizeAlert(
    {
      ...fallback,
      ...input,
    },
    fallback
  );
};

const persistAlerts = (alerts: RateAlert[]) => {
  rateAlertsCache = alerts.map((alert) => ({ ...alert }));
  saveSecurely([{ key: STORAGE_KEY, value: JSON.stringify(alerts) }]);
};

const loadAlerts = (): RateAlert[] => {
  if (rateAlertsCache) {
    return rateAlertsCache.map((alert) => ({ ...alert }));
  }

  const stored = getStoredValues([STORAGE_KEY]);
  const rawValue = stored[STORAGE_KEY];
  if (!rawValue) {
    rateAlertsCache = [];
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      rateAlertsCache = [];
      return [];
    }

    const normalized = parsed.map((raw) => {
      const fallback = buildDefaultAlert();
      return normalizeAlert(raw as Partial<RateAlert>, fallback);
    });
    rateAlertsCache = normalized;
    return normalized.map((alert) => ({ ...alert }));
  } catch (error) {
    console.error("Failed to parse rate alerts:", error);
    rateAlertsCache = [];
    return [];
  }
};

const ensurePermissionAsync = async (requestIfMissing: boolean) => {
  if (Platform.OS === "web") {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") {
    return true;
  }
  if (!requestIfMissing || !current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
};

const ensureAndroidChannelAsync = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  if (!rateAlertChannelSetupPromise) {
    rateAlertChannelSetupPromise = Notifications.setNotificationChannelAsync(
      CHANNEL_ID,
      {
        name: "Rate Alerts",
        description:
          "Detailed alerts when currency rates hit your configured targets",
        importance: Notifications.AndroidImportance.HIGH,
        showBadge: true,
        enableVibrate: true,
        vibrationPattern: [0, 220, 120, 220],
      }
    )
      .then(() => undefined)
      .catch((error) => {
        rateAlertChannelSetupPromise = null;
        throw error;
      });
  }

  await rateAlertChannelSetupPromise;
};

const isAlertConditionMet = (
  alert: RateAlert,
  currentPairRate: number
) =>
  alert.condition === "atOrAbove"
    ? currentPairRate >= alert.targetRate
    : currentPairRate <= alert.targetRate;

const conditionLabel = (condition: RateAlertCondition) =>
  condition === "atOrAbove" ? "at or above" : "at or below";

const formatRate = (value: number) => rateFormatter.format(value);

const notifyTriggeredAlertAsync = async (alert: RateAlert, currentPairRate: number) => {
  const title = `Rate alert hit: ${alert.baseCurrencyCode}/${alert.quoteCurrencyCode}`;
  const subtitle = `Target ${conditionLabel(alert.condition)} ${formatRate(
    alert.targetRate
  )}`;
  const body = [
    `1 ${alert.baseCurrencyCode} = ${formatRate(currentPairRate)} ${alert.quoteCurrencyCode}`,
    `Target: ${conditionLabel(alert.condition)} ${formatRate(alert.targetRate)}`,
    "Alert disabled after trigger to avoid duplicate notifications.",
  ].join("\n");

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      subtitle,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        screen: "rate-alerts",
        alertId: alert.id,
        baseCurrencyCode: alert.baseCurrencyCode,
        quoteCurrencyCode: alert.quoteCurrencyCode,
      },
    },
    trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
  });
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

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (isRegistered) {
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

const syncBackgroundTaskRegistrationAsync = async (alerts: RateAlert[]) => {
  const hasEnabledAlerts = alerts.some((alert) => alert.enabled);
  if (hasEnabledAlerts) {
    await registerBackgroundTaskAsync();
    return;
  }

  await unregisterBackgroundTaskAsync();
};

export const evaluateRateAlertsNow = async (
  options?: { requestPermissionIfMissing?: boolean }
): Promise<RateAlertEvaluationResult> => {
  const alerts = loadAlerts();
  const enabledAlerts = alerts.filter((alert) => alert.enabled);
  if (!enabledAlerts.length) {
    return {
      success: true,
      alerts,
      triggeredCount: 0,
      message: "No enabled alerts to evaluate.",
    };
  }

  const rates = await fetchGlobalExchangeRates();
  if (!rates) {
    return {
      success: false,
      alerts,
      triggeredCount: 0,
      message: "Unable to fetch exchange rates right now.",
    };
  }

  const now = Date.now();
  const nextAlerts = alerts.map((alert) => ({ ...alert }));
  const triggeredAlerts: Array<{ alert: RateAlert; currentPairRate: number }> = [];
  let permissionBlockedCount = 0;

  for (const alert of nextAlerts) {
    if (!alert.enabled) {
      continue;
    }

    const fromRate = rates[alert.baseCurrencyCode];
    const toRate = rates[alert.quoteCurrencyCode];
    if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
      continue;
    }

    const currentPairRate = toRate / fromRate;
    alert.lastCheckedRate = currentPairRate;
    alert.lastCheckedAt = now;

    if (isAlertConditionMet(alert, currentPairRate)) {
      triggeredAlerts.push({ alert, currentPairRate });
    }
  }

  if (triggeredAlerts.length) {
    const hasPermission = await ensurePermissionAsync(
      Boolean(options?.requestPermissionIfMissing)
    );

    if (hasPermission) {
      await ensureAndroidChannelAsync();
      await Promise.all(
        triggeredAlerts.map(({ alert, currentPairRate }) =>
          notifyTriggeredAlertAsync(alert, currentPairRate)
        )
      );
      triggeredAlerts.forEach(({ alert }) => {
        alert.enabled = false;
        alert.triggeredAt = now;
      });
    } else {
      permissionBlockedCount = triggeredAlerts.length;
    }
  }

  persistAlerts(nextAlerts);
  await syncBackgroundTaskRegistrationAsync(nextAlerts);

  if (!triggeredAlerts.length) {
    return {
      success: true,
      alerts: nextAlerts,
      triggeredCount: 0,
      message: "No alerts triggered with the latest rates.",
    };
  }

  if (permissionBlockedCount > 0) {
    return {
      success: true,
      alerts: nextAlerts,
      triggeredCount: 0,
      message:
        permissionBlockedCount === 1
          ? "1 alert condition matched, but notifications are not permitted. The alert remains enabled."
          : `${permissionBlockedCount} alert conditions matched, but notifications are not permitted. Alerts remain enabled.`,
    };
  }

  return {
    success: true,
    alerts: nextAlerts,
    triggeredCount: triggeredAlerts.length,
    message:
      triggeredAlerts.length === 1
        ? "1 alert triggered and a detailed notification was sent."
        : `${triggeredAlerts.length} alerts triggered and detailed notifications were sent.`,
  };
};

if (!TaskManager.isTaskDefined(BACKGROUND_TASK_NAME)) {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
      const result = await evaluateRateAlertsNow({
        requestPermissionIfMissing: false,
      });

      return result.success
        ? BackgroundTask.BackgroundTaskResult.Success
        : BackgroundTask.BackgroundTaskResult.Failed;
    } catch (error) {
      console.error("Rate alerts background task failed:", error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export const getRateAlerts = () => loadAlerts();

export const createRateAlert = async (
  input: CreateRateAlertInput
): Promise<RateAlertEvaluationResult> => {
  const alerts = loadAlerts();
  const nextAlert = buildDefaultAlert(input);
  const nextAlerts = [nextAlert, ...alerts];
  persistAlerts(nextAlerts);
  await syncBackgroundTaskRegistrationAsync(nextAlerts);
  return evaluateRateAlertsNow({ requestPermissionIfMissing: true });
};

export const toggleRateAlertEnabled = async (
  alertId: string,
  enabled: boolean
): Promise<RateAlert[]> => {
  const alerts = loadAlerts();
  const nextAlerts = alerts.map((alert) =>
    alert.id === alertId
      ? {
          ...alert,
          enabled,
          triggeredAt: enabled ? null : alert.triggeredAt,
        }
      : alert
  );
  persistAlerts(nextAlerts);
  await syncBackgroundTaskRegistrationAsync(nextAlerts);
  return nextAlerts;
};

export const deleteRateAlert = async (alertId: string): Promise<RateAlert[]> => {
  const alerts = loadAlerts();
  const nextAlerts = alerts.filter((alert) => alert.id !== alertId);
  persistAlerts(nextAlerts);
  await syncBackgroundTaskRegistrationAsync(nextAlerts);
  return nextAlerts;
};

export const initializeRateAlerts = async () => {
  const alerts = loadAlerts();
  try {
    await syncBackgroundTaskRegistrationAsync(alerts);
    if (alerts.some((alert) => alert.enabled)) {
      await evaluateRateAlertsNow({ requestPermissionIfMissing: false });
    }
  } catch (error) {
    console.error("Failed to initialize rate alerts:", error);
  }
};

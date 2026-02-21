import { getStoredValues, saveSecurely } from "@/store/storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

interface RetentionReminderState {
  lastCurrencyCheckAt: number;
  lastScheduledAt: number;
}

interface ReminderTemplate {
  title: string;
  body: string;
}

interface ReminderStage {
  id: string;
  delayMs: number;
  minuteOffset: number;
}

const RETENTION_STATE_KEY = "retentionReminderState";
const RETENTION_PERMISSION_PROMPTED_KEY = "retentionReminderPermissionPrompted";
const SELECTED_CODES_STORAGE_KEY = "selectedCurrencyCodes";
const PINNED_CONFIG_STORAGE_KEY = "pinnedRateNotificationConfig";

const RETENTION_CHANNEL_ID = "retention-reminders";
const RETENTION_NOTIFICATION_IDS = [
  "retention-reminder-1",
  "retention-reminder-2",
  "retention-reminder-3",
] as const;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const MIN_SCHEDULE_LEAD_MS = 60 * 1000;
const TRACK_ACTIVITY_THROTTLE_MS = 10 * MINUTE_MS;

const REMINDER_WINDOW_START_HOUR = 10;
const REMINDER_WINDOW_END_HOUR = 20;
const REMINDER_WINDOW_MINUTE = 15;

const REMINDER_STAGES: ReadonlyArray<ReminderStage> = [
  {
    id: RETENTION_NOTIFICATION_IDS[0],
    delayMs: 30 * HOUR_MS,
    minuteOffset: 0,
  },
  {
    id: RETENTION_NOTIFICATION_IDS[1],
    delayMs: 78 * HOUR_MS,
    minuteOffset: 5,
  },
  {
    id: RETENTION_NOTIFICATION_IDS[2],
    delayMs: 174 * HOUR_MS,
    minuteOffset: 10,
  },
];

let retentionStateCache: RetentionReminderState | null = null;
let retentionPermissionPromptedCache: boolean | null = null;
let retentionChannelSetupPromise: Promise<void> | null = null;

const createDefaultState = (): RetentionReminderState => ({
  lastCurrencyCheckAt: 0,
  lastScheduledAt: 0,
});

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const normalizeState = (
  raw: Partial<RetentionReminderState> | null | undefined
): RetentionReminderState => {
  const fallback = createDefaultState();
  return {
    lastCurrencyCheckAt: parsePositiveNumber(
      raw?.lastCurrencyCheckAt,
      fallback.lastCurrencyCheckAt
    ),
    lastScheduledAt: parsePositiveNumber(raw?.lastScheduledAt, fallback.lastScheduledAt),
  };
};

const loadState = (): RetentionReminderState => {
  if (retentionStateCache) {
    return retentionStateCache;
  }

  const stored = getStoredValues([RETENTION_STATE_KEY]);
  const rawValue = stored[RETENTION_STATE_KEY];

  if (!rawValue) {
    const defaultState = createDefaultState();
    retentionStateCache = defaultState;
    return defaultState;
  }

  try {
    const normalized = normalizeState(JSON.parse(rawValue));
    retentionStateCache = normalized;
    return normalized;
  } catch (error) {
    console.error("Failed to parse retention reminder state:", error);
    const defaultState = createDefaultState();
    retentionStateCache = defaultState;
    return defaultState;
  }
};

const persistState = (state: RetentionReminderState) => {
  retentionStateCache = { ...state };
  saveSecurely([{ key: RETENTION_STATE_KEY, value: JSON.stringify(state) }]);
};

const parseSelectedCurrencyCodes = (rawValue?: string | null): string[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => String(value || "").toUpperCase().trim())
      .filter((code) => code.length === 3);
  } catch (error) {
    console.error("Failed to parse selected currency codes for reminders:", error);
    return [];
  }
};

const getTrackedPairLabel = (rawSelectedCodes?: string | null) => {
  const selectedCodes =
    rawSelectedCodes === undefined
      ? parseSelectedCurrencyCodes(
          getStoredValues([SELECTED_CODES_STORAGE_KEY])[SELECTED_CODES_STORAGE_KEY]
        )
      : parseSelectedCurrencyCodes(rawSelectedCodes);

  if (selectedCodes.length >= 2) {
    return `${selectedCodes[0]}/${selectedCodes[1]}`;
  }
  if (selectedCodes.length === 1) {
    return `${selectedCodes[0]} rates`;
  }
  return "your currencies";
};

const isPinnedRateNotificationEnabled = (rawPinnedConfig?: string | null) => {
  const rawValue =
    rawPinnedConfig === undefined
      ? getStoredValues([PINNED_CONFIG_STORAGE_KEY])[PINNED_CONFIG_STORAGE_KEY]
      : rawPinnedConfig;

  if (!rawValue) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawValue) as { enabled?: unknown };
    return Boolean(parsed?.enabled);
  } catch (error) {
    console.error("Failed to parse pinned notification config for reminders:", error);
    return false;
  }
};

const ensureAndroidChannelAsync = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  if (!retentionChannelSetupPromise) {
    retentionChannelSetupPromise = Notifications.setNotificationChannelAsync(
      RETENTION_CHANNEL_ID,
      {
        name: "Currency Check Reminders",
        description: "Gentle reminders when you have not checked your currencies recently.",
        importance: Notifications.AndroidImportance.DEFAULT,
        enableVibrate: true,
        vibrationPattern: [0, 180, 120, 180],
        showBadge: true,
      }
    )
      .then(() => undefined)
      .catch((error) => {
        retentionChannelSetupPromise = null;
        throw error;
      });
  }

  await retentionChannelSetupPromise;
};

const ensurePermissionAsync = async (requestIfMissing: boolean) => {
  if (Platform.OS === "web") {
    return false;
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  if (currentPermission.status === "granted") {
    return true;
  }

  if (!requestIfMissing || !currentPermission.canAskAgain) {
    return false;
  }

  if (retentionPermissionPromptedCache === null) {
    const stored = getStoredValues([RETENTION_PERMISSION_PROMPTED_KEY]);
    retentionPermissionPromptedCache = stored[RETENTION_PERMISSION_PROMPTED_KEY] === "1";
  }
  if (retentionPermissionPromptedCache) {
    return false;
  }

  saveSecurely([{ key: RETENTION_PERMISSION_PROMPTED_KEY, value: "1" }]);
  retentionPermissionPromptedCache = true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
};

const cancelRetentionRemindersAsync = async () => {
  await Promise.all(
    RETENTION_NOTIFICATION_IDS.map((notificationId) =>
      Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined)
    )
  );
};

const normalizeReminderTimestamp = (timestamp: number, minuteOffset: number) => {
  const reminderDate = new Date(timestamp);
  const windowMinute = Math.min(55, REMINDER_WINDOW_MINUTE + minuteOffset);

  if (reminderDate.getHours() < REMINDER_WINDOW_START_HOUR) {
    reminderDate.setHours(REMINDER_WINDOW_START_HOUR, windowMinute, 0, 0);
    return reminderDate.getTime();
  }

  if (reminderDate.getHours() >= REMINDER_WINDOW_END_HOUR) {
    reminderDate.setDate(reminderDate.getDate() + 1);
    reminderDate.setHours(REMINDER_WINDOW_START_HOUR, windowMinute, 0, 0);
    return reminderDate.getTime();
  }

  reminderDate.setSeconds(0, 0);
  return reminderDate.getTime();
};

const toFutureReminderTimestamp = (
  baseTimestamp: number,
  minuteOffset: number,
  now = Date.now()
) => {
  let targetTimestamp = Math.max(baseTimestamp, now + MIN_SCHEDULE_LEAD_MS);
  targetTimestamp = normalizeReminderTimestamp(targetTimestamp, minuteOffset);

  if (targetTimestamp <= now + MIN_SCHEDULE_LEAD_MS) {
    targetTimestamp = normalizeReminderTimestamp(
      now + 30 * MINUTE_MS,
      minuteOffset
    );
  }

  return targetTimestamp;
};

const buildReminderTemplates = (pairLabel: string, stageIndex: number): ReminderTemplate[] => {
  if (stageIndex === 0) {
    return [
      {
        title: "Quick currency check?",
        body: `You have not checked ${pairLabel} recently. Open the app for a quick update.`,
      },
      {
        title: "Your rates are waiting",
        body: `Take 10 seconds to check ${pairLabel} and stay in sync with the latest moves.`,
      },
      {
        title: "Do not miss rate changes",
        body: `A quick look at ${pairLabel} now can help with your next transfer.`,
      },
    ];
  }

  if (stageIndex === 1) {
    return [
      {
        title: "Markets move fast",
        body: `It has been a few days since you checked ${pairLabel}. See where rates are now.`,
      },
      {
        title: "Stay ahead of currency swings",
        body: `Check ${pairLabel} today to avoid surprises on your next conversion.`,
      },
      {
        title: "Fresh currency snapshot",
        body: `Open the app for a quick ${pairLabel} update and compare the latest rate.`,
      },
    ];
  }

  return [
    {
      title: "Still tracking currencies?",
      body: `Come back for a fresh ${pairLabel} check and keep your rates under control.`,
    },
    {
      title: "Your converter misses you",
      body: `Rates can shift week to week. Check ${pairLabel} before your next exchange.`,
    },
    {
      title: "Time for a weekly rate check",
      body: `Open the app and get a quick pulse on ${pairLabel} in under a minute.`,
    },
  ];
};

const pickReminderTemplate = (
  stageIndex: number,
  pairLabel: string,
  lastCurrencyCheckAt: number
) => {
  const templates = buildReminderTemplates(pairLabel, stageIndex);
  const daySeed = Math.floor(lastCurrencyCheckAt / (24 * HOUR_MS));
  const variantIndex = Math.abs(daySeed + stageIndex) % templates.length;
  return templates[variantIndex] || templates[0];
};

const scheduleReminderSequenceAsync = async (
  state: RetentionReminderState,
  requestPermissionIfMissing: boolean
) => {
  if (Platform.OS === "web") {
    return false;
  }

  const stored = getStoredValues([
    SELECTED_CODES_STORAGE_KEY,
    PINNED_CONFIG_STORAGE_KEY,
  ]);
  if (
    state.lastCurrencyCheckAt <= 0 ||
    isPinnedRateNotificationEnabled(stored[PINNED_CONFIG_STORAGE_KEY])
  ) {
    await cancelRetentionRemindersAsync();
    return false;
  }

  const hasPermission = await ensurePermissionAsync(requestPermissionIfMissing);
  if (!hasPermission) {
    return false;
  }

  await ensureAndroidChannelAsync();
  await cancelRetentionRemindersAsync();

  const pairLabel = getTrackedPairLabel(stored[SELECTED_CODES_STORAGE_KEY]);
  const now = Date.now();
  let previousTriggerAt = 0;

  for (let index = 0; index < REMINDER_STAGES.length; index += 1) {
    const stage = REMINDER_STAGES[index];
    const template = pickReminderTemplate(index, pairLabel, state.lastCurrencyCheckAt);
    const baseTriggerAt = state.lastCurrencyCheckAt + stage.delayMs;
    let triggerAt = toFutureReminderTimestamp(baseTriggerAt, stage.minuteOffset, now);

    if (previousTriggerAt && triggerAt <= previousTriggerAt + 30 * MINUTE_MS) {
      triggerAt = toFutureReminderTimestamp(
        previousTriggerAt + 30 * MINUTE_MS,
        stage.minuteOffset,
        now
      );
    }

    await Notifications.scheduleNotificationAsync({
      identifier: stage.id,
      content: {
        title: template.title,
        body: template.body,
        sound: true,
        data: {
          screen: "index",
          type: "retention-reminder",
          pairLabel,
          stage: `${index + 1}`,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerAt),
        ...(Platform.OS === "android" ? { channelId: RETENTION_CHANNEL_ID } : {}),
      },
    });

    previousTriggerAt = triggerAt;
  }

  persistState({
    ...state,
    lastScheduledAt: now,
  });

  return true;
};

export const initializeRetentionReminders = async () => {
  const state = loadState();

  try {
    await scheduleReminderSequenceAsync(state, false);
  } catch (error) {
    console.error("Failed to initialize retention reminders:", error);
  }
};

export const trackCurrencyCheckActivity = async () => {
  if (Platform.OS === "web") {
    return;
  }

  const currentState = loadState();
  const now = Date.now();
  const shouldSkipUpdate =
    currentState.lastCurrencyCheckAt > 0 &&
    now - currentState.lastCurrencyCheckAt < TRACK_ACTIVITY_THROTTLE_MS;

  if (shouldSkipUpdate) {
    return;
  }

  const nextState: RetentionReminderState = {
    ...currentState,
    lastCurrencyCheckAt: now,
  };
  persistState(nextState);

  try {
    await scheduleReminderSequenceAsync(nextState, true);
  } catch (error) {
    console.error("Failed to schedule retention reminders:", error);
  }
};

import { getStoredValues, saveSecurely } from "@/store/storage";

export interface WidgetPreferences {
  enabled: boolean;
  showPairSnapshot: boolean;
  showConversionPreview: boolean;
}

const STORAGE_KEY = "widgetPreferences";

const defaultWidgetPreferences: WidgetPreferences = {
  enabled: false,
  showPairSnapshot: true,
  showConversionPreview: true,
};

let widgetPreferencesCache: WidgetPreferences | null = null;

const normalizePreferences = (
  value: Partial<WidgetPreferences> | null | undefined
): WidgetPreferences => ({
  enabled:
    typeof value?.enabled === "boolean"
      ? value.enabled
      : defaultWidgetPreferences.enabled,
  showPairSnapshot:
    typeof value?.showPairSnapshot === "boolean"
      ? value.showPairSnapshot
      : defaultWidgetPreferences.showPairSnapshot,
  showConversionPreview:
    typeof value?.showConversionPreview === "boolean"
      ? value.showConversionPreview
      : defaultWidgetPreferences.showConversionPreview,
});

const persistPreferences = (preferences: WidgetPreferences) => {
  widgetPreferencesCache = { ...preferences };
  saveSecurely([{ key: STORAGE_KEY, value: JSON.stringify(preferences) }]);
};

const loadPreferences = (): WidgetPreferences => {
  if (widgetPreferencesCache) {
    return { ...widgetPreferencesCache };
  }

  const stored = getStoredValues([STORAGE_KEY]);
  const rawValue = stored[STORAGE_KEY];
  if (!rawValue) {
    widgetPreferencesCache = { ...defaultWidgetPreferences };
    return { ...widgetPreferencesCache };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<WidgetPreferences>;
    const normalized = normalizePreferences(parsed);
    widgetPreferencesCache = normalized;
    return { ...normalized };
  } catch (error) {
    console.error("Failed to parse widget preferences:", error);
    widgetPreferencesCache = { ...defaultWidgetPreferences };
    return { ...widgetPreferencesCache };
  }
};

export const getWidgetPreferences = (): WidgetPreferences => loadPreferences();

export const updateWidgetPreferences = (
  partial: Partial<WidgetPreferences>
): WidgetPreferences => {
  const current = loadPreferences();
  const next = normalizePreferences({
    ...current,
    ...partial,
  });
  persistPreferences(next);
  return { ...next };
};

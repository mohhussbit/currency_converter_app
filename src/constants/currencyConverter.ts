export const DEBOUNCE_DELAY = 1000;
export const MIN_ROWS = 2;
export const MAX_ROWS = 5;
export const MAX_RECENT_CURRENCIES = 10;
export const MAX_ACTIVE_INPUT_LENGTH = 15;
export const DEFAULT_CODES = ["USD", "KES"] as const;
export const RECENT_CURRENCY_CODES_KEY = "recentCurrencyCodes";
export const KEYPAD_ROWS = [
  ["C", "<", "%", "/"],
  ["7", "8", "9", "x"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["00", "0", ".", "="],
] as const;

import {
  DEFAULT_CODES,
  MAX_ACTIVE_INPUT_LENGTH,
  MAX_ROWS,
  MIN_ROWS,
} from "@/constants/currencyConverter";
import type { Currency } from "@/services/currencyService";

export const formatNumber = (num: number): string =>
  num.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

export const isOperator = (value: string) =>
  value === "+" || value === "-" || value === "*" || value === "/";

const clampExpressionLength = (value: string) =>
  value.slice(0, MAX_ACTIVE_INPUT_LENGTH);

const sanitizeExpression = (value: string) =>
  value
    .replace(/x/g, "*")
    .replace(/[^0-9+\-*/.]/g, "")
    .replace(/\/{2,}/g, "/");

export const sanitizeAndLimitExpression = (value: string) =>
  clampExpressionLength(sanitizeExpression(value));

export const formatInput = (num: number): string => {
  const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
  return sanitizeAndLimitExpression(`${rounded}`);
};

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

export const formatExpressionDisplay = (rawValue: string) => {
  if (!rawValue) {
    return "0";
  }

  const expression = clampExpressionLength(rawValue).replace(/\*/g, "x");
  const tokens = expression.split(/([+\-/x])/);

  return tokens
    .map((token) =>
      /^[0-9]*\.?[0-9]*$/.test(token) ? formatNumericToken(token) : token
    )
    .join("");
};

export const evaluateExpression = (expression: string): number | null => {
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

export const normalizeCodes = (codes: string[], currencies: Currency[]) => {
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

export const formatLastUpdated = (timestamp: number | null) => {
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

export const parseStoredTimestamp = (value?: string) => {
  if (!value) {
    return null;
  }

  const stamp = Number(value);
  return Number.isFinite(stamp) ? stamp : null;
};

export const normalizeCodeList = (codes: unknown): string[] => {
  if (!Array.isArray(codes)) {
    return [];
  }

  const uniqueCodes: string[] = [];
  const seen = new Set<string>();

  codes.forEach((rawCode) => {
    const normalizedCode = String(rawCode).toUpperCase().trim();
    if (!normalizedCode || seen.has(normalizedCode)) {
      return;
    }

    seen.add(normalizedCode);
    uniqueCodes.push(normalizedCode);
  });

  return uniqueCodes;
};

export const areCodeListsEqual = (first: string[], second: string[]) =>
  first.length === second.length &&
  first.every((code, index) => code === second[index]);

export const prependCurrencyCode = (
  codes: string[],
  code: string,
  limit: number
) => {
  const normalizedCode = code.toUpperCase();
  return [
    normalizedCode,
    ...codes.filter((existingCode) => existingCode !== normalizedCode),
  ].slice(0, limit);
};

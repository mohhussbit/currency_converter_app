import {
  DEFAULT_CODES,
  MAX_ACTIVE_INPUT_LENGTH,
  MAX_ROWS,
  MIN_ROWS,
} from "@/constants/currencyConverter";
import type { Currency } from "@/services/currencyService";

export const formatNumber = (num: number): string =>
  numberFormatter.format(num);

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const THOUSANDS_SEPARATOR_REGEX = /\B(?=(\d{3})+(?!\d))/g;
const INPUT_SANITIZE_REGEX = /[^0-9+\-*/.]/g;
const MULTI_SLASH_REGEX = /\/{2,}/g;
const EXPRESSION_TOKEN_SPLIT_REGEX = /([+\-/x])/;
const NUMERIC_TOKEN_REGEX = /^[0-9]*\.?[0-9]*$/;

export const isOperator = (value: string) =>
  value === "+" || value === "-" || value === "*" || value === "/";

const clampExpressionLength = (value: string) =>
  value.slice(0, MAX_ACTIVE_INPUT_LENGTH);

const sanitizeExpression = (value: string) =>
  value
    .replace(/x/g, "*")
    .replace(INPUT_SANITIZE_REGEX, "")
    .replace(MULTI_SLASH_REGEX, "/");

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
  const groupedWhole = wholePart.replace(THOUSANDS_SEPARATOR_REGEX, ",");

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
  const tokens = expression.split(EXPRESSION_TOKEN_SPLIT_REGEX);

  return tokens
    .map((token) => (NUMERIC_TOKEN_REGEX.test(token) ? formatNumericToken(token) : token))
    .join("");
};

const getOperatorPrecedence = (operator: string) =>
  operator === "+" || operator === "-" ? 1 : 2;

const applyOperator = (values: number[], operator: string): boolean => {
  if (values.length < 2) {
    return false;
  }

  const right = values.pop()!;
  const left = values.pop()!;
  let result = 0;

  if (operator === "+") {
    result = left + right;
  } else if (operator === "-") {
    result = left - right;
  } else if (operator === "*") {
    result = left * right;
  } else if (operator === "/") {
    if (right === 0) {
      return false;
    }
    result = left / right;
  } else {
    return false;
  }

  if (!Number.isFinite(result)) {
    return false;
  }

  values.push(result);
  return true;
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

  const values: number[] = [];
  const operators: string[] = [];
  const length = safeExpression.length;
  let index = 0;
  let expectingNumber = true;

  while (index < length) {
    const char = safeExpression[index];

    if (expectingNumber) {
      let sign = 1;
      if (char === "+" || char === "-") {
        sign = char === "-" ? -1 : 1;
        index += 1;
      }

      const numberStart = index;
      let decimalCount = 0;

      while (index < length) {
        const current = safeExpression[index];
        if (current >= "0" && current <= "9") {
          index += 1;
          continue;
        }
        if (current === ".") {
          decimalCount += 1;
          if (decimalCount > 1) {
            return null;
          }
          index += 1;
          continue;
        }
        break;
      }

      if (numberStart === index) {
        return null;
      }

      const parsedValue = Number(safeExpression.slice(numberStart, index));
      if (!Number.isFinite(parsedValue)) {
        return null;
      }

      values.push(sign * parsedValue);
      expectingNumber = false;
      continue;
    }

    if (!isOperator(char)) {
      return null;
    }

    while (
      operators.length > 0 &&
      getOperatorPrecedence(operators[operators.length - 1]) >=
        getOperatorPrecedence(char)
    ) {
      const operator = operators.pop()!;
      if (!applyOperator(values, operator)) {
        return null;
      }
    }

    operators.push(char);
    expectingNumber = true;
    index += 1;
  }

  if (expectingNumber) {
    return null;
  }

  while (operators.length > 0) {
    const operator = operators.pop()!;
    if (!applyOperator(values, operator)) {
      return null;
    }
  }

  if (values.length !== 1 || !Number.isFinite(values[0])) {
    return null;
  }

  return values[0];
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

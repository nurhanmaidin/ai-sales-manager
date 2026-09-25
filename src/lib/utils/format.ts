import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";

type Numeric = number | string | { toString(): string } | null | undefined;

export function toNumber(value: Numeric): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  MYR: "RM",
  SGD: "S$",
  USD: "US$",
  IDR: "Rp",
  THB: "฿",
  PHP: "₱",
  BND: "B$",
};

export function currencySymbol(currency = "MYR") {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/** Formats money as e.g. `RM 12,800.00`. */
export function formatMoney(value: Numeric, currency = "MYR") {
  const amount = toNumber(value).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencySymbol(currency)} ${amount}`;
}

/** Compact money for KPI tiles and charts: `RM 9k`, `RM 128.4k`, `RM 1.2M`. */
export function formatMoneyCompact(value: Numeric, currency = "MYR") {
  const n = toNumber(value);
  const symbol = currencySymbol(currency);
  if (Math.abs(n) >= 1_000_000)
    return `${symbol} ${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1_000) return `${symbol} ${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${symbol} ${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return format(new Date(date), "d MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return format(new Date(date), "d MMM yyyy, h:mm a");
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  if (Math.abs(diffMs) < 60_000) return "just now";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

/** Human due-date label: "Today", "Tomorrow", "Yesterday", "In 3 days", "5 days overdue". */
export function formatDue(date: Date | string, now = new Date()) {
  const d = new Date(date);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return "Yesterday";
  const days = differenceInCalendarDays(d, now);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days < 7) return `In ${days} days`;
  return format(d, "d MMM yyyy");
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

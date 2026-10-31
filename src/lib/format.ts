import { getLocale, i18n } from "../i18n";

const BYTE_UNITS = ["bytes", "kilobytes", "megabytes", "gigabytes"] as const;

export function formatBytes(bytes: number, locale = getLocale()): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return `${formatCount(0, locale)} ${i18n.t("units.megabytes")}`;
  }
  const index = Math.min(
    BYTE_UNITS.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** index;
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: index <= 1 ? 0 : 1,
  }).format(value);
  return `${formatted} ${i18n.t(`units.${BYTE_UNITS[index]}`)}`;
}

export function formatDate(iso: string, locale = getLocale()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return i18n.t("units.unknown");
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCount(count: number, locale = getLocale()): string {
  return new Intl.NumberFormat(locale).format(count);
}

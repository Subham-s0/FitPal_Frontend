/**
 * Shared formatting utilities for dates, times, and display values
 */

/**
 * Format a date-time string for display
 * @param value - ISO date string or null
 * @returns Formatted date-time or "Not recorded"
 */
export function formatDateTime(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Format a routine type enum value for display
 * @param value - Routine type string (e.g., "UPPER_LOWER")
 * @returns Human-readable format (e.g., "Upper Lower")
 */
export function formatRoutineType(value: string | null): string {
  if (!value) return "General";
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Format a structure type enum value for display
 * @param value - Structure type ("NUMBERED" or "WEEKLY")
 * @returns Human-readable format
 */
export function formatStructureType(value: string): string {
  return value === "NUMBERED" ? "Numbered progression" : "Weekly split";
}

/**
 * Format a date string for display (date only, no time)
 * @param value - ISO date string or null
 * @returns Formatted date or "Not set"
 */
export function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours")
 * @param value - ISO date string or null
 * @returns Relative time string or "Unknown"
 */
export function formatRelativeTime(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (diffSec < 60) {
    return rtf.format(Math.floor(diffMs / 1000), "second");
  }
  if (diffSec < 3600) {
    return rtf.format(Math.floor(diffMs / 60000), "minute");
  }
  if (diffSec < 86400) {
    return rtf.format(Math.floor(diffMs / 3600000), "hour");
  }
  if (diffSec < 604800) {
    return rtf.format(Math.floor(diffMs / 86400000), "day");
  }
  if (diffSec < 2592000) {
    return rtf.format(Math.floor(diffMs / 604800000), "week");
  }
  if (diffSec < 31536000) {
    return rtf.format(Math.floor(diffMs / 2592000000), "month");
  }
  return rtf.format(Math.floor(diffMs / 31536000000), "year");
}

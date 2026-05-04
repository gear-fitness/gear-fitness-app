/**
 * Date utilities
 * Helper functions for parsing and formatting dates
 */

/**
 * Parse a date string as a local date to avoid timezone issues
 * JavaScript's Date constructor treats date-only strings like "2024-12-21" as UTC midnight,
 * which can cause dates to appear a day earlier in western timezones.
 * This function explicitly parses the date components as local time.
 *
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export function parseLocalDate(dateString: string): Date {
  // Validate format and extract components
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    console.error("Invalid date format:", dateString);
    return new Date(); // Return current date as fallback
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  // Validate ranges
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error("Invalid date components:", { year, month, day, dateString });
    return new Date();
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    console.error("Date components out of range:", {
      year,
      month,
      day,
      dateString,
    });
    return new Date();
  }

  return new Date(year, month - 1, day);
}

/**
 * Format the current date as YYYY-MM-DD string in local timezone
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentLocalDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a server datetime string. The backend serializes java.time.LocalDateTime
 * as a naive ISO string with no timezone suffix (e.g. "2025-05-02T22:00:00.123456")
 * while the wall-clock value is actually UTC. JavaScript's Date constructor
 * interprets a naive ISO datetime as local time, which shifts the parsed instant
 * by the viewer's UTC offset. Append "Z" so it parses as UTC. Strings that
 * already carry timezone info pass through untouched.
 */
export function parseServerDate(dateString: string): Date {
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(dateString);
  return new Date(hasTz ? dateString : dateString + "Z");
}

export function formatTimeAgo(dateString: string): string {
  const date = parseServerDate(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export function formatDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

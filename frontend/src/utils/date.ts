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
    console.error("Date components out of range:", { year, month, day, dateString });
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

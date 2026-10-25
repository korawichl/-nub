export const BANGKOK_TIMEZONE = 'Asia/Bangkok';

/**
 * Returns YYYY-MM-DD in Asia/Bangkok timezone for a given Date (defaults to now).
 */
export function getBangkokDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Formats a YYYY-MM-DD string into a human-friendly representation (e.g., "Mon, Oct 19, 2026").
 */
export function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate);
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string.
 */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + deltaDays, 12, 0, 0));
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const THAI_MONTH_NAMES = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

export const ENG_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Returns number of days in a given year and month (month: 1-12).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Returns the day of week for the 1st of the given month (0 = Sunday, 1 = Monday, ... 6 = Saturday).
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/**
 * Parses YYYY-MM-DD into { year, month, day }.
 */
export function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return {
    year: year || new Date().getFullYear(),
    month: month || new Date().getMonth() + 1,
    day: day || 1,
  };
}

/**
 * Builds a YYYY-MM-DD string from year, month (1-12), day (1-31).
 */
export function buildDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Formats Month & Year into friendly bilingual text, e.g. "ตุลาคม 2026 (October 2026)".
 */
export function formatMonthYear(year: number, month: number): string {
  const thaiName = THAI_MONTH_NAMES[month - 1] || '';
  const engName = ENG_MONTH_NAMES[month - 1] || '';
  return `${thaiName} ${year} (${engName} ${year})`;
}

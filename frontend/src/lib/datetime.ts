/**
 * Display helpers (BR-GEN-02, BR-GEN-05, OQ-34, ADR-0013): times in Africa/Cairo, 12-hour with ص/م, dates DD/MM/YYYY,
 * Western digits only.
 */
export const BUSINESS_TZ = 'Africa/Cairo';

function parts(value: Date | string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const date = typeof value === 'string' ? new Date(value) : value;
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TZ, ...options });
  return Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
}

/** "08:00 ص" / "03:45 م" */
export function formatTime(value: Date | string): string {
  const p = parts(value, { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${p.hour}:${p.minute} ${p.dayPeriod === 'PM' ? 'م' : 'ص'}`;
}

/** "26/09/2026" */
export function formatDate(value: Date | string): string {
  const p = parts(value, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${p.day}/${p.month}/${p.year}`;
}

/** "السبت 26 سبتمبر 2026" — Arabic names, Western digits (header, US-27.1). */
export function formatLongDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    timeZone: BUSINESS_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(date)
    .replace('،', '');
}

/** Cairo calendar date "YYYY-MM-DD" for API date filters (ADR-0013). */
export function cairoDate(value: Date = new Date()): string {
  const p = parts(value, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${p.year}-${p.month}-${p.day}`;
}

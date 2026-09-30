/**
 * Integer money helpers (BR-GEN-01, ADR-0005). Money is an integer number of minor units (piastres).
 * The server is authoritative (BR-GEN-03); these helpers only parse input and format display.
 */

/** An amount in minor units (1 EGP = 100). Always a safe integer. */
export type Minor = number;

export const CURRENCY_LABEL = 'ج.م';
const MINUS = '−';
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const ARABIC_INDIC = /[٠-٩]/g;

export function isMinor(value: unknown): value is Minor {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/**
 * Parse user input ("45", "45.5", "45.50") into minor units using string arithmetic only (no parseFloat).
 * Returns null for empty/invalid input or more than 2 decimals (BR-ITEM-02, OQ-27). Arabic-Indic digits are accepted
 * and normalised (display always uses Western digits, BR-GEN-05).
 */
export function parseToMinor(input: string): Minor | null {
  const text = input.trim().replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660));
  if (!AMOUNT_RE.test(text)) return null;
  const [major = '0', fraction = ''] = text.split('.');
  const value = Number(major) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(value) ? value : null;
}

/** 485000 → "4,850.00"; -2000 → "−20.00" (OQ-34: 2 decimals, thousands separator, Western digits). */
export function formatMinor(value: Minor): string {
  if (!isMinor(value)) throw new TypeError('money must be integer minor units');
  const abs = Math.abs(value);
  const major = Math.trunc(abs / 100);
  const minor = abs % 100;
  const grouped = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${value < 0 ? MINUS : ''}${grouped}.${minor.toString().padStart(2, '0')}`;
}

/** "4,850.00 ج.م" */
export function formatMoney(value: Minor): string {
  return `${formatMinor(value)} ${CURRENCY_LABEL}`;
}

/** Whole-number percentage of an amount, rounded half-up to a whole minor unit (BR-ORD-07). */
export function percentOfMinor(subtotal: Minor, percent: number): Minor {
  if (!isMinor(subtotal) || subtotal < 0) throw new RangeError('subtotal must be a non-negative integer');
  if (!Number.isInteger(percent) || percent < 0 || percent > 100)
    throw new RangeError('percent must be 0..100');
  return Math.floor((subtotal * percent + 50) / 100);
}

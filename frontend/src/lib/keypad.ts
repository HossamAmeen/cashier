export const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const;
export type Key = (typeof KEYS)[number];

/** Apply one key to the current input string (pure; unit-tested). */
export function applyKey(value: string, key: Key, maxLength = 10): string {
  if (key === 'back') return value.slice(0, -1);
  if (key === '.') {
    if (value.includes('.')) return value;
    return value === '' ? '0.' : `${value}.`;
  }
  const [, decimals] = value.split('.');
  if (decimals !== undefined && decimals.length >= 2) return value;
  if (value.length >= maxLength) return value;
  if (value === '0') return key; // no leading zeros
  return value + key;
}

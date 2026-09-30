/**
 * On-screen numeric keypad for amounts (screens 03, 05, 13). It edits a **string**; callers convert with
 * parseToMinor (never parseFloat, ADR-0005). At most 2 decimals, Western digits (BR-GEN-01, BR-GEN-05).
 */
import { Icon } from '../Icon';
import { applyKey, KEYS } from '@/lib/keypad';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  testId?: string;
}

export function NumericKeypad({ value, onChange, disabled, testId = 'keypad' }: NumericKeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2" dir="ltr" data-testid={testId}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(applyKey(value, key))}
          aria-label={key === 'back' ? 'حذف' : key === '.' ? 'فاصلة عشرية' : key}
          data-testid={`${testId}-${key === '.' ? 'dot' : key}`}
          className="grid h-touch-lg place-items-center rounded-control border border-surface-border bg-surface text-h3 font-semibold text-ink hover:bg-surface-page active:bg-primary-soft disabled:opacity-50"
        >
          {key === 'back' ? <Icon name="backspace" size={24} /> : key}
        </button>
      ))}
    </div>
  );
}

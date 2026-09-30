/**
 * Quantity stepper (screen 11 cart, PDF p.18): − qty + in RTL order (the filled + sits at the visual left), 44 px buttons. Bounds follow BR §2 (qty 1–999, OQ-41).
 * Removing a line is a separate trash action, so − stops at the minimum.
 */
import { Icon } from '../Icon';

export const QTY_MIN = 1;
export const QTY_MAX = 999;

interface QtyStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label: string;
  testId?: string;
}

export function QtyStepper({ value, onChange, min = QTY_MIN, max = QTY_MAX, disabled, label, testId = 'qty' }: QtyStepperProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-control border border-surface-border bg-surface" data-testid={testId}>
      <button
        type="button"
        aria-label="تقليل الكمية"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        data-testid={`${testId}-dec`}
        className="grid size-touch place-items-center rounded-control text-ink hover:bg-surface-page disabled:text-ink-disabled"
      >
        <Icon name="minus" size={18} />
      </button>
      <output className="min-w-10 px-2 text-center text-body-lg font-bold tabular-nums" aria-live="polite" data-testid={`${testId}-value`}>
        {value}
      </output>
      <button
        type="button"
        aria-label="زيادة الكمية"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        data-testid={`${testId}-inc`}
        className="grid size-touch place-items-center rounded-control bg-primary text-white disabled:bg-[#e9edf2] disabled:text-ink-disabled"
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

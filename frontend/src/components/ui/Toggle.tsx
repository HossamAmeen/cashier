/** Toggle switch (active/disabled status fields on screens 10, 19). 44 px touch target, role="switch". */
import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Visible state text next to the switch, e.g. "نشط" / "معطّل" (colour is never the only signal). */
  stateLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  'data-testid'?: string;
}

export function Toggle({ checked, onChange, label, stateLabel, disabled, disabledReason, ...rest }: ToggleProps) {
  const isDisabled = Boolean(disabled || disabledReason);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={isDisabled}
        onClick={() => onChange(!checked)}
        data-testid={rest['data-testid']}
        className="inline-flex min-h-touch items-center gap-3 rounded-control disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={cn(
            'relative inline-block h-7 w-12 rounded-pill transition-colors',
            checked ? 'bg-primary' : 'bg-[#cbd5e1]',
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              'absolute top-1 size-5 rounded-full bg-white shadow transition-all',
              checked ? 'start-6' : 'start-1',
            )}
          />
        </span>
        {stateLabel && <span className="text-body font-semibold text-ink">{stateLabel}</span>}
      </button>
      {disabledReason && <span className="text-label text-ink-muted">{disabledReason}</span>}
    </div>
  );
}

/**
 * Form field (PDF p.6 "حقول الإدخال"): label above, 44+ px input with a start icon, optional end adornment (e.g. the
 * password eye or the ج.م unit), hint and an error line under the field. The active state uses the primary ring.
 */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from '../Icon';

export interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  icon?: IconName;
  end?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Numbers / amounts: typed and shown left-to-right with Western digits (BR-GEN-05). */
  numeric?: boolean;
  containerClassName?: string;
  children?: ReactNode;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, icon, end, hint, error, numeric, id, className, containerClassName, children, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      <label htmlFor={inputId} className="text-label-lg font-semibold text-ink">
        {label}
      </label>
      <div
        className={cn(
          'flex min-h-[52px] items-center gap-2 rounded-control border bg-surface px-3 transition-shadow',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          error ? 'border-danger' : 'border-surface-border',
        )}
      >
        {icon && <Icon name={icon} size={18} className="text-ink-muted" />}
        {children ? (
          children
        ) : (
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            dir={numeric ? 'ltr' : undefined}
            inputMode={numeric ? 'decimal' : undefined}
            className={cn(
              'min-w-0 flex-1 bg-transparent text-body-lg text-ink outline-none placeholder:text-ink-disabled',
              numeric && 'text-end tabular-nums',
              className,
            )}
            {...rest}
          />
        )}
        {end}
      </div>
      {hint && (
        <p id={hintId} className="text-label text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-label-lg text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

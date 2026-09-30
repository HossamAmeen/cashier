/**
 * Button (PDF p.6 "الأزرار (ارتفاع 44 / 58 للمس)"): أساسي / ثانوي / خفيف / خطر / معطّل.
 * - size `md` = 44 px (every touch target, AC-15), `lg` = 58 px (primary POS actions).
 * - `mutation`: the button changes server state, so it is disabled while offline (ADR-0012, BR §0) and points at the
 *   offline banner for its reason.
 * - `disabledReason`: disables the button and shows why, visibly (PDF p.32, US-25.7).
 */
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/useOnline';

import { Icon, type IconName } from '../Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  mutation?: boolean;
  disabledReason?: string;
  block?: boolean;
  children?: ReactNode;
}

export const OFFLINE_BANNER_ID = 'offline-banner';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-contrast shadow-[0_6px_14px_-6px_rgba(13,122,107,0.6)] hover:bg-primary-hover',
  secondary: 'border border-surface-border bg-surface text-ink hover:bg-surface-page',
  soft: 'bg-primary-soft text-primary hover:bg-[#d2ece7]',
  danger: 'bg-danger text-white hover:bg-[#b91c1c]',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-page hover:text-ink',
};

const disabledStyle = 'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#e9edf2] disabled:text-ink-disabled disabled:shadow-none';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    mutation = false,
    disabledReason,
    block = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const online = useOnline();
  const reasonId = useId();
  const offlineBlocked = mutation && !online;
  const isDisabled = Boolean(disabled || loading || disabledReason || offlineBlocked);
  const describedBy = disabledReason ? reasonId : offlineBlocked ? OFFLINE_BANNER_ID : undefined;

  const button = (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-describedby={describedBy}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-control px-5 font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        size === 'lg' ? 'h-touch-lg min-h-touch-lg text-body-lg' : 'h-touch min-h-touch text-body',
        block && 'w-full',
        variants[variant],
        disabledStyle,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />
      )}
      {children}
    </button>
  );

  if (!disabledReason) return button;
  return (
    <span className={cn('inline-flex flex-col gap-1', block && 'w-full')}>
      {button}
      <span id={reasonId} className="text-label text-ink-muted">
        {disabledReason}
      </span>
    </span>
  );
});

/**
 * Confirmation dialog (PDF p.6 "النوافذ المنبثقة"): used only to confirm sensitive actions (open/close shift, cancel
 * order, delete, disable). Coloured icon, clear title, data summary, two equal buttons تأكيد / رجوع (US-25.6,
 * BR-SHIFT-10). The server never relies on it.
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from '../Icon';
import { Button } from './Button';

type Tone = 'primary' | 'danger' | 'warning';

const toneStyles: Record<Tone, { icon: string; confirm: 'primary' | 'danger' }> = {
  primary: { icon: 'bg-primary-soft text-primary', confirm: 'primary' },
  warning: { icon: 'bg-warning-soft text-warning', confirm: 'primary' },
  danger: { icon: 'bg-danger-soft text-danger', confirm: 'danger' },
};

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  icon?: IconName;
  tone?: Tone;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** Server-side error for this action, already mapped with errorMessage() (BR-GEN-06). */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
}

export function ConfirmModal({
  open,
  title,
  icon = 'alert',
  tone = 'primary',
  children,
  confirmLabel = 'تأكيد',
  cancelLabel = 'رجوع',
  loading = false,
  error,
  onConfirm,
  onCancel,
  testId = 'confirm',
}: ConfirmModalProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, loading, onCancel]);

  if (!open) return null;
  const style = toneStyles[tone];

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/50 p-4" data-testid={`${testId}-backdrop`}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-card bg-surface p-6 shadow-xl"
        data-testid={testId}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className={cn('grid size-14 place-items-center rounded-full', style.icon)}>
            <Icon name={icon} size={28} />
          </span>
          <h2 id={titleId} className="text-h3 text-ink">
            {title}
          </h2>
          {children && <div className="w-full text-body text-ink-muted">{children}</div>}
          {error && (
            <p role="alert" className="w-full rounded-control bg-danger-soft px-3 py-2 text-body text-danger">
              {error}
            </p>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            variant={style.confirm}
            icon="check"
            mutation
            loading={loading}
            onClick={onConfirm}
            data-testid={`${testId}-ok`}
          >
            {confirmLabel}
          </Button>
          <Button
            ref={cancelRef}
            variant="secondary"
            disabled={loading}
            onClick={onCancel}
            data-testid={`${testId}-cancel`}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

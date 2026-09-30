/**
 * Status badges (PDF p.6 "شارات الحالة"): colour + text + dot, never colour alone (PDF p.32, US-25.5).
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const tones: Record<BadgeTone, { box: string; dot: string }> = {
  success: { box: 'bg-success-soft text-success', dot: 'bg-success' },
  warning: { box: 'bg-warning-soft text-[#b45309]', dot: 'bg-warning' },
  danger: { box: 'bg-danger-soft text-danger', dot: 'bg-danger' },
  info: { box: 'bg-info-soft text-info', dot: 'bg-info' },
  neutral: { box: 'bg-[#eef1f5] text-ink-muted', dot: 'bg-ink-muted' },
  primary: { box: 'bg-primary-soft text-primary', dot: 'bg-primary' },
};

/** The design-system status set with its exact Arabic labels (PDF p.6). */
export const STATUS_BADGES = {
  available: { tone: 'success', label: 'متاحة' },
  occupied: { tone: 'warning', label: 'مشغولة' },
  paid: { tone: 'success', label: 'مدفوع' },
  open: { tone: 'warning', label: 'مفتوح' },
  cancelled: { tone: 'danger', label: 'ملغي' },
  shiftOpen: { tone: 'info', label: 'وردية مفتوحة' },
  disabled: { tone: 'neutral', label: 'معطّل' },
  active: { tone: 'success', label: 'نشط' },
} as const satisfies Record<string, { tone: BadgeTone; label: string }>;

export type StatusKey = keyof typeof STATUS_BADGES;

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-label font-semibold',
        t.box,
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', t.dot)} aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: StatusKey; className?: string }) {
  const { tone, label } = STATUS_BADGES[status];
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}

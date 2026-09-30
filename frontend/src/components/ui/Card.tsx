/** Card and KPI tile (PDF p.6 "البطاقات والجداول", p.9 / p.27 KPI rows). */
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon, type IconName } from '../Icon';
import type { BadgeTone } from './Badge';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-card border border-surface-border bg-surface p-5 shadow-card', className)} {...rest}>
      {children}
    </div>
  );
}

const iconTones: Record<BadgeTone, string> = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-[#eef1f5] text-ink-muted',
};

interface KpiProps {
  label: string;
  /** Pre-formatted value (use formatMinor / Intl for numbers; Western digits, BR-GEN-05). */
  value: ReactNode;
  unit?: string;
  icon: IconName;
  tone?: BadgeTone;
  footer?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function Kpi({ label, value, unit, icon, tone = 'primary', footer, className, ...rest }: KpiProps) {
  return (
    <Card className={cn('flex flex-col gap-3', className)} data-testid={rest['data-testid']}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-body text-ink-muted">{label}</span>
        <span className={cn('grid size-10 place-items-center rounded-control', iconTones[tone])}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-kpi text-[#475569]" dir="ltr">
          {value}
        </span>
        {unit && <span className="text-h3 font-medium text-ink-muted">{unit}</span>}
      </div>
      {footer && <div className="border-t border-dashed border-surface-border pt-2 text-label text-ink-muted">{footer}</div>}
    </Card>
  );
}

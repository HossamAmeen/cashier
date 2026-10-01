/** "Simple POS / نظام الكاشير المبسط" logo block (PDF p.5, p.8). */
import { cn } from '@/lib/cn';

import { Icon } from './Icon';

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent text-white shadow-[0_6px_16px_-6px_rgba(20,184,166,0.8)]">
        <Icon name="receipt" size={22} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-body-lg font-bold">كاشيري</span>
          <span className="text-label opacity-70">نظام إدارة نقاط البيع</span>
        </span>
      )}
    </div>
  );
}

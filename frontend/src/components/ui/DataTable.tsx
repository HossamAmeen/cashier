/**
 * Data table (PDF p.6 "البطاقات والجداول"; list screens 09, 15, 16, 18). Right-aligned (RTL) header row, optional row
 * click (the whole row becomes a ≥ 44 px target), loading and empty states.
 */
import type { KeyboardEvent, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Amounts and numbers align to the end with tabular digits. */
  numeric?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  caption?: string;
  testId?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowLabel,
  loading = false,
  empty = 'لا توجد بيانات',
  caption,
  testId = 'table',
}: DataTableProps<T>) {
  const onKey = (e: KeyboardEvent, row: T) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div className="overflow-x-auto rounded-card border border-surface-border bg-surface shadow-card">
      <table className="w-full border-collapse text-start text-body" data-testid={testId} aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface-page text-label-lg text-ink-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 text-start font-semibold', c.numeric && 'text-end', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-muted">
                <span className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                <span className="sr-only">جارٍ التحميل</span>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                data-testid={`${testId}-row-${rowKey(row)}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => onKey(e, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                className={cn(
                  'h-touch border-t border-surface-border',
                  onRowClick && 'cursor-pointer hover:bg-surface-page focus-visible:bg-primary-soft focus-visible:outline-none',
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', c.numeric && 'text-end tabular-nums', c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

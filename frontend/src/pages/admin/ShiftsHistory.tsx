import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api, call } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/Icon';
import { formatMoney } from '@/lib/money';
import type { components } from '@/api/schema';

type ShiftSummary = components['schemas']['ShiftSummary'];

export function ShiftsHistory() {
  const [cashierFilter, setCashierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);

  // Fetch Cashiers for dropdown filter
  const { data: cashiers } = useQuery({
    queryKey: ['cashiers-list'],
    queryFn: async () => {
      return await call(() => api.GET('/api/cashiers'));
    },
  });

  // Fetch Shifts
  const { data: shiftsData, isLoading, refetch } = useQuery({
    queryKey: ['shifts', cashierFilter, statusFilter],
    queryFn: async () => {
      return await call(() =>
        api.GET('/api/shifts', {
          params: {
            query: {
              cashier_id: cashierFilter ? Number(cashierFilter) : undefined,
              status: statusFilter ? (statusFilter as 'OPEN' | 'CLOSED') : undefined,
            },
          },
        }),
      );
    },
  });

  // Fetch detail for selected shift
  const { data: selectedShiftDetail } = useQuery({
    queryKey: ['shift-detail', selectedShiftId],
    enabled: selectedShiftId !== null,
    queryFn: async () => {
      if (!selectedShiftId) return null;
      return await call(() =>
        api.GET('/api/shifts/{id}', {
          params: { path: { id: selectedShiftId } },
        }),
      );
    },
  });

  const shifts = shiftsData?.items || [];

  const columns: Column<ShiftSummary>[] = [
    {
      key: 'code',
      header: 'رقم الوردية',
      cell: (row) => <span className="font-extrabold text-slate-900">{row.code}</span>,
    },
    {
      key: 'cashier',
      header: 'الكاشير',
      cell: (row) => row.cashier_name,
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (row) => (
        <Badge tone={row.status === 'OPEN' ? 'success' : 'neutral'}>
          {row.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
        </Badge>
      ),
    },
    {
      key: 'opened_at',
      header: 'تاريخ الفتح',
      cell: (row) => new Date(row.opened_at).toLocaleString('ar-EG'),
    },
    {
      key: 'closed_at',
      header: 'تاريخ الإغلاق',
      cell: (row) => (row.closed_at ? new Date(row.closed_at).toLocaleString('ar-EG') : '—'),
    },
    {
      key: 'orders_count',
      header: 'الطلبات',
      cell: (row) => `${row.orders_count} طلب`,
    },
    {
      key: 'sales_total',
      header: 'إجمالي المبيعات',
      cell: (row) => (
        <span className="font-bold text-[#0d7a6b]">{formatMoney(row.sales_total_minor)}</span>
      ),
    },
    {
      key: 'difference',
      header: 'الفرق (عجز/زيادة)',
      cell: (row) => {
        if (row.status === 'OPEN' || row.difference_minor === null) return '—';
        if (row.difference_minor === 0) return <Badge tone="success">مطابق</Badge>;
        if (row.difference_minor > 0)
          return <Badge tone="warning">+{formatMoney(row.difference_minor)}</Badge>;
        return <Badge tone="danger">{formatMoney(row.difference_minor)}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'التفاصيل',
      cell: (row) => (
        <Button
          variant="ghost"
          onClick={() => setSelectedShiftId(row.id)}
        >
          <Icon name="receipt" size={16} />
          <span>عرض</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">سجل الورديات (Shifts History)</h1>
          <p className="text-sm text-slate-500">استعراض وتقارير الورديات المفتوحة والمغلقة</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Cashier Filter */}
          <div className="w-48">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
              الكاشير
            </label>
            <select
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#0d7a6b] focus:outline-none"
            >
              <option value="">جميع الكاشيرين</option>
              {cashiers?.items?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-44">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
              الحالة
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#0d7a6b] focus:outline-none"
            >
              <option value="">جميع الحالات</option>
              <option value="OPEN">مفتوحة (OPEN)</option>
              <option value="CLOSED">مغلقة (CLOSED)</option>
            </select>
          </div>

          <div className="pt-5">
            <Button variant="secondary" onClick={() => refetch()}>
              تحديث
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="p-0 overflow-hidden">
        <DataTable<ShiftSummary>
          loading={isLoading}
          rows={shifts}
          rowKey={(row) => row.id.toString()}
          empty="لا توجد ورديات مطابقة للفلاتر."
          columns={columns}
        />
      </Card>

      {/* Detail Modal */}
      {selectedShiftDetail && (
        <Modal
          open={true}
          title={`تفاصيل الوردية ${selectedShiftDetail.code}`}
          onClose={() => setSelectedShiftId(null)}
        >
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span className="font-bold">{selectedShiftDetail.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span>الحالة:</span>
                <Badge tone={selectedShiftDetail.status === 'OPEN' ? 'success' : 'neutral'}>
                  {selectedShiftDetail.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>وقت الفتح:</span>
                <span>{new Date(selectedShiftDetail.opened_at).toLocaleString('ar-EG')}</span>
              </div>
              {selectedShiftDetail.closed_at && (
                <div className="flex justify-between">
                  <span>وقت الإغلاق:</span>
                  <span>{new Date(selectedShiftDetail.closed_at).toLocaleString('ar-EG')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>عهدة البداية:</span>
                <span>{formatMoney(selectedShiftDetail.opening_balance_minor)}</span>
              </div>
              <div className="flex justify-between">
                <span>المبيعات النقدي (CASH):</span>
                <span>{formatMoney(selectedShiftDetail.cash_total_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>المبيعات الشبكة (CARD):</span>
                <span>{formatMoney(selectedShiftDetail.card_total_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between font-extrabold border-t border-slate-200 pt-2 text-slate-900">
                <span>إجمالي المبيعات:</span>
                <span>{formatMoney(selectedShiftDetail.sales_total_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>المبلغ المتوقع:</span>
                <span>{formatMoney(selectedShiftDetail.expected_cash_minor ?? 0)}</span>
              </div>
              {selectedShiftDetail.counted_cash_minor !== null && (
                <div className="flex justify-between">
                  <span>المبلغ الفعلي عند الجرد:</span>
                  <span>{formatMoney(selectedShiftDetail.counted_cash_minor)}</span>
                </div>
              )}
              {selectedShiftDetail.difference_minor !== null && (
                <div className="flex justify-between font-extrabold border-t border-slate-200 pt-2">
                  <span>الفرق (عجز/زيادة):</span>
                  <span>
                    {selectedShiftDetail.difference_minor === 0
                      ? 'مطابق'
                      : formatMoney(selectedShiftDetail.difference_minor)}
                  </span>
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedShiftId(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

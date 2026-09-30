import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api, call } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { formatMoney } from '@/lib/money';
import { useAuth } from '@/auth/useAuth';

interface OrderHistoryRow {
  id: number;
  number: number;
  type: 'DINE_IN' | 'TAKEAWAY';
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  table_number: number | null;
  cashier_id: number;
  cashier_name: string;
  item_count: number;
  total_minor: number;
  created_at: string;
}

export function OrdersHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { search, statusFilter, methodFilter, page }],
    queryFn: async () => {
      const res = await call(() =>
        api.GET('/api/orders', {
          params: {
            query: {
              search: search.trim() || undefined,
              status: (statusFilter as 'OPEN' | 'PAID' | 'CANCELLED') || undefined,
              payment_method: (methodFilter as 'CASH' | 'CARD') || undefined,
              page,
              page_size: 15,
            },
          },
        }),
      );
      return res;
    },
  });

  const orders = (data?.items || []) as unknown as OrderHistoryRow[];
  const todayCounts = data?.today_counts || { total: 0, paid: 0, open: 0, cancelled: 0 };
  const rawData = data as unknown as { total_count?: number; total_pages?: number };
  const totalCount = rawData?.total_count || orders.length;
  const totalPages = rawData?.total_pages || 1;

  const columns: Column<OrderHistoryRow>[] = [
    {
      key: 'number',
      header: 'رقم الطلب',
      cell: (order) => (
        <span className="font-extrabold text-[#0d7a6b]">#{order.number}</span>
      ),
    },
    {
      key: 'type',
      header: 'النوع والطاولة',
      cell: (order) => (
        <span className="text-xs font-semibold text-slate-700">
          {order.type === 'DINE_IN' ? `محلي (طاولة ${order.table_number})` : 'سفري'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (order) => {
        const tone =
          order.status === 'PAID' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'warning';
        const label =
          order.status === 'PAID' ? 'مدفوع' : order.status === 'CANCELLED' ? 'ملغي' : 'مفتوح';
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: 'cashier_name',
      header: 'الكاشير',
      cell: (order) => <span className="text-xs text-slate-600">{order.cashier_name}</span>,
    },
    {
      key: 'item_count',
      header: 'الأصناف',
      cell: (order) => <span className="font-bold text-slate-700">{order.item_count}</span>,
    },
    {
      key: 'total_minor',
      header: 'الإجمالي',
      cell: (order) => (
        <span className="font-extrabold text-slate-900">{formatMoney(order.total_minor)}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'التاريخ والوقت',
      cell: (order) => (
        <span className="text-xs text-slate-500">
          {new Date(order.created_at).toLocaleString('ar-EG', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (order) => (
        <Button variant="secondary" onClick={() => navigate(`/orders/${order.id}`)}>
          التفاصيل
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">سجل الطلبات</h1>
          <p className="text-sm text-slate-500">عرض واستعراض كافة الطلبات المسجلة في النظام</p>
        </div>
        {user?.role === 'CASHIER' && (
          <Button variant="primary" onClick={() => navigate('/orders/new')}>
            <Icon name="plus" size={18} />
            <span>طلب جديد</span>
          </Button>
        )}
      </div>

      {/* Today Counts Summary Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">إجمالي اليوم</span>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{todayCounts.total}</p>
          </div>
          <Icon name="receipt" className="text-slate-400" size={24} />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">مدفوع اليوم</span>
            <p className="mt-1 text-xl font-extrabold text-[#0d7a6b]">{todayCounts.paid}</p>
          </div>
          <Icon name="check" className="text-[#0d7a6b]" size={24} />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">مفتوح حالياً</span>
            <p className="mt-1 text-xl font-extrabold text-amber-600">{todayCounts.open}</p>
          </div>
          <Icon name="clock" className="text-amber-600" size={24} />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500">ملغي اليوم</span>
            <p className="mt-1 text-xl font-extrabold text-[#b83227]">{todayCounts.cancelled}</p>
          </div>
          <Icon name="alert" className="text-[#b83227]" size={24} />
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث برقم الطلب..."
              className="w-full rounded-lg border border-slate-200 bg-white ps-9 pe-3 py-2 text-sm focus:border-[#0d7a6b] focus:outline-none"
            />
            <Icon name="search" className="absolute start-2.5 top-2.5 text-slate-400" size={16} />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white p-2 text-sm font-medium focus:border-[#0d7a6b] focus:outline-none"
          >
            <option value="">جميع الحالات</option>
            <option value="OPEN">مفتوح (OPEN)</option>
            <option value="PAID">مدفوع (PAID)</option>
            <option value="CANCELLED">ملغي (CANCELLED)</option>
          </select>

          {/* Payment method filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white p-2 text-sm font-medium focus:border-[#0d7a6b] focus:outline-none"
          >
            <option value="">جميع طرق الدفع</option>
            <option value="CASH">نقداً (CASH)</option>
            <option value="CARD">شبكة (CARD)</option>
          </select>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={orders}
          rowKey={(order) => order.id}
          loading={isLoading}
          empty={
            isLoading
              ? 'جاري تحميل الطلبات...'
              : 'لا توجد طلبات مسجلة بهذه الفلاتر'
          }
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 p-4">
            <span className="text-xs text-slate-500">
              إجمالي {totalCount} طلبات • الصفحة {page} من {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                السابق
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

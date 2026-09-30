import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api, call, type CashierItem } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';

type CashierStatusFilter = 'ALL' | 'ACTIVE' | 'DISABLED';

export function Cashiers() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<CashierStatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cashiers', statusFilter, search],
    queryFn: async () => {
      return await call(() =>
        api.GET('/api/cashiers', {
          params: {
            query: {
              status: statusFilter === 'ALL' ? undefined : statusFilter,
              search: search.trim() || undefined,
            },
          },
        }),
      );
    },
  });

  const cashiers: CashierItem[] = data?.items || [];
  const counts = data?.counts || { all: 0, active: 0, disabled: 0 };

  const columns: Column<CashierItem>[] = [
    {
      key: 'name',
      header: 'الكاشير',
      cell: (c) => (
        <div>
          <div className="font-semibold text-slate-900">{c.name}</div>
          <div className="text-xs text-slate-500">@{c.username}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'حالة الحساب',
      cell: (c) => <StatusBadge status={c.status === 'ACTIVE' ? 'active' : 'disabled'} />,
    },
    {
      key: 'current_shift',
      header: 'الوردية الحالية',
      cell: (c) =>
        c.current_shift ? (
          <Badge tone="success">وردية مفتوحة ({c.current_shift.code})</Badge>
        ) : (
          <span className="text-sm text-slate-400">لا يوجد وردية مفتوحة</span>
        ),
    },
    {
      key: 'last_login_at',
      header: 'آخر دخول',
      cell: (c) => (
        <span className="text-sm text-slate-600">
          {c.last_login_at ? new Date(c.last_login_at).toLocaleString('ar-EG') : 'لم يدخل بعد'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'التفاصيل',
      numeric: true,
      cell: (c) => (
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate(`/admin/cashiers/${c.id}`)}
          data-testid={`s16-detail-${c.id}`}
        >
          <Icon name="user" size={16} />
          <span className="ms-1">عرض الملف</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الكاشيرات</h1>
        <p className="text-sm text-slate-500">عرض أداء الكاشيرات ومتابعة وردياتهم</p>
      </div>

      {/* Filter & Search */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-[#0d7a6b] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الكل ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-[#0d7a6b] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              نشط ({counts.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DISABLED')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'DISABLED'
                  ? 'bg-[#0d7a6b] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              معطّل ({counts.disabled})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الكاشير..."
              className="w-full rounded-lg border border-slate-300 bg-white pe-3 ps-9 py-2 text-sm focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s16-search"
            />
            <Icon name="search" size={18} className="absolute start-3 top-2.5 text-slate-400" />
          </div>
        </div>
      </Card>

      {/* Cashiers Table */}
      <DataTable<CashierItem>
        columns={columns}
        rows={cashiers}
        loading={isLoading}
        empty="لا يوجد كاشيرات مطابقة لهذا البحث"
        rowKey={(c) => c.id}
      />
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api, call, type Role, type UserItem } from '@/api/client';
import { ROLE_LABELS } from '@/auth/session';
import { Icon } from '@/components/Icon';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';

export function Users() {
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', roleFilter, search],
    queryFn: async () => {
      const res = await call(() =>
        api.GET('/api/users', {
          params: {
            query: {
              role: roleFilter === 'ALL' ? undefined : roleFilter,
              search: search.trim() || undefined,
            },
          },
        }),
      );
      return res;
    },
  });

  const users: UserItem[] = data?.items || [];
  const counts = data?.counts || { all: 0, admin: 0, cashier: 0 };

  const columns: Column<UserItem>[] = [
    {
      key: 'name',
      header: 'الاسم',
      cell: (u) => (
        <div>
          <div className="font-semibold text-slate-900">{u.name}</div>
          <div className="text-xs text-slate-500">@{u.username}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'الدور',
      cell: (u) => (
        <Badge tone={u.role === 'ADMIN' ? 'info' : 'primary'}>
          {ROLE_LABELS[u.role as Role]}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (u) => <StatusBadge status={u.status === 'ACTIVE' ? 'active' : 'disabled'} />,
    },
    {
      key: 'last_login_at',
      header: 'آخر دخول',
      cell: (u) => (
        <span className="text-sm text-slate-600">
          {u.last_login_at ? new Date(u.last_login_at).toLocaleString('ar-EG') : 'لم يدخل بعد'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'إجراءات',
      numeric: true,
      cell: (u) => (
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate(`/admin/users/${u.id}`)}
          data-testid={`s18-edit-${u.id}`}
        >
          <Icon name="pencil" size={16} />
          <span className="ms-1">تعديل</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة المستخدمين</h1>
          <p className="text-sm text-slate-500">إضافة وتعديل حسابات المدراء والكاشيرات</p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/admin/users/new')}
          data-testid="s18-add-user"
        >
          <Icon name="plus" size={18} />
          <span>إضافة مستخدم جديد</span>
        </Button>
      </div>

      {/* Filters & Search */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                roleFilter === 'ALL'
                  ? 'bg-[#0d7a6b] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الكل ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('ADMIN')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                roleFilter === 'ADMIN'
                  ? 'bg-[#0d7a6b] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              المدراء ({counts.admin})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('CASHIER')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                roleFilter === 'CASHIER'
                  ? 'bg-[#0d7a6b] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الكاشيرات ({counts.cashier})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو اسم المستخدم..."
              className="w-full rounded-lg border border-slate-300 bg-white pe-3 ps-9 py-2 text-sm focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s18-search"
            />
            <Icon name="search" size={18} className="absolute start-3 top-2.5 text-slate-400" />
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <DataTable<UserItem>
        columns={columns}
        rows={users}
        loading={isLoading}
        empty="لا يوجد مستخدمين مطبقين لهذا البحث"
        rowKey={(u) => u.id}
      />
    </div>
  );
}

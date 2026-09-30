import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api, call } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/money';
import { useAuth } from '@/auth/useAuth';

interface AdminCashierCounts {
  total_active: number;
  with_open_shift: number;
  without_open_shift: number;
}

export function AdminHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      return await call(() => api.GET('/api/dashboard/admin'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        جاري تحميل لوحة المدير...
      </div>
    );
  }

  const businessDate = data?.business_date || '';
  const salesToday = data?.sales_today_minor || 0;
  const paidCountToday = data?.paid_orders_today || 0;
  const ordersToday = data?.orders_today || { total: 0, open: 0, paid: 0, cancelled: 0 };
  const openShifts = data?.open_shifts || { count: 0, items: [] };
  const tables = data?.tables || { total_active: 0, available: 0, occupied: 0, occupied_total_minor: 0 };
  const cashiers = (data?.cashiers || { total_active: 0, with_open_shift: 0, without_open_shift: 0 }) as unknown as AdminCashierCounts;
  const recentOrders = data?.recent_orders || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">لوحة الإدارة — {user?.name}</h1>
          <p className="text-sm text-slate-500">
            ملخص الأداء والمبيعات ليوم: <span className="font-bold text-slate-700">{businessDate}</span>
          </p>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          تحديث
        </Button>
      </div>

      {/* 6 Core KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-xs font-bold text-emerald-800">مبيعات اليوم</span>
          <p className="mt-1 text-xl font-black text-[#0d7a6b]">{formatMoney(salesToday)}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-bold text-slate-500">الطلبات المدفوعة</span>
          <p className="mt-1 text-xl font-black text-slate-900">{paidCountToday}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-bold text-slate-500">طلبات مفتوحة</span>
          <p className="mt-1 text-xl font-black text-amber-600">{ordersToday.open}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-bold text-slate-500">طلبات ملغاة</span>
          <p className="mt-1 text-xl font-black text-red-600">{ordersToday.cancelled}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-bold text-slate-500">الورديات المفتوحة</span>
          <p className="mt-1 text-xl font-black text-blue-700">{openShifts.count}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-bold text-slate-500">الطاولات المشغولة</span>
          <p className="mt-1 text-xl font-black text-indigo-700">{tables.occupied}</p>
        </Card>
      </div>

      {/* Main Grid: Open Shifts & Active Cashiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open Shifts List */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">الورديات النشطة المفتوحة حالياً</h2>
            <Button variant="ghost" onClick={() => navigate('/admin/shifts')}>
              سجل الورديات
            </Button>
          </div>

          {openShifts.items.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">لا توجد ورديات مفتوحة حالياً.</p>
          ) : (
            <div className="space-y-3">
              {openShifts.items.map((s) => (
                <div
                  key={s.shift_id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{s.code}</span>
                      <Badge tone="success">{s.cashier_name}</Badge>
                    </div>
                    <span className="text-xs text-slate-500">
                      تاريخ الفتح: {new Date(s.opened_at).toLocaleString('ar-EG', { timeStyle: 'short', dateStyle: 'short' })}
                    </span>
                  </div>

                  <div className="text-end">
                    <span className="text-xs text-slate-400 block">المبيعات الحالية</span>
                    <span className="font-extrabold text-[#0d7a6b] text-base">
                      {formatMoney(s.sales_total_minor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cashiers & Tables Summary */}
        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">حالة الكاشيرين</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>إجمالي الكاشيرين النشطين:</span>
                <span className="font-bold">{cashiers.total_active}</span>
              </div>
              <div className="flex justify-between">
                <span>لديهم وردية مفتوحة:</span>
                <Badge tone="success">{cashiers.with_open_shift}</Badge>
              </div>
              <div className="flex justify-between">
                <span>بدون وردية:</span>
                <Badge tone="neutral">{cashiers.without_open_shift}</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">إشغال الطاولات</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>إجمالي الطاولات المتاحة:</span>
                <span className="font-bold">{tables.available}</span>
              </div>
              <div className="flex justify-between">
                <span>إجمالي المشغولة:</span>
                <Badge tone="warning">{tables.occupied}</Badge>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 font-bold">
                <span>قيمة المبيعات المعلقة:</span>
                <span className="text-[#0d7a6b]">{formatMoney(tables.occupied_total_minor)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Orders Section */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">أحدث 3 طلبات مسجلة</h2>
          <Button variant="ghost" onClick={() => navigate('/orders')}>
            جميع الطلبات
          </Button>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">لا توجد طلبات مسجلة بعد.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recentOrders.map((ord) => (
              <Card
                key={ord.id}
                className="p-4 space-y-2 cursor-pointer hover:border-[#0d7a6b]"
                onClick={() => navigate(`/orders/${ord.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#0d7a6b]">#{ord.number}</span>
                  <Badge tone={ord.status === 'PAID' ? 'success' : ord.status === 'CANCELLED' ? 'danger' : 'warning'}>
                    {ord.status === 'PAID' ? 'مدفوع' : ord.status === 'CANCELLED' ? 'ملغي' : 'مفتوح'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 flex justify-between">
                  <span>الكاشير: {ord.cashier_name}</span>
                  <span>{formatMoney(ord.total_minor)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

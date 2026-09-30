import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api, call } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/money';
import { useAuth } from '@/auth/useAuth';

export function CashierHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cashier-dashboard'],
    queryFn: async () => {
      return await call(() => api.GET('/api/dashboard/cashier'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        جاري تحميل لوحة الكاشير...
      </div>
    );
  }

  const shift = data?.shift;
  const tables = data?.tables || { total_active: 0, available: 0, occupied: 0, occupied_total_minor: 0 };
  const runningOrders = data?.running_orders || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">مرحباً، {user?.name}</h1>
          <p className="text-sm text-slate-500">لوحة التحكم الرئيسية والعمليات اليومية</p>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          تحديث البيانات
        </Button>
      </div>

      {/* Shift Status Banner */}
      {!shift ? (
        <Card className="p-6 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200 text-amber-900">
              <Icon name="clock" size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-950">لا توجد وردية مفتوحة!</h3>
              <p className="text-xs text-amber-800">
                يجب فتح وردية جديدة وتسجيل عهدة البداية لتتمكن من إنشاء وتسديد الطلبات.
              </p>
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/shift/open')}>
            <Icon name="plus" size={20} />
            <span>فتح وردية جديدة</span>
          </Button>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-to-r from-[#0d7a6b]/5 to-[#0d7a6b]/10 border border-[#0d7a6b]/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge tone="success">وردية نشطة</Badge>
              <h2 className="text-lg font-black text-slate-900">الوردية #{shift.code}</h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              تاريخ الفتح: {new Date(shift.opened_at).toLocaleString('ar-EG', { timeStyle: 'short', dateStyle: 'short' })}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-sm border-t border-[#0d7a6b]/15">
            <div>
              <span className="text-xs text-slate-500">عهدة البداية:</span>
              <p className="font-extrabold text-slate-900">{formatMoney(shift.opening_balance_minor)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">المبيعات النقدية:</span>
              <p className="font-extrabold text-[#0d7a6b]">{formatMoney(shift.cash_total_minor ?? 0)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">المبيعات الشبكة:</span>
              <p className="font-extrabold text-blue-700">{formatMoney(shift.card_total_minor ?? 0)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-bold">المبلغ المتوقع بالدرج:</span>
              <p className="font-black text-lg text-[#0d7a6b]">{formatMoney(shift.expected_cash_minor ?? 0)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => navigate('/orders/new?type=TAKEAWAY')}
          className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#0d7a6b] hover:shadow-md transition-all group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d7a6b]/10 text-[#0d7a6b] group-hover:bg-[#0d7a6b] group-hover:text-white transition-colors mb-2">
            <Icon name="plus" size={24} />
          </div>
          <span className="font-bold text-slate-900 text-sm">طلب سفري جديد</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/tables')}
          className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#0d7a6b] hover:shadow-md transition-all group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-2">
            <Icon name="grid" size={24} />
          </div>
          <span className="font-bold text-slate-900 text-sm">صالة الطاولات</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#0d7a6b] hover:shadow-md transition-all group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-2">
            <Icon name="receipt" size={24} />
          </div>
          <span className="font-bold text-slate-900 text-sm">سجل الطلبات</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/shift/close')}
          className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 bg-white hover:border-amber-500 hover:shadow-md transition-all group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors mb-2">
            <Icon name="lock" size={24} />
          </div>
          <span className="font-bold text-slate-900 text-sm">إغلاق وتكتيف الوردية</span>
        </button>
      </div>

      {/* Table Occupancy Overview */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          إشغال الصالة والطاولات النشطة
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
            <span className="text-xs text-slate-500">إجمالي الطاولات</span>
            <p className="text-xl font-extrabold text-slate-900">{tables.total_active}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
            <span className="text-xs text-emerald-800">طاولات متاحة</span>
            <p className="text-xl font-extrabold text-emerald-700">{tables.available}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
            <span className="text-xs text-amber-800">طاولات مشغولة</span>
            <p className="text-xl font-extrabold text-amber-700">{tables.occupied}</p>
          </div>
          <div className="rounded-xl bg-[#0d7a6b]/10 p-3 border border-[#0d7a6b]/20">
            <span className="text-xs text-[#0d7a6b]">قيمة طلبات الطاولات الحالية</span>
            <p className="text-xl font-extrabold text-[#0d7a6b]">{formatMoney(tables.occupied_total_minor)}</p>
          </div>
        </div>
      </Card>

      {/* Running Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">الطلبات الجارية والمفتوحة ({runningOrders.length})</h2>
          <Button variant="ghost" onClick={() => navigate('/orders')}>
            مشاهدة الكل
          </Button>
        </div>

        {runningOrders.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            لا توجد طلبات مفتوحة حالياً في الوردية.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {runningOrders.map((ord) => (
              <Card
                key={ord.id}
                className="p-4 space-y-3 cursor-pointer hover:border-[#0d7a6b] transition-all"
                onClick={() => navigate(`/orders/${ord.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[#0d7a6b] text-base">#{ord.number}</span>
                  <Badge tone="warning">مفتوح</Badge>
                </div>

                <div className="text-xs text-slate-600 flex justify-between">
                  <span>{ord.type === 'DINE_IN' ? `محلي (طاولة ${ord.table_number})` : 'سفري'}</span>
                  <span>{ord.item_count} أصناف</span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-xs text-slate-400">
                    {new Date(ord.created_at).toLocaleTimeString('ar-EG', { timeStyle: 'short' })}
                  </span>
                  <span className="font-extrabold text-slate-900 text-lg">
                    {formatMoney(ord.total_minor)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';

import { api, call } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/money';

export function CurrentShift() {
  const navigate = useNavigate();

  const { data: shift, isLoading, isError, refetch } = useQuery({
    queryKey: ['current-shift'],
    queryFn: async () => {
      const shiftData = await call(() => api.GET('/api/shifts/current'));
      return shiftData;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-slate-500">جاري تحميل بيانات الوردية...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <div className="rounded-lg bg-red-50 p-6 text-red-800 border border-red-200">
          حدث خطأ أثناء تحميل بيانات الوردية الحالية.
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="mx-auto max-w-xl text-center py-12 space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Icon name="clock" size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">لا توجد وردية مفتوحة حالياً</h2>
          <p className="mt-2 text-sm text-slate-500">
            يجب فتح وردية جديدة للتمكن من تسجيل الطلبات واستلام الدفعات.
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/shift/open')}
            data-testid="s04-open-shift-btn"
          >
            <Icon name="clock" size={20} />
            <span>فتح وردية جديدة</span>
          </Button>
        </div>
      </div>
    );
  }

  const openedDateStr = new Date(shift.opened_at).toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">الوردية الحالية</h1>
            <Badge tone="success">وردية مفتوحة</Badge>
            <span className="font-mono text-sm font-semibold text-slate-500">{shift.code}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            الكاشير: <span className="font-semibold text-slate-700">{shift.cashier_name}</span> •
            وقت الفتح: <span className="font-semibold text-slate-700">{openedDateStr}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            <Icon name="receipt" size={18} />
            <span>سجل الطلبات</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/shift/close')}
            data-testid="s04-close-shift-btn"
          >
            <Icon name="clock" size={18} />
            <span>إغلاق الوردية</span>
          </Button>
        </div>
      </div>

      {shift.open_orders_count > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="alert" className="text-amber-600" size={24} />
            <div>
              <p className="font-bold">تنبيه: يوجد {shift.open_orders_count} طلبات مفتوحة في هذه الوردية</p>
              <p className="text-xs text-amber-700 mt-0.5">
                أرقام الطلبات: {shift.open_order_numbers.map((n: number) => `#${n}`).join('، ')} (يجب إغلاقها أو تسويتها قبل إغلاق الوردية)
              </p>
            </div>
          </div>
          <Link
            to="/orders"
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            عرض الطلبات
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">عهدة بداية الوردية</span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900" data-testid="s04-opening-balance">
            {formatMoney(shift.opening_balance_minor)}
          </p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">مبيعات نقدية (CASH)</span>
          <p className="mt-2 text-2xl font-extrabold text-[#0d7a6b]" data-testid="s04-cash-total">
            {formatMoney(shift.cash_total_minor)}
          </p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">مبيعات شبكة (CARD)</span>
          <p className="mt-2 text-2xl font-extrabold text-indigo-600" data-testid="s04-card-total">
            {formatMoney(shift.card_total_minor)}
          </p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">إجمالي المبيعات</span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900" data-testid="s04-sales-total">
            {formatMoney(shift.sales_total_minor)}
          </p>
        </Card>
      </div>

      {/* Primary Highlight Card: Expected Cash in Drawer */}
      <Card className="border-[#0d7a6b]/30 bg-[#0d7a6b]/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">المبلغ المتوقع بالدرج الآن</h3>
            <p className="text-xs text-slate-500 mt-1">
              عهد بداية الوردية ({formatMoney(shift.opening_balance_minor)}) + المبيعات النقدية ({formatMoney(shift.cash_total_minor)})
            </p>
          </div>
          <div className="text-3xl font-black text-[#0d7a6b]" data-testid="s04-expected-cash">
            {formatMoney(shift.expected_cash_minor)}
          </div>
        </div>
      </Card>

      {/* Orders Count Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">الطلبات المكتملة المدفوعة</span>
            <p className="mt-1 text-xl font-bold text-slate-900">{shift.orders_count} طلبات</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Icon name="check" size={24} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">الطلبات المفتوحة غير المسواة</span>
            <p className="mt-1 text-xl font-bold text-[#b83227]">{shift.open_orders_count} طلبات</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Icon name="clock" size={24} />
          </div>
        </Card>
      </div>
    </div>
  );
}

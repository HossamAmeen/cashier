import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { api, call } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Kpi } from '@/components/ui/Card';
import { formatMinor } from '@/lib/money';

export function CashierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cashierId = Number(id);

  const { data: cashier, isLoading } = useQuery({
    queryKey: ['cashier', cashierId],
    queryFn: async () => {
      return await call(() => api.GET('/api/cashiers/{id}', { params: { path: { id: cashierId } } }));
    },
    enabled: Boolean(cashierId),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Icon name="clock" className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!cashier) {
    return (
      <Card className="p-8 text-center text-slate-500">
        لم يتم العثور على الكاشير المطلوبة
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="md" onClick={() => navigate('/admin/cashiers')}>
            <Icon name="chevronStart" size={20} />
            <span>رجوع</span>
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">ملف الكاشير: {cashier.name}</h1>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => navigate(`/admin/users/${cashier.id}`)}
          data-testid="s17-edit-user"
        >
          <Icon name="pencil" size={16} />
          <span>تعديل الحساب</span>
        </Button>
      </div>

      {/* Profile Overview */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0d7a6b]/10 text-[#0d7a6b] font-bold text-2xl">
              {cashier.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{cashier.name}</h2>
              <p className="text-sm text-slate-500">@{cashier.username}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={cashier.status === 'ACTIVE' ? 'active' : 'disabled'} />
                <Badge tone="primary">كاشير</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:border-t-0 sm:pt-0 border-slate-200">
            <div>
              <span className="text-xs text-slate-500">تاريخ الإنشاء</span>
              <p className="text-sm font-semibold text-slate-800">
                {new Date(cashier.created_at).toLocaleDateString('ar-EG')}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">آخر دخول</span>
              <p className="text-sm font-semibold text-slate-800">
                {cashier.last_login_at ? new Date(cashier.last_login_at).toLocaleString('ar-EG') : 'لم يدخل بعد'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Current Shift Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">حالة الوردية الحالية</h3>
        {cashier.current_shift ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi
              label="كود الوردية"
              value={cashier.current_shift.code}
              footer={`تاريخ الفتح: ${new Date(cashier.current_shift.opened_at).toLocaleTimeString('ar-EG')}`}
              icon="clock"
            />
            <Kpi
              label="عدد الطلبات"
              value={cashier.current_shift.orders_count}
              icon="receipt"
            />
            <Kpi
              label="إجمالي المبيعات"
              value={formatMinor(cashier.current_shift.sales_total_minor)}
              icon="wallet"
            />
          </div>
        ) : (
          <Card className="p-6 text-center text-slate-500">
            لا توجد وردية مفتوحة حاليًا لهذا الكاشير
          </Card>
        )}
      </div>
    </div>
  );
}

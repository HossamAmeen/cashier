import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { api, call } from '@/api/client';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, Kpi } from '@/components/ui/Card';
import { formatMinor } from '@/lib/money';

export function TableDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tableId = Number(id);

  const { data: table, isLoading } = useQuery({
    queryKey: ['table', tableId],
    queryFn: async () => {
      return await call(() => api.GET('/api/tables/{id}', { params: { path: { id: tableId } } }));
    },
    enabled: Boolean(tableId),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Icon name="clock" className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!table) {
    return (
      <Card className="p-8 text-center text-slate-500">
        لم يتم العثور على الطاولة المطلوبة
      </Card>
    );
  }

  const isOccupied = table.status === 'OCCUPIED';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="md" onClick={() => navigate('/tables')}>
            <Icon name="chevronStart" size={20} />
            <span>رجوع</span>
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">طاولة #{table.number}</h1>
        </div>
        <StatusBadge status={isOccupied ? 'occupied' : 'available'} />
      </div>

      {/* Table Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-900 text-white font-bold text-2xl shadow-md">
              {table.number}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">طاولة رقم {table.number}</h2>
              <p className="text-sm text-slate-500">
                حالة التفعيل: {table.is_active ? 'نشطة ومتاحة' : 'معطلة'}
              </p>
            </div>
          </div>

          {!isOccupied && table.is_active && (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/orders/new?table_id=${table.id}`)}
              data-testid="s07-create-order"
            >
              <Icon name="plus" size={18} />
              <span>إنشاء طلب جديد للطاولة</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Status Section */}
      {isOccupied && table.current_order ? (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">الطلب المفتوح حالياً</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi
              label="رقم الطلب"
              value={`#${table.current_order.number}`}
              footer={`الكاشير: ${table.current_order.cashier_name}`}
              icon="receipt"
            />
            <Kpi
              label="عدد الأصناف"
              value={`${table.current_order.item_count} أصناف`}
              icon="box"
            />
            <Kpi
              label="إجمالي المطلوب"
              value={`${formatMinor(table.current_order.total_minor)} ج.م`}
              icon="wallet"
            />
          </div>

          <Card className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs text-slate-500">وقت إنشاء الطلب</span>
              <p className="text-sm font-semibold text-slate-800">
                {new Date(table.current_order.created_at).toLocaleTimeString('ar-EG')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(`/orders/${table.current_order?.id}`)}
                data-testid="s07-view-order"
              >
                <Icon name="eye" size={16} />
                <span>عرض تفاصيل الطلب</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/orders/${table.current_order?.id}/pay`)}
                data-testid="s07-pay-order"
              >
                <Icon name="wallet" size={16} />
                <span>دفع الطلب</span>
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-500">
          لا يوجد طلبات مفتوحة حالياً على هذه الطاولة
        </Card>
      )}
    </div>
  );
}

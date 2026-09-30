import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { api, call, ApiError } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { formatMoney } from '@/lib/money';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';
import { useAuth } from '@/auth/useAuth';

export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      return await call(() => api.GET('/api/orders/{id}', { params: { path: { id: Number(id) } } }));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (cancelReason.trim().length < 3) {
        throw new Error('REASON_TOO_SHORT');
      }
      return await call(() =>
        api.POST('/api/orders/{id}/cancel', {
          params: { path: { id: Number(id) } },
          body: { reason: cancelReason.trim() },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setCancelModalOpen(false);
      setCancelReason('');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(errorMessage(err.code as ClientErrorCode));
      } else if (err instanceof Error && err.message === 'REASON_TOO_SHORT') {
        setError('سبب الإلغاء يجب أن يكون 3 حروف على الأقل');
      } else {
        setError(errorMessage('INTERNAL_ERROR'));
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        جاري تحميل تفاصيل الطلب...
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center space-y-4">
        <div className="rounded-lg bg-red-50 p-6 text-red-800 border border-red-200">
          حدث خطأ أثناء تحميل تفاصيل الطلب.
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const createdDateStr = new Date(order.created_at).toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const isOwner = user?.id === order.cashier_id;
  const isOpen = order.status === 'OPEN';

  const statusTone =
    order.status === 'PAID' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'warning';
  const statusLabel =
    order.status === 'PAID' ? 'مدفوع' : order.status === 'CANCELLED' ? 'ملغي' : 'مفتوح';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/orders" className="text-slate-400 hover:text-slate-600">
              <Icon name="chevronStart" size={24} />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">طلب #{order.number}</h1>
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {order.type === 'DINE_IN' ? `محلي (طاولة ${order.table_number})` : 'سفري'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            الكاشير: <span className="font-semibold text-slate-700">{order.cashier_name}</span> •
            وقت الإنشاء: <span className="font-semibold text-slate-700">{createdDateStr}</span>
          </p>
        </div>

        {/* Action Buttons for OPEN orders */}
        {isOpen && isOwner && (
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate(`/orders/${order.id}/edit`)}
            >
              <Icon name="pencil" size={18} />
              <span>تعديل</span>
            </Button>

            <Button
              variant="secondary"
              className="text-red-700 hover:bg-red-50 hover:border-red-200"
              onClick={() => {
                setError(null);
                setCancelModalOpen(true);
              }}
            >
              <Icon name="trash" size={18} />
              <span>إلغاء الطلب</span>
            </Button>

            <Button
              variant="primary"
              onClick={() => navigate(`/orders/${order.id}/pay`)}
              data-testid="s12-pay-order-btn"
            >
              <Icon name="wallet" size={18} />
              <span>دفع الطلب</span>
            </Button>
          </div>
        )}
      </div>

      {/* Cancellation Banner */}
      {order.status === 'CANCELLED' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <Icon name="alert" size={20} className="text-red-600" />
            <span>تم إلغاء هذا الطلب</span>
          </div>
          <p className="text-xs text-red-700">
            سبب الإلغاء: <span className="font-semibold">{order.cancel_reason || 'غير محدد'}</span>
          </p>
        </div>
      )}

      {/* Order Items Table */}
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base">قائمة الأصناف</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th className="py-3 text-start">الصنف</th>
                <th className="py-3 text-center">السعر الفردي</th>
                <th className="py-3 text-center">الكمية</th>
                <th className="py-3 text-end">المجموع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(order.lines || []).map((line: { id: number; item_name_snapshot?: string; item_name?: string; note?: string; notes?: string; unit_price_snapshot_minor?: number; unit_price_minor?: number; qty: number; line_total_minor?: number; subtotal_minor?: number }) => (
                <tr key={line.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 text-start">
                    <span className="font-bold text-slate-900">
                      {line.item_name_snapshot || line.item_name}
                    </span>
                    {(line.note || line.notes) && (
                      <span className="block text-xs text-slate-400 mt-0.5">
                        ملاحظة: {line.note || line.notes}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 text-center text-slate-600 font-semibold">
                    {formatMoney(line.unit_price_snapshot_minor || line.unit_price_minor || 0)}
                  </td>
                  <td className="py-3.5 text-center text-slate-900 font-bold">{line.qty}</td>
                  <td className="py-3.5 text-end text-slate-900 font-bold">
                    {formatMoney(line.line_total_minor || line.subtotal_minor || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="border-t border-slate-200 pt-4 max-w-xs ms-auto space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>المجموع الفرعي</span>
            <span className="font-semibold">{formatMoney(order.subtotal_minor)}</span>
          </div>

          {order.discount_minor > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>الخصم</span>
              <span className="font-semibold">-{formatMoney(order.discount_minor)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
            <span>الإجمالي</span>
            <span className="text-[#0d7a6b]">{formatMoney(order.total_minor)}</span>
          </div>
        </div>
      </Card>

      {/* Cancel Order Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="إلغاء الطلب"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            cancelMutation.mutate();
          }}
          className="space-y-4"
        >
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-700">
            هل أنت تأكد من إلغاء الطلب <span className="font-bold">#{order.number}</span>؟ يرجى أدخال سبب الإلغاء (3 حروف على الأقل).
          </p>

          <FormField label="سبب الإلغاء" required>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="مثال: تغيير رأي العميل / خطأ في إدخال الأصناف"
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#0d7a6b] focus:outline-none"
              data-testid="s12-cancel-reason-input"
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" size="md" onClick={() => setCancelModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={cancelMutation.isPending}
              type="submit"
              data-testid="s12-confirm-cancel-btn"
            >
              تأكيد الإلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

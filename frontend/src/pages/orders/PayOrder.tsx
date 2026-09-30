import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { api, call, ApiError } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMoney, parseToMinor } from '@/lib/money';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';

export function PayOrder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [receivedInput, setReceivedInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Generate UUID idempotency key per mount/attempt
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  // Fetch Order
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      return await call(() => api.GET('/api/orders/{id}', { params: { path: { id: Number(id) } } }));
    },
  });

  const orderTotalMinor = order?.total_minor || 0;
  const parsedReceivedMinor = parseToMinor(receivedInput);
  const effectiveReceivedMinor = paymentMethod === 'CARD' ? orderTotalMinor : (parsedReceivedMinor ?? 0);
  const changeMinor = Math.max(0, effectiveReceivedMinor - orderTotalMinor);

  // Quick cash options
  const quickOptions = useMemo(() => {
    if (!orderTotalMinor) return [];
    const exact = Math.ceil(orderTotalMinor / 100);
    const next50 = Math.ceil(exact / 50) * 50;
    const next100 = Math.ceil(exact / 100) * 100;
    const next200 = Math.ceil(exact / 200) * 200;
    const next500 = Math.ceil(exact / 500) * 500;

    const set = new Set([exact, next50, next100, next200, next500]);
    return Array.from(set).sort((a, b) => a - b).slice(0, 4);
  }, [orderTotalMinor]);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (paymentMethod === 'CASH') {
        if (parsedReceivedMinor === null || parsedReceivedMinor < orderTotalMinor) {
          throw new Error('INSUFFICIENT_CASH');
        }
      }

      return await call(() =>
        api.POST('/api/orders/{id}/payment', {
          params: {
            path: { id: Number(id) },
            header: { 'Idempotency-Key': idempotencyKey },
          },
          body: {
            method: paymentMethod,
            amount_received_minor: paymentMethod === 'CASH' ? parsedReceivedMinor : undefined,
          },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      navigate(`/orders/${id}/done`);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(errorMessage(err.code as ClientErrorCode));
      } else if (err instanceof Error && err.message === 'INSUFFICIENT_CASH') {
        setError('المبلغ المستلم أقل من المطلوب');
      } else {
        setError(errorMessage('INTERNAL_ERROR'));
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        جاري تحميل بيانات الدفع...
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center space-y-4">
        <div className="rounded-lg bg-red-50 p-6 text-red-800 border border-red-200">
          حدث خطأ أثناء تحميل بيانات الطلب للدفع.
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/orders/${order.id}`} className="text-slate-400 hover:text-slate-600">
          <Icon name="chevronStart" size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">دفع الطلب #{order.number}</h1>
          <p className="text-sm text-slate-500">
            {order.type === 'DINE_IN' ? `محلي (طاولة ${order.table_number})` : 'سفري'}
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {/* Order Total Highlight */}
        <div className="rounded-xl border border-[#0d7a6b]/30 bg-[#0d7a6b]/5 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              المبلغ الإجمالي المطلوب
            </span>
            <p className="text-xs text-slate-400 mt-0.5">
              مجموع الأصناف بعد الخصم ({formatMoney(order.discount_minor)})
            </p>
          </div>
          <div className="text-3xl font-black text-[#0d7a6b]" data-testid="s13-order-total">
            {formatMoney(order.total_minor)}
          </div>
        </div>

        {/* Payment Method Switcher */}
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
            طريقة الدفع
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('CASH');
                setError(null);
              }}
              className={`flex items-center justify-center gap-3 rounded-xl border p-4 font-bold text-base transition-colors ${
                paymentMethod === 'CASH'
                  ? 'border-[#0d7a6b] bg-[#0d7a6b] text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              data-testid="s13-method-cash"
            >
              <Icon name="wallet" size={22} />
              <span>نقداً (CASH)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod('CARD');
                setError(null);
              }}
              className={`flex items-center justify-center gap-3 rounded-xl border p-4 font-bold text-base transition-colors ${
                paymentMethod === 'CARD'
                  ? 'border-[#0d7a6b] bg-[#0d7a6b] text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              data-testid="s13-method-card"
            >
              <Icon name="receipt" size={22} />
              <span>شبكة / بطاقة (CARD)</span>
            </button>
          </div>
        </div>

        {/* CASH Specific Inputs */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-4 pt-2">
            {/* Quick Chips */}
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                خيارات سريعة للمبلغ المستلم
              </label>
              <div className="grid grid-cols-4 gap-2">
                {quickOptions.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setReceivedInput(amt.toString())}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-xs text-slate-700 hover:bg-slate-100"
                  >
                    {amt * 100 === orderTotalMinor ? 'مضبوط' : `${amt} ج.م`}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                المبلغ المستلم من العميل (بالجنيه المصري)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={receivedInput}
                  onChange={(e) => setReceivedInput(e.target.value)}
                  placeholder={(orderTotalMinor / 100).toString()}
                  className="w-full rounded-xl border border-slate-300 bg-white pe-12 ps-4 py-3 font-extrabold text-2xl text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
                  data-testid="s13-cash-received-input"
                />
                <span className="absolute start-auto end-4 top-4 text-sm font-semibold text-slate-400">
                  ج.م
                </span>
              </div>
            </div>

            {/* Change Display */}
            <div className="flex items-center justify-between rounded-xl bg-slate-100 p-4">
              <span className="text-sm font-bold text-slate-700">المبلغ المتبقي للعميل (الباقي)</span>
              <span className="text-2xl font-black text-[#0d7a6b]" data-testid="s13-change-amount">
                {formatMoney(changeMinor)}
              </span>
            </div>
          </div>
        )}

        {/* CARD Specific Notice */}
        {paymentMethod === 'CARD' && (
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
            <Badge tone="info">دفع شبكة</Badge>
            <p className="mt-1">
              يتم خصم المبلغ المطلوب تلقائياً ({formatMoney(orderTotalMinor)}) عبر جهاز البصمة / الشبكة.
            </p>
          </div>
        )}

        {/* Submit Pay Button */}
        <div className="pt-4 border-t border-slate-200">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center py-3.5 text-base"
            loading={payMutation.isPending}
            onClick={() => {
              setError(null);
              payMutation.mutate();
            }}
            data-testid="s13-submit-pay-btn"
          >
            <Icon name="check" size={22} />
            <span>تأكيد وتسجيل الدفع</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

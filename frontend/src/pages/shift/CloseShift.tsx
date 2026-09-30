import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';

import { api, call, ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatMoney, parseToMinor } from '@/lib/money';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';
import type { components } from '@/api/schema';

type Shift = components['schemas']['Shift'];

export function CloseShift() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  const [countedInput, setCountedInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [closedSummary, setClosedSummary] = useState<Shift | null>(null);

  const { data: shift, isLoading, isError } = useQuery({
    queryKey: ['current-shift'],
    queryFn: async () => {
      return await call(() => api.GET('/api/shifts/current'));
    },
  });

  const parsedCountedMinor = parseToMinor(countedInput);
  const expectedCashMinor = shift?.expected_cash_minor ?? 0;

  const diffMinor =
    parsedCountedMinor !== null ? parsedCountedMinor - expectedCashMinor : null;

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!shift) return;
      if (parsedCountedMinor === null || parsedCountedMinor < 0) {
        throw new Error('VALIDATION_ERROR');
      }

      return await call(() =>
        api.POST('/api/shifts/{id}/close', {
          params: { path: { id: shift.id } },
          body: { counted_cash_minor: parsedCountedMinor },
        }),
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      if (data) {
        setClosedSummary(data);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(errorMessage(err.code as ClientErrorCode));
      } else {
        setError('يرجى إدخال المبلغ المحسوب بشكل صحيح');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        جاري تحميل بيانات الوردية...
      </div>
    );
  }

  if (isError || !shift) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center space-y-4">
        <div className="rounded-lg bg-amber-50 p-6 text-amber-900 border border-amber-200">
          لا توجد وردية مفتوحة حالياً لتسليمها وإغلاقها.
        </div>
        <Button variant="primary" onClick={() => navigate('/')}>
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  const hasOpenOrders = (shift.open_orders_count ?? 0) > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/shift" className="text-slate-400 hover:text-slate-600">
          <Icon name="chevronStart" size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إغلاق وتكتيف الوردية #{shift.code}</h1>
          <p className="text-sm text-slate-500">
            تاريخ الفتح: {new Date(shift.opened_at).toLocaleString('ar-EG')}
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
            {error}
          </div>
        )}

        {/* Warning if open orders exist */}
        {hasOpenOrders && (
          <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 text-amber-900 space-y-2" data-testid="s05-open-orders-warning">
            <div className="flex items-center gap-2 font-extrabold text-sm">
              <Icon name="lock" size={20} className="text-amber-600" />
              <span>لا يمكن إغلاق الوردية! يوجد طلبات مفتوحة غير مسددة.</span>
            </div>
            <p className="text-xs text-amber-800">
              أرقام الطلبات المفتوحة: {shift.open_order_numbers?.map((n) => `#${n}`).join(', ')}
            </p>
            <p className="text-xs text-amber-700">
              قم بدفع أو إلغاء هذه الطلبات أولاً للتمكن من إنهاء الوردية.
            </p>
          </div>
        )}

        {/* Financial Summary Breakdown */}
        <div className="space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            ملخص مبيعات ونقدية الوردية
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm pt-1">
            <div>
              <span className="text-slate-500 text-xs">رصيد البداية (عهدة الفتح):</span>
              <p className="font-extrabold text-slate-900">{formatMoney(shift.opening_balance_minor)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">إجمالي المبيعات النقدي (CASH):</span>
              <p className="font-extrabold text-[#0d7a6b]">{formatMoney(shift.cash_total_minor ?? 0)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">إجمالي المبيعات الشبكة (CARD):</span>
              <p className="font-extrabold text-blue-700">{formatMoney(shift.card_total_minor ?? 0)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">إجمالي عدد الطلبات المدفوعة:</span>
              <p className="font-extrabold text-slate-900">{shift.orders_count ?? 0} طلب</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">المبلغ المتوقع بالدرج (Expected Cash):</span>
            <span className="text-xl font-black text-[#0d7a6b]" data-testid="s05-expected-cash">
              {formatMoney(expectedCashMinor)}
            </span>
          </div>
        </div>

        {/* Counted Cash Input & Live Difference */}
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
              المبلغ الفعلي درج النقدية عند العد (العهدة الفعلية)
            </label>
            <div className="relative">
              <input
                type="text"
                disabled={hasOpenOrders}
                value={countedInput}
                onChange={(e) => setCountedInput(e.target.value)}
                placeholder={(expectedCashMinor / 100).toString()}
                className="w-full rounded-xl border border-slate-300 bg-white pe-12 ps-4 py-3 font-extrabold text-2xl text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b] disabled:bg-slate-100 disabled:opacity-60"
                data-testid="s05-counted-cash-input"
              />
              <span className="absolute start-auto end-4 top-4 text-sm font-semibold text-slate-400">
                ج.م
              </span>
            </div>
          </div>

          {diffMinor !== null && (
            <div className="flex items-center justify-between rounded-xl bg-slate-100 p-4" data-testid="s05-diff-preview">
              <span className="text-sm font-bold text-slate-700">نتيجة جرد الوردية (عجز / زيادة / مطابقة):</span>
              <div>
                {diffMinor === 0 && <Badge tone="success">مطابق تماماً (0.00 ج.م)</Badge>}
                {diffMinor > 0 && <Badge tone="warning">زيادة ({formatMoney(diffMinor)})</Badge>}
                {diffMinor < 0 && <Badge tone="danger">عجز ({formatMoney(diffMinor)})</Badge>}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-200">
          <Button
            variant="primary"
            size="lg"
            disabled={hasOpenOrders}
            loading={closeMutation.isPending}
            className="w-full justify-center py-3.5 text-base"
            onClick={() => {
              setError(null);
              closeMutation.mutate();
            }}
            data-testid="s05-confirm-close-btn"
          >
            <Icon name="check" size={22} />
            <span>تأكيد إغلاق وتكتيف الوردية</span>
          </Button>
        </div>
      </Card>

      {/* Closed Shift Summary Modal */}
      {closedSummary && (
        <Modal
          open={true}
          title="تم إغلاق الوردية بنجاح"
          onClose={() => {
            void signOut();
          }}
        >
          <div className="space-y-4 text-sm">
            <div className="text-center py-2 space-y-1">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Icon name="check" size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-900">تقرير إقفال الوردية #{closedSummary.code}</h3>
              <p className="text-xs text-slate-500">
                وقت الإغلاق: {closedSummary.closed_at ? new Date(closedSummary.closed_at).toLocaleString('ar-EG') : '—'}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span className="font-bold">{closedSummary.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span>عهدة البداية:</span>
                <span>{formatMoney(closedSummary.opening_balance_minor)}</span>
              </div>
              <div className="flex justify-between">
                <span>المبيعات النقدية:</span>
                <span>{formatMoney(closedSummary.cash_total_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>المبيعات الشبكة:</span>
                <span>{formatMoney(closedSummary.card_total_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between font-extrabold border-t border-slate-200 pt-2 text-slate-900">
                <span>إجمالي المبيعات:</span>
                <span>{formatMoney(closedSummary.sales_total_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>المبلغ المتوقع بالدرج:</span>
                <span>{formatMoney(closedSummary.expected_cash_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>المبلغ الفعلي عند الجرد:</span>
                <span>{formatMoney(closedSummary.counted_cash_minor ?? 0)}</span>
              </div>
              <div className="flex justify-between font-extrabold border-t border-slate-200 pt-2">
                <span>الفرق (عجز/زيادة):</span>
                <span>
                  {closedSummary.difference_minor === 0
                    ? 'مطابق'
                    : formatMoney(closedSummary.difference_minor ?? 0)}
                </span>
              </div>
            </div>

            <div className="pt-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full justify-center"
                onClick={() => {
                  void signOut();
                }}
                data-testid="s05-logout-btn"
              >
                <Icon name="logout" size={20} />
                <span>تسجيل الخروج من النظام</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { api, call } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/money';
import '@/print/receipt.css';

export function OrderReceipt() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: receipt, isLoading, isError, refetch } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      return await call(() =>
        api.GET('/api/orders/{id}/receipt', {
          params: { path: { id: Number(id) } },
        }),
      );
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        جاري إعداد الإيصال...
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center space-y-4">
        <div className="rounded-lg bg-red-50 p-6 text-red-800 border border-red-200">
          حدث خطأ أثناء تحميل بيانات إيصال الطلب.
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const paidDateStr = new Date(receipt.paid_at).toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Success Notification Banner */}
      <div className="no-print rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Icon name="check" size={32} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-emerald-900">تم اكتمال ودفع الطلب بنجاح!</h2>
          <p className="text-xs text-emerald-700 mt-1">
            الطلب <span className="font-bold">#{receipt.order_number}</span> مكتمل ومسجل في سجل المبيعات.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="lg" onClick={handlePrint} data-testid="s14-print-btn">
            <Icon name="receipt" size={20} />
            <span>طباعة الإيصال (80mm)</span>
          </Button>
          <Button variant="secondary" onClick={() => navigate('/orders/new')}>
            <Icon name="plus" size={18} />
            <span>طلب جديد</span>
          </Button>
        </div>
      </div>

      {/* Thermal Printable Receipt Preview (80mm) */}
      <Card id="thermal-receipt-printable" className="p-6 space-y-4 text-sm font-sans bg-white border border-slate-200 shadow-sm">
        {/* Store Info */}
        <div className="text-center space-y-1 border-b border-slate-200 pb-3">
          <h3 className="text-lg font-black text-slate-900">{receipt.business_name}</h3>
          <p className="text-xs font-bold text-slate-600">إيصال استلام (RECEIPT)</p>
        </div>

        {/* Meta Info */}
        <div className="text-xs space-y-1 border-b border-slate-200 pb-3 text-slate-700">
          <div className="flex justify-between">
            <span>رقم الطلب:</span>
            <span className="font-extrabold text-slate-900">#{receipt.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>نوع الطلب:</span>
            <span className="font-bold">
              {receipt.order_type === 'DINE_IN'
                ? `محلي (طاولة ${receipt.table_number})`
                : 'سفري'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>الكاشير:</span>
            <span>{receipt.cashier_name}</span>
          </div>
          <div className="flex justify-between">
            <span>التاريخ والوقت:</span>
            <span>{paidDateStr}</span>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2 border-b border-slate-200 pb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-bold text-slate-600">
                <th className="py-1 text-start">الصنف</th>
                <th className="py-1 text-center">الكمية</th>
                <th className="py-1 text-end">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.lines.map((line, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 text-start font-semibold text-slate-900">{line.name}</td>
                  <td className="py-1.5 text-center font-bold">{line.qty}</td>
                  <td className="py-1.5 text-end font-bold text-slate-900">
                    {formatMoney(line.line_total_minor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Payment Method */}
        <div className="text-xs space-y-1.5 pt-1">
          <div className="flex justify-between text-slate-600">
            <span>المجموع الفرعي:</span>
            <span>{formatMoney(receipt.subtotal_minor)}</span>
          </div>

          {receipt.discount_minor > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>الخصم:</span>
              <span>-{formatMoney(receipt.discount_minor)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-2 text-slate-900">
            <span>المجموع الكلي:</span>
            <span>{formatMoney(receipt.total_minor)}</span>
          </div>

          <div className="flex justify-between pt-1 font-semibold text-slate-700">
            <span>طريقة الدفع:</span>
            <Badge tone="info">
              {receipt.payment_method === 'CASH' ? 'نقداً (CASH)' : 'شبكة (CARD)'}
            </Badge>
          </div>

          {receipt.payment_method === 'CASH' && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>المبلغ المستلم:</span>
                <span>{formatMoney(receipt.amount_received_minor ?? receipt.total_minor)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>المبلغ المتبقي (الباقي):</span>
                <span>{formatMoney(receipt.change_minor ?? 0)}</span>
              </div>
            </>
          )}
        </div>

        {/* Receipt Footer */}
        {receipt.receipt_footer && (
          <div className="border-t border-slate-200 pt-3 text-center text-xs font-semibold text-slate-600">
            {receipt.receipt_footer}
          </div>
        )}
      </Card>
    </div>
  );
}

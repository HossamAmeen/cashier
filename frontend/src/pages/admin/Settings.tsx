import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api, call, ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';

export function Settings() {
  const [businessName, setBusinessName] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      return await call(() => api.GET('/api/settings'));
    },
  });

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.business_name);
      setReceiptFooter(settings.receipt_footer || '');
    }
  }, [settings]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await call(() =>
        api.PATCH('/api/settings', {
          body: {
            business_name: businessName.trim(),
            receipt_footer: receiptFooter.trim(),
          },
        }),
      );
      setSuccess('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(errorMessage(err.code as ClientErrorCode));
      } else {
        setError(errorMessage('INTERNAL_ERROR'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">جارٍ تحميل الإعدادات...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">إعدادات المنشأة</h1>
        <p className="text-sm text-slate-500">تعديل اسم المنشأة وتذييل إيصالات الطباعة</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200">
              {success}
            </div>
          )}

          <FormField label="اسم المنشأة" required hint="يظهر في أعلى الإيصال وفي أعلى الشاشة">
            <input
              type="text"
              required
              maxLength={80}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="مثال: مطعم وسوبر ماركت الخير"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s21-business-name"
            />
          </FormField>

          <FormField label="تذييل الإيصال (رسالة الترحيب)" hint="يظهر أسفل الإيصال المطبوع (حتى 200 حرف)">
            <textarea
              rows={3}
              maxLength={200}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="مثال: شكرًا لزيارتكم ونتمنى لكم يومًا سعيدًا"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s21-receipt-footer"
            />
          </FormField>

          <div className="flex items-center justify-end border-t border-slate-200 pt-4">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              mutation
              data-testid="s21-save"
            >
              حفظ الإعدادات
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

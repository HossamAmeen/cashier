import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api, call, ApiError } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';
import { parseToMinor } from '@/lib/money';

const QUICK_AMOUNTS = [0, 200, 500, 1000];

export function OpenShift() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [amountInput, setAmountInput] = useState('0');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMinor = parseToMinor(amountInput);

  const openShiftMutation = useMutation({
    mutationFn: async () => {
      const opening_balance_minor = parsedMinor ?? 0;
      await call(() =>
        api.POST('/api/shifts', {
          body: { opening_balance_minor },
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      setConfirmModalOpen(false);
      navigate('/shift');
    },
    onError: (err) => {
      setConfirmModalOpen(false);
      if (err instanceof ApiError) {
        setError(errorMessage(err.code as ClientErrorCode));
      } else {
        setError(errorMessage('INTERNAL_ERROR'));
      }
    },
  });

  const handleQuickSelect = (amt: number) => {
    setAmountInput(amt.toString());
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (parsedMinor === null || parsedMinor < 0) {
      setError('يرجى إدخال مبلغ فتح درج صحيح (صفر أو أكثر)');
      return;
    }
    setConfirmModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">فتح الوردية</h1>
        <p className="text-sm text-slate-500">أدخل عهدة بداية الوردية (المبلغ الموجود في العهدة/الدرج)</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {/* Quick Amount Chips */}
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
              خيارات سريعة للمبلغ
            </label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => handleQuickSelect(amt)}
                  className={`rounded-xl border p-3 font-bold text-sm transition-colors ${
                    amountInput === amt.toString()
                      ? 'border-[#0d7a6b] bg-[#0d7a6b] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {amt === 0 ? 'بدون عهدة (0)' : `${amt} ج.م`}
                </button>
              ))}
            </div>
          </div>

          <FormField label="مبلغ العهدة الافتتاحية (بالجنيه المصري)" required hint="يتم تسجيل الوقت تلقائياً من خادم النظام">
            <div className="relative">
              <input
                type="text"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 bg-white pe-12 ps-3 py-3 text-slate-900 font-bold text-xl focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
                data-testid="s03-opening-balance"
              />
              <span className="absolute start-auto end-3 top-3.5 text-sm font-semibold text-slate-400">
                ج.م
              </span>
            </div>
          </FormField>

          <div className="pt-4 border-t border-slate-200">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center py-3 text-base"
              data-testid="s03-open-shift-submit"
            >
              <Icon name="clock" size={20} />
              <span>تأكيد وفتح الوردية</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Confirm Open Shift Modal */}
      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="تأكيد فتح الوردية"
      >
        <div className="space-y-4">
          <p className="text-slate-700">
            هل أنت تأكد من فتح وردية جديدة بعهدة افتتاحية قدرها{' '}
            <span className="font-bold text-[#0d7a6b]">{amountInput} ج.م</span>؟
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" size="md" onClick={() => setConfirmModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={openShiftMutation.isPending}
              onClick={() => openShiftMutation.mutate()}
              data-testid="s03-confirm-open"
            >
              تأكيد الفتح
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

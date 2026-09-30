import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { api, call, ApiError } from '@/api/client';
import { type CategoryItem } from './Categories';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Icon } from '@/components/Icon';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';
import { formatMinor, parseToMinor } from '@/lib/money';

export function ItemEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const itemId = isNew ? null : Number(id);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [priceInput, setPriceInput] = useState('');
  const [description, setDescription] = useState('');
  const [statusVal, setStatusVal] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      return await call(() => api.GET('/api/categories'));
    },
  });

  const categories: CategoryItem[] = (categoriesData as unknown as CategoryItem[]) || [];

  // Fetch item if editing
  const { data: item, isLoading: fetchingItem } = useQuery({
    queryKey: ['item', itemId],
    queryFn: async () => {
      if (!itemId) return null;
      return await call(() => api.GET('/api/items/{id}', { params: { path: { id: itemId } } }));
    },
    enabled: Boolean(itemId),
  });

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategoryId(item.category_id);
      setPriceInput((item.price_minor / 100).toString());
      setDescription(item.description);
      setStatusVal(item.status);
    }
  }, [item]);

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);
  const parsedPriceMinor = parseToMinor(priceInput);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedPriceMinor === null || parsedPriceMinor <= 0) {
      setError('السعر يجب أن يكون رقمًا أكبر من صفر (مثال: 45 أو 45.50)');
      return;
    }

    if (!categoryId) {
      setError('يرجى اختيار التصنيف');
      return;
    }

    setLoading(true);

    try {
      if (isNew) {
        await call(() =>
          api.POST('/api/items', {
            body: {
              category_id: Number(categoryId),
              name: name.trim(),
              price_minor: parsedPriceMinor,
              description: description.trim(),
              status: statusVal,
            },
          }),
        );
      } else if (itemId) {
        await call(() =>
          api.PATCH('/api/items/{id}', {
            params: { path: { id: itemId } },
            body: {
              category_id: Number(categoryId),
              name: name.trim(),
              price_minor: parsedPriceMinor,
              description: description.trim(),
              status: statusVal,
            },
          }),
        );
      }
      navigate('/admin/items');
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

  if (fetchingItem) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Icon name="clock" className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="md" onClick={() => navigate('/admin/items')}>
          <Icon name="chevronStart" size={20} />
          <span>رجوع</span>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">
          {isNew ? 'إضافة صنف جديد' : `تعديل الصنف: ${item?.name || ''}`}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Form Column */}
        <Card className="p-6 md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
                {error}
              </div>
            )}

            <FormField label="اسم الصنف" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: بيتزا مارجريتا"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
                data-testid="s10-name"
              />
            </FormField>

            <FormField label="التصنيف" required>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
                data-testid="s10-category"
              >
                <option value="">اختر التصنيف...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="السعر (بالجنيه المصري)" required hint="مثال: 45 أو 45.50">
              <input
                type="text"
                required
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-bold focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
                data-testid="s10-price"
              />
            </FormField>

            <FormField label="الوصف / المكونات" hint="اختياري">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تفاصيل الصنف والمكونات..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
                data-testid="s10-description"
              />
            </FormField>

            <FormField label="حالة الصنف">
              <Toggle
                checked={statusVal === 'ACTIVE'}
                onChange={(checked) => setStatusVal(checked ? 'ACTIVE' : 'DISABLED')}
                label={statusVal === 'ACTIVE' ? 'نشط' : 'معطّل'}
                data-testid="s10-status-toggle"
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" size="md" onClick={() => navigate('/admin/items')}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                data-testid="s10-save"
              >
                حفظ الصنف
              </Button>
            </div>
          </form>
        </Card>

        {/* Live Preview Column */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">معاينة بطاقة الصنف</h3>
          <Card className="p-5 flex flex-col justify-between h-48 border-2 border-dashed border-[#0d7a6b]/30 bg-white shadow-sm">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-lg text-slate-900 leading-snug">
                  {name.trim() || 'اسم الصنف'}
                </h4>
                {selectedCategoryObj && (
                  <Badge tone="neutral" className="shrink-0">
                    <CategoryIcon name={selectedCategoryObj.icon} size={14} className="me-1" />
                    {selectedCategoryObj.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                {description.trim() || 'الوصف يظهر هنا للمستخدم أثناء الطلب'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-lg font-bold text-[#0d7a6b]">
                {parsedPriceMinor !== null ? `${formatMinor(parsedPriceMinor)} ج.م` : '0.00 ج.م'}
              </span>
              <StatusBadge status={statusVal === 'ACTIVE' ? 'active' : 'disabled'} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

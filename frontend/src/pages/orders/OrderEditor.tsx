import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { api, call, ApiError } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QtyStepper } from '@/components/ui/QtyStepper';
import { formatMoney, parseToMinor } from '@/lib/money';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';

interface CartItem {
  id?: number;
  item_id: number;
  item_name: string;
  unit_price_minor: number;
  qty: number;
  note: string;
}

interface TableOption {
  id: number;
  number: number;
}

interface CatalogItemType {
  id: number;
  name: string;
  price_minor: number;
  description?: string;
  category_id?: number;
}

interface CatalogCategoryType {
  id: number;
  name: string;
  sort_order: number;
  items?: CatalogItemType[];
}

interface OrderLineType {
  id: number;
  item_id: number;
  item_name_snapshot?: string;
  item_name?: string;
  unit_price_snapshot_minor?: number;
  unit_price_minor?: number;
  qty: number;
  note?: string;
  notes?: string;
}

export function OrderEditor() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEditMode = Boolean(id);
  const initialTableId = searchParams.get('table_id');

  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>(
    initialTableId ? 'DINE_IN' : 'TAKEAWAY',
  );
  const [selectedTableId, setSelectedTableId] = useState<number | null>(
    initialTableId ? Number(initialTableId) : null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartLines, setCartLines] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState('0');
  const [error, setError] = useState<string | null>(null);

  // Fetch Catalog
  const { data: catalog, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      return await call(() => api.GET('/api/catalog'));
    },
  });

  // Fetch Active Tables for DINE_IN dropdown
  const { data: tablesData } = useQuery({
    queryKey: ['tables', 'active'],
    queryFn: async () => {
      const res = await call(() => api.GET('/api/tables', { params: { query: { is_active: true } } }));
      return (res.items || []) as TableOption[];
    },
  });

  // Fetch Existing Order if in Edit Mode
  const { isLoading: isOrderLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      if (!id) return null;
      const order = await call(() => api.GET('/api/orders/{id}', { params: { path: { id: Number(id) } } }));
      setOrderType(order.type as 'DINE_IN' | 'TAKEAWAY');
      setSelectedTableId(order.table_id);
      setDiscountInput((order.discount_minor / 100).toString());
      const rawLines = (order.lines || []) as unknown as OrderLineType[];
      setCartLines(
        rawLines.map((l) => ({
          id: l.id,
          item_id: l.item_id,
          item_name: l.item_name_snapshot || l.item_name || '',
          unit_price_minor: l.unit_price_snapshot_minor || l.unit_price_minor || 0,
          qty: l.qty,
          note: l.note || l.notes || '',
        })),
      );
      return order;
    },
    enabled: isEditMode,
  });

  const categories = useMemo(() => {
    return (catalog?.categories || []) as CatalogCategoryType[];
  }, [catalog]);

  const items = useMemo(() => {
    return categories.flatMap((cat) =>
      (cat.items || []).map((item) => ({
        ...item,
        category_id: cat.id,
      })),
    );
  }, [categories]);

  // Filter items by category & search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategoryId && item.category_id !== selectedCategoryId) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(query) || (item.description || '').toLowerCase().includes(query);
      }
      return true;
    });
  }, [items, selectedCategoryId, searchQuery]);

  // Calculations
  const subtotalMinor = useMemo(() => {
    return cartLines.reduce((acc, line) => acc + line.unit_price_minor * line.qty, 0);
  }, [cartLines]);

  const parsedDiscountMinor = parseToMinor(discountInput) ?? 0;
  const discountMinor = Math.min(parsedDiscountMinor, subtotalMinor);
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);

  // Cart actions
  const handleAddItem = (item: { id: number; name: string; price_minor: number }) => {
    setCartLines((prev) => {
      const existingIdx = prev.findIndex((line) => line.item_id === item.id && line.note === '');
      if (existingIdx >= 0) {
        const next = [...prev];
        const currentItem = next[existingIdx];
        if (currentItem) {
          next[existingIdx] = {
            ...currentItem,
            qty: Math.min(999, currentItem.qty + 1),
          };
        }
        return next;
      }
      return [
        ...prev,
        {
          item_id: item.id,
          item_name: item.name,
          unit_price_minor: item.price_minor,
          qty: 1,
          note: '',
        },
      ];
    });
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCartLines((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setCartLines((prev) => {
      const next = [...prev];
      const currentItem = next[index];
      if (currentItem) {
        next[index] = { ...currentItem, qty: Math.min(999, newQty) };
      }
      return next;
    });
  };

  const handleUpdateNote = (index: number, note: string) => {
    setCartLines((prev) => {
      const next = [...prev];
      const currentItem = next[index];
      if (currentItem) {
        next[index] = { ...currentItem, note };
      }
      return next;
    });
  };

  const handleRemoveLine = (index: number) => {
    setCartLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (cartLines.length === 0) {
        throw new Error('ORDER_EMPTY');
      }
      if (orderType === 'DINE_IN' && !selectedTableId) {
        throw new Error('DINE_IN_REQUIRES_TABLE');
      }

      if (isEditMode && id) {
        const updatePayload = {
          lines: cartLines.map((l) => ({
            id: l.id ?? null,
            item_id: l.item_id,
            qty: l.qty,
            note: l.note,
          })),
          discount_minor: discountMinor,
        };
        return await call(() =>
          api.PUT('/api/orders/{id}', {
            params: { path: { id: Number(id) } },
            body: updatePayload,
          }),
        );
      } else {
        const createPayload = {
          type: orderType,
          table_id: orderType === 'DINE_IN' ? selectedTableId : null,
          lines: cartLines.map((l) => ({
            item_id: l.item_id,
            qty: l.qty,
            note: l.note,
          })),
          discount_minor: discountMinor,
        };
        return await call(() =>
          api.POST('/api/orders', {
            body: createPayload,
          }),
        );
      }
    },
    onSuccess: (savedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      navigate(`/orders/${savedOrder.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(errorMessage(err.code as ClientErrorCode));
      } else if (err instanceof Error && err.message === 'ORDER_EMPTY') {
        setError('أضف صنفًا واحدًا على الأقل إلى الطلب');
      } else if (err instanceof Error && err.message === 'DINE_IN_REQUIRES_TABLE') {
        setError('يرجى اختيار طاولة للطلبات المحلي');
      } else {
        setError(errorMessage('INTERNAL_ERROR'));
      }
    },
  });

  if (isCatalogLoading || isOrderLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-slate-500">جاري تحميل البيانات...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Panel: Catalogue Grid (7 Cols) */}
      <div className="space-y-4 lg:col-span-7">
        {/* Search & Category Filter */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في قائمة الطعام والمشروبات..."
              className="w-full rounded-xl border border-slate-200 bg-white ps-10 pe-4 py-3 text-sm focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
            />
            <Icon name="search" className="absolute start-3 top-3.5 text-slate-400" size={18} />
          </div>

          {/* Categories Horizontal Scroll Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategoryId === null
                  ? 'bg-[#0d7a6b] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              الكل ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#0d7a6b] text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleAddItem(item)}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-start transition-all hover:border-[#0d7a6b] hover:shadow-md active:scale-98"
            >
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                {item.description && (
                  <p className="mt-1 text-xs text-slate-400 line-clamp-1">{item.description}</p>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="font-extrabold text-[#0d7a6b] text-sm">
                  {formatMoney(item.price_minor)}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0d7a6b]">
                  <Icon name="plus" size={16} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Cart Summary (5 Cols) */}
      <div className="space-y-4 lg:col-span-5">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">
              {isEditMode ? 'تعديل الطلب' : 'سلة الطلب الجديدة'}
            </h2>
            <Badge tone="info">{cartLines.length} أصناف</Badge>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800 border border-red-200">
              {error}
            </div>
          )}

          {/* Order Type & Table Selection */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                  orderType === 'DINE_IN'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                محلي (Dine-in)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType('TAKEAWAY');
                  setSelectedTableId(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                  orderType === 'TAKEAWAY'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سفري (Takeaway)
              </button>
            </div>

            {orderType === 'DINE_IN' && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  اختر الطاولة
                </label>
                <select
                  value={selectedTableId ?? ''}
                  onChange={(e) => setSelectedTableId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-semibold focus:border-[#0d7a6b] focus:outline-none"
                >
                  <option value="">-- اختر الطاولة --</option>
                  {(tablesData || []).map((tbl) => (
                    <option key={tbl.id} value={tbl.id}>
                      طاولة رقم {tbl.number}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="max-h-64 overflow-y-auto space-y-3 divide-y divide-slate-100">
            {cartLines.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                السلة فارغة. انقر على الأصناف لإضافتها.
              </div>
            ) : (
              cartLines.map((line, idx) => (
                <div key={idx} className="pt-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">{line.item_name}</h5>
                      <span className="text-xs text-slate-500">
                        {formatMoney(line.unit_price_minor)}
                      </span>
                    </div>
                    <span className="font-bold text-[#0d7a6b] text-sm">
                      {formatMoney(line.unit_price_minor * line.qty)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <QtyStepper
                      label="كمية الصنف"
                      value={line.qty}
                      onChange={(newQty) => handleUpdateQty(idx, newQty)}
                      min={1}
                      max={999}
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="ملاحظات..."
                        value={line.note}
                        onChange={(e) => handleUpdateNote(idx, e.target.value)}
                        className="w-32 rounded border border-slate-200 px-2 py-1 text-xs focus:border-[#0d7a6b] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing & Discount */}
          <div className="pt-4 border-t border-slate-200 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>المجموع الفرعي</span>
              <span className="font-semibold">{formatMoney(subtotalMinor)}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">الخصم (ج.م)</span>
              <input
                type="text"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0.00"
                className="w-24 rounded-lg border border-slate-300 text-end p-1.5 text-sm font-bold focus:border-[#0d7a6b] focus:outline-none"
              />
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-slate-900">
              <span>الإجمالي النهائي</span>
              <span className="text-[#0d7a6b]">{formatMoney(totalMinor)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-center py-3 text-base"
            loading={saveMutation.isPending}
            onClick={() => {
              setError(null);
              saveMutation.mutate();
            }}
            data-testid="s11-confirm-order-btn"
          >
            <Icon name="check" size={20} />
            <span>{isEditMode ? 'حفظ التعديلات' : 'تأكيد الطلب'}</span>
          </Button>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api, call, ApiError } from '@/api/client';
import { type CategoryItem } from './Categories';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Icon } from '@/components/Icon';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';
import { formatMinor } from '@/lib/money';

export interface ItemRow {
  id: number;
  category_id: number;
  category_name: string;
  category_icon: string | null;
  name: string;
  price_minor: number;
  description: string;
  status: 'ACTIVE' | 'DISABLED';
  in_use: boolean;
  created_at: string;
}

export function Items() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [search, setSearch] = useState('');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch categories for filter chips
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      return await call(() => api.GET('/api/categories'));
    },
  });

  const rawCategories = Array.isArray(categoriesData)
    ? categoriesData
    : (categoriesData as unknown as { items?: CategoryItem[]; categories?: CategoryItem[] })?.items ||
      (categoriesData as unknown as { items?: CategoryItem[]; categories?: CategoryItem[] })?.categories ||
      [];
  const categories: CategoryItem[] = Array.isArray(rawCategories) ? rawCategories : [];

  // Fetch items
  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['items', selectedCategory, statusFilter, search],
    queryFn: async () => {
      return await call(() =>
        api.GET('/api/items', {
          params: {
            query: {
              category_id: selectedCategory ?? undefined,
              status: statusFilter === 'ALL' ? undefined : statusFilter,
              search: search.trim() || undefined,
            },
          },
        }),
      );
    },
  });

  const items: ItemRow[] = (itemsData?.items as ItemRow[]) || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await call(() => api.DELETE('/api/items/{id}', { params: { path: { id } } }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setDeleteError(errorMessage(err.code as ClientErrorCode));
      } else {
        setDeleteError(errorMessage('INTERNAL_ERROR'));
      }
    },
  });

  const columns: Column<ItemRow>[] = [
    {
      key: 'name',
      header: 'الصنف',
      cell: (item) => (
        <div>
          <div className="font-semibold text-slate-900">{item.name}</div>
          {item.description && (
            <div className="text-xs text-slate-500 max-w-xs truncate">{item.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'التصنيف',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <CategoryIcon name={item.category_icon} size={16} />
          <Badge tone="neutral">{item.category_name}</Badge>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'السعر',
      numeric: true,
      cell: (item) => (
        <span className="font-bold text-slate-900">{formatMinor(item.price_minor)} ج.م</span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (item) => <StatusBadge status={item.status === 'ACTIVE' ? 'active' : 'disabled'} />,
    },
    {
      key: 'actions',
      header: 'إجراءات',
      numeric: true,
      cell: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(`/admin/items/${item.id}`)}
            data-testid={`s09-edit-${item.id}`}
          >
            <Icon name="pencil" size={16} />
            <span>تعديل</span>
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              setItemToDelete(item);
              setDeleteError(null);
              setDeleteModalOpen(true);
            }}
            data-testid={`s09-delete-${item.id}`}
          >
            <Icon name="trash" size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة الأصناف</h1>
          <p className="text-sm text-slate-500">إضافة وتعديل أسعار وأوصاف وجبات وقائمة الطعام</p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/admin/items/new')}
          data-testid="s09-add-item"
        >
          <Icon name="plus" size={18} />
          <span>إضافة صنف جديد</span>
        </Button>
      </div>

      {/* Filter Chips & Search */}
      <Card className="p-4 space-y-4">
        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              selectedCategory === null
                ? 'bg-[#0d7a6b] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#0d7a6b] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Status Tabs & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              نشط
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DISABLED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === 'DISABLED'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              معطّل
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الوصف..."
              className="w-full rounded-lg border border-slate-300 bg-white pe-3 ps-9 py-2 text-sm focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s09-search"
            />
            <Icon name="search" size={18} className="absolute start-3 top-2.5 text-slate-400" />
          </div>
        </div>
      </Card>

      {/* Items Table */}
      <DataTable<ItemRow>
        columns={columns}
        rows={items}
        loading={isLoading}
        empty="لا يوجد أصناف مطابقة لهذا البحث"
        rowKey={(item) => item.id}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="تأكيد حذف الصنف"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
              {deleteError}
            </div>
          )}
          <p className="text-slate-700">
            هل أنت تأكد من رغبتك في حذف الصنف{' '}
            <span className="font-bold">{itemToDelete?.name}</span>؟
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" size="md" onClick={() => setDeleteModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              className="bg-red-600 hover:bg-red-700 text-white"
              loading={deleteMutation.isPending}
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
              data-testid="s09-confirm-delete"
            >
              حذف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, call, ApiError } from '@/api/client';
import { CATEGORY_ICONS, type CategoryIconKey } from '@/components/categoryIcons';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';

export interface CategoryItem {
  id: number;
  name: string;
  sort_order: number;
  status: 'ACTIVE' | 'DISABLED';
  icon: CategoryIconKey | null;
  item_count: number;
  created_at: string;
}

export function Categories() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [statusVal, setStatusVal] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');
  const [iconVal, setIconVal] = useState<CategoryIconKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch categories
  const { data, isLoading } = useQuery({
    queryKey: ['categories', statusFilter],
    queryFn: async () => {
      const res = await call(() =>
        api.GET('/api/categories', {
          params: {
            query: {
              status: statusFilter === 'ALL' ? undefined : statusFilter,
            },
          },
        }),
      );
      return res;
    },
  });

  const rawCategories = Array.isArray(data)
    ? data
    : (data as unknown as { items?: CategoryItem[]; categories?: CategoryItem[] })?.items ||
      (data as unknown as { items?: CategoryItem[]; categories?: CategoryItem[] })?.categories ||
      [];
  const categories: CategoryItem[] = Array.isArray(rawCategories) ? rawCategories : [];

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSortOrder(0);
    setStatusVal('ACTIVE');
    setIconVal(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSortOrder(cat.sort_order);
    setStatusVal(cat.status);
    setIconVal(cat.icon);
    setFormError(null);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingCategory) {
        await call(() =>
          api.PATCH('/api/categories/{id}', {
            params: { path: { id: editingCategory.id } },
            body: {
              name: name.trim(),
              sort_order: Number(sortOrder),
              status: statusVal,
              icon: iconVal,
            },
          }),
        );
      } else {
        await call(() =>
          api.POST('/api/categories', {
            body: {
              name: name.trim(),
              sort_order: Number(sortOrder),
              status: statusVal,
              icon: iconVal,
            },
          }),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setModalOpen(false);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setFormError(errorMessage(err.code as ClientErrorCode));
      } else {
        setFormError(errorMessage('INTERNAL_ERROR'));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await call(() => api.DELETE('/api/categories/{id}', { params: { path: { id } } }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setDeleteError(errorMessage(err.code as ClientErrorCode));
      } else {
        setDeleteError(errorMessage('INTERNAL_ERROR'));
      }
    },
  });

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    saveMutation.mutate();
  };

  const columns: Column<CategoryItem>[] = [
    {
      key: 'name',
      header: 'التصنيف',
      cell: (cat) => (
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
            <CategoryIcon name={cat.icon} size={20} />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{cat.name}</div>
            <div className="text-xs text-slate-500">الترتيب: {cat.sort_order}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      cell: (cat) => <StatusBadge status={cat.status === 'ACTIVE' ? 'active' : 'disabled'} />,
    },
    {
      key: 'item_count',
      header: 'عدد الأصناف',
      numeric: true,
      cell: (cat) => <span className="font-medium text-slate-700">{cat.item_count} صنف</span>,
    },
    {
      key: 'actions',
      header: 'إجراءات',
      numeric: true,
      cell: (cat) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => openEditModal(cat)}
            data-testid={`s08-edit-${cat.id}`}
          >
            <Icon name="pencil" size={16} />
            <span>تعديل</span>
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              setCategoryToDelete(cat);
              setDeleteError(null);
              setDeleteModalOpen(true);
            }}
            data-testid={`s08-delete-${cat.id}`}
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
          <h1 className="text-2xl font-bold text-slate-900">إدارة التصنيفات</h1>
          <p className="text-sm text-slate-500">تنظيم أصناف القائمة وتخصيص الأيقونات والترتيب</p>
        </div>
        <Button variant="primary" size="md" onClick={openAddModal} data-testid="s08-add-category">
          <Icon name="plus" size={18} />
          <span>إضافة تصنيف جديد</span>
        </Button>
      </div>

      {/* Tabs */}
      <Card className="p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#0d7a6b] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            الكل ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#0d7a6b] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            نشط
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DISABLED')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'DISABLED'
                ? 'bg-[#0d7a6b] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            معطّل
          </button>
        </div>
      </Card>

      {/* Categories Table */}
      <DataTable<CategoryItem>
        columns={columns}
        rows={categories}
        loading={isLoading}
        empty="لا يوجد تصنيفات حاليًا"
        rowKey={(cat) => cat.id}
      />

      {/* Add / Edit Category Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {formError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <FormField label="اسم التصنيف" required>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مشروبات ساخنة"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s08-category-name"
            />
          </FormField>

          <FormField label="ترتيب العرض" hint="الأرقام الأقل تظهر أولاً">
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s08-category-sort"
            />
          </FormField>

          <FormField label="أيقونة التصنيف">
            <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-lg">
              {CATEGORY_ICONS.map((ico) => (
                <button
                  type="button"
                  key={ico.key}
                  onClick={() => setIconVal(iconVal === ico.key ? null : ico.key)}
                  className={`flex flex-col items-center gap-1 rounded-lg p-2 text-xs transition-colors ${
                    iconVal === ico.key
                      ? 'bg-[#0d7a6b] text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CategoryIcon name={ico.key} size={20} />
                  <span className="truncate w-full text-center">{ico.label}</span>
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="حالة التصنيف">
            <Toggle
              checked={statusVal === 'ACTIVE'}
              onChange={(checked) => setStatusVal(checked ? 'ACTIVE' : 'DISABLED')}
              label={statusVal === 'ACTIVE' ? 'نشط' : 'معطّل'}
              data-testid="s08-category-status"
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={saveMutation.isPending}
              data-testid="s08-save-category"
            >
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="تأكيد حذف التصنيف"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
              {deleteError}
            </div>
          )}
          <p className="text-slate-700">
            هل أنت تأكد من رغبتك في حذف التصنيف{' '}
            <span className="font-bold">{categoryToDelete?.name}</span>؟
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
              onClick={() => categoryToDelete && deleteMutation.mutate(categoryToDelete.id)}
              data-testid="s08-confirm-delete"
            >
              حذف
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

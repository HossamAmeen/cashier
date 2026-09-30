import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { api, call, ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';
import { formatMinor } from '@/lib/money';

export interface TableItem {
  id: number;
  number: number;
  is_active: boolean;
  status: 'AVAILABLE' | 'OCCUPIED';
  current_order: {
    id: number;
    number: number;
    item_count: number;
    total_minor: number;
    cashier_id: number;
    cashier_name: string;
    created_at: string;
  } | null;
  created_at: string;
}

export function Tables() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED'>('ALL');

  // Add/Edit Table Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [tableNumber, setTableNumber] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch tables
  const { data, isLoading } = useQuery({
    queryKey: ['tables', statusFilter],
    queryFn: async () => {
      const res = await call(() =>
        api.GET('/api/tables', {
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

  const tables: TableItem[] = (data?.items as TableItem[]) || [];
  const counts = data?.counts || { all: 0, available: 0, occupied: 0 };

  const openAddModal = () => {
    setEditingTable(null);
    setTableNumber('');
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (tbl: TableItem) => {
    setEditingTable(tbl);
    setTableNumber(tbl.number);
    setIsActive(tbl.is_active);
    setFormError(null);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingTable) {
        await call(() =>
          api.PATCH('/api/tables/{id}', {
            params: { path: { id: editingTable.id } },
            body: {
              number: Number(tableNumber),
              is_active: isActive,
            },
          }),
        );
      } else {
        await call(() =>
          api.POST('/api/tables', {
            body: {
              number: Number(tableNumber),
              is_active: isActive,
            },
          }),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
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

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!tableNumber || Number(tableNumber) <= 0) {
      setFormError('يرجى إدخال رقم طاولة صحيح أكثر من صفر');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">طاولات الصالة</h1>
          <p className="text-sm text-slate-500">متابعة حالة الطاولات والطلبات المفتوحة في الصالة</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/orders/new?type=TAKEAWAY')}
            data-testid="s06-takeaway-order"
          >
            <Icon name="hand" size={18} />
            <span>طلب سفري</span>
          </Button>
          {isAdmin && (
            <Button
              variant="primary"
              size="md"
              onClick={openAddModal}
              data-testid="s06-add-table"
            >
              <Icon name="plus" size={18} />
              <span>إضافة طاولة</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
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
            الكل ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('AVAILABLE')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'AVAILABLE'
                ? 'bg-[#0d7a6b] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            متاحة ({counts.available})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OCCUPIED')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'OCCUPIED'
                ? 'bg-[#0d7a6b] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            مشغولة ({counts.occupied})
          </button>
        </div>
      </Card>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Icon name="clock" className="animate-spin text-slate-400" size={32} />
        </div>
      ) : tables.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">لا توجد طاولات متاحة للعرض</Card>
      ) : (
        /* Tables Grid */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((tbl) => {
            const isOccupied = tbl.status === 'OCCUPIED';
            return (
              <Card
                key={tbl.id}
                onClick={() => navigate(`/tables/${tbl.id}`)}
                className={`group flex flex-col justify-between p-5 transition-all cursor-pointer hover:shadow-lg border-2 ${
                  isOccupied
                    ? 'border-warning/50 bg-amber-50/30'
                    : tbl.is_active
                      ? 'border-slate-200 hover:border-[#0d7a6b]'
                      : 'border-slate-200 bg-slate-100 opacity-60'
                }`}
                data-testid={`s06-table-card-${tbl.number}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white font-bold text-lg">
                        {tbl.number}
                      </span>
                      <span className="font-bold text-slate-900 text-lg">طاولة {tbl.number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={isOccupied ? 'occupied' : 'available'} />
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(tbl);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          data-testid={`s06-edit-table-${tbl.id}`}
                        >
                          <Icon name="pencil" size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {!tbl.is_active && (
                    <span className="mt-2 inline-block rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                      معطلة
                    </span>
                  )}

                  {/* Order Details Preview if Occupied */}
                  {isOccupied && tbl.current_order && (
                    <div className="mt-4 space-y-2 rounded-xl bg-white p-3 border border-amber-200 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>طلب #{tbl.current_order.number}</span>
                        <span>{tbl.current_order.cashier_name}</span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-xs text-slate-600 font-medium">
                          {tbl.current_order.item_count} أصناف
                        </span>
                        <span className="font-bold text-slate-900 text-base">
                          {formatMinor(tbl.current_order.total_minor)} ج.م
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end text-xs font-semibold text-[#0d7a6b] group-hover:underline">
                  <span>عرض التفاصيل</span>
                  <Icon name="chevronEnd" size={16} className="ms-1" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Table Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTable ? `تعديل طاولة #${editingTable.number}` : 'إضافة طاولة جديدة'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {formError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <FormField label="رقم الطاولة" required hint="أدخل رقم موجب فريد">
            <input
              type="number"
              required
              min={1}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value ? Number(e.target.value) : '')}
              placeholder="مثال: 5"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-bold focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s06-modal-table-number"
            />
          </FormField>

          <FormField label="حالة تفعيل الطاولة">
            <Toggle
              checked={isActive}
              onChange={setIsActive}
              label={isActive ? 'مفعلة (متاحة في الصالة)' : 'معطلة'}
              data-testid="s06-modal-table-active"
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
              data-testid="s06-modal-save-table"
            >
              حفظ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

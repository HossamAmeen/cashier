import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { api, call, ApiError, type Role, type UserStatus } from '@/api/client';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Toggle } from '@/components/ui/Toggle';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';

export function UserEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const userId = isNew ? null : Number(id);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('CASHIER');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing user on edit
  const { data: user, isLoading: fetching } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await call(() => api.GET('/api/users/{id}', { params: { path: { id: userId } } }));
    },
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername(user.username);
      setRole(user.role);
      setStatus(user.status);
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isNew) {
        await call(() =>
          api.POST('/api/users', {
            body: {
              name: name.trim(),
              username: username.trim().toLowerCase(),
              password,
              role,
              status,
            },
          }),
        );
      } else if (userId) {
        await call(() =>
          api.PATCH('/api/users/{id}', {
            params: { path: { id: userId } },
            body: {
              name: name.trim(),
              username: username.trim().toLowerCase(),
              password: password ? password : undefined,
              role,
              status,
            },
          }),
        );
      }
      navigate('/admin/users');
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

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Icon name="clock" className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="md" onClick={() => navigate('/admin/users')}>
          <Icon name="chevronStart" size={20} />
          <span>رجوع</span>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">
          {isNew ? 'إضافة مستخدم جديد' : `تعديل المستخدم: ${user?.name || ''}`}
        </h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <FormField label="الاسم الكامل" required>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد محمد"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s19-name"
            />
          </FormField>

          <FormField label="اسم المستخدم" required hint="أحرف إنجليزية صغيرة، أرقام، نقطة أو شرطة سفلي">
            <input
              type="text"
              required
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثال: cashier1"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s19-username"
            />
          </FormField>

          <FormField
            label="كلمة المرور"
            required={isNew}
            hint={isNew ? 'على الأقل 8 خانات' : 'اتركها فارغة إذا لم تكن تريد تغييرها'}
          >
            <input
              type="password"
              required={isNew}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
              data-testid="s19-password"
            />
          </FormField>

          <FormField label="دور المستخدم" required>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('CASHIER')}
                className={`rounded-xl border p-4 text-center transition-all ${
                  role === 'CASHIER'
                    ? 'border-[#0d7a6b] bg-[#0d7a6b]/5 ring-2 ring-[#0d7a6b]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-slate-900">كاشير (CASHIER)</div>
                <div className="mt-1 text-xs text-slate-500">إدارة الوردية والطلبات والدفع</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`rounded-xl border p-4 text-center transition-all ${
                  role === 'ADMIN'
                    ? 'border-[#0d7a6b] bg-[#0d7a6b]/5 ring-2 ring-[#0d7a6b]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-slate-900">مدير النظام (ADMIN)</div>
                <div className="mt-1 text-xs text-slate-500">صلاحيات كاملة في إدارة النظام</div>
              </button>
            </div>
          </FormField>

          <FormField label="حالة الحساب">
            <Toggle
              checked={status === 'ACTIVE'}
              onChange={(checked) => setStatus(checked ? 'ACTIVE' : 'DISABLED')}
              label={status === 'ACTIVE' ? 'نشط (مفعل)' : 'معطّل'}
              data-testid="s19-status-toggle"
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" size="md" onClick={() => navigate('/admin/users')}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              mutation
              data-testid="s19-save"
            >
              حفظ البيانات
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

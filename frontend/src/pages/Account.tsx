import { ROLE_LABELS } from '@/auth/session';
import { useAuth } from '@/auth/useAuth';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export function Account() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الملف الشخصي والحساب</h1>
        <p className="text-sm text-slate-500">معلومات حسابك الحالي في النظام</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0d7a6b] text-white font-bold text-2xl">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">@{user.username}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={user.role === 'ADMIN' ? 'info' : 'primary'}>
                {ROLE_LABELS[user.role]}
              </Badge>
              <StatusBadge status={user.status === 'ACTIVE' ? 'active' : 'disabled'} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <span className="text-xs text-slate-500">الاسم</span>
            <p className="text-base font-semibold text-slate-900 mt-1">{user.name}</p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <span className="text-xs text-slate-500">اسم المستخدم</span>
            <p className="text-base font-semibold text-slate-900 mt-1">@{user.username}</p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <span className="text-xs text-slate-500">الصلاحية</span>
            <p className="text-base font-semibold text-slate-900 mt-1">{ROLE_LABELS[user.role]}</p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <span className="text-xs text-slate-500">حالة الحساب</span>
            <div className="mt-1">
              <StatusBadge status={user.status === 'ACTIVE' ? 'active' : 'disabled'} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

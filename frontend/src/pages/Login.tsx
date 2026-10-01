import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { homeFor } from '@/auth/session';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';

export function Login() {
  const navigate = useNavigate();
  const { signIn, notice } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(notice ? errorMessage(notice) : null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError(null);
    setLoading(true);

    try {
      const user = await signIn({
        username: username.trim(),
        password,
        rememberMe,
      });
      navigate(homeFor(user.role), { replace: true });
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f2724] px-4 py-8 text-white">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="h-16 w-16 text-[#0d7a6b]" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">كاشيري</h1>
          <p className="mt-1 text-sm text-slate-300">نظام إدارة نقاط البيع للمطاعم والكافيهات</p>
        </div>

        <Card className="border-slate-700 bg-slate-900/90 p-6 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-950/80 p-3 text-center text-sm font-medium text-red-200 border border-red-800/50"
                data-testid="s01-error"
              >
                {error}
              </div>
            )}

            <FormField label="اسم المستخدم" required>
              <input
                name="username"
                type="text"
                required
                dir="ltr"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: cashier1"
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-400 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
                data-testid="s01-username"
              />
            </FormField>

            <FormField label="كلمة المرور" required>
              <input
                name="password"
                type="password"
                required
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-400 focus:border-[#0d7a6b] focus:outline-none focus:ring-1 focus:ring-[#0d7a6b]"
                data-testid="s01-password"
              />
            </FormField>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-[#0d7a6b] focus:ring-[#0d7a6b]"
                  data-testid="s01-remember"
                />
                <span>تذكرني على هذا الجهاز</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full h-[58px] text-lg font-semibold bg-[#0d7a6b] hover:bg-[#0a6357]"
              data-testid="s01-submit"
            >
              تسجيل الدخول
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <p className="text-xs text-slate-400">
              نسيت كلمة المرور؟ يرجى التواصل مع مسؤول النظام لإعادة تعيين كلمة المرور
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { homeFor } from '@/auth/session';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Icon } from '@/components/Icon';
import { errorMessage, type ClientErrorCode } from '@/lib/errors';

export function Login() {
  const navigate = useNavigate();
  const { signIn, notice } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f2724] px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div
            aria-hidden="true"
            className="grid size-16 place-items-center rounded-card bg-accent text-white shadow-[0_8px_24px_-6px_rgba(20,184,166,0.6)] ring-4 ring-white/10"
          >
            <Icon name="receipt" size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-h1 text-white">كاشيري</h1>
            <p className="text-body text-sidebar-muted">نظام إدارة نقاط البيع للمطاعم والكافيهات</p>
          </div>
        </header>

        {/* Login Form Card */}
        <Card className="p-6 sm:p-8 shadow-2xl rounded-card border-surface-border bg-surface">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-center justify-center gap-2 rounded-control bg-danger-soft p-3.5 text-sm font-medium text-danger border border-danger/20 text-center"
                data-testid="s01-error"
              >
                <Icon name="alert" size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <FormField
              label="اسم المستخدم"
              icon="user"
              name="username"
              type="text"
              required
              dir="ltr"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثال: admin"
              data-testid="s01-username"
            />

            <FormField
              label="كلمة المرور"
              icon="lock"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              data-testid="s01-password"
              end={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-ink-muted hover:text-ink transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              }
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-5 rounded border-surface-border accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
                  data-testid="s01-remember"
                />
                <span className="text-body font-medium text-ink transition-colors group-hover:text-primary">
                  تذكرني على هذا الجهاز
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={loading}
              icon="login"
              className="w-full text-body-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
              data-testid="s01-submit"
            >
              تسجيل الدخول
            </Button>
          </form>

          <div className="mt-6 border-t border-surface-border pt-4 text-center">
            <p className="text-label text-ink-muted leading-relaxed">
              نسيت كلمة المرور؟ يرجى التواصل مع مسؤول النظام لإعادة تعيين كلمة المرور
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

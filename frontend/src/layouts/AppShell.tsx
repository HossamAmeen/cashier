import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { ROLE_LABELS } from '@/auth/session';
import { useAuth } from '@/auth/useAuth';
import { BrandMark } from '@/components/BrandMark';
import { Icon, type IconName } from '@/components/Icon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const CASHIER_NAV: NavItem[] = [
  { to: '/', label: 'الرئيسية', icon: 'home' },
  { to: '/shift', label: 'الوردية', icon: 'clock' },
  { to: '/tables', label: 'الطاولات', icon: 'grid' },
  { to: '/orders/new', label: 'طلب جديد', icon: 'plus' },
  { to: '/orders', label: 'سجل الطلبات', icon: 'receipt' },
  { to: '/account', label: 'الحساب', icon: 'user' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'لوحة التحكم', icon: 'home' },
  { to: '/admin/categories', label: 'التصنيفات', icon: 'box' },
  { to: '/admin/items', label: 'الأصناف', icon: 'box' },
  { to: '/tables', label: 'الطاولات', icon: 'grid' },
  { to: '/admin/cashiers', label: 'الكاشير', icon: 'user' },
  { to: '/admin/users', label: 'المستخدمون', icon: 'users' },
  { to: '/admin/shifts', label: 'الورديات', icon: 'clock' },
  { to: '/admin/settings', label: 'الإعدادات', icon: 'settings' },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const navItems = user.role === 'ADMIN' ? ADMIN_NAV : CASHIER_NAV;

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6f9] text-slate-800" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-e border-slate-800 bg-[#0f2724] text-white transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <BrandMark className="h-8 w-8 text-[#0d7a6b] shrink-0" />
            {!collapsed && <span className="font-bold text-lg tracking-wide text-white truncate">كاشيري</span>}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={collapsed ? 'توسيع القائمة' : 'طوي القائمة'}
          >
            <Icon name={collapsed ? 'chevronEnd' : 'chevronStart'} size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0d7a6b] text-white'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon name={item.icon} size={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <p className="px-4 pb-2 text-xs text-slate-500" dir="ltr" data-testid="app-version">
            v{__APP_VERSION__}
          </p>
        )}

        {/* User Info & Logout Footer */}
        <div className="border-t border-slate-800 p-3">
          {!collapsed && (
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="truncate">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400">@{user.username}</p>
              </div>
              <Badge tone={user.role === 'ADMIN' ? 'info' : 'primary'}>
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="md"
            onClick={handleLogout}
            className="w-full justify-start text-red-400 hover:bg-red-950/30 hover:text-red-300"
          >
            <Icon name="logout" size={18} className="shrink-0" />
            {!collapsed && <span className="ms-2">تسجيل الخروج</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />

        {/* TopBar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-900">نظام إدارة المبيعات</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">مرحبًا، {user.name}</span>
            <Badge tone="success">متصل</Badge>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

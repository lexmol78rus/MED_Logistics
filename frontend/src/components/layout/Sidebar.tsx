import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  ClockAlert,
  AlertOctagon,
  Settings,
  LogOut,
  Users,
  ScrollText,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutApi } from '../../lib/api/auth';
import { canAccessRoute, ROLE_BADGE_CLASS, ROLE_LABELS } from '../../lib/rbac/permissions';
import { userInitials } from '../../lib/api/users';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';

const navItems = [
  { name: 'Панель управления', path: '/dashboard', icon: LayoutDashboard, section: 'ops' },
  { name: 'Номенклатура', path: '/products', icon: Package, section: 'ops' },
  { name: 'Партии', path: '/lots', icon: Boxes, section: 'ops' },
  { name: 'Приёмка', path: '/receiving', icon: ArrowDownToLine, section: 'ops' },
  { name: 'Списание', path: '/write-off', icon: ArrowUpFromLine, section: 'ops' },
  { name: 'Движение', path: '/movements', icon: ArrowRightLeft, section: 'ops' },
  { name: 'Контроль сроков', path: '/expiry-control', icon: ClockAlert, section: 'compliance' },
  { name: 'Отзыв партий', path: '/recall', icon: AlertOctagon, section: 'compliance' },
  { name: 'ТСД терминал', path: '/terminal', icon: Terminal, section: 'ops' },
  { name: 'Пользователи', path: '/users', icon: Users, section: 'system' },
  { name: 'Журнал аудита', path: '/audit', icon: ScrollText, section: 'system' },
  { name: 'Настройки', path: '/settings', icon: Settings, section: 'system' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearUser = useUserStore((s) => s.clearUser);
  const user = useUserStore((s) => s.user);

  const visibleItems = navItems.filter(
    (item) => user && canAccessRoute(user.role, item.path),
  );

  const opsItems = visibleItems.filter((i) => i.section === 'ops');
  const complianceItems = visibleItems.filter((i) => i.section === 'compliance');
  const systemItems = visibleItems.filter((i) => i.section === 'system');

  const handleLogout = () => {
    void logoutApi().finally(() => {
      clearAuth();
      clearUser();
      navigate('/login');
    });
  };

  const email = user?.email ?? '—';
  const role = user?.role;
  const initials = user ? userInitials(user.email) : '??';

  return (
    <aside className="w-56 border-r border-slate-300 bg-[#F1F5F9] flex flex-col h-full flex-shrink-0 shadow-inner">
      <div className="p-4 border-b border-slate-300 flex items-center gap-3 bg-[#1E293B] text-white">
        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-sm">M</div>
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-tight leading-none">МЕД-ЛОГИСТИКА</span>
          <span className="text-[9px] text-blue-200 uppercase tracking-widest mt-0.5">Склад Pro</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {opsItems.length > 0 && (
          <>
            <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-2 first:mt-0">
              Основные операции
            </div>
            {opsItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-2.5 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200/70',
                  )
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </>
        )}

        {complianceItems.length > 0 && (
          <>
            <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">Соответствие</div>
            {complianceItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-2.5 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                    isActive ? 'bg-red-600 text-white shadow-sm' : 'text-slate-700 hover:bg-red-100 hover:text-red-700',
                  )
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </>
        )}

        {systemItems.length > 0 && (
          <>
            <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">Система</div>
            {systemItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-2.5 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                    isActive ? 'bg-slate-300 text-slate-900 shadow-sm' : 'text-slate-700 hover:bg-slate-200/70',
                  )
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-slate-300 bg-slate-200/50 mt-auto">
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded bg-slate-300 border border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-700">
            {initials}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-[11px] font-bold text-slate-900 truncate" title={email}>
              {email.split('@')[0] || '—'}
            </span>
            {role ? (
              <span
                className={cn(
                  'inline-flex self-start mt-0.5 px-1.5 py-0 rounded border text-[8px] font-bold uppercase tracking-wide',
                  ROLE_BADGE_CLASS[role],
                )}
              >
                {ROLE_LABELS[role]}
              </span>
            ) : (
              <span className="text-[9px] text-slate-600 truncate">—</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded"
            title="Выйти"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

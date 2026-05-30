import { NavLink, useNavigate } from 'react-router-dom';
import { useCallback, useMemo, useState } from 'react';
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
  Truck,
  Handshake,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutApi } from '../../lib/api/auth';
import { canAccessRoute, ROLE_BADGE_CLASS, ROLE_LABELS } from '../../lib/rbac/permissions';
import { userInitials } from '../../lib/api/users';
import { useAuthStore } from '../../stores/authStore';
import { useRoleTemplatesStore } from '../../stores/roleTemplatesStore';
import { useUserStore } from '../../stores/userStore';
import { loadSettings } from '../../lib/settings/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SIDEBAR_COLLAPSED_KEY = 'med-sidebar-collapsed';

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

type NavItem = {
  name: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  section: 'ops' | 'compliance' | 'system';
  children?: { name: string; path: string }[];
};

const navItems: NavItem[] = [
  { name: 'Панель управления', path: '/dashboard', icon: LayoutDashboard, section: 'ops' },
  { name: 'Номенклатура', path: '/products', icon: Package, section: 'ops' },
  { name: 'Партии', path: '/lots', icon: Boxes, section: 'ops' },
  { name: 'Приёмка', path: '/receiving', icon: ArrowDownToLine, section: 'ops' },
  { name: 'Списание', path: '/write-off', icon: ArrowUpFromLine, section: 'ops' },
  { name: 'Движение', path: '/movements', icon: ArrowRightLeft, section: 'ops' },
  { name: 'Контроль сроков', path: '/expiry-control', icon: ClockAlert, section: 'compliance' },
  { name: 'Отзыв партий', path: '/recall', icon: AlertOctagon, section: 'compliance' },
  { name: 'ТСД терминал', path: '/terminal', icon: Terminal, section: 'ops' },
  { name: 'Отгрузки', path: '/shipments', icon: Truck, section: 'ops' },
  {
    name: 'Контрагенты',
    icon: Handshake,
    section: 'ops',
    children: [
      { name: 'Заказчики', path: '/counterparties/customers' },
      { name: 'Поставщики', path: '/counterparties/suppliers' },
      { name: 'Юр. лица', path: '/counterparties/legal-entities' },
    ],
  },
  { name: 'Пользователи', path: '/users', icon: Users, section: 'system' },
  { name: 'Журнал аудита', path: '/audit', icon: ScrollText, section: 'system' },
  { name: 'Настройки', path: '/settings', icon: Settings, section: 'system' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearUser = useUserStore((s) => s.clearUser);
  const user = useUserStore((s) => s.user);
  const roleTemplates = useRoleTemplatesStore((s) => s.templates);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const noAnim = loadSettings().uiAnimations === false;

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
    setOpenGroup(null);
  }, []);

  const visibleItems = useMemo(() => {
    if (!user) return [];
    return navItems
      .map((item) => {
        if (item.path) {
          return canAccessRoute(user.role, item.path) ? item : null;
        }
        if (item.children?.length) {
          const children = item.children.filter((c) => canAccessRoute(user.role, c.path));
          if (!children.length) return null;
          return { ...item, children };
        }
        return null;
      })
      .filter(Boolean) as NavItem[];
  }, [user, roleTemplates]);

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

  const navLinkClass = (active: boolean, variant: 'default' | 'compliance' | 'system' = 'default') =>
    cn(
      'flex items-center rounded text-xs font-medium transition-colors',
      collapsed ? 'justify-center p-2' : 'space-x-2.5 px-2 py-1.5',
      variant === 'compliance'
        ? active
          ? 'bg-red-600 text-white shadow-sm'
          : 'text-slate-700 hover:bg-red-100 hover:text-red-700'
        : variant === 'system'
          ? active
            ? 'bg-slate-300 text-slate-900 shadow-sm'
            : 'text-slate-700 hover:bg-slate-200/70'
          : active
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-700 hover:bg-slate-200/70',
    );

  return (
    <aside
      className={cn(
        'relative border-r border-slate-300 bg-[#F1F5F9] flex flex-col h-full flex-shrink-0 shadow-inner',
        collapsed ? 'w-14' : 'w-56',
        !noAnim && 'transition-[width] duration-200 ease-in-out',
      )}
    >
      <div
        className={cn(
          'border-b border-slate-300 bg-[#1E293B] text-white flex-shrink-0',
          collapsed ? 'flex flex-col items-center gap-2 py-2 px-1' : 'p-4 flex items-center gap-3',
        )}
      >
        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
          M
        </div>
        {!collapsed && (
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-bold tracking-tight leading-none">МЕД-ЛОГИСТИКА</span>
            <span className="text-[9px] text-blue-200 uppercase tracking-widest mt-0.5">Склад Pro</span>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            'rounded p-1 text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0',
            collapsed && 'mt-0.5',
          )}
          title={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
          aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-2 space-y-0.5', collapsed ? 'px-1' : 'px-2')}>
        {opsItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-2 first:mt-0">
                Основные операции
              </div>
            )}
            {opsItems.map((item) => (
              <div key={item.path ?? item.name} className="relative space-y-0.5">
                {item.path ? (
                  <NavLink
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={({ isActive }) => navLinkClass(isActive)}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </NavLink>
                ) : collapsed ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      title={item.name}
                      className={cn(
                        'w-full flex items-center justify-center rounded text-xs font-medium transition-colors text-slate-700 hover:bg-slate-200/70 p-2 outline-none',
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="min-w-[148px]">
                      {item.children?.map((c) => (
                        <DropdownMenuItem key={c.path} onClick={() => navigate(c.path)}>
                          {c.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenGroup((g) => (g === item.name ? null : item.name))}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1.5 rounded text-xs font-medium transition-colors',
                        'text-slate-700 hover:bg-slate-200/70',
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <item.icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.name}</span>
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 transition-transform shrink-0',
                          openGroup === item.name ? 'rotate-180' : 'rotate-0',
                        )}
                      />
                    </button>
                    {openGroup === item.name && (
                      <div className="pl-7 pr-1 pb-1 space-y-0.5">
                        {item.children?.map((c) => (
                          <NavLink
                            key={c.path}
                            to={c.path}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center px-2 py-1 rounded text-[11px] font-semibold transition-colors',
                                isActive
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'text-slate-700 hover:bg-slate-200/70',
                              )
                            }
                          >
                            {c.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </>
        )}

        {complianceItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">
                Соответствие
              </div>
            )}
            {complianceItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path!}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) => navLinkClass(isActive, 'compliance')}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </>
        )}

        {systemItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">
                Система
              </div>
            )}
            {systemItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path!}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) => navLinkClass(isActive, 'system')}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div
        className={cn(
          'border-t border-slate-300 bg-slate-200/50 mt-auto',
          collapsed ? 'p-2' : 'p-3',
        )}
      >
        <div
          className={cn(
            'flex items-center',
            collapsed ? 'flex-col gap-2' : 'gap-2 px-1',
          )}
        >
          <div
            className="w-7 h-7 rounded bg-slate-300 border border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0"
            title={collapsed ? `${email}${role ? ` · ${ROLE_LABELS[role]}` : ''}` : undefined}
          >
            {initials}
          </div>
          {!collapsed && (
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
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded shrink-0"
            title="Выйти"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

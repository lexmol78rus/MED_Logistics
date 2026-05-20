import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowRightLeft, 
  ClockAlert, 
  AlertOctagon, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Панель управления', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Номенклатура', path: '/products', icon: Package },
  { name: 'Партии', path: '/lots', icon: Boxes },
  { name: 'Приёмка', path: '/receiving', icon: ArrowDownToLine },
  { name: 'Списание', path: '/write-off', icon: ArrowUpFromLine },
  { name: 'Движение', path: '/movements', icon: ArrowRightLeft },
  { name: 'Контроль сроков', path: '/expiry-control', icon: ClockAlert },
  { name: 'Отзыв партий', path: '/recall', icon: AlertOctagon },
  { name: 'Настройки', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-56 border-r border-slate-300 bg-[#F1F5F9] flex flex-col h-full flex-shrink-0 shadow-inner">
      <div className="p-4 border-b border-slate-300 flex items-center gap-3 bg-[#1E293B] text-white">
        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-sm">
          M
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-tight leading-none">МЕД-ЛОГИСТИКА</span>
          <span className="text-[9px] text-blue-200 uppercase tracking-widest mt-0.5">Склад Pro</span>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-2 first:mt-0">
          Основные операции
        </div>
        {navItems.slice(0, 6).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-2.5 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/70'
              )
            }
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">
          Соответствие
        </div>
        {navItems.slice(6, 8).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-2.5 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                isActive
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-red-100 hover:text-red-700'
              )
            }
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        <div className="px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4">
          Система
        </div>
        {navItems.slice(8).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-2.5 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-300 text-slate-900 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/70'
              )
            }
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-3 border-t border-slate-300 bg-slate-200/50 mt-auto">
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded bg-slate-300 border border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-700">
            АВ
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-[11px] font-bold text-slate-900 truncate">А. Волков</span>
            <span className="text-[9px] text-slate-600 truncate">Старший кладовщик</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

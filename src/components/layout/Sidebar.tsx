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
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Lots', path: '/lots', icon: Boxes },
  { name: 'Receiving', path: '/receiving', icon: ArrowDownToLine },
  { name: 'Write-off', path: '/write-off', icon: ArrowUpFromLine },
  { name: 'Movements', path: '/movements', icon: ArrowRightLeft },
  { name: 'Expiry Control', path: '/expiry-control', icon: ClockAlert },
  { name: 'Recall Management', path: '/recall', icon: AlertOctagon },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-[#E2E8F0] bg-white flex flex-col h-full flex-shrink-0">
      <div className="p-6 border-b border-[#E2E8F0] flex items-center gap-3 bg-[#1E293B] text-white">
        <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center font-bold text-lg">
          M
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight leading-none">MED-LOGISTICS</span>
          <span className="text-[10px] opacity-70 uppercase tracking-widest mt-0.5">Warehouse Pro</span>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 first:mt-0">
          Main Menu
        </div>
        {navItems.slice(0, 6).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        <div className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">
          Critical Controls
        </div>
        {navItems.slice(6, 8).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-red-50 text-red-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        <div className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">
          System
        </div>
        {navItems.slice(8).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-[#E2E8F0] mt-auto">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-medium text-slate-700">
            AK
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs font-bold text-slate-900 truncate">Admin User</span>
            <span className="text-[10px] text-slate-500 truncate">Warehouse Manager</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

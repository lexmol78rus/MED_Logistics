import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalScanner from './GlobalScanner';
import NotificationDropdown from './NotificationDropdown';
import ConnectionBanner from '../ops/ConnectionBanner';
import { loadSettings } from '../../lib/settings/storage';
import { cn } from '@/lib/utils';

export default function Layout() {
  const settings = loadSettings();
  const noAnim = settings.uiAnimations === false;

  return (
    <div
      className={cn(
        'flex h-screen w-full bg-[#E2E8F0] overflow-hidden text-[#1E293B] selection:bg-blue-600/30 font-sans',
        settings.uiCompactMode ? 'text-xs' : 'text-sm',
        noAnim && '[&_*]:!transition-none [&_*]:!animate-none',
      )}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 shadow-[-4px_0_12px_rgba(0,0,0,0.05)] z-10 bg-[#F8FAFC]">
        <ConnectionBanner />
        <header className="h-12 border-b border-slate-300 bg-white flex items-center justify-between px-4 flex-shrink-0 sticky top-0 shadow-sm z-20">
          <GlobalScanner />

          <div className="flex items-center gap-4 ml-4">
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Сканер активен
            </div>
            <NotificationDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#F1F5F9] p-4 text-sm">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

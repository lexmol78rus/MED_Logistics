import React, { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { ScanBarcode, Bell, Search, Terminal } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const scannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep scanner input focused when pressing keys if not typing in another input
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        scannerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#E2E8F0] overflow-hidden text-[#1E293B] selection:bg-blue-600/30 font-sans text-sm">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 shadow-[-4px_0_12px_rgba(0,0,0,0.05)] z-10 bg-[#F8FAFC]">
        <header className="h-12 border-b border-slate-300 bg-white flex items-center justify-between px-4 flex-shrink-0 sticky top-0 shadow-sm z-20">
          <div className="flex items-center flex-1 max-w-2xl bg-slate-100 rounded border border-slate-300 overflow-hidden focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 transition-shadow">
            <div className="pl-3 py-1.5 flex items-center text-slate-500 bg-slate-200 border-r border-slate-300 pr-2">
              <Terminal className="h-3.5 w-3.5 mr-1.5 text-slate-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 text-nowrap">Скан / Поиск:</span>
            </div>
            <input
              ref={scannerRef}
              type="text"
              placeholder="Штрихкод, АРТ, Партия..."
              className="w-full px-3 py-1.5 bg-transparent text-sm focus:outline-none font-mono placeholder:font-sans placeholder:text-slate-400 font-bold text-blue-900"
              autoFocus
            />
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              Сканер активен
            </div>
            <button className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded border border-transparent transition-colors relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-600 rounded-full ring-2 ring-white" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#F1F5F9] p-4 text-sm">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

import React from 'react';
import Sidebar from './Sidebar';
import { ScanBarcode, Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden text-[#1E293B] selection:bg-blue-500/30">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-14 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center space-x-4 flex-1 max-w-lg">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Scan barcode or search REF / LOT / Product..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Scanner Connected
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-2 h-2 w-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  onApply: () => void;
  onReset: () => void;
  activeCount?: number;
};

export default function FilterDrawer({
  open,
  onClose,
  title = 'Фильтры',
  children,
  onApply,
  onReset,
  activeCount = 0,
}: FilterDrawerProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/30"
        aria-label="Закрыть фильтры"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-white border-l border-slate-300 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            {activeCount > 0 && (
              <p className="text-[10px] text-blue-700 font-semibold mt-0.5">Активно: {activeCount}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">{children}</div>
        <div className="p-4 border-t border-slate-200 flex gap-2">
          <Button variant="outline" className="flex-1 h-8 text-xs" onClick={onReset}>
            Сбросить
          </Button>
          <Button className="flex-1 h-8 text-xs bg-blue-700 hover:bg-blue-800" onClick={onApply}>
            Применить
          </Button>
        </div>
      </aside>
    </>
  );
}

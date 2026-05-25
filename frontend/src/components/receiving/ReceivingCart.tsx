import { useState } from 'react';
import { ArrowDownToLine, Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../ops/ConfirmDialog';
import type { ReceivingCartItem } from '../../types/receiving-cart';

type Props = {
  items: ReceivingCartItem[];
  submitting: boolean;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSubmit: () => void;
};

function formatDraftTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatExpiry(date: string): string {
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export default function ReceivingCart({
  items,
  submitting,
  onEdit,
  onRemove,
  onClear,
  onSubmit,
}: Props) {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const positionCount = items.length;
  const productCount = new Set(items.map((i) => i.productId)).size;
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);

  if (positionCount === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl px-4 py-8 text-center">
        <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Список на приёмку пуст</p>
        <p className="text-[11px] text-slate-500 mt-1.5 max-w-[220px] mx-auto leading-relaxed">
          Укажите партию и нажмите «Добавить в приёмку» — можно несколько LOT с одним REF
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0 w-full min-w-0 max-w-full">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ArrowDownToLine className="w-4 h-4 text-blue-700 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 truncate">Список на приёмку</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md shrink-0">
          {positionCount} поз.
        </span>
      </div>

      <div className="min-h-0 flex-1 max-h-[min(48vh,400px)] overflow-y-auto overflow-x-hidden overscroll-contain py-3 pl-3 pr-4 flex flex-col gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4
                  className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2"
                  title={item.productName}
                >
                  {item.productName}
                </h4>
                <p className="font-mono text-[11px] font-semibold text-slate-600 mt-1 truncate">
                  REF: {item.productRef}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 self-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-slate-200 hover:bg-slate-50"
                  onClick={() => onEdit(item.id)}
                  disabled={submitting}
                  title="Изменить"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-600" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-red-200/80 text-red-600 hover:bg-red-50"
                  onClick={() => onRemove(item.id)}
                  disabled={submitting}
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 font-bold uppercase tracking-wide text-slate-600">LOT</span>
                <span className="font-mono font-bold text-slate-900">{item.lotNumber}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 font-bold uppercase tracking-wide text-slate-600">Годен до</span>
                <span className="font-mono font-semibold text-slate-900">{formatExpiry(item.expiryDate)}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 font-bold uppercase tracking-wide text-slate-600">Кол-во</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">{item.quantity} шт</span>
              </div>
              {item.expectedReceiptLabel && (
                <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    Ожидаемое поступление
                  </span>
                  <p className="text-[11px] text-slate-700 leading-snug line-clamp-2">
                    {item.expectedReceiptLabel}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                <span className="truncate min-w-0">{item.operatorEmail}</span>
                <span className="shrink-0 tabular-nums">{formatDraftTime(item.createdAt)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 pt-3 pb-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-slate-700">
          <span>
            Позиций: <span className="font-bold text-slate-800 tabular-nums">{positionCount}</span>
          </span>
          <span>
            Товаров: <span className="font-bold text-slate-800 tabular-nums">{productCount}</span>
          </span>
          <span>
            Единиц:{' '}
            <span className="font-mono font-bold text-slate-900 tabular-nums">{totalUnits}</span>
          </span>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 px-3 py-3 flex flex-col gap-2 w-full min-w-0 box-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => setClearConfirmOpen(true)}
          disabled={submitting}
          className="h-10 w-full min-w-0 max-w-full text-sm font-semibold border-slate-300 text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1.5 shrink-0" />
          Очистить корзину
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="h-10 w-full min-w-0 max-w-full text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          {submitting ? 'Оприходование...' : 'Оприходовать всё'}
        </Button>
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Очистить корзину?"
        message="Удалить все позиции из списка приёмки? Текущий товар в форме сохранится."
        confirmLabel="Очистить корзину"
        onConfirm={() => {
          setClearConfirmOpen(false);
          onClear();
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
}

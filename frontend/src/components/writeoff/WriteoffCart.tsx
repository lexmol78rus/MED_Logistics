import { useState, type ReactNode } from 'react';
import { Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../ops/ConfirmDialog';
import { formatAppTime } from '../../lib/datetime';
import type { WriteoffCartItem } from '../../types/writeoff-cart';

type Props = {
  items: WriteoffCartItem[];
  submitting: boolean;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSubmit: () => void;
};

function formatDraftTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatAppTime(d);
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs leading-snug">
      <span className="shrink-0 font-bold uppercase tracking-wide text-slate-600 pt-px">
        {label}
      </span>
      <div className="min-w-0 text-right font-semibold text-slate-900">{children}</div>
    </div>
  );
}

export default function WriteoffCart({
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
  const totalUnits = items.reduce((sum, i) => sum + i.totalQty, 0);

  if (positionCount === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl px-4 py-8 text-center">
        <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Список на списание пуст</p>
        <p className="text-[11px] text-slate-500 mt-1.5 max-w-[220px] mx-auto leading-relaxed">
          Заполните форму и нажмите «Добавить в списание»
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingCart className="w-4 h-4 text-emerald-700 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800 truncate">Список на списание</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md shrink-0">
          {positionCount} поз.
        </span>
      </div>

      {/* Scrollable cards */}
      <div className="min-h-0 flex-1 max-h-[min(48vh,400px)] overflow-y-auto overflow-x-hidden overscroll-contain py-3 pl-3 pr-4 flex flex-col gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            {/* Title row: text left, actions right — same baseline */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h4
                    className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2"
                    title={item.productName}
                  >
                    {item.productName}
                  </h4>
                  {item.lines.some((line) => line.expired) && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-orange-950 bg-orange-100 border border-orange-300 rounded px-1.5 py-0.5">
                      ПРОСРОЧЕН
                    </span>
                  )}
                </div>
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

            {/* Details */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <DetailRow label="Назначение">
                <span className="text-blue-900 font-bold break-words">{item.destinationLabel}</span>
              </DetailRow>
              <DetailRow label="Количество">
                <span className="font-mono font-bold text-slate-900 tabular-nums">{item.totalQty} шт</span>
              </DetailRow>

              {item.lines.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Партии
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.lines.map((line) => (
                      <span
                        key={line.lotId}
                        className={`inline-flex items-center gap-1 h-6 font-mono text-[10px] font-semibold rounded-md px-2 border ${
                          line.expired
                            ? 'text-orange-950 bg-orange-50 border-orange-300'
                            : 'text-slate-800 bg-slate-100 border-slate-300'
                        }`}
                      >
                        {line.lotNumber} × {line.quantity}
                        {line.expired && (
                          <span className="font-sans text-[8px] font-bold uppercase text-orange-800">
                            EXPIRED
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.writeOffComment && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Комментарий
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-2" title={item.writeOffComment}>
                    {item.writeOffComment}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 mt-0.5 border-t border-slate-200 text-[10px] text-slate-500">
                <span className="truncate min-w-0">{item.operatorEmail}</span>
                <span className="shrink-0 tabular-nums">{formatDraftTime(item.createdAt)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Statistics footer */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 pt-3 pb-3">
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

      {/* Actions — always column: sidebar is narrow even on wide viewport */}
      <div className="shrink-0 border-t border-slate-200 px-3 py-3 flex flex-col gap-2 w-full min-w-0 box-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => setClearConfirmOpen(true)}
          disabled={submitting}
          className="h-10 w-full min-w-0 max-w-full text-sm font-semibold border-slate-300 text-red-700 hover:bg-red-50 whitespace-normal"
        >
          <Trash2 className="w-4 h-4 mr-1.5 shrink-0" />
          Очистить корзину
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="h-10 w-full min-w-0 max-w-full text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm whitespace-normal"
        >
          {submitting ? 'Списание...' : 'Выполнить списание'}
        </Button>
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Очистить корзину?"
        message="Удалить все позиции из списка списания? Черновик формы сохранится."
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

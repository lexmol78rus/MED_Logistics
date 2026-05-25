import { Activity } from 'lucide-react';
import { MovementRuButton } from '../movements/MovementRuButton';
import { MovementTypeBadge } from '../movements/MovementTypeBadge';
import { WriteOffDestinationBadge } from '../movements/WriteOffDestinationBadge';
import { movementQtyClass, movementQtyTone } from '../../lib/movements/qtyDisplay';
import type { MovementListItem } from '../../types/api';

type Props = {
  productId: string;
  items: MovementListItem[];
};

function rowAccentClass(qty: string): string {
  switch (movementQtyTone(qty)) {
    case 'in':
      return 'border-l-emerald-400';
    case 'out':
      return 'border-l-red-400';
    case 'zero':
      return 'border-l-slate-300';
    default:
      return 'border-l-slate-200';
  }
}

function qtyBgClass(qty: string): string {
  switch (movementQtyTone(qty)) {
    case 'in':
      return 'bg-emerald-50/80';
    case 'out':
      return 'bg-red-50/80';
    case 'zero':
      return 'bg-slate-50';
    default:
      return 'bg-slate-50/60';
  }
}

export default function ProductMovementsTab({ productId, items }: Props) {
  return (
    <div className="flex-1 bg-white border border-slate-300 rounded shadow-sm flex flex-col min-h-[300px] min-w-0">
      <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <Activity className="w-4 h-4 shrink-0 text-blue-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Все движения</h3>
        {items.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-slate-500 tabular-nums">
            {items.length} записей
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-4 text-xs text-slate-400">Движений по этому товару пока нет.</p>
        ) : (
          <table className="product-movements-table w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50/95 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 text-left font-bold w-[38%] min-w-[200px]">Операция</th>
                <th className="px-2 py-2 text-left font-bold w-[14%]">Документ</th>
                <th className="px-2 py-2 text-left font-bold w-[14%]">LOT / Партия</th>
                <th className="px-2 py-2 text-right font-bold w-[10%]">Кол-во</th>
                <th className="px-2 py-2 text-right font-bold w-[16%] whitespace-nowrap">Дата / время</th>
                <th className="px-2 py-2 text-center font-bold w-[8%]">РУ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((mv, index) => (
                <tr
                  key={`${mv.id}:${mv.date}:${mv.lot ?? ''}:${mv.qty}`}
                  className={`border-b border-slate-100 border-l-[3px] transition-colors hover:bg-slate-200/90 ${rowAccentClass(mv.qty)} ${
                    index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <MovementTypeBadge type={mv.type} />
                      {mv.destination ? (
                        <WriteOffDestinationBadge destination={mv.destination} />
                      ) : null}
                    </div>
                  </td>

                  <td className="px-2 py-2.5 align-middle">
                    <span
                      className="inline-block max-w-full truncate font-mono text-[11px] font-semibold text-blue-700"
                      title={mv.id}
                    >
                      {mv.id}
                    </span>
                  </td>

                  <td className="px-2 py-2.5 align-middle">
                    <span
                      className="inline-block max-w-full truncate font-mono text-[11px] text-slate-600"
                      title={mv.lot ?? undefined}
                    >
                      {mv.lot?.trim() ? mv.lot : '—'}
                    </span>
                  </td>

                  <td className="px-2 py-2.5 align-middle text-right">
                    <span
                      className={`inline-block min-w-[3rem] rounded px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums ${qtyBgClass(mv.qty)} ${movementQtyClass(mv.qty)}`}
                    >
                      {mv.qty}
                    </span>
                  </td>

                  <td className="px-2 py-2.5 align-middle text-right">
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                      {mv.date}
                    </span>
                  </td>

                  <td className="px-2 py-2.5 align-middle text-center">
                    <MovementRuButton productId={productId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

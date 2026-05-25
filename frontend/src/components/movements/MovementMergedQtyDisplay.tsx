import type { MergedWriteoffQtyDisplay } from '../../lib/movements/groupStats';

type Props = {
  display: MergedWriteoffQtyDisplay;
};

/** Итог списания крупно; исходное кол-во и корректировки — мелкой строкой ниже. */
export function MovementMergedQtyDisplay({ display }: Props) {
  const hasTotal = !!display.effectivePart;
  const hasBreakdown = !!(display.primary || display.correctionPart);

  return (
    <div
      className="movement-detail-qty-merged flex flex-col items-end gap-0.5 text-right"
      title={display.title}
    >
      {hasTotal ? (
        <>
          <span className="movement-detail-qty-total font-mono text-[1.125rem] font-bold leading-none tabular-nums text-red-600">
            {display.effectivePart}
          </span>
          {hasBreakdown && (
            <span className="movement-detail-qty-breakdown font-mono text-[10px] font-medium leading-snug tabular-nums text-slate-900">
              {display.primary}
              {display.correctionPart ? (
                <span className="text-slate-800"> {display.correctionPart}</span>
              ) : null}
            </span>
          )}
        </>
      ) : (
        <span className="movement-detail-qty font-mono text-sm font-bold tabular-nums text-red-600">
          {display.primary}
          {display.correctionPart ? (
            <span className="ml-0.5 text-[10px] font-medium text-slate-900">{display.correctionPart}</span>
          ) : null}
        </span>
      )}
    </div>
  );
}

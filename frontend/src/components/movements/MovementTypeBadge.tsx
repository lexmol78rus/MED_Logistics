import { HoverHint } from '@/components/ui/HoverHint';

const BADGE_BASE_CLASS =
  'movement-type-badge inline-flex h-[22px] shrink-0 items-center justify-center rounded-full border px-1.5 text-[11px] font-bold uppercase leading-none whitespace-nowrap';

function resolveMovementBadge(type: string): { label: string; colorClass: string } {
  const upper = type.toUpperCase();
  const isWriteoff = upper.startsWith('СПИСАНО');

  if (upper.includes('КОРРЕКТИРОВКА СПИСАНИЯ')) {
    return {
      label: 'КОРРЕКТИРОВКА',
      colorClass: 'bg-amber-50 text-amber-900 border-amber-200',
    };
  }

  if (isWriteoff) {
    return {
      label: 'СПИСАНО',
      colorClass: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  switch (type) {
    case 'ПРИХОД':
    case 'ОПРИХОДОВАНО':
      return { label: type, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'РАСХОД':
      return { label: type, colorClass: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'КАРАНТИН':
      return { label: type, colorClass: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'РАЗБЛОКИРОВКА':
      return { label: type, colorClass: 'bg-violet-50 text-violet-700 border-violet-200' };
    case 'БЛОКИРОВКА':
      return { label: type, colorClass: 'bg-red-600 text-white border-red-700' };
    case 'КОРРЕКТИРОВКА':
      return { label: type, colorClass: 'bg-slate-100 text-slate-700 border-slate-300' };
    case 'ОТЗЫВ':
      return { label: type, colorClass: 'bg-orange-50 text-orange-800 border-orange-200' };
    case 'ЗАКАЗАНО':
      return { label: type, colorClass: 'bg-sky-50 text-sky-700 border-sky-200' };
    default:
      return { label: type, colorClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
}

export function MovementTypeBadge({ type }: { type: string }) {
  const { label, colorClass } = resolveMovementBadge(type);

  return (
    <div className="movement-type-cell flex h-full w-full items-center justify-center">
      <HoverHint tip={type} className={`${BADGE_BASE_CLASS} ${colorClass}`}>
        {label}
      </HoverHint>
    </div>
  );
}

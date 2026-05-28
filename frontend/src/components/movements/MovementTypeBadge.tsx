import { HoverHint } from '@/components/ui/HoverHint';

const BADGE_BASE_CLASS =
  'movement-type-badge inline-flex h-[22px] max-w-full shrink-0 items-center justify-center rounded-full border px-1.5 text-[11px] font-bold uppercase leading-none truncate';

function resolveMovementBadge(type: string): { label: string; colorClass: string } {
  const upper = type.toUpperCase();

  if (upper.includes('КОРРЕКТИРОВКА СПИСАНИЯ')) {
    return {
      label: 'КОРРЕКТИРОВКА',
      colorClass: 'bg-amber-50 text-amber-900 border-amber-200',
    };
  }

  /** Отгрузка → списано (не начинается с «Списано», иначе в default уходила вся строка). */
  if (upper.includes('ОТГРУЗКА') && upper.includes('СПИСАНО')) {
    return {
      label: 'ОТГРУЗКА',
      colorClass: 'bg-violet-50 text-violet-800 border-violet-200',
    };
  }

  if (upper.includes('СПИСАНО')) {
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

export function MovementTypeBadge({
  type,
  inline = false,
}: {
  type: string;
  /** В карточке раскрытой группы — без растягивания на всю ширину ячейки. */
  inline?: boolean;
}) {
  const { label, colorClass } = resolveMovementBadge(type);

  const badge = (
    <HoverHint tip={type} className={`${BADGE_BASE_CLASS} ${colorClass}`}>
      {label}
    </HoverHint>
  );

  if (inline) return badge;

  return (
    <div className="movement-type-cell flex h-full w-full min-w-0 items-center justify-center">
      {badge}
    </div>
  );
}

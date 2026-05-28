import { HoverHint } from '@/components/ui/HoverHint';
import { parseWriteoffDestinationLabel } from '../../lib/movements/writeoffDestinationDisplay';

type DestinationVariant =
  | 'internal'
  | 'locb'
  | 'other'
  | 'disposal'
  | 'hospital'
  | 'defect'
  | 'default'
  | 'empty';

const VARIANT_CLASS: Record<Exclude<DestinationVariant, 'empty'>, string> = {
  internal: 'bg-sky-50 text-sky-800 border-sky-200/80',
  locb: 'bg-violet-50 text-violet-700 border-violet-200/80',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
  disposal: 'bg-orange-50 text-orange-800 border-orange-200/80',
  hospital: 'bg-blue-50 text-blue-800 border-blue-200/80',
  defect: 'bg-rose-50 text-rose-700 border-rose-200/80',
  default: 'bg-slate-50 text-slate-600 border-slate-200',
};

const BADGE_CLASS =
  'inline-flex h-6 min-h-6 max-w-full min-w-0 items-center rounded border px-2 text-[10px] font-medium leading-none truncate';

export function resolveWriteOffDestinationVariant(
  label: string | null | undefined,
): DestinationVariant {
  if (!label?.trim()) return 'empty';
  const lower = label.trim().toLowerCase();

  if (lower.includes('локб')) return 'locb';
  if (lower.startsWith('внутреннее потребление') || lower.includes('внутренн')) return 'internal';
  if (lower.startsWith('утилизация') || lower.includes('утилиз')) return 'disposal';
  if (
    lower.includes('отделение') ||
    lower.includes('кабинет') ||
    lower.includes('больниц') ||
    lower.includes('палат')
  ) {
    return 'hospital';
  }
  if (lower.startsWith('другое')) return 'other';
  if (lower.includes('брак') || lower.includes('дефект') || lower.includes('поврежден')) return 'defect';
  if (lower.includes('истёк') || lower.includes('истек') || lower.includes('срок годности')) {
    return 'disposal';
  }

  return 'default';
}

export function WriteOffDestinationBadge({
  destination,
  showCommentLine = false,
}: {
  destination: string | null | undefined;
  /** В раскрытой группе — вторая строка с контекстом отгрузки. */
  showCommentLine?: boolean;
}) {
  const label = destination?.trim() ?? '';
  const variant = resolveWriteOffDestinationVariant(label);
  const { short, full, comment } = parseWriteoffDestinationLabel(label);

  if (variant === 'empty') {
    return (
      <div className="movement-destination-cell flex h-full w-full min-w-0 items-center">
        <span className="text-xs text-slate-400">—</span>
      </div>
    );
  }

  const colorClass = VARIANT_CLASS[variant];

  return (
    <div
      className={`movement-destination-cell flex w-full min-w-0 ${
        showCommentLine && comment ? 'h-auto flex-col items-start justify-center gap-0.5 py-0.5' : 'h-full items-center'
      }`}
    >
      <HoverHint tip={full} className={`${BADGE_CLASS} ${colorClass}`}>
        {short}
      </HoverHint>
      {showCommentLine && comment && (
        <p
          className="max-w-full text-[10px] leading-snug text-slate-500 line-clamp-2 break-words"
          title={comment}
        >
          {comment}
        </p>
      )}
    </div>
  );
}

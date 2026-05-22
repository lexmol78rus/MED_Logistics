import type { ReactNode } from 'react';
import { HoverHint } from '@/components/ui/HoverHint';
import type { MovementListItem } from '../../types/api';

type Props = {
  item?: MovementListItem;
  groupCorrected?: boolean;
  compact?: boolean;
  formatOperator?: (email: string | null | undefined) => string;
};

export function MovementCorrectionBadges({
  item,
  groupCorrected,
  compact,
  formatOperator,
}: Props) {
  const badges: ReactNode[] = [];
  const label = (email: string | null | undefined) =>
    formatOperator ? formatOperator(email) : (email?.trim() || 'Система');

  if (groupCorrected || item?.hasCorrections) {
    const tip = item?.lastCorrection
      ? `Скорректировано: ${label(item.lastCorrection.correctedBy)}, ${item.lastCorrection.correctedAt}. Причина: ${item.lastCorrection.reason}`
      : 'В группе есть корректировки списания';
    badges.push(
      <HoverHint
        key="changed"
        tip={tip}
        className={`inline-flex items-center rounded border border-amber-200 bg-amber-50 font-semibold uppercase tracking-wide text-amber-800 ${
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
        }`}
      >
        Изменено
      </HoverHint>,
    );
  }

  if ((item?.correctionCount ?? 0) > 0 || item?.isCorrection) {
    badges.push(
      <HoverHint
        key="corr"
        tip="Есть связанные корректирующие движения в журнале"
        className={`inline-flex items-center rounded border border-sky-200 bg-sky-50 font-semibold uppercase tracking-wide text-sky-800 ${
          compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
        }`}
      >
        Есть коррекции
      </HoverHint>,
    );
  }

  if (badges.length === 0) return null;
  return <div className="flex flex-wrap items-center gap-1.5">{badges}</div>;
}

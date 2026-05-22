import { Package } from 'lucide-react';
import { formatGroupSummary } from '../../lib/movements/groupMovements';
import type { MovementGridRow } from '../../lib/movements/groupMovements';
import { groupHasCorrections } from '../../lib/movements/groupStats';
import { MovementCorrectionBadges } from './MovementCorrectionBadges';

type Props = {
  row: MovementGridRow;
};

export function MovementGroupMasterCell({ row }: Props) {
  const count = row.groupItems?.length ?? 0;
  const summary = formatGroupSummary(row.movement, count);
  const corrected = row.groupItems ? groupHasCorrections(row.groupItems) : false;

  return (
    <div className="movement-group-master flex h-full w-full min-w-0 items-center gap-2">
      <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <span className="min-w-0 truncate text-xs font-semibold text-slate-800">
        {summary}
      </span>
      {corrected && <MovementCorrectionBadges groupCorrected compact />}
    </div>
  );
}

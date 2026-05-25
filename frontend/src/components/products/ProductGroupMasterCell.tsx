import { Layers } from 'lucide-react';
import { formatProductLotsSummary } from '../../lib/products/groupProducts';
import type { ProductGridRow } from '../../lib/products/groupProducts';

type Props = {
  row: ProductGridRow;
};

export function ProductGroupMasterCell({ row }: Props) {
  const count = row.product.lots;

  return (
    <div className="movement-group-master flex h-full w-full min-w-0 items-center gap-2">
      <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <span className="min-w-0 truncate text-xs font-semibold text-slate-600">
        {formatProductLotsSummary(count)}
      </span>
    </div>
  );
}

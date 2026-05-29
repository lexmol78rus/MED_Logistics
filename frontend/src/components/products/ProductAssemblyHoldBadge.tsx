import { HoverHint } from '@/components/ui/HoverHint';
import type { ProductAssemblyHold } from '../../types/api';

const INDICATOR_CLASS =
  'inline-block h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm bg-sky-500';

function formatHoldLine(hold: ProductAssemblyHold): string {
  const customer = hold.customerName?.trim() || 'без заказчика';
  const qty =
    Number.isInteger(hold.quantity) ? String(hold.quantity) : hold.quantity.toFixed(2).replace(/\.?0+$/, '');
  return `${qty} шт. · ${hold.reservedBy} · ${customer}`;
}

export function formatAssemblyHoldsTip(holds: ProductAssemblyHold[]): string {
  if (!holds.length) return '';
  const header = 'Забронировано на сборку отгрузки';
  const lines = holds.map((h) => formatHoldLine(h));
  return [header, ...lines].join('\n');
}

export function ProductAssemblyHoldBadge({
  holds,
  reservedQty,
}: {
  holds: ProductAssemblyHold[];
  reservedQty?: number;
}) {
  const qty = reservedQty ?? holds.reduce((sum, h) => sum + h.quantity, 0);
  if (qty <= 0 || !holds.length) return null;

  const tip = formatAssemblyHoldsTip(holds);

  return (
    <HoverHint tip={tip}>
      <span
        className={INDICATOR_CLASS}
        role="img"
        aria-label={tip.split('\n')[0]}
      />
    </HoverHint>
  );
}

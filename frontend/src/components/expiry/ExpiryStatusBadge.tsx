import type { ExpiryListItem } from '../../lib/api/expiry';

type BadgeVariant = 'expired' | 'critical' | 'warning' | 'quarantine' | 'blocked';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  expired: 'bg-rose-600 text-white border-rose-700',
  critical: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  quarantine: 'bg-amber-50 text-amber-900 border-amber-300',
  blocked: 'bg-red-600 text-white border-red-700',
};

function resolveVariant(row: Pick<ExpiryListItem, 'status' | 'lotDbStatus'>): {
  variant: BadgeVariant;
  label: string;
} {
  if (row.lotDbStatus === 'QUARANTINE') {
    return { variant: 'quarantine', label: 'Карантин' };
  }
  if (row.lotDbStatus === 'BLOCKED') {
    return { variant: 'blocked', label: 'Блок' };
  }
  if (row.status === 'Просрочено') {
    return { variant: 'expired', label: 'Просрочено' };
  }
  if (row.status === 'Критичный') {
    return { variant: 'critical', label: 'Критичный' };
  }
  return { variant: 'warning', label: row.status || 'Внимание' };
}

export function ExpiryStatusBadge({ row }: { row: ExpiryListItem }) {
  const { variant, label } = resolveVariant(row);

  return (
    <div className="expiry-status-cell flex h-full w-full items-center">
      <span
        className={`inline-flex h-6 max-w-full shrink-0 items-center justify-center rounded border px-2 text-[10px] font-bold uppercase leading-none whitespace-nowrap ${VARIANT_CLASS[variant]}`}
      >
        {label}
      </span>
    </div>
  );
}

export function matchesExpiryStatusFilter(row: ExpiryListItem, filter: string): boolean {
  const s = filter.trim().toLowerCase();
  if (!s) return true;

  const risk = row.status.toLowerCase();
  const db = row.lotDbStatus.toLowerCase();

  if (s === 'карантин' || s === 'quarantine') return row.lotDbStatus === 'QUARANTINE';
  if (s === 'блок' || s === 'blocked') return row.lotDbStatus === 'BLOCKED';
  if (s === 'просрочено' || s === 'expired') return risk === 'просрочено';
  if (s === 'критичный' || s === 'critical') return risk === 'критичный';
  if (s === 'внимание' || s === 'warning') return risk === 'внимание';

  return risk.includes(s) || db.includes(s) || row.lot.toLowerCase().includes(s);
}

import { CATEGORY_LABELS } from '../../lib/audit/actionConfig';
import type { AuditCategory } from '../../lib/audit/types';

const BADGE_BASE =
  'inline-flex h-6 min-h-6 max-w-full shrink-0 items-center justify-center rounded border px-2 text-[10px] font-bold uppercase leading-none whitespace-nowrap';

const CATEGORY_STYLES: Record<AuditCategory, string> = {
  all: 'bg-slate-100 text-slate-700 border-slate-300',
  login: 'bg-sky-50 text-sky-700 border-sky-200',
  receive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  writeoff: 'bg-red-50 text-red-700 border-red-200',
  block: 'bg-red-600 text-white border-red-700',
  users: 'bg-violet-50 text-violet-700 border-violet-200',
  settings: 'bg-amber-50 text-amber-800 border-amber-200',
  expected_receipt: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  products: 'bg-teal-50 text-teal-700 border-teal-200',
  errors: 'bg-orange-50 text-orange-800 border-orange-300',
  other: 'bg-slate-100 text-slate-600 border-slate-300',
};

export function AuditEventBadge({ category }: { category: AuditCategory }) {
  const label = CATEGORY_LABELS[category] ?? category;
  const colorClass = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.other;

  return (
    <div className="audit-type-cell flex h-full w-full items-center justify-center">
      <span className={`${BADGE_BASE} ${colorClass}`}>{label}</span>
    </div>
  );
}

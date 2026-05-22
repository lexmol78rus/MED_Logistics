import { Package, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MovementTypeBadge } from './MovementTypeBadge';
import { WriteOffDestinationBadge } from './WriteOffDestinationBadge';
import { MovementExpiryLabel } from './MovementExpiryLabel';
import { MovementCorrectionBadges } from './MovementCorrectionBadges';
import { MovementItemCorrectionComment } from './MovementItemCorrectionComment';
import {
  buildGroupDetailHeader,
  getItemCorrectionComment,
  isWriteoffGroup,
} from '../../lib/movements/groupStats';
import type { MovementListItem } from '../../types/api';

function movementQtyClass(qty: string): string {
  if (qty === '0') return 'movement-qty-zero';
  if (qty.startsWith('+')) return 'movement-qty-in';
  if (qty.startsWith('-')) return 'movement-qty-out';
  return 'movement-qty-neutral';
}

type Props = {
  items: MovementListItem[];
  canEdit?: boolean;
  onEdit?: () => void;
  formatOperator?: (email: string | null | undefined) => string;
};

export function MovementGroupDetailPanel({ items, canEdit, onEdit, formatOperator }: Props) {
  const header = buildGroupDetailHeader(items);
  const writeoff = isWriteoffGroup(items);
  const operatorLabel = (email: string | null | undefined) =>
    formatOperator ? formatOperator(email) : (email?.trim() || 'Система');

  return (
    <div className="movement-group-detail">
      <div className="movement-group-detail-banner" aria-hidden>
        <Package className="movement-group-detail-banner-icon h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
        <span className="movement-group-detail-banner-title">{header.title}</span>
      </div>
      <div className="movement-group-detail-header border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <span>
                <span className="font-semibold text-slate-500">Документ:</span>{' '}
                <span className="font-mono text-blue-700">{header.documentId}</span>
              </span>
              <span>
                <span className="font-semibold text-slate-500">Оператор:</span>{' '}
                {operatorLabel(header.operator)}
              </span>
              <span>
                <span className="font-semibold text-slate-500">Время:</span> {header.date}
              </span>
            </div>
            {header.destination && (
              <div className="pt-0.5">
                <WriteOffDestinationBadge destination={header.destination} />
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <div>{header.positions} поз.</div>
              <div>{header.units.toLocaleString('ru-RU')} ед.</div>
            </div>
            <MovementCorrectionBadges
              groupCorrected={header.corrected}
              formatOperator={formatOperator}
            />
          </div>
        </div>
      </div>

      <div className="movement-group-detail-list px-3 py-3">
        <ul className="space-y-2.5">
          {items.map((item) => {
            const correctionComment = getItemCorrectionComment(item);
            return (
            <li
              key={item.id}
              className="movement-group-detail-card rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-800">{item.productName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] text-slate-500">
                    <span>REF {item.ref}</span>
                    <span>LOT {item.lot ?? '—'}</span>
                    <span className="inline-flex items-center gap-1 font-sans">
                      <span className="text-slate-400">Срок</span>
                      <MovementExpiryLabel expiryDate={item.expiryDate} variant="inline" />
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <MovementTypeBadge type={item.type} />
                  <span
                    className={`movement-detail-qty font-mono text-sm font-bold tabular-nums ${movementQtyClass(item.qty)}`}
                  >
                    {item.qty}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  {item.destination ? (
                    <WriteOffDestinationBadge destination={item.destination} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                  <span>{operatorLabel(item.user)}</span>
                  <span className="font-mono text-slate-400">{item.id}</span>
                </div>
                <MovementCorrectionBadges item={item} compact formatOperator={formatOperator} />
              </div>
              {correctionComment && (
                <MovementItemCorrectionComment comment={correctionComment} />
              )}
            </li>
            );
          })}
        </ul>
      </div>

      {canEdit && writeoff && onEdit && (
        <div className="border-t border-slate-200 bg-white px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Редактировать списание
          </Button>
        </div>
      )}
    </div>
  );
}

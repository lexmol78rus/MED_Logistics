import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { buildAuditDetailFields } from '../../lib/audit/detailFields';
import type { AuditLookups } from '../../lib/audit/types';
import type { EnrichedAuditRow } from '../../lib/audit/types';
import { toast } from 'sonner';

type Props = {
  row: EnrichedAuditRow | null;
  lookups: AuditLookups;
  onClose: () => void;
};

export function AuditDetailPanel({ row, lookups, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  if (!row) return null;

  const fields = buildAuditDetailFields(row.raw, lookups) ?? [];

  const copyDescription = async () => {
    try {
      await navigator.clipboard.writeText(row.description);
      setCopied(true);
      toast.success('Описание скопировано');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const severityBorder =
    row.severity === 'danger'
      ? 'border-l-red-500'
      : row.severity === 'warning'
        ? 'border-l-amber-500'
        : 'border-l-blue-500';

  return (
    <aside
      className={`shrink-0 w-[min(100%,22rem)] sm:w-80 border-l border-slate-200 bg-white flex flex-col min-h-0 border-l-4 ${severityBorder}`}
    >
      <div className="shrink-0 flex items-start justify-between gap-2 p-3 border-b border-slate-200 bg-slate-50">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800">{row.actionLabel}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{row.dateLabel}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="shrink-0 p-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed flex-1">{row.description}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 text-[10px]"
            onClick={() => void copyDescription()}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {fields.map((field) => (
          <div key={field.label} className="text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{field.label}</p>
            <p
              className={`mt-0.5 text-slate-700 break-words ${field.mono ? 'font-mono text-[11px]' : ''} whitespace-pre-wrap`}
            >
              {field.value}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}

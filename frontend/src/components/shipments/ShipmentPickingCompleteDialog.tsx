import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ShipmentPickingOutcome } from '../../lib/api/shipments';

type Props = {
  open: boolean;
  customerName: string;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (outcome: ShipmentPickingOutcome, comment: string) => void;
};

const OUTCOMES: Array<{
  value: ShipmentPickingOutcome;
  label: string;
  hint: string;
}> = [
  {
    value: 'SUCCESS',
    label: 'Успешно',
    hint: 'Все позиции собраны по листу',
  },
  {
    value: 'PARTIAL',
    label: 'Частично',
    hint: 'Собрано не всё количество или не все позиции',
  },
  {
    value: 'ISSUE',
    label: 'С замечаниями',
    hint: 'Нехватка, брак, расхождение с заказом',
  },
];

export default function ShipmentPickingCompleteDialog({
  open,
  customerName,
  saving = false,
  onCancel,
  onConfirm,
}: Props) {
  const [outcome, setOutcome] = useState<ShipmentPickingOutcome>('SUCCESS');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open) {
      setOutcome('SUCCESS');
      setComment('');
    }
  }, [open]);

  if (!open) return null;

  const trimmed = comment.trim();
  const canSubmit = trimmed.length >= 3;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-lg border border-slate-300 bg-white p-4 shadow-xl"
      >
        <h3 className="text-sm font-bold text-slate-900">Сборка завершена?</h3>
        <p className="mt-1 text-sm text-slate-600">
          Заказчик: <span className="font-semibold text-slate-800">{customerName}</span>
        </p>
        <p className="mt-2 text-[13px] leading-snug text-slate-500">
          Укажите результат сборки и комментарий — далее откроется списание по REF из отгрузки.
        </p>

        <div className="mt-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Результат *</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {OUTCOMES.map((o) => (
              <label
                key={o.value}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors ${
                  outcome === o.value
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="picking-outcome"
                  className="sr-only"
                  checked={outcome === o.value}
                  onChange={() => setOutcome(o.value)}
                  disabled={saving}
                />
                <div className="text-sm font-semibold text-slate-900">{o.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{o.hint}</div>
              </label>
            ))}
          </div>
        </div>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Комментарий кладовщика *
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="mt-1 w-full min-w-0 resize-y rounded border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Например: всё собрано по листу / не хватает 2 шт по REF 13432345…"
          disabled={saving}
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={saving || !canSubmit}
            onClick={() => onConfirm(outcome, trimmed)}
          >
            {saving ? 'Сохранение...' : 'Готово → к списанию'}
          </Button>
        </div>
      </div>
    </div>
  );
}

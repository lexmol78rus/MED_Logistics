import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export type ShipmentWarehouseActionKind = 'pause' | 'recall' | 'resume';

type Props = {
  open: boolean;
  kind: ShipmentWarehouseActionKind;
  customerName: string;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (comment: string) => void;
};

const COPY: Record<
  ShipmentWarehouseActionKind,
  { title: string; hint: string; confirmLabel: string; confirmClass: string; commentRequired: boolean }
> = {
  pause: {
    title: 'Приостановить сборку?',
    hint: 'Кладовщики увидят паузу и ваш комментарий. Сборку можно возобновить или полностью отозвать.',
    confirmLabel: 'Приостановить',
    confirmClass: 'bg-amber-600 hover:bg-amber-700',
    commentRequired: true,
  },
  recall: {
    title: 'Отозвать сборку со склада?',
    hint: 'Заказ вернётся в статус «Новый» — можно изменить состав и отправить снова. Обязательно укажите причину для склада.',
    confirmLabel: 'Отозвать',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    commentRequired: true,
  },
  resume: {
    title: 'Возобновить сборку?',
    hint: 'Заказ снова станет активным на складе. Комментарий необязателен.',
    confirmLabel: 'Возобновить',
    confirmClass: 'bg-blue-700 hover:bg-blue-800',
    commentRequired: false,
  },
};

export default function ShipmentWarehouseActionDialog({
  open,
  kind,
  customerName,
  saving = false,
  onCancel,
  onConfirm,
}: Props) {
  const [comment, setComment] = useState('');
  const meta = COPY[kind];

  useEffect(() => {
    if (open) setComment('');
  }, [open, kind]);

  if (!open) return null;

  const trimmed = comment.trim();
  const canSubmit = meta.commentRequired ? trimmed.length >= 3 : true;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-4 shadow-xl"
      >
        <h3 className="text-sm font-bold text-slate-900">{meta.title}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Заказчик: <span className="font-semibold text-slate-800">{customerName}</span>
        </p>
        <p className="mt-2 text-[13px] leading-snug text-slate-500">{meta.hint}</p>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {meta.commentRequired ? 'Комментарий для склада *' : 'Комментарий для склада'}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="mt-1 w-full min-w-0 resize-y rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={
            kind === 'pause'
              ? 'Например: уточняем количество по позиции 2…'
              : kind === 'recall'
                ? 'Например: ошибка в заказе, нужна правка менеджером…'
                : 'Необязательно'
          }
          disabled={saving}
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            className={meta.confirmClass}
            disabled={saving || !canSubmit}
            onClick={() => onConfirm(trimmed)}
          >
            {saving ? 'Сохранение...' : meta.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

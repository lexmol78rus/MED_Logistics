import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RecallLotDetail } from '../../lib/api/recall';
import { voidLot } from '../../lib/api/recall';
import { ApiError } from '../../lib/api/client';

type Props = {
  open: boolean;
  lot: RecallLotDetail;
  onClose: () => void;
  onSuccess: () => void;
};

export default function VoidLotDialog({ open, lot, onClose, onSuccess }: Props) {
  const [comment, setComment] = useState('');
  const [transferLot, setTransferLot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setComment('');
    setTransferLot('');
    setError(null);
  }, [open, lot.id]);

  const handleSubmit = async () => {
    const trimmedComment = comment.trim();
    if (trimmedComment.length < 5) {
      setError('Укажите причину удаления (не короче 5 символов)');
      return;
    }
    if (lot.requiresTransfer && !transferLot.trim()) {
      setError('Укажите LOT корректной партии для переноса остатка');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await voidLot(lot.id, {
        comment: trimmedComment,
        transferToLotNumber: lot.requiresTransfer ? transferLot.trim() : undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить партию');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <Trash2 className="w-5 h-5" />
            Удалить ошибочную партию
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Партия <span className="font-mono font-bold text-slate-800">{lot.lot}</span> будет
            полностью удалена из системы. Операция необратима; в журнале аудита сохранится запись с
            вашим комментарием.
          </p>

          {lot.requiresTransfer && (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
              <p className="font-bold text-xs uppercase tracking-wide mb-1">Требуется перенос</p>
              <p>
                На ошибочной партии остаток <strong>{lot.qty} шт</strong>. Укажите LOT корректной
                партии того же товара — остаток будет перенесён перед удалением.
              </p>
              {lot.siblingLots.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold uppercase text-amber-800 mb-1">
                    Партии этого товара (в т.ч. с нулевым остатком)
                  </p>
                  <ul className="space-y-0.5 font-mono text-xs max-h-28 overflow-y-auto">
                    {lot.siblingLots.map((s) => (
                      <li key={s.lot}>
                        <button
                          type="button"
                          className="underline hover:no-underline"
                          onClick={() => setTransferLot(s.lot)}
                        >
                          {s.lot}
                        </button>
                        <span className={s.qty > 0 ? 'text-amber-700/80' : 'text-amber-600/60'}>
                          {' '}
                          — {s.qty} шт
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3">
                <Label htmlFor="void-transfer-lot" className="text-xs">
                  LOT корректной партии
                </Label>
                <input
                  id="void-transfer-lot"
                  value={transferLot}
                  onChange={(e) => setTransferLot(e.target.value.toUpperCase())}
                  placeholder="Номер партии-получателя"
                  className="mt-1 w-full h-9 font-mono text-sm border border-amber-400 rounded px-2 uppercase font-bold"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="void-comment" className="text-xs">
              Причина удаления <span className="text-rose-600">*</span>
            </Label>
            <textarea
              id="void-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Например: партия создана с опечаткой в LOT, фактической партии 63838884"
              className="mt-1 w-full text-sm border border-slate-300 rounded p-2 resize-y min-h-[72px]"
            />
          </div>

          {error && (
            <p className="text-rose-600 text-xs font-medium" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            type="button"
            className="bg-rose-700 hover:bg-rose-800"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Удаление…' : 'Удалить партию'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

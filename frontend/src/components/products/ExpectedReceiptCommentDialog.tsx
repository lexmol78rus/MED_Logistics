import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type ExpectedReceiptCommentAction = 'close' | 'cancel';

type Props = {
  open: boolean;
  action: ExpectedReceiptCommentAction;
  onClose: () => void;
  onConfirm: (comment: string) => Promise<void>;
};

const COPY: Record<
  ExpectedReceiptCommentAction,
  { title: string; label: string; placeholder: string; confirm: string; confirmClass: string }
> = {
  close: {
    title: 'Подтвердить предзаказ',
    label: 'Комментарий к подтверждению',
    placeholder: 'Например: всё ок, товар получен полностью',
    confirm: 'Подтвердить',
    confirmClass: 'bg-emerald-700 hover:bg-emerald-800',
  },
  cancel: {
    title: 'Отменить предзаказ',
    label: 'Причина отмены',
    placeholder: 'Например: отказ больницы, заказ отозван поставщиком',
    confirm: 'Отменить предзаказ',
    confirmClass: 'bg-rose-700 hover:bg-rose-800',
  },
};

export default function ExpectedReceiptCommentDialog({
  open,
  action,
  onClose,
  onConfirm,
}: Props) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[action];

  useEffect(() => {
    if (!open) return;
    setComment('');
    setError(null);
  }, [open, action]);

  const handleSubmit = async () => {
    const trimmed = comment.trim();
    if (trimmed.length < 2) {
      setError('Укажите комментарий (не короче 2 символов)');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить действие');
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = action === 'close' ? CheckCircle2 : XCircle;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${action === 'close' ? 'text-emerald-700' : 'text-rose-700'}`}
          >
            <Icon className="w-5 h-5" />
            {copy.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <Label htmlFor="er-action-comment" className="text-xs">
              {copy.label} <span className="text-rose-600">*</span>
            </Label>
            <textarea
              id="er-action-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={copy.placeholder}
              className="mt-1 w-full text-sm border border-slate-300 rounded p-2 resize-y min-h-[72px]"
              autoFocus
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
            Назад
          </Button>
          <Button
            type="button"
            className={copy.confirmClass}
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Сохранение…' : copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

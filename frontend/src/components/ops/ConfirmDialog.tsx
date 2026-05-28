import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClassName?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  confirmClassName = 'bg-red-600 hover:bg-red-700',
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white border border-slate-300 rounded shadow-xl max-w-md w-full p-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mt-2">{message}</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            className={confirmClassName}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

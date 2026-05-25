import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createProduct, updateProduct } from '../../lib/api/products';
import type { ProductListItem } from '../../types/api';
import { ApiError } from '../../lib/api/client';
import { canEditProduct } from '../../lib/rbac/permissions';
import { useUserStore } from '../../stores/userStore';
import { toast } from 'sonner';

type ProductFormState = {
  ref: string;
  name: string;
  manufacturer: string;
  barcode: string;
};

const emptyForm = (): ProductFormState => ({
  ref: '',
  name: '',
  manufacturer: '',
  barcode: '',
});

type ProductFormDialogProps = {
  open: boolean;
  product: ProductListItem | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export default function ProductFormDialog({
  open,
  product,
  onClose,
  onSaved,
}: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const canEditRef = canEditProduct(userRole);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        ref: product.ref,
        name: product.name,
        manufacturer: product.manufacturer ?? '',
        barcode: product.barcode ?? '',
      });
      return;
    }
    setForm(emptyForm());
  }, [open, product]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.ref.trim() || !form.name.trim()) {
      toast.error('Заполните REF и наименование');
      return;
    }

    setSaving(true);
    try {
      if (product) {
        const refNormalized = form.ref.trim().toUpperCase();
        const payload = {
          name: form.name.trim(),
          manufacturer: form.manufacturer.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          ...(canEditRef && refNormalized !== product.ref.trim().toUpperCase()
            ? { sku: refNormalized }
            : {}),
        };
        await updateProduct(product.id, payload);
        toast.success('Товар обновлён');
      } else {
        await createProduct({
          sku: form.ref.trim(),
          name: form.name.trim(),
          manufacturer: form.manufacturer.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
        });
        toast.success('Товар создан');
      }
      await onSaved();
      onClose();
    } catch (err) {
      console.error('[ProductFormDialog] save failed', err);
      toast.error(err instanceof ApiError ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="relative w-full max-w-md rounded-lg border border-slate-300 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 id="product-form-title" className="text-sm font-bold text-slate-800">
            {product ? 'Редактировать ТМЦ' : 'Добавить ТМЦ'}
          </h3>
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 px-4 py-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="product-ref" className="text-[10px] font-bold uppercase text-slate-500">
              REF
            </label>
            <input
              id="product-ref"
              className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              value={form.ref}
              onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
              disabled={!!product && !canEditRef}
              placeholder="Например REF-1102"
            />
            <p className="text-[10px] text-slate-400">
              {product && canEditRef
                ? 'REF можно исправить при опечатке; должен оставаться уникальным в системе'
                : 'Уникальный идентификатор товара (например REF-1102)'}
            </p>
          </div>
          <label className="text-[10px] font-bold uppercase text-slate-500">Наименование</label>
          <input
            className="h-9 rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <label className="text-[10px] font-bold uppercase text-slate-500">Изготовитель</label>
          <input
            className="h-9 rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={form.manufacturer}
            onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
          />
          <label className="text-[10px] font-bold uppercase text-slate-500">Штрихкод</label>
          <input
            className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={form.barcode}
            onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
}

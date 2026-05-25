import { useEffect, useRef, useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { quickCreateProduct } from '../../lib/api/products';
import type { QuickCreateProductResult } from '../../lib/api/products';
import { ApiError } from '../../lib/api/client';
import { toast } from 'sonner';

export type ReceivingCreateProductForm = {
  name: string;
  ref: string;
  manufacturer: string;
};

type ReceivingCreateProductModalProps = {
  open: boolean;
  barcode: string;
  onClose: () => void;
  onCreated: (product: QuickCreateProductResult) => void;
};

const emptyForm = (): ReceivingCreateProductForm => ({
  name: '',
  ref: '',
  manufacturer: '',
});

export default function ReceivingCreateProductModal({
  open,
  barcode,
  onClose,
  onCreated,
}: ReceivingCreateProductModalProps) {
  const [form, setForm] = useState<ReceivingCreateProductForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    const t = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, barcode]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (name: string, minimal = false) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Укажите наименование товара');
      nameRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const result = await quickCreateProduct({
        barcode,
        name: trimmedName,
        sku: form.ref.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
      });
      if (result.created) {
        toast.success(minimal ? 'Минимальная карточка создана' : 'Товар создан');
      } else {
        toast.info('Товар уже в базе — продолжаем приёмку (укажите LOT / партию)');
      }
      onCreated(result);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка создания товара');
    } finally {
      setSaving(false);
    }
  };

  const handleMinimal = () => {
    void submit(`НЕИЗВЕСТНЫЙ ТОВАР ${barcode}`, true);
  };

  const handleFormKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit(form.name);
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
        aria-labelledby="receiving-create-product-title"
        className="relative w-full max-w-md rounded-lg border border-slate-300 bg-white shadow-xl"
        onKeyDown={handleFormKeyDown}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-blue-600" />
            <h3 id="receiving-create-product-title" className="text-sm font-bold text-slate-800">
              Новый товар не найден
            </h3>
          </div>
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 px-4 py-4">
          <div className="rounded border border-blue-100 bg-blue-50/50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Штрихкод</p>
            <p className="font-mono text-sm font-bold text-blue-900">{barcode}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="recv-product-name" className="text-[10px] font-bold uppercase text-slate-500">
              Наименование товара <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              id="recv-product-name"
              className="h-9 rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Введите название"
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="recv-product-ref" className="text-[10px] font-bold uppercase text-slate-500">
              REF / артикул
            </label>
            <input
              id="recv-product-ref"
              className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.ref}
              onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
              placeholder="Авто, если пусто"
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="recv-product-mfr" className="text-[10px] font-bold uppercase text-slate-500">
              Производитель
            </label>
            <input
              id="recv-product-mfr"
              className="h-9 rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.manufacturer}
              onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
              disabled={saving}
            />
          </div>

          <p className="text-[10px] text-slate-400 leading-tight">
            Категорию и ед. измерения можно дозаполнить позже в номенклатуре. Для приёмки достаточно названия и штрихкода.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <Button
            className="h-9 w-full text-xs font-bold bg-blue-700 hover:bg-blue-800"
            onClick={() => void submit(form.name)}
            disabled={saving}
          >
            {saving ? 'Создание...' : 'Создать и продолжить приёмку'}
          </Button>
          <Button
            variant="outline"
            className="h-9 w-full text-xs font-semibold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
            onClick={handleMinimal}
            disabled={saving}
          >
            Создать минимально
          </Button>
          <Button variant="ghost" className="h-8 text-xs text-slate-500" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}

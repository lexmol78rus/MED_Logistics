import { useEffect, useRef, useState } from 'react';
import { AlertCircle, X, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ProductNameAutocomplete from '../product-names/ProductNameAutocomplete';

export type ReceivingCreateProductForm = {
  name: string;
  ref: string;
  manufacturer: string;
  gtin: string;
};

export type ReceivingCreateProductDraft = {
  barcode: string;
  name: string;
  ref: string;
  manufacturer: string | null;
  gtin: string | null;
  minimal: boolean;
};

type ReceivingCreateProductModalProps = {
  open: boolean;
  barcode: string;
  initialGtin?: string | null;
  initialForm?: Partial<ReceivingCreateProductForm> | null;
  expiryWarning?: string | null;
  scanHints?: string[];
  onClose: () => void;
  onSubmitDraft: (draft: ReceivingCreateProductDraft) => void;
};

function filterModalScanHints(hints: string[], expiryWarning: string | null | undefined): string[] {
  return hints.filter(
    (hint) =>
      hint !== expiryWarning &&
      !hint.startsWith('REF (артикул) при новом товаре'),
  );
}

const emptyForm = (): ReceivingCreateProductForm => ({
  name: '',
  ref: '',
  manufacturer: '',
  gtin: '',
});

function normalizeGtinInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits;
}

export default function ReceivingCreateProductModal({
  open,
  barcode,
  initialGtin,
  initialForm,
  expiryWarning,
  scanHints = [],
  onClose,
  onSubmitDraft,
}: ReceivingCreateProductModalProps) {
  const [form, setForm] = useState<ReceivingCreateProductForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const gtinFromScan = initialGtin ? normalizeGtinInput(initialGtin) : '';
    setForm({
      ...emptyForm(),
      ...(initialForm ?? {}),
      gtin: initialForm?.gtin?.trim() ? normalizeGtinInput(initialForm.gtin) : gtinFromScan,
    });
    const t = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, barcode, initialForm, initialGtin]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (
    values: { name: string; ref: string; manufacturer: string; gtin: string },
    minimal = false,
  ) => {
    const trimmedName = values.name.trim();
    const trimmedRef = values.ref.trim();
    const trimmedManufacturer = values.manufacturer.trim();
    const trimmedGtin = normalizeGtinInput(values.gtin);

    if (!trimmedName) {
      toast.error('Укажите наименование товара');
      nameRef.current?.focus();
      return;
    }
    if (!trimmedRef) {
      toast.error('Укажите REF / артикул');
      return;
    }
    if (!trimmedManufacturer) {
      toast.error('Укажите производителя');
      return;
    }
    if (values.gtin.trim() && trimmedGtin.length < 8) {
      toast.error('GTIN должен содержать от 8 до 14 цифр');
      return;
    }

    setSaving(true);
    try {
      onSubmitDraft({
        barcode,
        name: trimmedName,
        ref: trimmedRef,
        manufacturer: trimmedManufacturer,
        gtin: trimmedGtin.length >= 8 ? trimmedGtin : null,
        minimal,
      });
    } catch {
      toast.error('Ошибка подготовки карточки товара');
    } finally {
      setSaving(false);
    }
  };

  const handleMinimal = () => {
    const next = {
      name: `НЕИЗВЕСТНЫЙ ТОВАР ${barcode}`,
      ref: form.ref.trim() || barcode,
      manufacturer: form.manufacturer.trim() || 'Неизвестно',
      gtin: form.gtin,
    };
    setForm((f) => ({
      ...f,
      name: next.name,
      ref: next.ref,
      manufacturer: next.manufacturer,
    }));
    void submit(next, true);
  };

  const handleFormKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit({
        name: form.name,
        ref: form.ref,
        manufacturer: form.manufacturer,
        gtin: form.gtin,
      });
    }
  };

  const gtinAutofilled = Boolean(initialGtin?.trim() && form.gtin === normalizeGtinInput(initialGtin));
  const extraScanHints = filterModalScanHints(scanHints, expiryWarning);

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

        {(expiryWarning || extraScanHints.length > 0) && (
          <div className="space-y-2 border-b border-amber-100 bg-amber-50/30 px-4 py-3">
            {expiryWarning && (
              <div
                role="status"
                className="flex gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium leading-snug text-amber-950"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                <span>{expiryWarning}</span>
              </div>
            )}
            {extraScanHints.length > 0 && (
              <div className="rounded-md border border-blue-200 bg-blue-50/90 px-3 py-2 text-[11px] font-medium leading-snug text-slate-700 space-y-1">
                {extraScanHints.map((hint) => (
                  <p key={hint}>{hint}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 px-4 py-4">
          <div className="rounded border border-blue-100 bg-blue-50/50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Штрихкод</p>
            <p className="font-mono text-sm font-bold text-blue-900 break-all">{barcode}</p>
            <p className="mt-1 text-[10px] font-medium text-amber-800">
              REF (артикул) укажите с этикетки — в этом штрих-коде его обычно нет.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="recv-product-gtin" className="text-[10px] font-bold uppercase text-slate-500">
              GTIN
            </label>
            <input
              id="recv-product-gtin"
              className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.gtin}
              onChange={(e) => setForm((f) => ({ ...f, gtin: normalizeGtinInput(e.target.value) }))}
              placeholder="14 цифр (из GS1-кода, если есть)"
              inputMode="numeric"
              disabled={saving}
            />
            <p className="text-[10px] text-slate-400 leading-tight">
              {gtinAutofilled
                ? 'Подставлен из штрих-кода (01). Сохранится в карточке товара для Честного ЗНАКа.'
                : 'Для «умного» штрих-кода GTIN подставится сам. Иначе можно оставить пустым.'}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="recv-product-name" className="text-[10px] font-bold uppercase text-slate-500">
              Наименование товара <span className="text-red-500">*</span>
            </label>
            <ProductNameAutocomplete
              id="recv-product-name"
              inputRef={nameRef}
              value={form.name}
              onChange={(name) => setForm((f) => ({ ...f, name }))}
              onPick={(pick) =>
                setForm((f) => ({
                  ...f,
                  name: pick.name,
                  manufacturer: pick.manufacturer?.trim()
                    ? pick.manufacturer
                    : f.manufacturer,
                }))
              }
              placeholder="Введите название"
              disabled={saving}
            />
            <p className="text-[10px] text-slate-400 leading-tight">
              Начните вводить название — подсказки из базы наименований. При выборе подставится изготовитель, если он указан.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="recv-product-ref" className="text-[10px] font-bold uppercase text-slate-500">
              REF / артикул <span className="text-red-500">*</span>
            </label>
            <input
              id="recv-product-ref"
              className="h-9 rounded border border-slate-300 px-3 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.ref}
              onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
              placeholder="Введите REF / артикул"
              required
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="recv-product-mfr" className="text-[10px] font-bold uppercase text-slate-500">
              Производитель <span className="text-red-500">*</span>
            </label>
            <input
              id="recv-product-mfr"
              className="h-9 rounded border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={form.manufacturer}
              onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
              placeholder="Введите производителя"
              required
              disabled={saving}
            />
          </div>

          <p className="text-[10px] text-slate-400 leading-tight">
            Категорию и ед. измерения можно дозаполнить позже в номенклатуре.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <Button
            className="h-9 w-full text-xs font-bold bg-blue-700 hover:bg-blue-800"
            onClick={() =>
              void submit({
                name: form.name,
                ref: form.ref,
                manufacturer: form.manufacturer,
                gtin: form.gtin,
              })
            }
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

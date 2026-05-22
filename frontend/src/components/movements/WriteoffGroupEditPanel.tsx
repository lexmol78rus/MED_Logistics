import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ApiError } from '../../lib/api/client';
import {
  correctWriteoffGroup,
  fetchWriteoffRecommendation,
  type CorrectWriteoffAdditionPayload,
  type CorrectWriteoffLinePayload,
} from '../../lib/api/inventory';
import { fetchWriteoffDestinations } from '../../lib/api/writeoff-destinations';
import type { WriteoffDestinationItem } from '../../lib/api/writeoff-destinations';
import DestinationSelect from '../writeoff/DestinationSelect';
import type { MovementListItem } from '../../types/api';
import type { WriteoffRecommendation } from '../../types/api';

type EditLine = {
  reference: string;
  productName: string;
  ref: string;
  lot: string | null;
  effectiveQty: number;
  newQty: number;
  remove: boolean;
  writeOffDestinationId?: string | null;
};

type NewLine = {
  key: string;
  productId: string;
  productName: string;
  ref: string;
  lotId: string;
  lot: string;
  quantity: number;
  writeOffDestinationId: string;
};

type Props = {
  open: boolean;
  items: MovementListItem[];
  operationGroupId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

const EDIT_REASON_PRESETS = [
  'Менеджер ошибся',
  'Клиент попросил больше',
  'Клиент отказался от части товара',
  'Коррекция после проверки',
  'Ошибка комплектации',
];

function rootWriteoffLines(items: MovementListItem[]): MovementListItem[] {
  return items.filter(
    (item) => !item.isCorrection && item.type.toUpperCase().startsWith('СПИСАНО'),
  );
}

export default function WriteoffGroupEditPanel({
  open,
  items,
  operationGroupId,
  onClose,
  onSaved,
}: Props) {
  const [lines, setLines] = useState<EditLine[]>([]);
  const [newLines, setNewLines] = useState<NewLine[]>([]);
  const [editReason, setEditReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [destinations, setDestinations] = useState<WriteoffDestinationItem[]>([]);

  const [addSearch, setAddSearch] = useState('');
  const [addProduct, setAddProduct] = useState<WriteoffRecommendation | null>(null);
  const [addQtyByLot, setAddQtyByLot] = useState<Record<string, number>>({});
  const [addDestinationId, setAddDestinationId] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const defaultDestinationId = useMemo(() => {
    const root = rootWriteoffLines(items)[0];
    return destinations[0]?.id ?? '';
  }, [items, destinations]);

  useEffect(() => {
    if (!open) return;
    const roots = rootWriteoffLines(items);
    setLines(
      roots.map((item) => ({
        reference: item.id,
        productName: item.productName,
        ref: item.ref,
        lot: item.lot,
        effectiveQty: item.effectiveWriteoffQty ?? Math.abs(Number.parseFloat(item.qty.replace(/\s/g, '')) || 0),
        newQty: item.effectiveWriteoffQty ?? Math.abs(Number.parseFloat(item.qty.replace(/\s/g, '')) || 0),
        remove: false,
      })),
    );
    setNewLines([]);
    setEditReason('');
    setAddSearch('');
    setAddProduct(null);
    setAddQtyByLot({});
    void fetchWriteoffDestinations({ activeOnly: true, pageSize: 200 })
      .then((d) => setDestinations(d.items))
      .catch(() => setDestinations([]));
  }, [open, items]);

  useEffect(() => {
    if (addDestinationId || !defaultDestinationId) return;
    setAddDestinationId(defaultDestinationId);
  }, [addDestinationId, defaultDestinationId]);

  const searchProduct = useCallback(async () => {
    const q = addSearch.trim();
    if (!q) {
      toast.error('Введите REF, штрихкод или LOT');
      return;
    }
    setAddLoading(true);
    try {
      const data = await fetchWriteoffRecommendation({ q, useFefoRecommendations: true });
      setAddProduct(data);
      const initial: Record<string, number> = {};
      for (const lot of data.lots) initial[lot.lotId] = 0;
      setAddQtyByLot(initial);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Товар не найден');
      setAddProduct(null);
    } finally {
      setAddLoading(false);
    }
  }, [addSearch]);

  const appendNewLine = () => {
    if (!addProduct || !addDestinationId) {
      toast.error('Выберите товар и назначение списания');
      return;
    }
    const lots = addProduct.lots.filter((l) => (addQtyByLot[l.lotId] ?? 0) > 0);
    if (lots.length === 0) {
      toast.error('Укажите количество хотя бы по одной партии');
      return;
    }
    for (const lot of lots) {
      setNewLines((prev) => [
        ...prev,
        {
          key: `${addProduct.productId}:${lot.lotId}:${Date.now()}:${Math.random()}`,
          productId: addProduct.productId,
          productName: addProduct.name,
          ref: addProduct.ref,
          lotId: lot.lotId,
          lot: lot.lot,
          quantity: addQtyByLot[lot.lotId] ?? 0,
          writeOffDestinationId: addDestinationId,
        },
      ]);
    }
    setAddProduct(null);
    setAddQtyByLot({});
    setAddSearch('');
  };

  const handleSave = async () => {
    const reason = editReason.trim();
    if (reason.length < 3) {
      toast.error('Укажите причину редактирования (минимум 3 символа)');
      return;
    }

    const updates: CorrectWriteoffLinePayload[] = [];
    for (const line of lines) {
      if (line.remove) {
        updates.push({ reference: line.reference, remove: true });
        continue;
      }
      if (line.newQty !== line.effectiveQty) {
        updates.push({ reference: line.reference, newQuantity: line.newQty });
      }
    }

    const additions: CorrectWriteoffAdditionPayload[] = newLines.map((n) => ({
      productId: n.productId,
      lotId: n.lotId,
      quantity: n.quantity,
      writeOffDestinationId: n.writeOffDestinationId,
    }));

    if (updates.length === 0 && additions.length === 0) {
      toast.error('Нет изменений для сохранения');
      return;
    }

    setSubmitting(true);
    try {
      await correctWriteoffGroup({
        operationGroupId: operationGroupId ?? undefined,
        movementReferences: operationGroupId
          ? undefined
          : rootWriteoffLines(items).map((i) => i.id),
        editReason: reason,
        updates,
        additions,
      });
      toast.success('Списание скорректировано');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось сохранить корректировку');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-slate-900/40"
        aria-label="Закрыть редактирование"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 z-[70] flex h-full w-full max-w-xl flex-col border-l border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">Корректировка списания</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Изменения оформляются отдельными движениями в журнале
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <section>
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Позиции списания
            </h4>
            <ul className="space-y-3">
              {lines.map((line) => (
                <li key={line.reference} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <div className="mb-2 min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{line.productName}</div>
                    <div className="font-mono text-[10px] text-slate-500">
                      REF {line.ref} · LOT {line.lot ?? '—'} · {line.reference}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600">
                      Сейчас списано: <strong>{line.effectiveQty.toLocaleString('ru-RU')}</strong> шт
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-[10px] font-semibold uppercase text-slate-500">Новое кол-во</label>
                    <input
                      type="number"
                      min={0}
                      disabled={line.remove}
                      className="h-8 w-24 rounded border border-slate-300 px-2 text-sm"
                      value={line.newQty}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0);
                        setLines((prev) =>
                          prev.map((l) =>
                            l.reference === line.reference ? { ...l, newQty: v, remove: false } : l,
                          ),
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-red-700"
                      onClick={() =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.reference === line.reference
                              ? { ...l, remove: !l.remove, newQty: 0 }
                              : l,
                          ),
                        )
                      }
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      {line.remove ? 'Отменить удаление' : 'Удалить позицию'}
                    </Button>
                  </div>
                </li>
              ))}
              {lines.length === 0 && (
                <p className="text-xs text-slate-500">Нет редактируемых строк списания в группе.</p>
              )}
            </ul>
          </section>

          {newLines.length > 0 && (
            <section>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Новые позиции
              </h4>
              <ul className="space-y-2">
                {newLines.map((n) => (
                  <li
                    key={n.key}
                    className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs"
                  >
                    <span>
                      {n.productName} · LOT {n.lot} · {n.quantity} шт
                    </span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => setNewLines((prev) => prev.filter((x) => x.key !== n.key))}
                    >
                      Убрать
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Добавить позицию
            </h4>
            <div className="flex gap-2">
              <input
                className="h-8 flex-1 rounded border border-slate-300 px-2 text-xs"
                placeholder="REF / штрихкод / LOT"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void searchProduct()}
              />
              <Button type="button" size="sm" className="h-8 text-xs" disabled={addLoading} onClick={() => void searchProduct()}>
                Найти
              </Button>
            </div>
            {addProduct && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  {addProduct.name} <span className="font-mono text-slate-500">({addProduct.ref})</span>
                </p>
                <DestinationSelect value={addDestinationId} onChange={setAddDestinationId} />
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {addProduct.lots.map((lot) => (
                    <li key={lot.lotId} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono">
                        {lot.lot} · {lot.expiry} · доступно {lot.qty}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={lot.qty}
                        className="h-7 w-20 rounded border border-slate-300 px-1 text-right"
                        value={addQtyByLot[lot.lotId] ?? 0}
                        onChange={(e) =>
                          setAddQtyByLot((prev) => ({
                            ...prev,
                            [lot.lotId]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </li>
                  ))}
                </ul>
                <Button type="button" size="sm" className="h-8 w-full text-xs" onClick={appendNewLine}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Добавить в корректировку
                </Button>
              </div>
            )}
          </section>

          <section>
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Причина редактирования <span className="text-red-600">*</span>
            </label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Обязательное поле"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EDIT_REASON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
                  onClick={() => setEditReason(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="flex gap-2 border-t border-slate-200 p-4">
          <Button variant="outline" className="flex-1 h-9 text-xs" onClick={onClose} disabled={submitting}>
            Отмена
          </Button>
          <Button
            className="flex-1 h-9 bg-blue-700 text-xs hover:bg-blue-800"
            disabled={submitting || editReason.trim().length < 3}
            onClick={() => void handleSave()}
          >
            {submitting ? 'Сохранение…' : 'Сохранить корректировку'}
          </Button>
        </div>
      </aside>
    </>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, BoxSelect, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWriteoffRecommendation, writeoffInventory } from '../lib/api/inventory';
import type { WriteoffRecommendation } from '../types/api';
import { ApiError } from '../lib/api/client';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import { enqueueRetry } from '../lib/ops/retry-queue';
import { useScannerField } from '../lib/scanner/useScannerField';
import DestinationSelect from '../components/writeoff/DestinationSelect';
import { fetchWriteoffDestinations } from '../lib/api/writeoff-destinations';

function pickFefoLot(lots: WriteoffRecommendation['lots']) {
  return lots.find((l) => l.fefo === true) ?? null;
}

function buildInitialQuantities(
  lots: WriteoffRecommendation['lots'],
  useFefo: boolean,
): Record<string, number> {
  const initial: Record<string, number> = {};
  for (const lot of lots) {
    initial[lot.lotId] = 0;
  }
  if (useFefo) {
    const primary = pickFefoLot(lots);
    if (primary) {
      initial[primary.lotId] = Math.min(1, primary.qty);
    }
  }
  return initial;
}

export default function WriteOff() {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<WriteoffRecommendation | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [useFefoRecommendations, setUseFefoRecommendations] = useState(true);
  const [destinationId, setDestinationId] = useState('');
  const [destinationComment, setDestinationComment] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fefoLot = useMemo(
    () => (useFefoRecommendations && selectedProduct ? pickFefoLot(selectedProduct.lots) : null),
    [selectedProduct, useFefoRecommendations],
  );

  const applyRecommendation = useCallback(
    (data: WriteoffRecommendation, useFefo: boolean) => {
      setSelectedProduct(data);
      setQuantities(buildInitialQuantities(data.lots, useFefo));
    },
    [],
  );

  const handleSearch = useCallback(
    async (query?: string, useFefo = useFefoRecommendations) => {
      const q = (query ?? search).trim();
      if (!q) return;
      setLoading(true);
      try {
        const data = await fetchWriteoffRecommendation({ q, useFefoRecommendations: useFefo });
        applyRecommendation(data, useFefo);
        if (query != null) setSearch(q);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Товар не найден');
        setSelectedProduct(null);
      } finally {
        setLoading(false);
      }
    },
    [search, applyRecommendation, useFefoRecommendations],
  );

  const { inputRef, handleKeyDown, restoreFocus } = useScannerField({
    onScan: (value) => {
      setSearch(value);
      void handleSearch(value);
    },
    onClear: () => setSearch(''),
  });

  const setLotQuantity = useCallback((lotId: string, maxQty: number, raw: string) => {
    const parsed = raw === '' ? 0 : Number(raw);
    const value = Number.isFinite(parsed) ? Math.min(maxQty, Math.max(0, parsed)) : 0;
    setQuantities((prev) => ({ ...prev, [lotId]: value }));
  }, []);

  const totalToWriteoff = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.lots.reduce((sum, lot) => sum + (quantities[lot.lotId] ?? 0), 0);
  }, [selectedProduct, quantities]);

  const hasNonFefoAllocation = useMemo(() => {
    if (!useFefoRecommendations || !fefoLot || !selectedProduct) return false;
    return selectedProduct.lots.some(
      (lot) => lot.lotId !== fefoLot.lotId && (quantities[lot.lotId] ?? 0) > 0,
    );
  }, [useFefoRecommendations, fefoLot, selectedProduct, quantities]);

  const destinationReady = destinationId !== '';

  const canSubmit = Boolean(selectedProduct && totalToWriteoff > 0 && destinationReady && !submitting);

  const handleDestinationChange = useCallback(async (id: string) => {
    setDestinationId(id);
    if (!id) {
      setDestinationLabel('');
      return;
    }
    try {
      const data = await fetchWriteoffDestinations({ activeOnly: true, pageSize: 200 });
      const found = data.items.find((d) => d.id === id);
      setDestinationLabel(found?.name ?? '');
    } catch {
      setDestinationLabel('');
    }
  }, []);

  const handleFefoToggle = useCallback(
    (enabled: boolean) => {
      setUseFefoRecommendations(enabled);
      if (!selectedProduct) return;
      if (search.trim()) {
        void handleSearch(search.trim(), enabled);
      } else {
        void (async () => {
          setLoading(true);
          try {
            const data = await fetchWriteoffRecommendation({
              productId: selectedProduct.productId,
              useFefoRecommendations: enabled,
            });
            applyRecommendation(data, enabled);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Не удалось обновить партии');
          } finally {
            setLoading(false);
          }
        })();
      }
    },
    [selectedProduct, search, handleSearch, applyRecommendation],
  );

  const resetForm = useCallback(() => {
    setSelectedProduct(null);
    setSearch('');
    setQuantities({});
    setDestinationId('');
    setDestinationLabel('');
    setDestinationComment('');
  }, []);

  const handleConfirmRequest = () => {
    if (!selectedProduct || totalToWriteoff <= 0) {
      toast.error('Укажите количество для списания');
      return;
    }
    if (!destinationReady) {
      toast.error('Укажите, куда списываем');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedProduct || !destinationId) return;
    setConfirmOpen(false);

    const lines = selectedProduct.lots
      .filter((lot) => (quantities[lot.lotId] ?? 0) > 0)
      .map((lot) => ({ lotId: lot.lotId, quantity: quantities[lot.lotId] }));

    const run = async () => {
      await writeoffInventory({
        productId: selectedProduct.productId,
        writeOffDestinationId: destinationId,
        writeOffComment: destinationComment.trim() || undefined,
        lines,
        useFefoRecommendations,
      });
      toast.success('Товар успешно списан.');
      resetForm();
      restoreFocus();
    };

    setSubmitting(true);
    try {
      await run();
    } catch (err) {
      if (!navigator.onLine) {
        enqueueRetry('Списание', run);
        toast.error('Офлайн — операция в очереди на повтор');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Ошибка списания');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col max-w-4xl mx-auto gap-4 py-4 md:py-6">
      <div className="shrink-0">
        <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">Расход / Списание со склада</h2>
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">
          {useFefoRecommendations ? 'FEFO — рекомендация, выбор партии вручную' : 'Ручной выбор партий'}
        </p>
      </div>

      <div className="shrink-0 bg-white border border-slate-300 rounded shadow-sm flex items-center p-2 gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Штрихкод, REF, GTIN, LOT / Партия..."
            className="w-full pl-8 h-9 text-sm border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 px-2 border outline-none font-mono placeholder:font-sans placeholder:text-slate-400 font-bold text-blue-900"
            autoFocus
          />
        </div>
        <Button onClick={() => void handleSearch()} className="h-9 px-6 bg-slate-800 hover:bg-slate-900 text-xs font-bold" disabled={loading}>
          {loading ? 'Поиск...' : 'Найти'}
        </Button>
      </div>

      {selectedProduct && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto pb-4">
            <div className="bg-white border border-slate-300 shadow-md rounded flex flex-col">
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight">{selectedProduct.name}</h3>
                  <div className="font-mono mt-1 text-xs font-bold text-slate-500 bg-white border border-slate-200 inline-block px-1.5 py-0.5 rounded">
                    <span className="text-slate-400 font-sans font-semibold mr-1">REF</span>
                    {selectedProduct.ref}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Доступный остаток</div>
                  <div className="text-xl font-bold font-mono tracking-tight text-blue-700">
                    {selectedProduct.totalQty.toLocaleString('ru-RU')}{' '}
                    <span className="text-[10px] text-slate-500 font-sans font-normal">шт</span>
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none border border-slate-200 rounded p-3 bg-slate-50">
                  <input
                    type="checkbox"
                    checked={useFefoRecommendations}
                    onChange={(e) => handleFefoToggle(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">Использовать FEFO рекомендации</span>
                </label>

                <div className="grid gap-3 sm:grid-cols-2 border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Куда списываем <span className="text-red-600">*</span>
                    </label>
                    <DestinationSelect
                      value={destinationId}
                      onChange={(id) => void handleDestinationChange(id)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Комментарий (необязательно)
                    </label>
                    <textarea
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded bg-white min-h-[56px] focus:outline-none focus:border-blue-500"
                      value={destinationComment}
                      onChange={(e) => setDestinationComment(e.target.value)}
                      placeholder="Дополнительная информация..."
                    />
                  </div>
                </div>

                <div
                  className={`border rounded p-4 relative ${
                    useFefoRecommendations
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {useFefoRecommendations && (
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500 rounded-l" />
                  )}
                  <div
                    className={`flex items-center font-bold text-sm mb-1 ${
                      useFefoRecommendations ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    <BoxSelect className="w-4 h-4 mr-1.5" />
                    {useFefoRecommendations ? 'FEFO рекомендация системы' : 'Ручной выбор партии'}
                  </div>
                  <p
                    className={`text-[11px] font-medium leading-tight max-w-2xl ${
                      useFefoRecommendations ? 'text-emerald-800/80' : 'text-slate-600'
                    }`}
                  >
                    {useFefoRecommendations
                      ? 'Ближайший срок подсвечен — можно списать с любой партии.'
                      : 'Укажите количество для каждой нужной партии.'}
                  </p>

                  {hasNonFefoAllocation && fefoLot && (
                    <div className="mt-3 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-semibold leading-snug">
                        Вы выбрали не самую раннюю партию (рекомендована{' '}
                        <span className="font-mono">{fefoLot.lot}</span>). Операция разрешена.
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2">
                    <div
                      className={`grid grid-cols-12 text-[9px] font-bold uppercase tracking-wider pb-1 px-2 ${
                        useFefoRecommendations ? 'text-emerald-800/60' : 'text-slate-500'
                      }`}
                    >
                      <div className="col-span-4">LOT / Партия</div>
                      <div className="col-span-3">Срок годности</div>
                      <div className="col-span-2 text-right">Наличие</div>
                      <div className="col-span-3 text-right">Списание</div>
                    </div>
                    {selectedProduct.lots.map((lot) => {
                      const isFefoRow = useFefoRecommendations && fefoLot?.lotId === lot.lotId;
                      return (
                        <div
                          key={lot.lotId}
                          className={`grid grid-cols-12 items-center p-2 rounded border ${
                            isFefoRow
                              ? 'bg-white border-emerald-300 shadow-sm'
                              : 'bg-white/80 border-slate-200'
                          }`}
                        >
                          <div className="col-span-4 flex items-center gap-1.5">
                            <span className={`font-mono text-xs font-bold ${isFefoRow ? 'text-slate-900' : 'text-slate-700'}`}>
                              {lot.lot}
                            </span>
                            {isFefoRow && (
                              <span className="text-[8px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1 rounded">
                                FEFO
                              </span>
                            )}
                          </div>
                          <div className="col-span-3">
                            <span
                              className={`font-mono text-xs ${
                                isFefoRow ? 'text-red-600 font-bold' : 'text-slate-600'
                              }`}
                            >
                              {lot.expiry}
                            </span>
                          </div>
                          <div className="col-span-2 text-right font-mono text-xs font-medium text-slate-600">
                            {lot.qty}
                          </div>
                          <div className="col-span-3 flex justify-end">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={quantities[lot.lotId] ?? 0}
                              min={0}
                              max={lot.qty}
                              className="w-20 pl-2 pr-1 h-7 text-xs font-mono font-bold text-right border rounded bg-white border-slate-300 shadow-inner focus:outline-none focus:border-blue-500"
                              onChange={(e) => setLotQuantity(lot.lotId, lot.qty, e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Итого к списанию:</div>
                  <div className="text-2xl font-bold font-mono text-slate-900">{totalToWriteoff}</div>
                </div>

                <div className="flex items-start text-amber-700 gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-[10px] font-bold uppercase leading-tight">Проверьте физическое совпадение партий</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="shrink-0 z-30 border-t border-slate-300 bg-white shadow-[0_-6px_16px_rgba(15,23,42,0.12)]"
            role="toolbar"
            aria-label="Действия списания"
          >
            <div className="flex gap-2 p-3">
              <Button
                variant="outline"
                onClick={resetForm}
                className="h-11 md:h-10 flex-1 sm:flex-none text-sm font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                disabled={submitting}
              >
                Отмена
              </Button>
              <Button
                type="button"
                onClick={handleConfirmRequest}
                className="h-12 md:h-11 flex-[2] sm:min-w-[200px] text-base md:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                disabled={!canSubmit}
                aria-disabled={!canSubmit}
              >
                {submitting ? 'Списание...' : 'Списать'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Подтвердить списание?"
        message={`Списать ${totalToWriteoff} ед. → ${destinationLabel}? Операция необратима.`}
        confirmLabel="Списать"
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, BoxSelect, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchWriteoffRecommendation,
  writeoffInventoryBatch,
} from '../lib/api/inventory';
import type { WriteoffRecommendation } from '../types/api';
import {
  createWriteoffCartItemId,
  type WriteoffCartItem,
} from '../types/writeoff-cart';
import { ApiError } from '../lib/api/client';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import { enqueueRetry } from '../lib/ops/retry-queue';
import { useScannerField } from '../lib/scanner/useScannerField';
import DestinationSelect from '../components/writeoff/DestinationSelect';
import WriteoffCart from '../components/writeoff/WriteoffCart';
import { fetchWriteoffDestinations } from '../lib/api/writeoff-destinations';
import { useUserStore } from '../stores/userStore';
import {
  syncWriteoffDraftOwner,
  useWriteoffDraftStore,
} from '../stores/writeoffDraftStore';
import { formatExpiryRu, lotIsExpired } from '../lib/writeoff/expiry';
import {
  availableAfterCart,
  cartLotReservations,
} from '../lib/writeoff/cartReservations';

function pickFefoLot(lots: WriteoffRecommendation['lots']) {
  return lots.find((l) => l.fefo === true) ?? null;
}

/** Одна цифра «0» в поле; type=number при value=0 не перерисовывается и копит «000». */
function formatLotQtyInput(qty: number): string {
  return qty === 0 ? '0' : String(qty);
}

function buildInitialQuantities(
  lots: WriteoffRecommendation['lots'],
  useFefo: boolean,
  reservedByLot: Record<string, number> = {},
): Record<string, number> {
  const initial: Record<string, number> = {};
  for (const lot of lots) {
    initial[lot.lotId] = 0;
  }
  if (useFefo) {
    const primary = pickFefoLot(lots);
    if (primary) {
      const available = availableAfterCart(
        primary.qty,
        reservedByLot[primary.lotId] ?? 0,
      );
      if (available > 0) {
        initial[primary.lotId] = Math.min(1, available);
      }
    }
  }
  return initial;
}

export default function WriteOff() {
  const userId = useUserStore((s) => s.user?.userId ?? null);
  const operatorEmail = useUserStore((s) => s.user?.email ?? '—');

  const cart = useWriteoffDraftStore((s) => s.cart);
  const form = useWriteoffDraftStore((s) => s.form);
  const setForm = useWriteoffDraftStore((s) => s.setForm);
  const upsertCartItem = useWriteoffDraftStore((s) => s.upsertCartItem);
  const removeCartItem = useWriteoffDraftStore((s) => s.removeCartItem);
  const clearCart = useWriteoffDraftStore((s) => s.clearCart);
  const clearFormProduct = useWriteoffDraftStore((s) => s.clearFormProduct);
  const clearAllDraft = useWriteoffDraftStore((s) => s.clearAllDraft);

  const {
    search,
    selectedProduct,
    quantities,
    useFefoRecommendations,
    destinationId,
    destinationLabel,
    destinationComment,
    editingCartId,
  } = form;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);

  useEffect(() => {
    syncWriteoffDraftOwner(userId);
  }, [userId]);

  const fefoLot = useMemo(
    () => (useFefoRecommendations && selectedProduct ? pickFefoLot(selectedProduct.lots) : null),
    [selectedProduct, useFefoRecommendations],
  );

  const lotReservations = useMemo(() => {
    if (!selectedProduct) return {};
    return cartLotReservations(cart, selectedProduct.productId, editingCartId);
  }, [selectedProduct, cart, editingCartId]);

  const availableTotalQty = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.lots.reduce(
      (sum, lot) => sum + availableAfterCart(lot.qty, lotReservations[lot.lotId] ?? 0),
      0,
    );
  }, [selectedProduct, lotReservations]);

  /** Синхронизация с корзиной (в т.ч. после добавления и старого черновика в localStorage). */
  useEffect(() => {
    if (!selectedProduct) return;
    const current = useWriteoffDraftStore.getState().form.quantities;
    let changed = false;
    const next = { ...current };
    for (const lot of selectedProduct.lots) {
      const max = availableAfterCart(lot.qty, lotReservations[lot.lotId] ?? 0);
      const cur = next[lot.lotId] ?? 0;
      const clamped = Math.min(max, Math.max(0, cur));
      if (clamped !== cur) {
        next[lot.lotId] = clamped;
        changed = true;
      }
    }
    if (changed) setForm({ quantities: next });
  }, [selectedProduct, lotReservations, setForm]);

  const applyRecommendation = useCallback(
    (data: WriteoffRecommendation, useFefo: boolean) => {
      const { cart: currentCart, form: currentForm } = useWriteoffDraftStore.getState();
      const reserved = cartLotReservations(
        currentCart,
        data.productId,
        currentForm.editingCartId,
      );
      const expiredOnly =
        data.lots.length > 0 && data.lots.every((lot) => lotIsExpired(lot));
      const effectiveFefo = expiredOnly ? false : useFefo;
      setForm({
        selectedProduct: data,
        quantities: buildInitialQuantities(data.lots, effectiveFefo, reserved),
        ...(expiredOnly ? { useFefoRecommendations: false } : {}),
      });
    },
    [setForm],
  );

  const handleSearch = useCallback(
    async (query?: string, useFefo = useFefoRecommendations) => {
      const q = (query ?? search).trim();
      if (!q) return;
      setLoading(true);
      try {
        const data = await fetchWriteoffRecommendation({ q, useFefoRecommendations: useFefo });
        applyRecommendation(data, useFefo);
        if (query != null) setForm({ search: q });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Товар не найден');
        setForm({ selectedProduct: null });
      } finally {
        setLoading(false);
      }
    },
    [search, applyRecommendation, useFefoRecommendations, setForm],
  );

  const { inputRef, handleKeyDown, restoreFocus } = useScannerField({
    onScan: (value) => {
      setForm({ search: value });
      void handleSearch(value);
    },
    onClear: () => setForm({ search: '' }),
  });

  const setLotQuantity = useCallback(
    (lotId: string, maxQty: number, raw: string) => {
      const digits = raw.replace(/\D/g, '');
      const parsed = digits === '' ? 0 : Number(digits);
      const value = Number.isFinite(parsed) ? Math.min(maxQty, Math.max(0, parsed)) : 0;
      const current = useWriteoffDraftStore.getState().form.quantities;
      setForm({ quantities: { ...current, [lotId]: value } });
    },
    [setForm],
  );

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

  const isExpiredOnlyProduct = useMemo(() => {
    if (!selectedProduct?.lots.length) return false;
    return selectedProduct.lots.every((lot) => lotIsExpired(lot));
  }, [selectedProduct]);

  const expiredWriteoffSummary = useMemo(() => {
    if (!selectedProduct || !isExpiredOnlyProduct) return null;
    const expiredLots = selectedProduct.lots.filter((lot) => lotIsExpired(lot));
    const totalQty = expiredLots.reduce(
      (sum, lot) => sum + availableAfterCart(lot.qty, lotReservations[lot.lotId] ?? 0),
      0,
    );
    const expiryDates = expiredLots
      .map((lot) => lot.expiry)
      .filter((expiry) => expiry && expiry !== 'Н/Д')
      .sort();
    const earliestExpiry = expiryDates[0];
    return {
      totalQty,
      expiryLabel: earliestExpiry ? formatExpiryRu(earliestExpiry) : null,
    };
  }, [selectedProduct, isExpiredOnlyProduct, lotReservations]);

  const destinationReady = destinationId !== '';

  const canAddToCart = Boolean(
    selectedProduct && totalToWriteoff > 0 && destinationReady && !submitting,
  );

  const handleDestinationChange = useCallback(
    async (id: string, label?: string) => {
      if (!id) {
        setForm({ destinationId: '', destinationLabel: '' });
        return;
      }
      if (label) {
        setForm({ destinationId: id, destinationLabel: label });
        return;
      }
      setForm({ destinationId: id });
      try {
        const data = await fetchWriteoffDestinations({ activeOnly: true, pageSize: 200 });
        const found = data.items.find((d) => d.id === id);
        setForm({ destinationLabel: found?.name ?? '' });
      } catch {
        setForm({ destinationLabel: '' });
      }
    },
    [setForm],
  );

  const handleFefoToggle = useCallback(
    (enabled: boolean) => {
      setForm({ useFefoRecommendations: enabled });
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
    [selectedProduct, search, handleSearch, applyRecommendation, setForm],
  );

  const resetQuantitiesOnly = useCallback(() => {
    const { cart: currentCart, form: currentForm } = useWriteoffDraftStore.getState();
    const product = currentForm.selectedProduct;
    if (!product) return;
    const expiredOnly =
      product.lots.length > 0 && product.lots.every((lot) => lotIsExpired(lot));
    const effectiveFefo = expiredOnly ? false : currentForm.useFefoRecommendations;
    const reserved = cartLotReservations(
      currentCart,
      product.productId,
      currentForm.editingCartId,
    );
    setForm({
      quantities: buildInitialQuantities(product.lots, effectiveFefo, reserved),
    });
  }, [setForm]);

  const handleAddToCart = useCallback(() => {
    const snap = useWriteoffDraftStore.getState().form;
    const product = snap.selectedProduct;

    if (!product) {
      toast.error('Сначала найдите товар');
      return;
    }

    const lines = product.lots
      .map((lot) => ({
        lotId: lot.lotId,
        lotNumber: lot.lot,
        quantity: snap.quantities[lot.lotId] ?? 0,
        expiry: lot.expiry,
        expired: lotIsExpired(lot),
      }))
      .filter((line) => line.quantity > 0);

    const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
    const hasExpiredInCart = lines.some((line) => line.expired);

    if (totalQty <= 0) {
      toast.error('Укажите количество для списания');
      return;
    }
    if (!snap.destinationId) {
      toast.error('Укажите, куда списываем');
      return;
    }

    const item: WriteoffCartItem = {
      id: snap.editingCartId ?? createWriteoffCartItemId(),
      productId: product.productId,
      productName: product.name,
      productRef: product.ref,
      writeOffDestinationId: snap.destinationId,
      destinationLabel: snap.destinationLabel || snap.destinationId,
      writeOffComment: snap.destinationComment.trim(),
      useFefoRecommendations: snap.useFefoRecommendations,
      lines,
      totalQty,
      operatorEmail,
      createdAt: new Date().toISOString(),
    };

    upsertCartItem(item, snap.editingCartId);
    setForm({ editingCartId: null });
    resetQuantitiesOnly();
    if (hasExpiredInCart) {
      toast.warning('В корзину добавлен товар с истёкшим сроком годности', {
        duration: 5000,
      });
    }
    toast.success(`Добавлено: ${product.name} → ${item.destinationLabel}, ${totalQty} шт`);
    restoreFocus();
  }, [upsertCartItem, setForm, resetQuantitiesOnly, restoreFocus, operatorEmail]);

  const handleEditCartItem = useCallback(
    async (id: string) => {
      const item = cart.find((entry) => entry.id === id);
      if (!item) return;

      setForm({
        editingCartId: id,
        destinationId: item.writeOffDestinationId,
        destinationLabel: item.destinationLabel,
        destinationComment: item.writeOffComment,
        useFefoRecommendations: item.useFefoRecommendations,
      });

      setLoading(true);
      try {
        const data = await fetchWriteoffRecommendation({
          productId: item.productId,
          useFefoRecommendations: item.useFefoRecommendations,
        });
        const nextQty: Record<string, number> = {};
        for (const lot of data.lots) {
          nextQty[lot.lotId] = 0;
        }
        for (const line of item.lines) {
          nextQty[line.lotId] = line.quantity;
        }
        setForm({
          selectedProduct: data,
          quantities: nextQty,
          search: data.ref,
        });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить товар');
      } finally {
        setLoading(false);
      }
    },
    [cart, setForm],
  );

  const handleClearCart = useCallback(() => {
    clearCart();
    toast.success('Корзина списания очищена');
  }, [clearCart]);

  const handleBatchConfirmRequest = () => {
    if (cart.length === 0) {
      toast.error('Список списания пуст');
      return;
    }
    setBatchConfirmOpen(true);
  };

  const handleBatchConfirm = async () => {
    if (cart.length === 0) return;
    setBatchConfirmOpen(false);

    const payload = {
      items: cart.map((item) => ({
        productId: item.productId,
        writeOffDestinationId: item.writeOffDestinationId,
        writeOffComment: item.writeOffComment || undefined,
        lines: item.lines.map((line) => ({
          lotId: line.lotId,
          quantity: line.quantity,
        })),
        useFefoRecommendations: item.useFefoRecommendations,
      })),
    };

    const run = async () => {
      const result = await writeoffInventoryBatch(payload);
      const count = cart.length;
      clearAllDraft();
      toast.success(
        `Списание выполнено: ${count} поз., документы ${result.movementIds.slice(0, 3).join(', ')}${result.movementIds.length > 3 ? '…' : ''}`,
      );
      restoreFocus();
    };

    setSubmitting(true);
    try {
      await run();
    } catch (err) {
      if (!navigator.onLine) {
        enqueueRetry('Списание (пакет)', run);
        toast.error('Офлайн — операция в очереди на повтор');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Ошибка списания');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const batchTotalUnits = cart.reduce((sum, item) => sum + item.totalQty, 0);
  const showSplitLayout = Boolean(selectedProduct || cart.length > 0);
  const hasPersistedDraft = cart.length > 0 || Boolean(selectedProduct);

  return (
    <div className="h-full min-h-0 flex flex-col max-w-6xl mx-auto gap-4 py-4 md:py-6">
      <div className="shrink-0">
        <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">
          Расход / Списание со склада
        </h2>
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">
          {isExpiredOnlyProduct
            ? 'Просроченный товар — ручной выбор партий, накопительный список'
            : useFefoRecommendations
              ? 'FEFO — накопительный список, проверка перед выполнением'
              : 'Ручной выбор партий — накопительный список'}
          {hasPersistedDraft && (
            <span className="ml-2 text-emerald-700 normal-case tracking-normal">
              · черновик сохранён
            </span>
          )}
        </p>
      </div>

      <div className="shrink-0 bg-white border border-slate-300 rounded shadow-sm flex items-center p-2 gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setForm({ search: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Штрихкод, REF, GTIN, LOT / Партия..."
            className="w-full pl-8 h-9 text-sm border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 px-2 border outline-none font-mono placeholder:font-sans placeholder:text-slate-400 font-bold text-blue-900"
            autoFocus
          />
        </div>
        <Button
          onClick={() => void handleSearch()}
          className="h-9 px-6 bg-slate-800 hover:bg-slate-900 text-xs font-bold"
          disabled={loading}
        >
          {loading ? 'Поиск...' : 'Найти'}
        </Button>
      </div>

      <div
        className={`flex-1 min-h-0 gap-4 ${
          showSplitLayout
            ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start'
            : 'flex flex-col'
        }`}
      >
        {selectedProduct && (
          <div className="min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pb-4">
              <div className="bg-white border border-slate-300 shadow-md rounded flex flex-col">
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">
                      {selectedProduct.name}
                    </h3>
                    <div className="font-mono mt-1 text-xs font-bold text-slate-500 bg-white border border-slate-200 inline-block px-1.5 py-0.5 rounded">
                      <span className="text-slate-400 font-sans font-semibold mr-1">REF</span>
                      {selectedProduct.ref}
                    </div>
                    {editingCartId && (
                      <p className="text-[10px] font-bold text-amber-700 mt-2 uppercase tracking-wide">
                        Редактирование позиции в списке
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Доступный остаток
                    </div>
                    <div className="text-xl font-bold font-mono tracking-tight text-blue-700">
                      {availableTotalQty.toLocaleString('ru-RU')}{' '}
                      <span className="text-[10px] text-slate-500 font-sans font-normal">шт</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-4">
                  {isExpiredOnlyProduct ? (
                    <div className="rounded-lg border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 rounded-full bg-orange-100 p-2 border border-orange-300">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-orange-950 leading-tight">
                            Обнаружен просроченный товар
                          </h4>
                          <p className="text-xs font-medium text-orange-900/90 mt-1.5 leading-relaxed">
                            Срок годности товара истёк.
                            <br />
                            Списание разрешено для корректного вывода товара из остатков склада.
                          </p>
                          <ul className="mt-2.5 space-y-1 text-[11px] font-medium text-orange-800/95 leading-snug list-disc list-inside">
                            <li>операция будет отмечена в журнале</li>
                            <li>FEFO-рекомендации недоступны для просроченных партий</li>
                          </ul>
                          {expiredWriteoffSummary && (
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-orange-950 border-t border-orange-200/80 pt-2.5">
                              {expiredWriteoffSummary.expiryLabel && (
                                <span>
                                  Истёк:{' '}
                                  <span className="font-mono">
                                    {expiredWriteoffSummary.expiryLabel}
                                  </span>
                                </span>
                              )}
                              <span>
                                Доступно к списанию:{' '}
                                <span className="font-mono">
                                  {expiredWriteoffSummary.totalQty.toLocaleString('ru-RU')} шт
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer select-none border border-slate-200 rounded p-3 bg-slate-50">
                      <input
                        type="checkbox"
                        checked={useFefoRecommendations}
                        onChange={(e) => handleFefoToggle(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-slate-700">
                        Использовать FEFO рекомендации
                      </span>
                    </label>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Куда списываем <span className="text-red-600">*</span>
                      </label>
                      <DestinationSelect
                        value={destinationId}
                        onChange={(id, label) => void handleDestinationChange(id, label)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Комментарий (необязательно)
                      </label>
                      <textarea
                        className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded bg-white min-h-[56px] focus:outline-none focus:border-blue-500"
                        value={destinationComment}
                        onChange={(e) => setForm({ destinationComment: e.target.value })}
                        placeholder="Дополнительная информация..."
                      />
                    </div>
                  </div>

                  <div
                    className={`border rounded p-4 relative ${
                      isExpiredOnlyProduct
                        ? 'bg-amber-50/60 border-amber-200'
                        : useFefoRecommendations
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {useFefoRecommendations && !isExpiredOnlyProduct && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500 rounded-l" />
                    )}
                    {isExpiredOnlyProduct && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-orange-500 rounded-l" />
                    )}
                    <div
                      className={`flex items-center font-bold text-sm mb-1 ${
                        isExpiredOnlyProduct
                          ? 'text-orange-800'
                          : useFefoRecommendations
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                      }`}
                    >
                      <BoxSelect className="w-4 h-4 mr-1.5" />
                      {isExpiredOnlyProduct
                        ? 'Просроченные партии'
                        : useFefoRecommendations
                          ? 'FEFO рекомендация системы'
                          : 'Ручной выбор партии'}
                    </div>
                    <p
                      className={`text-[11px] font-medium leading-tight max-w-2xl ${
                        isExpiredOnlyProduct
                          ? 'text-orange-800/90'
                          : useFefoRecommendations
                            ? 'text-emerald-800/80'
                            : 'text-slate-600'
                      }`}
                    >
                      {isExpiredOnlyProduct
                        ? 'Укажите количество для списания по каждой просроченной партии.'
                        : useFefoRecommendations
                          ? 'Ближайший срок подсвечен — можно списать с любой партии.'
                          : 'Укажите количество для каждой нужной партии.'}
                    </p>

                    {hasNonFefoAllocation && fefoLot && !isExpiredOnlyProduct && (
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
                          isExpiredOnlyProduct
                            ? 'text-orange-800/70'
                            : useFefoRecommendations
                              ? 'text-emerald-800/60'
                              : 'text-slate-500'
                        }`}
                      >
                        <div className="col-span-4">LOT / Партия</div>
                        <div className="col-span-3">Срок годности</div>
                        <div className="col-span-2 text-right">Наличие</div>
                        <div className="col-span-3 text-right">Списание</div>
                      </div>
                      {selectedProduct.lots.map((lot) => {
                        const isExpired = lotIsExpired(lot);
                        const availableQty = availableAfterCart(
                          lot.qty,
                          lotReservations[lot.lotId] ?? 0,
                        );
                        const isFefoRow =
                          !isExpiredOnlyProduct &&
                          useFefoRecommendations &&
                          fefoLot?.lotId === lot.lotId;
                        return (
                          <div
                            key={lot.lotId}
                            className={`grid grid-cols-12 items-center p-2 rounded border ${
                              isExpiredOnlyProduct || isExpired
                                ? 'bg-white border-orange-300 shadow-sm'
                                : isFefoRow
                                  ? 'bg-white border-emerald-300 shadow-sm'
                                  : 'bg-white/80 border-slate-200'
                            }`}
                          >
                            <div className="col-span-4 flex items-center gap-1.5">
                              <span
                                className={`font-mono text-xs font-bold ${isFefoRow ? 'text-slate-900' : 'text-slate-700'}`}
                              >
                                {lot.lot}
                              </span>
                              {isFefoRow && (
                                <span className="text-[8px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1 rounded">
                                  FEFO
                                </span>
                              )}
                              {(isExpiredOnlyProduct || isExpired) && (
                                <span className="text-[8px] font-bold uppercase text-orange-950 bg-orange-100 border border-orange-300 px-1 rounded">
                                  Просрочено
                                </span>
                              )}
                            </div>
                            <div className="col-span-3">
                              <span
                                className={`font-mono text-xs ${
                                  isExpiredOnlyProduct || isExpired
                                    ? 'text-orange-800 font-bold'
                                    : isFefoRow
                                      ? 'text-red-600 font-bold'
                                      : 'text-slate-600'
                                }`}
                              >
                                {isExpired ? formatExpiryRu(lot.expiry) : lot.expiry}
                              </span>
                            </div>
                            <div className="col-span-2 text-right font-mono text-xs font-medium text-slate-600">
                              {availableQty}
                            </div>
                            <div className="col-span-3 flex justify-end">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={formatLotQtyInput(quantities[lot.lotId] ?? 0)}
                                className="w-20 pl-2 pr-1 h-7 text-xs font-mono font-bold text-right border rounded bg-white border-slate-300 shadow-inner focus:outline-none focus:border-blue-500"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) =>
                                  setLotQuantity(lot.lotId, availableQty, e.target.value)
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Итого к добавлению:
                    </div>
                    <div className="text-2xl font-bold font-mono text-slate-900">{totalToWriteoff}</div>
                  </div>

                  <div className="flex items-start text-amber-700 gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold uppercase leading-tight">
                      Склад не изменится до «Выполнить списание» в списке
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="shrink-0 z-30 border-t border-slate-300 bg-white shadow-[0_-6px_16px_rgba(15,23,42,0.12)] rounded-b"
              role="toolbar"
              aria-label="Действия списания"
            >
              <div className="flex gap-2 p-3">
                <Button
                  variant="outline"
                  onClick={clearFormProduct}
                  className="h-11 md:h-10 flex-1 sm:flex-none text-sm font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  disabled={submitting}
                >
                  Сбросить товар
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAddToCart()}
                  className="h-12 md:h-11 flex-[2] sm:min-w-[200px] text-base md:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                  disabled={!canAddToCart}
                >
                  <Plus className="w-4 h-4 mr-1.5 shrink-0" />
                  {editingCartId ? 'Сохранить в список' : 'Добавить в списание'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div
          className={`min-h-0 min-w-0 flex flex-col w-full max-w-full ${
            showSplitLayout ? 'lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)]' : ''
          }`}
        >
          <WriteoffCart
            items={cart}
            submitting={submitting}
            onEdit={(id) => void handleEditCartItem(id)}
            onRemove={removeCartItem}
            onClear={handleClearCart}
            onSubmit={handleBatchConfirmRequest}
          />
        </div>
      </div>

      {!selectedProduct && cart.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-8">
          Найдите товар и добавьте позиции в список — затем выполните списание одним действием.
        </p>
      )}

      <ConfirmDialog
        open={batchConfirmOpen}
        title="Выполнить списание?"
        message={`Списать ${cart.length} поз. (${batchTotalUnits} ед.)? Операция необратима, изменения склада применятся сразу.`}
        confirmLabel="Выполнить списание"
        onConfirm={() => void handleBatchConfirm()}
        onCancel={() => setBatchConfirmOpen(false)}
      />
    </div>
  );
}

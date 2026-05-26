import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ScanLine,
  CheckCircle2,
  ArrowDownToLine,
  Keyboard,
  AlertCircle,
  Plus,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { processScanner } from '../lib/api/scanner';
import { receiveInventory } from '../lib/api/inventory';
import {
  fetchActiveExpectedReceipts,
  type ExpectedReceipt,
} from '../lib/api/expected-receipts';
import type { QuickCreateProductResult } from '../lib/api/products';
import { ApiError } from '../lib/api/client';
import { useScannerField } from '../lib/scanner/useScannerField';
import ReceivingCreateProductModal from '../components/receiving/ReceivingCreateProductModal';
import ReceivingCart from '../components/receiving/ReceivingCart';
import ReceivingProductRu from '../components/receiving/ReceivingProductRu';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import { useUserStore } from '../stores/userStore';
import {
  isNotFoundScanError,
  shouldOpenReceivingCreateModal,
} from '../lib/receiving/unknownBarcode';
import {
  createReceivingCartItemId,
  type ReceivingCartItem,
} from '../types/receiving-cart';
import {
  syncReceivingDraftOwner,
  useReceivingDraftStore,
  type ReceivingScannedProduct,
} from '../stores/receivingDraftStore';
import { enqueueRetry } from '../lib/ops/retry-queue';

export default function Receiving() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const userId = useUserStore((s) => s.user?.userId ?? null);
  const operatorEmail = useUserStore((s) => s.user?.email ?? '—');

  const cart = useReceivingDraftStore((s) => s.cart);
  const form = useReceivingDraftStore((s) => s.form);
  const setForm = useReceivingDraftStore((s) => s.setForm);
  const upsertCartItem = useReceivingDraftStore((s) => s.upsertCartItem);
  const removeCartItem = useReceivingDraftStore((s) => s.removeCartItem);
  const clearCart = useReceivingDraftStore((s) => s.clearCart);
  const clearScannedProduct = useReceivingDraftStore((s) => s.clearScannedProduct);
  const clearAllDraft = useReceivingDraftStore((s) => s.clearAllDraft);

  const {
    scannedProduct,
    lot,
    expiry,
    qty,
    location,
    linkedExpectedId,
    editingCartId,
  } = form;

  const [barcode, setBarcode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [pendingReceivingFlow, setPendingReceivingFlow] = useState(false);
  const [activeExpected, setActiveExpected] = useState<ExpectedReceipt[]>([]);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);

  useEffect(() => {
    syncReceivingDraftOwner(userId);
  }, [userId]);

  useEffect(() => {
    if (!scannedProduct?.id) {
      setActiveExpected([]);
      return;
    }
    let cancelled = false;
    void fetchActiveExpectedReceipts(scannedProduct.id)
      .then((expected) => {
        if (!cancelled) setActiveExpected(expected);
      })
      .catch(() => {
        if (!cancelled) setActiveExpected([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scannedProduct?.id]);

  const applyScannedProduct = useCallback(
    (product: ReceivingScannedProduct, options?: { keepLotFields?: boolean }) => {
      setForm({
        scannedProduct: product,
        ...(options?.keepLotFields
          ? {}
          : {
              lot: '',
              expiry: '',
              qty: '',
              location: '',
              linkedExpectedId: null,
              editingCartId: null,
            }),
      });
    },
    [setForm],
  );

  const resumeReceivingFlow = useCallback(
    (product: QuickCreateProductResult, scannedBarcode: string) => {
      applyScannedProduct({
        id: product.id,
        name: product.name,
        ref: product.ref,
        manufacturer: product.manufacturer,
        barcode: product.barcode ?? scannedBarcode,
      });
      setPendingBarcode(null);
      setPendingReceivingFlow(false);
      toast.success('Продолжите приёмку: укажите партию, срок и количество.');
    },
    [applyScannedProduct],
  );

  const openCreateProductModal = useCallback((scannedBarcode: string) => {
    setPendingBarcode(scannedBarcode);
    setPendingReceivingFlow(true);
    setForm({
      scannedProduct: null,
      lot: '',
      expiry: '',
      qty: '',
      location: '',
      linkedExpectedId: null,
    });
    setCreateModalOpen(true);
  }, [setForm]);

  const lookupBarcode = async (raw: string) => {
    const code = raw.trim();
    if (!code || createModalOpen) return;

    setScanning(true);
    try {
      const result = await processScanner(code);
      if (!result.found || !result.product) {
        if (shouldOpenReceivingCreateModal(userRole)) {
          openCreateProductModal(code);
        } else {
          toast.error('Недостаточно прав для создания товара при приёмке.');
          setForm({ scannedProduct: null });
        }
        return;
      }
      applyScannedProduct({
        id: result.product.id,
        name: result.product.name,
        ref: result.product.ref,
        manufacturer: result.product.manufacturer,
        barcode: result.product.barcode,
      });
      setPendingReceivingFlow(false);
      try {
        const expected = await fetchActiveExpectedReceipts(result.product.id);
        setActiveExpected(expected);
        if (expected.length === 1) {
          setForm({ linkedExpectedId: expected[0].id });
        }
      } catch {
        setActiveExpected([]);
      }
      toast.success('Товар идентифицирован в базе.');
    } catch (err) {
      if (shouldOpenReceivingCreateModal(userRole) && isNotFoundScanError(err)) {
        openCreateProductModal(code);
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Ошибка сканирования');
    } finally {
      setScanning(false);
      setBarcode('');
    }
  };

  const { inputRef, handleKeyDown, restoreFocus } = useScannerField({
    onScan: lookupBarcode,
    onClear: () => setBarcode(''),
    enabled: !createModalOpen,
  });

  const handleCreateModalClose = () => {
    setCreateModalOpen(false);
    setPendingBarcode(null);
    setPendingReceivingFlow(false);
    restoreFocus();
  };

  const handleProductCreated = (product: QuickCreateProductResult) => {
    if (!pendingBarcode) return;
    resumeReceivingFlow(product, pendingBarcode);
    restoreFocus();
  };

  const validateLine = useCallback((): string | null => {
    if (!scannedProduct || !lot.trim() || !expiry || !qty) {
      return 'Заполните обязательные атрибуты партии: LOT / Партия, срок, кол-во.';
    }
    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 'Укажите корректное количество';
    }
    const expiryDate = new Date(expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      return 'Срок годности не может быть в прошлом';
    }
    return null;
  }, [scannedProduct, lot, expiry, qty]);

  const buildCartItemFromForm = useCallback((): ReceivingCartItem | null => {
    const error = validateLine();
    if (error || !scannedProduct) return null;

    const linked = linkedExpectedId
      ? activeExpected.find((er) => er.id === linkedExpectedId)
      : null;

    return {
      id: editingCartId ?? createReceivingCartItemId(),
      productId: scannedProduct.id,
      productName: scannedProduct.name,
      productRef: scannedProduct.ref,
      barcode: scannedProduct.barcode,
      manufacturer: scannedProduct.manufacturer,
      lotNumber: lot.trim().toUpperCase(),
      expiryDate: expiry,
      quantity: Number(qty),
      location: location.trim() || null,
      expectedReceiptId: linkedExpectedId,
      expectedReceiptLabel: linked?.comment ?? (linked ? 'Связанное поступление' : null),
      operatorEmail,
      createdAt: new Date().toISOString(),
    };
  }, [
    validateLine,
    scannedProduct,
    lot,
    expiry,
    qty,
    location,
    linkedExpectedId,
    activeExpected,
    editingCartId,
    operatorEmail,
  ]);

  const resetLineFields = useCallback(() => {
    setForm({
      lot: '',
      expiry: '',
      qty: '',
      location: '',
      linkedExpectedId: null,
      editingCartId: null,
    });
  }, [setForm]);

  const handleAddToCart = useCallback(() => {
    const error = validateLine();
    if (error) {
      toast.error(error);
      return;
    }
    const item = buildCartItemFromForm();
    if (!item) return;

    upsertCartItem(item, editingCartId);
    resetLineFields();
    toast.success(
      `Добавлено: ${item.productName} · LOT ${item.lotNumber}, ${item.quantity} шт`,
    );
    restoreFocus();
  }, [
    validateLine,
    buildCartItemFromForm,
    upsertCartItem,
    editingCartId,
    resetLineFields,
    restoreFocus,
  ]);

  const handleEditCartItem = useCallback(
    (id: string) => {
      const item = cart.find((entry) => entry.id === id);
      if (!item) return;

      applyScannedProduct(
        {
          id: item.productId,
          name: item.productName,
          ref: item.productRef,
          manufacturer: item.manufacturer,
          barcode: item.barcode,
        },
        { keepLotFields: true },
      );

      setForm({
        editingCartId: id,
        lot: item.lotNumber,
        expiry: item.expiryDate,
        qty: String(item.quantity),
        location: item.location ?? '',
        linkedExpectedId: item.expectedReceiptId,
      });
    },
    [cart, applyScannedProduct, setForm],
  );

  const handleClearCart = useCallback(() => {
    clearCart();
    toast.success('Корзина приёмки очищена');
  }, [clearCart]);

  const handleBatchConfirmRequest = () => {
    if (cart.length === 0) {
      toast.error('Список приёмки пуст');
      return;
    }
    setBatchConfirmOpen(true);
  };

  const handleBatchConfirm = async () => {
    if (cart.length === 0) return;
    setBatchConfirmOpen(false);

    const run = async () => {
      const movementIds: string[] = [];
      for (const item of cart) {
        const result = await receiveInventory({
          barcode: item.barcode,
          productId: item.productId,
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          ...(item.location ? { location: item.location } : {}),
          ...(item.expectedReceiptId ? { expectedReceiptId: item.expectedReceiptId } : {}),
        });
        movementIds.push(result.movementId);
      }
      const count = cart.length;
      clearAllDraft();
      setActiveExpected([]);
      setBarcode('');
      toast.success(
        `Приёмка выполнена: ${count} поз., документы ${movementIds.slice(0, 3).join(', ')}${movementIds.length > 3 ? '…' : ''}`,
      );
      restoreFocus();
    };

    setSubmitting(true);
    try {
      await run();
    } catch (err) {
      if (!navigator.onLine) {
        enqueueRetry('Приёмка (пакет)', run);
        toast.error('Офлайн — операция в очереди на повтор');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Ошибка оприходования');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canAddToCart = Boolean(scannedProduct && lot.trim() && expiry && qty && !submitting);
  const batchTotalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const showSplitLayout = Boolean(scannedProduct || cart.length > 0);
  const hasPersistedDraft = cart.length > 0 || Boolean(scannedProduct);

  return (
    <div className="h-full min-h-0 flex flex-col max-w-6xl mx-auto gap-4 py-4 md:py-6 pb-20">
      <ReceivingCreateProductModal
        open={createModalOpen && !!pendingBarcode}
        barcode={pendingBarcode ?? ''}
        onClose={handleCreateModalClose}
        onCreated={handleProductCreated}
      />

      <div className="shrink-0 flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded mb-3 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <ArrowDownToLine className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Рабочее место приемки (РМП)</h2>
        <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
          Отсканируйте код маркировки для старта
          {hasPersistedDraft && (
            <span className="ml-2 text-blue-700 normal-case tracking-normal">· черновик сохранён</span>
          )}
        </p>
        {pendingReceivingFlow && !createModalOpen && (
          <p className="text-[10px] font-semibold text-amber-700 mt-2 uppercase tracking-wider">
            Ожидание создания товара для продолжения приёмки
          </p>
        )}
      </div>

      <div
        className={`flex-1 min-h-0 gap-4 ${
          showSplitLayout
            ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start'
            : 'flex flex-col'
        }`}
      >
        <div className="min-h-0 flex flex-col gap-6">
          <div className="bg-white border-2 border-blue-200 rounded-md shadow-md relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent pointer-events-none" />

            <div className="p-4 border-b border-blue-100 flex items-center bg-blue-50/30 relative z-10">
              <ScanLine className="w-4 h-4 mr-2 text-blue-600 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Шаг 1: Идентификация по штрихкоду
              </h3>
            </div>

            <div className="p-6 relative z-10">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Keyboard className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    ref={inputRef}
                    value={barcode}
                    onChange={(e) => {
                      if (!scanning) setBarcode(e.target.value);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ожидание ввода со сканера..."
                    className="w-full pl-9 h-11 px-3 py-2 border-2 text-sm font-mono font-bold bg-slate-50 border-slate-300 rounded focus:border-blue-500 focus:bg-white focus:outline-none transition-colors placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 text-blue-900"
                    autoComplete="off"
                    autoFocus
                    disabled={scanning || createModalOpen}
                  />
                </div>
                <Button
                  type="button"
                  className="h-11 px-8 text-sm font-bold bg-blue-700 hover:bg-blue-800"
                  disabled={scanning || !barcode.trim() || createModalOpen}
                  onClick={() => void lookupBarcode(barcode)}
                >
                  {scanning ? 'Поиск...' : 'Запросить ВУ'}
                </Button>
              </div>
            </div>
          </div>

          {scannedProduct && (
            <div className="bg-white border border-slate-300 rounded-md shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300 overflow-hidden flex flex-col">
              <div className="px-5 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
                    {scannedProduct.name}
                  </h3>
                  <div className="flex items-center mt-1 text-[11px] font-mono font-medium text-slate-600">
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-1 py-0.5 rounded">
                      <span className="text-slate-400 font-sans font-semibold mr-1">REF</span>
                      {scannedProduct.ref}
                    </span>
                    <span className="mx-2 text-slate-300 pl-1">|</span>
                    <span className="font-sans uppercase">{scannedProduct.manufacturer ?? '—'}</span>
                  </div>
                  {editingCartId && (
                    <p className="text-[10px] font-bold text-amber-700 mt-2 uppercase tracking-wide">
                      Редактирование позиции в списке
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      LOT / Партия
                    </label>
                    <input
                      value={lot}
                      onChange={(e) => setForm({ lot: e.target.value })}
                      placeholder="Номер партии"
                      className="h-10 px-3 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono uppercase text-sm font-bold text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400">
                      Производственная партия поставщика (например LOT-202X-001)
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Годен до
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={expiry}
                      onChange={(e) => setForm({ expiry: e.target.value })}
                      className="h-10 px-3 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm text-slate-800 uppercase"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Кол-во (Осн. ед.)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setForm({ qty: e.target.value })}
                      placeholder="0"
                      className="h-10 px-3 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-base font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Адрес хранения в ячейке
                    </label>
                    <input
                      value={location}
                      onChange={(e) => setForm({ location: e.target.value })}
                      placeholder="Напр. A-12-03"
                      className="h-10 px-3 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm font-bold text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400">
                      Необязательно — можно указать сейчас или позже в карточке товара
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <ReceivingProductRu
                      productId={scannedProduct.id}
                      userRole={userRole}
                    />
                  </div>
                </div>

                {activeExpected.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      Ожидается поступление
                    </p>
                    {activeExpected.map((er) => (
                      <div
                        key={er.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded border ${
                          linkedExpectedId === er.id
                            ? 'border-blue-400 bg-white'
                            : 'border-blue-100 bg-blue-50/50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {er.comment ?? 'Без комментария'}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Осталось принять:{' '}
                            <span className="font-mono font-bold text-blue-700">
                              {er.remainingQty.toLocaleString('ru-RU')}
                            </span>{' '}
                            из {er.orderedQty.toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={linkedExpectedId === er.id ? 'default' : 'outline'}
                          className={`h-8 text-[10px] font-bold shrink-0 ${
                            linkedExpectedId === er.id
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'border-blue-300 text-blue-700'
                          }`}
                          onClick={() =>
                            setForm({
                              linkedExpectedId: linkedExpectedId === er.id ? null : er.id,
                            })
                          }
                        >
                          {linkedExpectedId === er.id ? 'Связано' : 'Связать поступление'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-[11px] leading-tight font-medium">
                    Убедитесь в точном соответствии LOT / Партия и срока годности. Ошибка на этапе
                    приемки нарушит алгоритм FEFO при списании.
                  </p>
                </div>

                <div className="flex items-start text-blue-800 gap-2 border border-blue-100 bg-blue-50/80 rounded p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <span className="text-[10px] font-bold uppercase leading-tight">
                    Склад не изменится до «Оприходовать всё» в списке — можно добавить несколько LOT
                    с одним REF
                  </span>
                </div>
              </div>

              <div
                className="shrink-0 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-end gap-2 p-3"
                role="toolbar"
                aria-label="Действия приёмки"
              >
                <Button
                  variant="outline"
                  onClick={clearScannedProduct}
                  className="h-10 text-xs font-semibold border-slate-300 text-slate-600 bg-white"
                  disabled={submitting}
                >
                  Сбросить товар
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAddToCart()}
                  className="h-10 min-w-[180px] text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                  disabled={!canAddToCart}
                >
                  <Plus className="w-4 h-4 mr-1.5 shrink-0" />
                  {editingCartId ? 'Сохранить в список' : 'Добавить в приёмку'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div
          className={`min-h-0 min-w-0 flex flex-col w-full max-w-full ${
            showSplitLayout ? 'lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)]' : ''
          }`}
        >
          <ReceivingCart
            items={cart}
            submitting={submitting}
            onEdit={handleEditCartItem}
            onRemove={removeCartItem}
            onClear={handleClearCart}
            onSubmit={handleBatchConfirmRequest}
          />
        </div>
      </div>

      {!scannedProduct && cart.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-4">
          Отсканируйте товар и добавьте партии в список — затем оприходуйте одним действием.
        </p>
      )}

      <ConfirmDialog
        open={batchConfirmOpen}
        title="Оприходовать всё?"
        message={`Оприходовать ${cart.length} поз. (${batchTotalUnits} ед.)? Изменения склада применятся сразу.`}
        confirmLabel="Оприходовать всё"
        onConfirm={() => void handleBatchConfirm()}
        onCancel={() => setBatchConfirmOpen(false)}
      />
    </div>
  );
}

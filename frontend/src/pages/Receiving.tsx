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
import { quickCreateProduct, type QuickCreateProductResult } from '../lib/api/products';
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
  discardReceivingDraft,
  syncReceivingDraftOwner,
  useReceivingDraftStore,
  type ReceivingScannedProduct,
} from '../stores/receivingDraftStore';
import { enqueueRetry } from '../lib/ops/retry-queue';
import type { ReceivingCreateProductDraft } from '../components/receiving/ReceivingCreateProductModal';
import { createDraftProductId, isDraftProductId } from '../lib/receiving/draftProduct';
import type { ScanParsedFields } from '../types/api';
import {
  applyScanParsedFields,
  expiryBlockMessage,
  isExpiryIsoInPast,
} from '../lib/receiving/scanParsed';

/** Создание карточки в номенклатуре — только при «Оприходовать всё» (шаг 3). */
async function resolveReceivingProductId(item: ReceivingCartItem): Promise<string> {
  if (!isDraftProductId(item.productId)) return item.productId;
  const created = await quickCreateProduct({
    barcode: item.barcode,
    name: item.productName,
    sku: item.productRef.trim() || undefined,
    manufacturer: item.manufacturer?.trim() || undefined,
    gtin: item.productGtin?.trim() || undefined,
  });
  return created.id;
}

function isoToRuDate(value: string): string {
  // Expect ISO yyyy-mm-dd from store; keep empty/unknown as-is.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return '';
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function ruToIsoDate(value: string): string | null {
  const raw = value.trim();
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!Number.isInteger(dd) || !Number.isInteger(mm) || !Number.isInteger(yyyy)) return null;
  if (yyyy < 1900 || yyyy > 2100) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  // Validate roundtrip (catches 31.02 etc.)
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) {
    return null;
  }
  const iso = `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return iso;
}

function clampExpiryParts(parts: { dd?: string; mm?: string; yyyy?: string }) {
  const toNum = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : NaN);
  let dd = toNum(parts.dd);
  let mm = toNum(parts.mm);
  const yyyy = toNum(parts.yyyy);

  if (!Number.isFinite(dd)) dd = 1;
  if (!Number.isFinite(mm)) mm = 1;

  dd = Math.min(Math.max(dd, 1), 31);
  mm = Math.min(Math.max(mm, 1), 12);

  // If year is known, clamp day by month length (incl. leap year for Feb).
  if (Number.isFinite(yyyy)) {
    const daysInMonth = new Date(Date.UTC(yyyy, mm, 0)).getUTCDate(); // mm: 1-12
    dd = Math.min(dd, daysInMonth);
  }

  return {
    dd: String(dd).padStart(2, '0'),
    mm: String(mm).padStart(2, '0'),
    yyyy: Number.isFinite(yyyy) ? String(yyyy).padStart(4, '0') : parts.yyyy,
  };
}

function normalizeExpiryInput(nextRaw: string): string {
  // Keep only digits, auto-insert dots as dd.mm.yyyy
  const digits = nextRaw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }

  // When day/month are complete, keep them within valid ranges to prevent impossible dates like 20.28....
  const rawDd = digits.slice(0, 2);
  const rawMm = digits.length >= 4 ? digits.slice(2, 4) : digits.slice(2);
  const rawYyyy = digits.length > 4 ? digits.slice(4) : '';

  const ddFixed =
    rawDd.length === 2 ? clampExpiryParts({ dd: rawDd }).dd : rawDd;
  const mmFixed =
    rawMm.length === 2 ? clampExpiryParts({ mm: rawMm }).mm : rawMm;

  if (digits.length <= 4) {
    return `${ddFixed}.${mmFixed}`;
  }

  return `${ddFixed}.${mmFixed}.${rawYyyy}`;
}

export default function Receiving() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const userId = useUserStore((s) => s.user?.userId ?? null);
  const operatorEmail = useUserStore((s) => s.user?.email ?? '—');

  const cart = useReceivingDraftStore((s) => s.cart);
  const form = useReceivingDraftStore((s) => s.form);
  const setForm = useReceivingDraftStore((s) => s.setForm);
  const upsertCartItem = useReceivingDraftStore((s) => s.upsertCartItem);
  const removeCartItem = useReceivingDraftStore((s) => s.removeCartItem);
  const clearScannedProduct = useReceivingDraftStore((s) => s.clearScannedProduct);

  const {
    scannedProduct,
    lot,
    expiry,
    qty,
    location,
    linkedExpectedId,
    editingCartId,
  } = form;

  const [expiryText, setExpiryText] = useState('');

  const [barcode, setBarcode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [pendingReceivingFlow, setPendingReceivingFlow] = useState(false);
  const [activeExpected, setActiveExpected] = useState<ExpectedReceipt[]>([]);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [scanExpiryWarning, setScanExpiryWarning] = useState<string | null>(null);
  const [scanHints, setScanHints] = useState<string[]>([]);
  const [pendingParsed, setPendingParsed] = useState<ScanParsedFields | null>(null);

  useEffect(() => {
    // Keep UI text in sync when draft changes (edit line, clear, restore from storage).
    setExpiryText(expiry ? isoToRuDate(expiry) : '');
  }, [expiry]);

  useEffect(() => {
    syncReceivingDraftOwner(userId);
  }, [userId]);

  useEffect(() => {
    if (!scannedProduct?.id || isDraftProductId(scannedProduct.id)) {
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

  const applyParsedFromScan = useCallback(
    (parsed: ScanParsedFields | null | undefined) => {
      if (!parsed) return;
      applyScanParsedFields(parsed, (fields) => setForm(fields), setExpiryText);
    },
    [setForm],
  );

  const ensureProductForRu = useCallback(async (): Promise<string> => {
    if (!scannedProduct) {
      throw new Error('Товар не выбран');
    }
    if (!isDraftProductId(scannedProduct.id)) {
      return scannedProduct.id;
    }

    const created = await quickCreateProduct({
      barcode: scannedProduct.barcode,
      name: scannedProduct.name,
      sku: scannedProduct.ref.trim() || undefined,
      manufacturer: scannedProduct.manufacturer?.trim() || undefined,
      gtin: scannedProduct.gtin?.trim() || undefined,
    });

    const draftId = scannedProduct.id;
    applyScannedProduct({
      id: created.id,
      name: created.name,
      ref: created.ref,
      manufacturer: created.manufacturer,
      barcode: created.barcode ?? scannedProduct.barcode,
      gtin: scannedProduct.gtin,
    });

    const { cart: currentCart } = useReceivingDraftStore.getState();
    for (const item of currentCart) {
      if (item.productId === draftId) {
        upsertCartItem({ ...item, productId: created.id }, item.id);
      }
    }

    return created.id;
  }, [scannedProduct, applyScannedProduct, upsertCartItem]);

  const resumeReceivingFlowDraft = useCallback(
    (draft: ReceivingCreateProductDraft) => {
      const draftId = createDraftProductId(draft.barcode);
      applyScannedProduct({
        id: draftId,
        name: draft.name,
        ref: draft.ref,
        manufacturer: draft.manufacturer,
        barcode: draft.barcode,
        gtin: draft.gtin,
      });
      applyParsedFromScan(pendingParsed);
      setPendingParsed(null);
      setPendingBarcode(null);
      setPendingReceivingFlow(false);
      toast.success('Продолжите приёмку: проверьте партию и срок, укажите количество.');
    },
    [applyScannedProduct, applyParsedFromScan, pendingParsed],
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
    setScanExpiryWarning(null);
    setScanHints([]);
    try {
      const result = await processScanner(code);

      setScanExpiryWarning(result.expiryWarning ?? null);
      setScanHints(result.hints ?? []);

      if (!result.found || !result.product) {
        setPendingParsed(result.parsed ?? null);
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
      applyParsedFromScan(result.parsed);
      setPendingParsed(null);
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
    setPendingParsed(null);
    setPendingReceivingFlow(false);
    const { cart, form } = useReceivingDraftStore.getState();
    if (
      cart.length === 0 &&
      form.scannedProduct &&
      isDraftProductId(form.scannedProduct.id)
    ) {
      clearScannedProduct();
    }
    restoreFocus();
  };

  const handleProductDraftSubmitted = (draft: ReceivingCreateProductDraft) => {
    setCreateModalOpen(false);
    setPendingBarcode(null);
    setPendingReceivingFlow(false);
    resumeReceivingFlowDraft(draft);
    restoreFocus();
  };

  const expiryIso = ruToIsoDate(expiryText) ?? expiry;

  const receivingBlockMessage =
    expiryIso && isExpiryIsoInPast(expiryIso) ? expiryBlockMessage(expiryIso) : null;

  const validateLine = useCallback((): string | null => {
    if (receivingBlockMessage) {
      return receivingBlockMessage;
    }
    if (!scannedProduct || !lot.trim() || !expiryIso || !qty) {
      if (scannedProduct && lot.trim() && qty && expiryText.trim().length === 10 && !ruToIsoDate(expiryText)) {
        return 'Некорректная дата срока годности — проверьте день/месяц (ДД.ММ.ГГГГ)';
      }
      return 'Заполните обязательные атрибуты партии: LOT / Партия, срок, кол-во.';
    }
    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 'Укажите корректное количество';
    }
    if (expiryIso && isExpiryIsoInPast(expiryIso)) {
      return expiryBlockMessage(expiryIso);
    }
    return null;
  }, [scannedProduct, lot, expiryIso, qty, expiryText, receivingBlockMessage]);

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
      productGtin: scannedProduct.gtin ?? null,
      lotNumber: lot.trim().toUpperCase(),
      expiryDate: expiryIso,
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
    expiryIso,
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
    setExpiryText('');
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
          gtin: item.productGtin ?? null,
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
    discardReceivingDraft();
    setPendingBarcode(null);
    setPendingReceivingFlow(false);
    setActiveExpected([]);
    setBatchConfirmOpen(false);
    toast.success('Черновик приёмки очищен');
    restoreFocus();
  }, [restoreFocus]);

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
      const resolvedDraftIds = new Map<string, string>();

      const productIdForItem = async (item: ReceivingCartItem): Promise<string> => {
        if (!isDraftProductId(item.productId)) return item.productId;
        const cached = resolvedDraftIds.get(item.productId);
        if (cached) return cached;
        const realId = await resolveReceivingProductId(item);
        resolvedDraftIds.set(item.productId, realId);
        return realId;
      };

      for (const item of cart) {
        const productId = await productIdForItem(item);
        const result = await receiveInventory({
          barcode: item.barcode,
          productId,
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          ...(item.location ? { location: item.location } : {}),
          ...(item.expectedReceiptId ? { expectedReceiptId: item.expectedReceiptId } : {}),
        });
        movementIds.push(result.movementId);
      }
      const count = cart.length;
      discardReceivingDraft();
      setPendingBarcode(null);
      setPendingReceivingFlow(false);
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

  // Enable button when user filled fields; actual date validity is enforced in validateLine().
  const canAddToCart = Boolean(
    scannedProduct &&
      lot.trim() &&
      (expiryText.trim() || expiryIso) &&
      qty &&
      !submitting &&
      !receivingBlockMessage,
  );
  const batchTotalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const showSplitLayout = Boolean(scannedProduct || cart.length > 0);
  const hasPersistedDraft = cart.length > 0 || Boolean(scannedProduct);

  return (
    <div className="h-full min-h-0 flex flex-col max-w-6xl mx-auto gap-4 py-4 md:py-6 pb-20">
      <ReceivingCreateProductModal
        open={createModalOpen && !!pendingBarcode}
        barcode={pendingBarcode ?? ''}
        initialGtin={pendingParsed?.gtin ?? null}
        expiryWarning={scanExpiryWarning}
        scanHints={scanHints}
        onClose={handleCreateModalClose}
        onSubmitDraft={handleProductDraftSubmitted}
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

              {scanExpiryWarning && !receivingBlockMessage && !createModalOpen && (
                <div
                  role="status"
                  className="mt-4 flex gap-3 rounded-md border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <span>{scanExpiryWarning}</span>
                </div>
              )}

              {receivingBlockMessage && (
                <div
                  role="alert"
                  className="mt-4 flex gap-3 rounded-md border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <span>{receivingBlockMessage}</span>
                </div>
              )}

              {!receivingBlockMessage && scanHints.length > 0 && !createModalOpen && (
                <div className="mt-4 rounded-md border border-blue-200 bg-blue-50/80 px-4 py-3 text-xs font-medium text-slate-700 space-y-1">
                  {scanHints.filter((h) => h !== scanExpiryWarning).map((hint) => (
                    <p key={hint}>{hint}</p>
                  ))}
                </div>
              )}
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
                {receivingBlockMessage && (
                  <div
                    role="alert"
                    className="flex gap-3 rounded-md border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <span>{receivingBlockMessage}</span>
                  </div>
                )}

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
                      type="text"
                      inputMode="numeric"
                      placeholder="ДД.ММ.ГГГГ"
                      value={expiryText}
                      onChange={(e) => {
                        const normalized = normalizeExpiryInput(e.target.value);
                        setExpiryText(normalized);
                        const iso = ruToIsoDate(normalized);
                        setForm({ expiry: iso ?? '' });
                        if (scanExpiryWarning && iso && !isExpiryIsoInPast(iso)) {
                          setScanExpiryWarning(null);
                        }
                      }}
                      onBlur={() => {
                        const iso = ruToIsoDate(expiryText);
                        if (iso) {
                          setExpiryText(isoToRuDate(iso));
                          setForm({ expiry: iso });
                          return;
                        }

                        // If user entered 8 digits, try auto-correct (clamp month/day) instead of leaving a confusing invalid state.
                        const digits = expiryText.replace(/\D/g, '');
                        if (digits.length === 8) {
                          const fixed = clampExpiryParts({
                            dd: digits.slice(0, 2),
                            mm: digits.slice(2, 4),
                            yyyy: digits.slice(4, 8),
                          });
                          const candidate = `${fixed.dd}.${fixed.mm}.${fixed.yyyy ?? ''}`;
                          const fixedIso = ruToIsoDate(candidate);
                          if (fixedIso) {
                            setExpiryText(candidate);
                            setForm({ expiry: fixedIso });
                            return;
                          }
                        }
                      }}
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
                  <div className="md:col-span-2 flex flex-col justify-end">
                    <ReceivingProductRu
                      productId={
                        isDraftProductId(scannedProduct.id) ? null : scannedProduct.id
                      }
                      ensureProductId={
                        isDraftProductId(scannedProduct.id) ? ensureProductForRu : undefined
                      }
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
                  onClick={() => {
                    clearScannedProduct();
                    setExpiryText('');
                    setPendingBarcode(null);
                    setPendingReceivingFlow(false);
                    setActiveExpected([]);
                  }}
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

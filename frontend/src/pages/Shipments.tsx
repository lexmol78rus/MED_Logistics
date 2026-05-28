import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import ShipmentWarehouseActionDialog, {
  type ShipmentWarehouseActionKind,
} from '../components/ops/ShipmentWarehouseActionDialog';
import { ApiError } from '../lib/api/client';
import {
  completeShipmentPicking,
  createShipment,
  deleteShipment,
  fetchShipments,
  fetchShipment,
  pauseShipmentPicking,
  recallShipmentFromPicking,
  resumeShipmentPicking,
  sendShipmentToPicking,
  shipmentStatusBadge,
  updateShipment,
  type CreateShipmentPayload,
  type ShipmentListItem,
  type ShipmentPickingOutcome,
  type ShipmentStatus,
} from '../lib/api/shipments';
import ShipmentPickingCompleteDialog from '../components/shipments/ShipmentPickingCompleteDialog';
import ShipmentWriteoffNavigateDialog from '../components/shipments/ShipmentWriteoffNavigateDialog';
import { canWriteoff } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';
import {
  fetchContractProcurementItems,
  fetchContracts,
  fetchCounterparties,
  searchContractsByNumber,
  type Counterparty,
} from '../lib/api/counterparties';
import ShipmentWarehouseMessageBanner from '../components/shipments/ShipmentWarehouseMessageBanner';
import { resolveWarehouseMessageMeta } from '../lib/shipments/warehouse-message';

type CreateMode = 'manual' | 'template' | 'contract';

type DraftItem = CreateShipmentPayload['items'][number] & {
  contractQty?: string;
};

function pickHeaderIndex(headers: string[], predicate: (h: string) => boolean): number {
  const idx = headers.findIndex((h) => predicate(h.trim().toLowerCase()));
  return idx >= 0 ? idx : -1;
}

function normalizeCell(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/[().,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildHeaders(
  ws: XLSX.WorkSheet,
  headerRowIdx: number,
  headerRowsCount = 2,
): { headers: string[]; dataStartRowIdx: number } {
  const ref = ws['!ref'];
  const merges = (ws['!merges'] ?? []) as XLSX.Range[];
  if (!ref) return { headers: [], dataStartRowIdx: headerRowIdx + 1 };
  const range = XLSX.utils.decode_range(ref);

  const mergedTopLeftValue = (r: number, c: number): string => {
    const m = merges.find((mm) => r >= mm.s.r && r <= mm.e.r && c >= mm.s.c && c <= mm.e.c);
    if (!m) return '';
    const addr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
    const cell = ws[addr] as { v?: unknown } | undefined;
    return normalizeCell(cell?.v);
  };

  const getCellText = (r: number, c: number): string => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr] as { v?: unknown } | undefined;
    const direct = normalizeCell(cell?.v);
    if (direct) return direct;
    return mergedTopLeftValue(r, c);
  };

  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const parts: string[] = [];
    for (let k = 0; k < headerRowsCount; k += 1) {
      const r = headerRowIdx + k;
      const t = normalizeHeader(getCellText(r, c));
      if (t) parts.push(t);
    }
    headers.push(parts.join(' ').trim());
  }

  return { headers, dataStartRowIdx: headerRowIdx + headerRowsCount };
}

function parseTemplate(file: File): Promise<CreateShipmentPayload['items']> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      try {
        const data = reader.result;
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const ref = ws['!ref'];
        if (!ref) throw new Error('Пустой лист');
        const range = XLSX.utils.decode_range(ref);

        // We don't "search for products in text". We just detect the table header and copy cells
        // from the corresponding columns into the shipment form (same structure as Excel).
        const maxScan = Math.min(range.e.r, range.s.r + 80);
        let detected:
          | {
              headerRowIdx: number;
              dataStartRowIdx: number;
              headers: string[];
              idxName: number;
              idxCode: number;
              idxUnit: number;
              idxVat: number;
              idxPrice: number;
              idxQty: number;
              idxSum: number;
            }
          | null = null;

        const tryDetectAt = (r: number, headerRowsCount: number) => {
          const { headers, dataStartRowIdx } = buildHeaders(ws, r, headerRowsCount);
          if (!headers.length) return null;
          const idxName = pickHeaderIndex(headers, (h) => h.includes('наимен'));
          const idxCode = pickHeaderIndex(headers, (h) => h === 'код' || h.startsWith('код ') || h.includes(' код'));
          const idxUnit = pickHeaderIndex(headers, (h) => h.includes('ед') && (h === 'ед' || h.includes('изм')));
          const idxVat = pickHeaderIndex(headers, (h) => h.includes('ставк') && h.includes('ндс'));
          const idxPrice = pickHeaderIndex(headers, (h) => h.includes('цена') && h.includes('ндс'));
          const idxQty = pickHeaderIndex(headers, (h) => (h.includes('отгр') && h.includes('заявк')) || h.includes('кол-во') || h.includes('количество'));
          const idxSum = pickHeaderIndex(headers, (h) => h === 'сумма' || h.includes('сумм'));

          if (idxName < 0) return null;
          if (idxQty < 0) return null;
          return {
            headerRowIdx: r,
            dataStartRowIdx,
            headers,
            idxName,
            idxCode,
            idxUnit,
            idxVat,
            idxPrice,
            idxQty,
            idxSum,
          };
        };

        for (let r = range.s.r; r <= maxScan && !detected; r += 1) {
          detected = tryDetectAt(r, 2) ?? tryDetectAt(r, 1);
        }

        if (!detected) {
          throw new Error('Не удалось определить колонки «Наименование» и «Отгр.ед. по заявке / Кол-во»');
        }

        const {
          idxName,
          idxCode,
          idxUnit,
          idxVat,
          idxPrice,
          idxQty,
          idxSum,
          dataStartRowIdx,
        } = detected;

        const cellText = (r: number, idx: number): string => {
          if (idx < 0) return '';
          const addr = XLSX.utils.encode_cell({ r, c: range.s.c + idx });
          const raw = normalizeCell((ws[addr] as { v?: unknown } | undefined)?.v);
          return raw;
        };

        const items: CreateShipmentPayload['items'] = [];
        for (let r = dataStartRowIdx; r <= range.e.r; r += 1) {
          const name = cellText(r, idxName);
          const qty = cellText(r, idxQty);
          if (!name && !qty) continue;
          if (!name || !qty) continue;

          const code = cellText(r, idxCode);
          const unit = cellText(r, idxUnit);
          const vatRate = cellText(r, idxVat);
          const priceWithVat = cellText(r, idxPrice);
          const sum = cellText(r, idxSum);

          items.push({
            contractLineNo: items.length + 1,
            name,
            ...(code ? { code } : {}),
            ...(unit ? { unit } : {}),
            ...(vatRate ? { vatRate } : {}),
            ...(priceWithVat ? { priceWithVat } : {}),
            quantity: qty,
            ...(sum ? { sum } : {}),
          });
        }

        if (!items.length) throw new Error('В шаблоне не найдено ни одной строки товаров');
        resolve(items);
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Ошибка разбора шаблона'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function parseNumeric(raw: string | null | undefined): number | null {
  const s = (raw ?? '').toString().trim();
  if (!s) return null;
  const normalized = s.replace(/\u00A0/g, ' ').replace(/\s+/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(n: number): string {
  const fixed = n.toFixed(2);
  const [intPart, frac] = fixed.split('.');
  const spaced = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${spaced}.${frac}`;
}

function normalizeMoneyString(raw: string | null | undefined): string | undefined {
  const n = parseNumeric(raw);
  if (n == null) return undefined;
  return formatMoney(n);
}

function calcSumString(priceWithVat: string | null | undefined, qty: string | null | undefined): string | undefined {
  const p = parseNumeric(priceWithVat);
  const q = parseNumeric(qty);
  if (p == null || q == null) return undefined;
  return formatMoney(p * q);
}

function isPlausibleItemName(name: string): boolean {
  const n = name.trim();
  if (n.length < 5) return false;
  if (/^\d{1,4}$/.test(n)) return false;
  return true;
}

function dedupeDraftItemsByLine(items: DraftItem[]): DraftItem[] {
  const byLine = new Map<number, DraftItem>();
  for (const it of items) {
    if (!isPlausibleItemName(it.name)) continue;
    const line = it.contractLineNo ?? 0;
    if (line <= 0) continue;
    const prev = byLine.get(line);
    if (!prev || it.name.length > prev.name.length) {
      byLine.set(line, it);
    }
  }
  return [...byLine.values()].sort((a, b) => (a.contractLineNo ?? 0) - (b.contractLineNo ?? 0));
}

function filterShipmentsByTab(
  list: ShipmentListItem[],
  tab: ShipmentStatus | 'ALL',
): ShipmentListItem[] {
  if (tab === 'ALL') return list;
  if (tab === 'PICKING') {
    return list.filter((s) => s.status === 'PICKING' || s.status === 'PICKING_ON_HOLD');
  }
  return list.filter((s) => s.status === tab);
}

function computeShipmentStatusCounts(list: ShipmentListItem[]) {
  const c: Record<string, number> = { ALL: list.length, NEW: 0, PICKING: 0, PICKED: 0 };
  let onHold = 0;
  for (const s of list) {
    if (s.status === 'PICKING_ON_HOLD') onHold += 1;
    if (s.status === 'PICKING' || s.status === 'PICKING_ON_HOLD') c.PICKING += 1;
    else if (s.status === 'PICKED') c.PICKED += 1;
    else if (s.status === 'NEW') c.NEW += 1;
  }
  return { ...c, onHold } as { ALL: number; NEW: number; PICKING: number; PICKED: number; onHold: number };
}

export default function Shipments() {
  const navigate = useNavigate();
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const templateFileRef = useRef<HTMLInputElement | null>(null);
  const contractQueryRef = useRef<HTMLInputElement | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const [allItems, setAllItems] = useState<ShipmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<ShipmentListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [warehouseAction, setWarehouseAction] = useState<{
    kind: ShipmentWarehouseActionKind;
    shipment: ShipmentListItem;
  } | null>(null);
  const [warehouseSaving, setWarehouseSaving] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<ShipmentListItem | null>(null);
  const [completeSaving, setCompleteSaving] = useState(false);
  const [writeoffNavigate, setWriteoffNavigate] = useState<{
    shipment: ShipmentListItem;
    linkedCount: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState<CreateMode>('template');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [draftNote, setDraftNote] = useState('');
  const [customers, setCustomers] = useState<Counterparty[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [contractQuery, setContractQuery] = useState('');
  const [contractId, setContractId] = useState('');
  const [contractOptions, setContractOptions] = useState<
    Array<{ id: string; number: string; counterpartyId: string; counterpartyName: string }>
  >([]);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsLoadedForCustomer, setContractsLoadedForCustomer] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchShipments();
      setAllItems(res.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось загрузить отгрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(
    () => filterShipmentsByTab(allItems, filter),
    [allItems, filter],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCreateMenuOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (!createMenuRef.current) return;
      if (createMenuRef.current.contains(e.target as Node)) return;
      setCreateMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  const statusCounts = useMemo(() => computeShipmentStatusCounts(allItems), [allItems]);

  const openCreate = async (m: CreateMode) => {
    setMode(m);
    setEditingId(null);
    setDraftItems([]);
    setDraftNote('');
    setCustomerId('');
    setContractId('');
    setContractQuery('');
    setContractOptions([]);
    setContractsLoadedForCustomer(null);
    setCreateOpen(true);
    try {
      const res = await fetchCounterparties('CUSTOMER');
      setCustomers(res.items.filter((c) => c.isActive));
    } catch {
      /* ignore */
    }
  };

  const loadContractsForCustomer = async (cpId: string, q?: string) => {
    const id = (cpId ?? '').trim();
    if (!id) return;
    setContractsLoading(true);
    try {
      const res = await fetchContracts(id, q?.trim() || undefined);
      const opts = res.items
        .map((c) => ({
          id: c.id,
          number: c.number,
          counterpartyId: c.counterpartyId,
          counterpartyName: customers.find((x) => x.id === c.counterpartyId)?.name ?? '—',
        }))
        .slice(0, 200);
      setContractOptions(opts);
      setContractsLoadedForCustomer(id);
      if (!opts.length) toast.message('У заказчика нет загруженных контрактов');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось загрузить контракты заказчика');
    } finally {
      setContractsLoading(false);
    }
  };

  useEffect(() => {
    if (!createOpen) return;
    if (mode !== 'contract') return;
    if (!customerId) return;
    // Auto-load contracts list for selected customer (scrollable select)
    void loadContractsForCustomer(customerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, mode, customerId]);

  const addManualRow = () => {
    setDraftItems((prev) => [
      ...prev,
      {
        contractLineNo: prev.length + 1,
        name: '',
        quantity: '1',
      },
    ]);
  };

  const removeDraftRow = (idx: number) => {
    setDraftItems((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((it, i) => ({ ...it, contractLineNo: i + 1 })),
    );
  };

  const draftInputClass =
    'w-full min-w-0 border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';

  const handleTemplateUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const parsed = await parseTemplate(file);
      setDraftItems(parsed);
      toast.success(`Шаблон загружен: ${parsed.length} строк`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка загрузки шаблона');
    }
  };

  const handleContractSearch = async () => {
    const q = contractQuery.trim();
    if (!q) {
      contractQueryRef.current?.focus();
      toast.message('Введите номер контракта');
      return;
    }
    // In "contract" mode: if a customer is selected, search within their uploaded contracts first.
    if (mode === 'contract' && customerId) {
      await loadContractsForCustomer(customerId, q);
      return;
    }
    try {
      const res = await searchContractsByNumber(q);
      const opts = res.items
        .filter((c) => c.counterparty.type === 'CUSTOMER')
        .map((c) => ({
          id: c.id,
          number: c.number,
          counterpartyId: c.counterpartyId,
          counterpartyName: c.counterparty.name,
        }))
        .slice(0, 50);
      setContractOptions(opts);
      if (opts.length === 1) {
        setContractId(opts[0].id);
        setCustomerId(opts[0].counterpartyId);
        if (mode === 'contract') void loadItemsFromContract(opts[0].id);
      }
      if (!opts.length) toast.message('Контракты не найдены');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось выполнить поиск контракта');
    }
  };

  const loadItemsFromContract = async (id: string) => {
    if (!id) return;
    setContractLoading(true);
    try {
      const res = await fetchContractProcurementItems(id);
      const mapped: DraftItem[] = dedupeDraftItemsByLine(
        res.items
          .slice()
          .sort((a, b) => (a.contractLineNo ?? 0) - (b.contractLineNo ?? 0))
          .map((it, idx) => ({
            contractLineNo: it.contractLineNo ?? idx + 1,
            name: it.name,
            code: '',
            unit: it.unit || 'шт.',
            ...(it.vatRate ? { vatRate: it.vatRate } : {}),
            ...(it.priceWithVat ? { priceWithVat: normalizeMoneyString(it.priceWithVat) } : {}),
            contractQty: it.quantity || '—',
            quantity: it.quantity || '1',
            sum: calcSumString(it.priceWithVat, it.quantity) ?? undefined,
          })),
      );
      setDraftItems(mapped);
      toast.success(`Контракт: добавлено ${mapped.length} строк`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось извлечь позиции из контракта');
    } finally {
      setContractLoading(false);
    }
  };

  const submitCreate = async () => {
    if (!draftItems.length) {
      toast.error('Добавьте позиции в отгрузку');
      return;
    }
    if (!customerId) {
      toast.error('Выберите заказчика');
      return;
    }
    if (draftItems.some((it) => !(it.code ?? '').trim())) {
      toast.error('Заполните REF для всех позиций');
      return;
    }
    setCreating(true);
    try {
      const payloadItems: CreateShipmentPayload['items'] = draftItems.map((it) => ({
        name: it.name,
        ...(it.code ? { code: it.code } : {}),
        ...(it.unit ? { unit: it.unit } : {}),
        ...(it.vatRate ? { vatRate: it.vatRate } : {}),
        ...(it.priceWithVat ? { priceWithVat: it.priceWithVat } : {}),
        quantity: it.quantity,
        ...(it.sum ? { sum: it.sum } : {}),
        ...(it.contractLineNo ? { contractLineNo: it.contractLineNo } : {}),
        ...(it.managerNote ? { managerNote: it.managerNote } : {}),
      }));
      const payload: CreateShipmentPayload = {
        counterpartyId: customerId,
        contractId: contractId || undefined,
        note: draftNote.trim() || undefined,
        items: payloadItems,
      };
      if (editingId) {
        await updateShipment(editingId, payload);
        toast.success('Отгрузка обновлена');
      } else {
        const created = await createShipment(payload);
        toast.success('Отгрузка создана');
        navigate(`/shipments/${created.id}/print`);
      }
      setCreateOpen(false);
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : editingId ? 'Не удалось обновить отгрузку' : 'Не удалось создать отгрузку');
    } finally {
      setCreating(false);
    }
  };

  const submitPickingComplete = async (outcome: ShipmentPickingOutcome, comment: string) => {
    if (!completeTarget) return;
    setCompleteSaving(true);
    try {
      await completeShipmentPicking(completeTarget.id, { outcome, comment });
      toast.success('Сборка завершена — переход к списанию');
      setCompleteTarget(null);
      await load();
      setWriteoffNavigate({
        shipment: { ...completeTarget, status: 'PICKED', pickingOutcome: outcome },
        linkedCount: completeTarget.itemsCount,
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось завершить сборку');
    } finally {
      setCompleteSaving(false);
    }
  };

  const goToWriteoff = (destinationId: string, destinationLabel: string) => {
    const shipmentId = writeoffNavigate?.shipment.id;
    if (!shipmentId) return;
    const qs = new URLSearchParams({ shipmentId, destinationId, destinationLabel });
    navigate(`/write-off?${qs.toString()}`);
    setWriteoffNavigate(null);
  };

  const sendToPicking = async (id: string) => {
    try {
      await sendShipmentToPicking(id);
      toast.success('Отправлено на сборку');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось отправить на сборку');
    }
  };

  const submitWarehouseAction = async (comment: string) => {
    if (!warehouseAction) return;
    const { kind, shipment } = warehouseAction;
    setWarehouseSaving(true);
    try {
      if (kind === 'pause') {
        await pauseShipmentPicking(shipment.id, comment);
        toast.success('Сборка приостановлена — склад уведомлён');
      } else if (kind === 'recall') {
        await recallShipmentFromPicking(shipment.id, comment);
        toast.success('Сборка отозвана — можно редактировать заказ');
      } else {
        await resumeShipmentPicking(shipment.id, comment || undefined);
        toast.success('Сборка возобновлена');
      }
      setWarehouseAction(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось выполнить действие');
    } finally {
      setWarehouseSaving(false);
    }
  };

  const editShipment = async (s: ShipmentListItem) => {
    if (s.status !== 'NEW') {
      toast.message('Редактирование доступно только для статуса «Новый»');
      return;
    }

    setCreating(true);
    try {
      const detail = await fetchShipment(s.id);
      setEditingId(detail.id);
      setMode('manual');
      setDraftItems(
        detail.items.map((it, idx) => ({
          contractLineNo: it.contractLineNo ?? idx + 1,
          name: it.name,
          ...(it.code ? { code: it.code } : {}),
          ...(it.unit ? { unit: it.unit } : {}),
          ...(it.vatRate ? { vatRate: it.vatRate } : {}),
          ...(it.priceWithVat ? { priceWithVat: it.priceWithVat } : {}),
          quantity: it.quantity,
          ...(it.sum ? { sum: it.sum } : {}),
          ...(it.managerNote ? { managerNote: it.managerNote } : {}),
        })),
      );
      setDraftNote(detail.note ?? '');
      setCustomerId(detail.counterpartyId ?? '');
      setContractId(detail.contractId ?? '');
      setContractQuery(detail.contract?.number ?? '');
      setContractOptions([]);
      try {
        const res = await fetchCounterparties('CUSTOMER');
        setCustomers(res.items.filter((c) => c.isActive));
      } catch {
        /* ignore */
      }
      setCreateOpen(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось открыть отгрузку для редактирования');
    } finally {
      setCreating(false);
    }
  };

  const requestDeleteShipment = (s: ShipmentListItem) => {
    setDeleteTarget(s);
  };

  const confirmDeleteShipment = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteShipment(deleteTarget.id)
      .then(() => {
        toast.success('Отгрузка удалена');
        setDeleteTarget(null);
        return load();
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Не удалось удалить отгрузку'))
      .finally(() => setDeleting(false));
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Отгрузки</h1>
          <p className="text-xs text-slate-500">Новые заявки, сборка на складе и печать листа сборки</p>
        </div>
        <div className="relative" ref={createMenuRef}>
          <Button
            type="button"
            className="bg-blue-700 hover:bg-blue-800 text-white"
            onClick={() => setCreateMenuOpen((v) => !v)}
          >
            Создать отгрузку
          </Button>
          {createMenuOpen && (
            <div className="absolute right-0 mt-2 w-[340px] rounded-md border bg-white shadow-lg overflow-hidden z-10">
              <button
                type="button"
                className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50"
                onClick={() => {
                  setCreateMenuOpen(false);
                  void openCreate('manual');
                }}
              >
                Создать отгрузку вручную
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50"
                onClick={() => {
                  setCreateMenuOpen(false);
                  void openCreate('contract');
                }}
              >
                Создать отгрузку на основании контракта
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50"
                onClick={() => {
                  setCreateMenuOpen(false);
                  void openCreate('template');
                }}
              >
                Создать отгрузку по шаблону
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {(['ALL', 'NEW', 'PICKING', 'PICKED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`h-8 px-3 rounded border text-xs font-bold ${
              filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            {s === 'ALL' ? 'Все' : shipmentStatusBadge(s).label} · {statusCounts[s]}
            {s === 'PICKING' && statusCounts.onHold > 0 ? (
              <span className="ml-1 opacity-90">({statusCounts.onHold} пауза)</span>
            ) : null}
          </button>
        ))}
        <Button type="button" variant="outline" className="h-8 ml-auto" onClick={() => void load()}>
          {loading ? 'Обновление...' : 'Обновить'}
        </Button>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b text-[10px] font-bold uppercase text-slate-500 tracking-wider">
          <div className="col-span-2">Статус</div>
          <div className="col-span-3">Заказчик</div>
          <div className="col-span-2">Контракт</div>
          <div className="col-span-1 text-right">Позиций</div>
          <div className="col-span-4 text-right">Действия</div>
        </div>
        {items.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">{loading ? 'Загрузка...' : 'Пока нет отгрузок'}</div>
        ) : (
          <div className="divide-y">
            {items.map((s) => {
              const badge = shipmentStatusBadge(s.status);
              const warehouseMeta = resolveWarehouseMessageMeta(s);
              return (
                <div key={s.id} className="px-3 py-2.5">
                  <div className="grid grid-cols-12 gap-2 items-center text-sm">
                  <div className="col-span-2">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <div className="font-semibold text-slate-900 truncate" title={s.counterparty?.name ?? ''}>
                      {s.counterparty?.name ?? '—'}
                    </div>
                  </div>
                  <div className="col-span-2 font-mono text-xs text-slate-700 truncate" title={s.contract?.number ?? ''}>
                    {s.contract?.number ?? '—'}
                  </div>
                  <div className="col-span-1 text-right font-mono text-xs text-slate-700">{s.itemsCount}</div>
                  <div className="col-span-4 flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/shipments/${s.id}/print`)}>
                      Печать
                    </Button>
                    {s.status === 'NEW' ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-blue-700 hover:bg-blue-800 text-white"
                        onClick={() => void sendToPicking(s.id)}
                      >
                        На сборку
                      </Button>
                    ) : (
                      <Button type="button" variant="secondary" size="sm" disabled>
                        На сборку
                      </Button>
                    )}
                    {s.status === 'PICKING' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-900 hover:bg-amber-50"
                        onClick={() => setWarehouseAction({ kind: 'pause', shipment: s })}
                      >
                        Пауза
                      </Button>
                    ) : null}
                    {s.status === 'PICKING_ON_HOLD' ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-blue-700 hover:bg-blue-800 text-white"
                        onClick={() => setWarehouseAction({ kind: 'resume', shipment: s })}
                      >
                        Возобновить
                      </Button>
                    ) : null}
                    {s.status === 'PICKING' || s.status === 'PICKING_ON_HOLD' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => setWarehouseAction({ kind: 'recall', shipment: s })}
                      >
                        Отозвать
                      </Button>
                    ) : null}
                    {(s.status === 'PICKING' || s.status === 'PICKING_ON_HOLD') && canWriteoff(userRole) ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setCompleteTarget(s)}
                      >
                        Готово
                      </Button>
                    ) : null}
                    {s.status === 'PICKED' && canWriteoff(userRole) ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-violet-700 hover:bg-violet-800 text-white"
                        onClick={() =>
                          setWriteoffNavigate({ shipment: s, linkedCount: s.itemsCount })
                        }
                      >
                        Списание
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={s.status !== 'NEW'}
                      onClick={() => editShipment(s)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={s.status !== 'NEW'}
                      onClick={() => requestDeleteShipment(s)}
                    >
                      Удалить
                    </Button>
                  </div>
                  </div>
                  {warehouseMeta ? (
                    <ShipmentWarehouseMessageBanner
                      className="mt-2"
                      tone={warehouseMeta.tone}
                      label={warehouseMeta.label}
                      message={s.warehouseMessage!.trim()}
                    />
                  ) : null}
                  {s.status === 'DISPATCHED' && s.writeoffCompletedAt ? (
                    <p className="mt-1.5 text-[11px] text-emerald-800 px-0.5">
                      Списание выполнено ·{' '}
                      {new Date(s.writeoffCompletedAt).toLocaleString('ru-RU')}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ShipmentWarehouseActionDialog
        open={warehouseAction != null}
        kind={warehouseAction?.kind ?? 'pause'}
        customerName={warehouseAction?.shipment.counterparty?.name ?? '—'}
        saving={warehouseSaving}
        onCancel={() => setWarehouseAction(null)}
        onConfirm={(comment) => void submitWarehouseAction(comment)}
      />

      <ShipmentPickingCompleteDialog
        open={completeTarget != null}
        customerName={completeTarget?.counterparty?.name ?? '—'}
        saving={completeSaving}
        onCancel={() => setCompleteTarget(null)}
        onConfirm={(outcome, comment) => void submitPickingComplete(outcome, comment)}
      />

      <ShipmentWriteoffNavigateDialog
        open={writeoffNavigate != null}
        shipmentId={writeoffNavigate?.shipment.id ?? ''}
        customerName={writeoffNavigate?.shipment.counterparty?.name ?? '—'}
        linkedCount={writeoffNavigate?.linkedCount ?? 0}
        totalCount={writeoffNavigate?.shipment.itemsCount ?? 0}
        onCancel={() => setWriteoffNavigate(null)}
        onConfirm={(destinationId, destinationLabel) => goToWriteoff(destinationId, destinationLabel)}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Удалить заказ на сборку?"
        message="Действие необратимо. Отгрузка будет удалена."
        confirmLabel="Удалить"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteShipment}
        confirmDisabled={deleting}
      />

      {createOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/50 p-2 sm:p-3">
          <div className="mx-auto flex h-[calc(100vh-1rem)] w-full max-w-[1920px] flex-col overflow-hidden rounded-lg border bg-white shadow-2xl sm:h-[calc(100vh-1.5rem)]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div>
                <div className="text-base font-bold text-slate-900">
                  {editingId ? 'Редактирование отгрузки' : 'Создание отгрузки'}
                </div>
                <div className="text-xs text-slate-500">
                  {mode === 'template' ? 'По шаблону Excel' : mode === 'contract' ? 'На основании контракта' : 'Вручную'}
                  {draftItems.length > 0 ? ` · ${draftItems.length} поз.` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={addManualRow}>
                  + Строка
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditingId(null);
                  }}
                >
                  Закрыть
                </Button>
                <Button
                  type="button"
                  className="bg-blue-700 hover:bg-blue-800 text-white"
                  disabled={creating}
                  onClick={() => void submitCreate()}
                >
                  {creating ? (editingId ? 'Сохранение...' : 'Создание...') : editingId ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b bg-white p-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="space-y-3 xl:col-span-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-8 ${mode === 'template' ? 'bg-blue-700 hover:bg-blue-800 text-white border-blue-700' : ''}`}
                    onClick={() => setMode('template')}
                  >
                    Шаблон
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-8 ${mode === 'contract' ? 'bg-blue-700 hover:bg-blue-800 text-white border-blue-700' : ''}`}
                    onClick={() => setMode('contract')}
                  >
                    Контракт
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-8 ${mode === 'manual' ? 'bg-blue-700 hover:bg-blue-800 text-white border-blue-700' : ''}`}
                    onClick={() => setMode('manual')}
                  >
                    Вручную
                  </Button>
                </div>

                {mode === 'template' ? (
                  <div className="rounded border p-3 bg-slate-50">
                    <div className="text-xs font-bold text-slate-700 mb-2">Загрузить шаблон Excel</div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={templateFileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => void handleTemplateUpload(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() => templateFileRef.current?.click()}
                      >
                        Загрузить
                      </Button>
                      <div className="text-[11px] text-slate-500">
                        Таблица будет перенесена в форму “как в Excel” (колонки/значения).
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">
                      Поддерживаем структуру как на вашем шаблоне: Наименование, Код, Ед.изм., Ставка НДС, Цена с НДС, Отгр.ед. по заявке, Сумма.
                    </div>
                  </div>
                ) : mode === 'contract' ? (
                  <div className="rounded border p-3 bg-slate-50">
                    <div className="text-xs font-bold text-slate-700 mb-2">Заполнить позиции из контракта</div>
                    <div className="text-[11px] text-slate-500 mb-2">
                      Выберите заказчика, затем выберите контракт из списка (можно прокручивать). Позиции из раздела «Объект закупки» перенесутся в форму и останутся редактируемыми.
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() => {
                          if (!customerId) {
                            toast.message('Сначала выберите заказчика');
                            return;
                          }
                          void loadContractsForCustomer(customerId, contractQuery.trim() || undefined);
                        }}
                      >
                        Показать контракты
                      </Button>
                      <div className="text-[11px] text-slate-500">
                        {contractsLoading ? 'Загрузка контрактов...' : contractLoading ? 'Загрузка позиций...' : ' '}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded border p-3 bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-700">Ручное добавление</div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="h-8" onClick={addManualRow}>
                          Добавить строку
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8"
                          onClick={() => setDraftItems([])}
                        >
                          Очистить
                        </Button>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2">
                      Добавьте строки справа и заполните «Наименование» и «Кол-во».
                    </div>
                  </div>
                )}

                <div className="rounded border p-3">
                  <div className="text-xs font-bold text-slate-700 mb-2">Куда поедет товар (заказчик)</div>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded px-2 text-sm bg-white"
                  >
                    <option value="">— выбрать заказчика —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3">
                    <div className="text-xs font-bold text-slate-700 mb-2">
                      Контракт {mode === 'contract' ? '(выбор из базы)' : '(поиск по номеру)'}
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={contractQueryRef}
                        value={contractQuery}
                        onChange={(e) => setContractQuery(e.target.value)}
                        placeholder={mode === 'contract' ? 'Фильтр по номеру/названию (необязательно)' : '№ контракта'}
                        className="flex-1 h-9 border border-slate-200 rounded px-2 text-sm font-mono"
                      />
                      <Button type="button" variant="outline" className="h-9" onClick={() => void handleContractSearch()}>
                        {mode === 'contract' ? 'Фильтр' : 'Найти'}
                      </Button>
                    </div>
                    {contractOptions.length > 0 && (
                      <select
                        value={contractId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setContractId(id);
                          const picked = contractOptions.find((o) => o.id === id);
                          if (picked) setCustomerId(picked.counterpartyId);
                          if (mode === 'contract' && id) void loadItemsFromContract(id);
                        }}
                        className="w-full h-9 border border-slate-200 rounded px-2 text-sm bg-white mt-2"
                      >
                        <option value="">
                          {mode === 'contract'
                            ? contractsLoadedForCustomer === customerId
                              ? '— выбрать контракт —'
                              : '— нажмите «Показать контракты» —'
                            : '— не привязывать —'}
                        </option>
                        {contractOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.number} · {o.counterpartyName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="xl:col-span-8">
                <div className="rounded border p-3 h-full">
                  <div className="text-xs font-bold text-slate-700 mb-2">Комментарий к отгрузке</div>
                  <textarea
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    className="w-full min-h-[88px] border border-slate-200 rounded px-2 py-2 text-sm"
                    placeholder="Необязательно — видно в карточке отгрузки"
                  />
                </div>
              </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col border-t bg-slate-50/50">
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2">
                  <div className="text-sm font-bold text-slate-800">Позиции ({draftItems.length})</div>
                  <div className="text-[11px] text-slate-500">Прокрутите таблицу · границы колонок совпадают с заголовками</div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
                  {draftItems.length === 0 ? (
                    <div className="rounded border border-dashed bg-white p-8 text-center text-sm text-slate-600">
                      Загрузите шаблон, выберите контракт или нажмите «+ Строка»
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded border border-slate-300 bg-white shadow-sm">
                      <table className="w-full min-w-[1400px] border-collapse text-xs">
                        <colgroup>
                          <col className="w-10" />
                          <col className="w-[min(360px,28vw)]" />
                          <col className="w-24" />
                          <col className="w-48" />
                          <col className="w-14" />
                          <col className="w-16" />
                          <col className="w-28" />
                          <col className="w-20" />
                          <col className="w-20" />
                          <col className="w-28" />
                          <col className="w-10" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-slate-300 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            <th rowSpan={2} className="border-r border-slate-300 px-1 py-2 text-center align-middle">
                              №
                            </th>
                            <th rowSpan={2} className="border-r border-slate-300 px-2 py-2 text-left align-middle">
                              Наименование
                            </th>
                            <th rowSpan={2} className="border-r border-slate-300 px-2 py-2 text-left align-middle">
                              REF
                            </th>
                            <th rowSpan={2} className="border-r border-slate-300 px-2 py-2 text-left align-middle bg-blue-50/80">
                              Комментарий менеджера
                            </th>
                            <th rowSpan={2} className="border-r border-slate-300 px-1 py-2 text-center align-middle">
                              Ед.
                            </th>
                            <th colSpan={4} className="border-b border-r border-slate-300 px-2 py-1 text-center bg-amber-50/80">
                              Цены и количество
                            </th>
                            <th rowSpan={2} className="border-r border-slate-300 px-2 py-2 text-right align-middle">
                              Сумма
                            </th>
                            <th rowSpan={2} className="px-1 py-2 text-center align-middle" />
                          </tr>
                          <tr className="border-b-2 border-slate-300 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            <th className="border-r border-slate-300 px-1 py-1 text-center bg-amber-50/50">НДС</th>
                            <th className="border-r border-slate-300 px-2 py-1 text-right bg-amber-50/50">Цена с НДС</th>
                            <th className="border-r border-slate-300 px-2 py-1 text-right bg-amber-50/50" title="По контракту">
                              По контр.
                            </th>
                            <th className="border-r border-slate-300 px-2 py-1 text-right bg-amber-50/50">Отгрузка</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draftItems.map((it, idx) => (
                            <tr
                              key={idx}
                              className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/90'} hover:bg-blue-50/40`}
                            >
                              <td className="border-r border-slate-200 px-1 py-1 text-center font-mono text-slate-600 align-top">
                                {idx + 1}
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top">
                                <textarea
                                  value={it.name}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setDraftItems((prev) => prev.map((p, i) => (i === idx ? { ...p, name: v } : p)));
                                  }}
                                  rows={3}
                                  className={`${draftInputClass} text-sm leading-snug resize-y min-h-[56px]`}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top">
                                <input
                                  value={it.code ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setDraftItems((prev) => prev.map((p, i) => (i === idx ? { ...p, code: v } : p)));
                                  }}
                                  className={`${draftInputClass} font-mono`}
                                  placeholder="REF"
                                />
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top bg-blue-50/20">
                                <input
                                  value={it.managerNote ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setDraftItems((prev) => prev.map((p, i) => (i === idx ? { ...p, managerNote: v } : p)));
                                  }}
                                  className={draftInputClass}
                                  placeholder="комментарий"
                                />
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top">
                                <input
                                  value={it.unit ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setDraftItems((prev) => prev.map((p, i) => (i === idx ? { ...p, unit: v } : p)));
                                  }}
                                  className={`${draftInputClass} text-center font-mono`}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top bg-amber-50/20">
                                <input
                                  value={it.vatRate ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setDraftItems((prev) => prev.map((p, i) => (i === idx ? { ...p, vatRate: v } : p)));
                                  }}
                                  className={`${draftInputClass} text-center font-mono`}
                                  placeholder="%"
                                />
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top bg-amber-50/20">
                                <input
                                  value={it.priceWithVat ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setDraftItems((prev) =>
                                      prev.map((p, i) =>
                                        i === idx
                                          ? { ...p, priceWithVat: v, sum: calcSumString(v, p.quantity) ?? undefined }
                                          : p,
                                      ),
                                    );
                                  }}
                                  onBlur={() => {
                                    const formatted = normalizeMoneyString(it.priceWithVat);
                                    if (!formatted || formatted === it.priceWithVat) return;
                                    setDraftItems((prev) =>
                                      prev.map((p, i) =>
                                        i === idx
                                          ? { ...p, priceWithVat: formatted, sum: calcSumString(formatted, p.quantity) ?? undefined }
                                          : p,
                                      ),
                                    );
                                  }}
                                  className={`${draftInputClass} text-right font-mono`}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top bg-amber-50/20">
                                <input
                                  value={it.contractQty ?? '—'}
                                  readOnly
                                  className={`${draftInputClass} text-right font-mono bg-slate-100 text-slate-600`}
                                  title="Кол-во по контракту"
                                />
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top bg-amber-50/20">
                                <input
                                  value={it.quantity}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setDraftItems((prev) =>
                                      prev.map((p, i) =>
                                        i === idx
                                          ? { ...p, quantity: v, sum: calcSumString(p.priceWithVat, v) ?? undefined }
                                          : p,
                                      ),
                                    );
                                  }}
                                  className={`${draftInputClass} text-right font-mono font-semibold`}
                                />
                              </td>
                              <td className="border-r border-slate-200 px-1 py-1 align-top">
                                <input
                                  value={normalizeMoneyString(it.sum) ?? it.sum ?? ''}
                                  readOnly
                                  className={`${draftInputClass} text-right font-mono bg-slate-100 text-slate-700`}
                                  title="Сумма = цена × отгрузка"
                                />
                              </td>
                              <td className="px-1 py-1 text-center align-top">
                                <button
                                  type="button"
                                  onClick={() => removeDraftRow(idx)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                                  title="Удалить строку"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


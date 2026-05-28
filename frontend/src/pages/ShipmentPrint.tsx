import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import ShipmentWarehouseActionDialog, {
  type ShipmentWarehouseActionKind,
} from '../components/ops/ShipmentWarehouseActionDialog';
import { ApiError } from '../lib/api/client';
import {
  completeShipmentPicking,
  fetchShipmentPrintData,
  pauseShipmentPicking,
  recallShipmentFromPicking,
  resumeShipmentPicking,
  sendShipmentToPicking,
  shipmentStatusBadge,
  type ShipmentPickingOutcome,
  type ShipmentPrintData,
} from '../lib/api/shipments';
import ShipmentPickingCompleteDialog from '../components/shipments/ShipmentPickingCompleteDialog';
import { printElementInIframe } from '../lib/print/printInIframe';
import ShipmentWarehouseMessageBanner from '../components/shipments/ShipmentWarehouseMessageBanner';
import ShipmentRefLinkBadge from '../components/shipments/ShipmentRefLinkBadge';
import ShipmentWriteoffNavigateDialog from '../components/shipments/ShipmentWriteoffNavigateDialog';
import { resolveWarehouseMessageMeta } from '../lib/shipments/warehouse-message';
import { refLinkSummaryHint } from '../lib/shipments/shipment-ref-link';
import { canWriteoff } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';

const thBase =
  'border border-slate-300 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100';
const tdBase = 'border border-slate-200 px-2 py-2 align-top text-[11px]';

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

function normalizeMoneyString(raw: string | null | undefined): string {
  const n = parseNumeric(raw);
  if (n == null) return raw ?? '';
  return formatMoney(n);
}

function parseVatRatePercent(raw: string | null | undefined): number {
  const s = (raw ?? '').toString().trim();
  if (!s) return 0;
  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return 0;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function calcVat(priceWithVat: number | null, qty: number | null, vatRatePct: number) {
  const p = priceWithVat ?? 0;
  const q = qty ?? 0;
  const r = Math.max(0, vatRatePct) / 100;
  const priceWithout = r > 0 ? p / (1 + r) : p;
  const vatPerUnit = p - priceWithout;
  const sumWith = p * q;
  const sumWithout = priceWithout * q;
  const sumVat = vatPerUnit * q;
  return { priceWithout, vatPerUnit, sumWith, sumWithout, sumVat };
}

function formatContractDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('ru-RU');
}

function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatPrintUnit(unit: string | null | undefined): string {
  const u = (unit ?? '').trim();
  if (!u) return '';
  const lower = u.toLowerCase();
  if (lower.includes('шт')) return 'шт';
  if (lower.includes('уп')) return 'уп';
  if (lower.includes('компл')) return 'компл';
  return u.length > 12 ? u.slice(0, 12) : u;
}

function printStatusClass(status: string): string {
  if (status === 'PICKING_ON_HOLD') return 'shipment-print-doc__status--hold';
  if (status === 'PICKING') return 'shipment-print-doc__status--picking';
  if (status === 'PICKED') return 'shipment-print-doc__status--picked';
  return 'shipment-print-doc__status--new';
}


function ShipmentPickingPrintDocument({
  data,
  statusLabel,
  isPaused,
}: {
  data: ShipmentPrintData;
  statusLabel: string;
  isPaused: boolean;
}) {
  const printedAt = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const hasComments = data.items.some((it) => (it.managerNote ?? '').trim().length > 0);
  const positionsLabel = `${data.items.length} ${data.items.length === 1 ? 'позиция' : data.items.length < 5 ? 'позиции' : 'позиций'}`;
  const contractNo = data.contract?.number?.trim();
  const contractDate = formatContractDate(data.contract?.date);

  return (
    <div className="shipment-print-document" aria-hidden="true">
      <article className="shipment-print-doc">
        <div className="shipment-print-doc__brand">
          <span>МЕД-ЛОГИСТИКА</span>
          <span className="shipment-print-doc__brand-meta">Напечатано {printedAt}</span>
        </div>

        <div className="shipment-print-doc__head">
          <div className="shipment-print-doc__title-block">
            <h1 className="shipment-print-doc__title">Лист сборки</h1>
            {contractNo ? (
              <p className="shipment-print-doc__subtitle">
                Контракт {contractNo}
                {contractDate ? ` от ${contractDate}` : ''}
              </p>
            ) : null}
          </div>
          <div className="shipment-print-doc__status-wrap">
            <span className={`shipment-print-doc__status ${printStatusClass(data.status)}`}>{statusLabel}</span>
            <div className="shipment-print-doc__positions">{positionsLabel}</div>
          </div>
        </div>

        <div className="shipment-print-doc__meta">
          <div className="shipment-print-doc__meta-block">
            <div className="shipment-print-doc__label">Заказчик</div>
            <div className="shipment-print-doc__value">{data.counterparty?.name ?? '—'}</div>
            <div className="shipment-print-doc__value-sub">
              ИНН {data.counterparty?.inn ?? '—'}
              {data.counterparty?.kpp ? ` · КПП ${data.counterparty.kpp}` : ''}
            </div>
          </div>
          <div className="shipment-print-doc__meta-block">
            <div className="shipment-print-doc__label">Контракт</div>
            <div className="shipment-print-doc__value shipment-print-doc__value-mono">{contractNo ?? '—'}</div>
            <div className="shipment-print-doc__value-sub">{contractDate || '—'}</div>
          </div>
          <div className="shipment-print-doc__meta-block">
            <div className="shipment-print-doc__label">Отгрузка</div>
            <div className="shipment-print-doc__value shipment-print-doc__value-mono shipment-print-doc__value--id">
              {data.id}
            </div>
            {data.pickingSentAt ? (
              <div className="shipment-print-doc__value-sub">На склад {formatDateTime(data.pickingSentAt)}</div>
            ) : null}
          </div>
        </div>

        {isPaused && data.warehouseMessage ? (
          <div className="shipment-print-doc__alert">
            <div className="shipment-print-doc__alert-title">Сборка приостановлена — не комплектовать</div>
            <div>{data.warehouseMessage}</div>
          </div>
        ) : null}

        {!isPaused && data.warehouseMessage ? (
          <div className="shipment-print-doc__alert shipment-print-doc__alert--note">
            <div className="shipment-print-doc__alert-title">Сообщение менеджера</div>
            <div>{data.warehouseMessage}</div>
          </div>
        ) : null}

        <div className="shipment-print-doc__table-wrap">
          <table className={`shipment-print-doc__table${hasComments ? '' : ' shipment-print-doc__table--no-notes'}`}>
            <colgroup>
              {hasComments ? (
                <>
                  <col style={{ width: '4%' }} />
                  <col style={{ width: '50%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '19%' }} />
                </>
              ) : (
                <>
                  <col style={{ width: '4%' }} />
                  <col style={{ width: '62%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                </>
              )}
            </colgroup>
            <thead>
              <tr>
                <th className="shipment-print-doc__col-no">№</th>
                <th className="shipment-print-doc__col-name">Наименование</th>
                <th className="shipment-print-doc__col-ref">REF</th>
                <th className="shipment-print-doc__col-unit">Ед.</th>
                <th className="shipment-print-doc__col-qty">Кол-во</th>
                {hasComments ? <th className="shipment-print-doc__col-note">Комментарий</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, rowIdx) => (
                <tr key={`print-${it.lineNo}-${rowIdx}`}>
                  <td className="shipment-print-doc__col-no">{rowIdx + 1}</td>
                  <td className="shipment-print-doc__col-name">{it.name}</td>
                  <td className="shipment-print-doc__col-ref">{it.code ?? ''}</td>
                  <td className="shipment-print-doc__col-unit">{formatPrintUnit(it.unit)}</td>
                  <td className="shipment-print-doc__col-qty">{it.quantity}</td>
                  {hasComments ? (
                    <td className="shipment-print-doc__col-note">{it.managerNote ?? ''}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="shipment-print-doc__bottom">
          <div className="shipment-print-doc__sign">
            <div className="shipment-print-doc__sign-item">
              <div className="shipment-print-doc__label">Собрал (подпись)</div>
              <div className="shipment-print-doc__sign-line" />
            </div>
            <div className="shipment-print-doc__sign-item">
              <div className="shipment-print-doc__label">Проверил (подпись)</div>
              <div className="shipment-print-doc__sign-line" />
            </div>
            <div className="shipment-print-doc__sign-item">
              <div className="shipment-print-doc__label">Дата</div>
              <div className="shipment-print-doc__sign-line" />
            </div>
          </div>
          <div className="shipment-print-doc__footer">
            <span>МЕД-ЛОГИСТИКА · лист сборки</span>
            <span className="shipment-print-doc__footer-hint">Альбомная A4 · масштаб 100%</span>
          </div>
        </div>
      </article>
    </div>
  );
}

export default function ShipmentPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const [data, setData] = useState<ShipmentPrintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [warehouseAction, setWarehouseAction] = useState<ShipmentWarehouseActionKind | null>(null);
  const [warehouseSaving, setWarehouseSaving] = useState(false);
  const [writeoffDialogOpen, setWriteoffDialogOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeSaving, setCompleteSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchShipmentPrintData(id)
      .then((d) => setData(d))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Не удалось загрузить печать'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    document.body.setAttribute('data-shipment-print', '1');
    return () => document.body.removeAttribute('data-shipment-print');
  }, []);

  const handlePrint = () => {
    const docEl = document.querySelector('.shipment-print-doc');
    if (docEl instanceof HTMLElement) {
      printElementInIframe(docEl);
      return;
    }
    window.print();
  };

  const totals = useMemo(() => {
    if (!data) return { sumWith: 0, sumWithout: 0, sumVat: 0 };
    let sumWith = 0;
    let sumWithout = 0;
    let sumVat = 0;
    for (const it of data.items) {
      const p = parseNumeric(it.priceWithVat);
      const q = parseNumeric(it.quantity);
      const r = parseVatRatePercent(it.vatRate);
      const c = calcVat(p, q, r);
      sumWith += c.sumWith;
      sumWithout += c.sumWithout;
      sumVat += c.sumVat;
    }
    return { sumWith, sumWithout, sumVat };
  }, [data]);

  const confirmSendToWarehouse = async () => {
    if (!id || !data) return;
    setSending(true);
    try {
      const res = await sendShipmentToPicking(id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              pickingSentAt: res.pickingSentAt,
              pickingPausedAt: null,
              pickingRecalledAt: null,
              warehouseMessage: null,
            }
          : prev,
      );
      setConfirmSendOpen(false);
      toast.success('Заявка передана на склад — кладовщики получили уведомление');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось отправить на сборку');
    } finally {
      setSending(false);
    }
  };

  const submitWarehouseAction = async (comment: string) => {
    if (!id || !data || !warehouseAction) return;
    setWarehouseSaving(true);
    try {
      if (warehouseAction === 'pause') {
        const res = await pauseShipmentPicking(id, comment);
        setData((prev) =>
          prev
            ? {
                ...prev,
                status: res.status,
                warehouseMessage: res.warehouseMessage,
                pickingPausedAt: new Date().toISOString(),
              }
            : prev,
        );
        toast.success('Сборка приостановлена');
      } else if (warehouseAction === 'recall') {
        const res = await recallShipmentFromPicking(id, comment);
        setData((prev) =>
          prev
            ? {
                ...prev,
                status: res.status,
                warehouseMessage: res.warehouseMessage,
                pickingSentAt: null,
                pickingPausedAt: null,
                pickingRecalledAt: res.pickingRecalledAt,
              }
            : prev,
        );
        toast.success('Сборка отозвана — заказ снова «Новый»');
      } else {
        const res = await resumeShipmentPicking(id, comment || undefined);
        setData((prev) =>
          prev
            ? {
                ...prev,
                status: res.status,
                warehouseMessage: res.warehouseMessage,
                pickingPausedAt: null,
              }
            : prev,
        );
        toast.success('Сборка возобновлена');
      }
      setWarehouseAction(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось выполнить действие');
    } finally {
      setWarehouseSaving(false);
    }
  };

  if (!id) return <div className="p-4">Не указан id</div>;
  if (loading && !data) return <div className="p-4">Загрузка...</div>;
  if (!data) return <div className="p-4">Нет данных</div>;

  const badge = shipmentStatusBadge(data.status);
  const canEdit = data.status === 'NEW';
  const canSendToWarehouse = data.status === 'NEW';
  const isActivePicking = data.status === 'PICKING';
  const isPaused = data.status === 'PICKING_ON_HOLD';
  const isPicked = data.status === 'PICKED';
  const isDispatched = data.status === 'DISPATCHED';
  const canCompletePicking =
    canWriteoff(userRole) && (isActivePicking || isPaused);
  const customerName = data.counterparty?.name ?? '—';
  const warehouseMeta = resolveWarehouseMessageMeta(data);
  const canBuildWriteoffCart =
    canWriteoff(userRole) &&
    isPicked &&
    (data.refLinkSummary?.linked ?? 0) > 0;
  const refHint = data.refLinkSummary ? refLinkSummaryHint(data.refLinkSummary) : null;

  const submitPickingComplete = async (outcome: ShipmentPickingOutcome, comment: string) => {
    if (!id) return;
    setCompleteSaving(true);
    try {
      const res = await completeShipmentPicking(id, { outcome, comment });
      setData((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              warehouseMessage: res.warehouseMessage,
              pickingOutcome: res.pickingOutcome,
              pickingCompleteComment: res.pickingCompleteComment,
              pickingPausedAt: null,
            }
          : prev,
      );
      setCompleteOpen(false);
      toast.success('Сборка завершена');
      setWriteoffDialogOpen(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось завершить сборку');
    } finally {
      setCompleteSaving(false);
    }
  };

  const goToWriteoffCart = (destinationId: string, destinationLabel: string) => {
    if (!id) return;
    setWriteoffDialogOpen(false);
    const qs = new URLSearchParams({
      shipmentId: id,
      destinationId,
      destinationLabel,
    });
    navigate(`/write-off?${qs.toString()}`);
  };

  return (
    <div className="shipment-print-page p-4">
      {data ? (
        <ShipmentPickingPrintDocument data={data} statusLabel={badge.label} isPaused={isPaused} />
      ) : null}

      <div className="shipment-print-screen-only">
      <div className="shipment-print-no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">Лист сборки</h1>
            <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-bold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Отгрузка #{data.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button type="button" variant="outline" onClick={() => navigate('/shipments')}>
              К списку · редактировать
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => navigate('/shipments')}>
              К списку отгрузок
            </Button>
          )}
          {canSendToWarehouse ? (
            <Button
              type="button"
              className="bg-blue-700 hover:bg-blue-800 text-white"
              disabled={sending}
              onClick={() => setConfirmSendOpen(true)}
            >
              {sending ? 'Отправка...' : 'Отправить в сборку на склад'}
            </Button>
          ) : null}
          {isActivePicking ? (
            <Button
              type="button"
              variant="outline"
              className="border-amber-300 text-amber-900 hover:bg-amber-50"
              onClick={() => setWarehouseAction('pause')}
            >
              Приостановить
            </Button>
          ) : null}
          {isPaused ? (
            <Button
              type="button"
              className="bg-blue-700 hover:bg-blue-800 text-white"
              onClick={() => setWarehouseAction('resume')}
            >
              Возобновить сборку
            </Button>
          ) : null}
          {isActivePicking || isPaused ? (
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setWarehouseAction('recall')}
            >
              Отозвать со склада
            </Button>
          ) : null}
          {canCompletePicking ? (
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setCompleteOpen(true)}
            >
              Готово
            </Button>
          ) : null}
          {canBuildWriteoffCart ? (
            <Button
              type="button"
              variant="outline"
              className="border-violet-200 text-violet-900 hover:bg-violet-50"
              onClick={() => setWriteoffDialogOpen(true)}
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" />
              К списанию
            </Button>
          ) : null}
          <Button
            type="button"
            variant={canSendToWarehouse ? 'outline' : 'default'}
            title="Альбомная A4, масштаб 100%. Если сверху/снизу видны URL и дата — в «Дополнительно» снимите «Колонтитулы»"
            onClick={handlePrint}
          >
            Печать листа
          </Button>
        </div>
      </div>

      {warehouseMeta ? (
        <div className="shipment-print-no-print mb-4 space-y-2">
          <ShipmentWarehouseMessageBanner
            tone={warehouseMeta.tone}
            label={warehouseMeta.label}
            message={data.warehouseMessage!.trim()}
          />
          {isPaused ? (
            <p className="text-[12px] text-orange-900/90 px-1">
              Не комплектуйте заказ до снятия паузы менеджером.
              {data.pickingPausedAt ? ` · с ${formatDateTime(data.pickingPausedAt)}` : ''}
            </p>
          ) : null}
          {isActivePicking && !isPaused ? (
            <p className="text-[12px] text-amber-900/90 px-1">
              Заявка на складе — в работе.
              {data.pickingSentAt ? ` Отправлено: ${formatDateTime(data.pickingSentAt)}` : ''}
            </p>
          ) : null}
          {canEdit && warehouseMeta.tone === 'recall' ? (
            <p className="text-[12px] text-slate-600 px-1">
              Проверьте позиции и отправьте на сборку снова.
            </p>
          ) : null}
        </div>
      ) : isActivePicking ? (
        <div className="shipment-print-no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="font-semibold">Заявка на складе — в работе</div>
          <p className="mt-1 text-[13px] leading-snug text-amber-900/90">
            Кладовщики видят заказ в «Отгрузки» → «Сборка».
            {data.pickingSentAt ? (
              <span className="block mt-1 text-[12px] text-amber-800/80">
                Отправлено: {formatDateTime(data.pickingSentAt)}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      {data.refLinkSummary ? (
        <div
          className={`shipment-print-no-print mb-4 rounded-lg border px-4 py-3 text-sm ${
            data.refLinkSummary.notFound > 0
              ? 'border-red-200 bg-red-50 text-red-950'
              : 'border-slate-200 bg-slate-50 text-slate-800'
          }`}
        >
          <div className="font-semibold">
            REF → номенклатура: {data.refLinkSummary.linked} / {data.refLinkSummary.total}
          </div>
          {refHint ? <p className="mt-1 text-[13px] leading-snug opacity-90">{refHint}</p> : null}
        </div>
      ) : null}

      {isPicked ? (
        <div className="shipment-print-no-print mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <div className="font-semibold">Сборка завершена — требуется списание</div>
          <p className="mt-1 text-[13px] leading-snug text-violet-900/90">
            Нажмите «К списанию», выберите назначение и подтвердите расход по REF из этой отгрузки.
          </p>
        </div>
      ) : null}

      {isDispatched ? (
        <div className="shipment-print-no-print mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <div className="font-semibold">Отгрузка закрыта</div>
          <p className="mt-1 text-[13px] leading-snug text-emerald-900/90">
            Товар списан со склада
            {data.writeoffCompletedAt
              ? ` · ${formatDateTime(data.writeoffCompletedAt)}`
              : ''}
            . В движениях операции помечены как «Отгрузка → списано».
          </p>
        </div>
      ) : null}

      <div className="rounded border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            <div className="text-xs text-slate-500">Заказчик</div>
            <div className="text-base font-bold text-slate-900">{data.counterparty?.name ?? '—'}</div>
            <div className="mt-1 text-[11px] text-slate-600">
              ИНН: {data.counterparty?.inn ?? '—'} · КПП: {data.counterparty?.kpp ?? '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Контракт</div>
            <div className="font-mono text-sm font-bold text-slate-900">{data.contract?.number ?? '—'}</div>
            <div className="text-[11px] text-slate-600">{formatContractDate(data.contract?.date)}</div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded border-2 border-slate-300">
          <div className="max-h-[calc(100vh-280px)] overflow-auto">
            <table className="w-full min-w-[1200px] border-collapse bg-white text-[11px]">
              <colgroup>
                <col className="w-10" />
                <col style={{ minWidth: 280 }} />
                <col className="w-24" />
                <col className="w-12" />
                <col className="w-16" />
                <col className="w-14" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-26" />
                <col style={{ minWidth: 180 }} />
              </colgroup>
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr>
                  <th rowSpan={2} className={`${thBase} text-center`}>
                    №
                  </th>
                  <th rowSpan={2} className={`${thBase} text-left`}>
                    Наименование
                  </th>
                  <th rowSpan={2} className={`${thBase} text-left`}>
                    REF
                  </th>
                  <th rowSpan={2} className={`${thBase} text-center`}>
                    Ед.
                  </th>
                  <th rowSpan={2} className={`${thBase} text-right`}>
                    Кол-во
                  </th>
                  <th colSpan={6} className={`${thBase} bg-amber-100/90 text-center`}>
                    НДС и суммы
                  </th>
                  <th rowSpan={2} className={`${thBase} bg-blue-100/90 text-left align-middle`}>
                    Комментарий менеджера
                  </th>
                </tr>
                <tr>
                  <th className={`${thBase} bg-amber-50 text-center`}>Ставка</th>
                  <th className={`${thBase} bg-amber-50 text-right`}>Цена без НДС</th>
                  <th className={`${thBase} bg-amber-50 text-right`}>Цена с НДС</th>
                  <th className={`${thBase} bg-amber-50 text-right`}>Сумма без НДС</th>
                  <th className={`${thBase} bg-amber-50 text-right`}>Сумма НДС</th>
                  <th className={`${thBase} bg-amber-50 text-right`}>Сумма с НДС</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, rowIdx) => {
                  const p = parseNumeric(it.priceWithVat);
                  const q = parseNumeric(it.quantity);
                  const r = parseVatRatePercent(it.vatRate);
                  const c = calcVat(p, q, r);
                  const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  return (
                    <tr key={`${it.lineNo}-${rowIdx}`} className={rowBg}>
                      <td className={`${tdBase} text-center font-mono font-semibold text-slate-700`}>{rowIdx + 1}</td>
                      <td className={`${tdBase} text-slate-900 leading-snug`}>{it.name}</td>
                      <td className={`${tdBase} text-slate-800`}>
                        <div className="font-mono">{it.code ?? ''}</div>
                        {it.refLinkStatus ? (
                          <div className="mt-1">
                            <ShipmentRefLinkBadge
                              status={it.refLinkStatus}
                              productId={it.productId}
                              productRef={it.productRef}
                              compact
                            />
                          </div>
                        ) : null}
                      </td>
                      <td className={`${tdBase} text-center font-mono text-slate-700`}>{it.unit ?? ''}</td>
                      <td className={`${tdBase} text-right font-mono font-semibold text-slate-900`}>{it.quantity}</td>
                      <td className={`${tdBase} bg-amber-50/40 text-center font-mono text-slate-700`}>{it.vatRate ?? '—'}</td>
                      <td className={`${tdBase} bg-amber-50/40 text-right font-mono tabular-nums text-slate-800`}>
                        {formatMoney(c.priceWithout)}
                      </td>
                      <td className={`${tdBase} bg-amber-50/40 text-right font-mono tabular-nums text-slate-800`}>
                        {normalizeMoneyString(it.priceWithVat)}
                      </td>
                      <td className={`${tdBase} bg-amber-50/40 text-right font-mono tabular-nums text-slate-800`}>
                        {formatMoney(c.sumWithout)}
                      </td>
                      <td className={`${tdBase} bg-amber-50/40 text-right font-mono tabular-nums text-slate-800`}>
                        {formatMoney(c.sumVat)}
                      </td>
                      <td className={`${tdBase} bg-amber-50/40 text-right font-mono tabular-nums font-semibold text-slate-900`}>
                        {formatMoney(c.sumWith)}
                      </td>
                      <td className={`${tdBase} bg-blue-50/30 text-slate-700 whitespace-pre-wrap`}>{it.managerNote ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 font-bold">
                  <td colSpan={8} className={`${tdBase} text-right uppercase tracking-wide text-slate-700`}>
                    Итого
                  </td>
                  <td className={`${tdBase} bg-amber-100/80 text-right font-mono tabular-nums`}>
                    {formatMoney(totals.sumWithout)}
                  </td>
                  <td className={`${tdBase} bg-amber-100/80 text-right font-mono tabular-nums`}>
                    {formatMoney(totals.sumVat)}
                  </td>
                  <td className={`${tdBase} bg-amber-100/80 text-right font-mono tabular-nums`}>
                    {formatMoney(totals.sumWith)}
                  </td>
                  <td className={tdBase} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {canEdit ? (
          <p className="shipment-print-no-print mt-3 text-xs text-slate-500">
            Проверьте позиции и нажмите «Отправить в сборку на склад» — после этого редактирование будет недоступно.
            Изменить состав можно только в статусе «Новый» через список «Отгрузки».
          </p>
        ) : null}
      </div>
      </div>

      <div className="shipment-print-no-print">
      <ConfirmDialog
        open={confirmSendOpen}
        title="Отправить на сборку?"
        message={`Заявка по заказчику «${customerName}» уйдёт кладовщикам. Они увидят её в «Отгрузки» → «Сборка» и получат уведомление. После отправки состав заказа изменить нельзя.${
          data.refLinkSummary && data.refLinkSummary.notFound > 0
            ? ` Внимание: ${data.refLinkSummary.notFound} REF не найдены в номенклатуре — корзина списания будет неполной.`
            : ''
        }`}
        confirmLabel="Отправить на склад"
        confirmClassName="bg-blue-700 hover:bg-blue-800"
        confirmDisabled={sending}
        onCancel={() => setConfirmSendOpen(false)}
        onConfirm={() => void confirmSendToWarehouse()}
      />

      <ShipmentWarehouseActionDialog
        open={warehouseAction != null}
        kind={warehouseAction ?? 'pause'}
        customerName={customerName}
        saving={warehouseSaving}
        onCancel={() => setWarehouseAction(null)}
        onConfirm={(comment) => void submitWarehouseAction(comment)}
      />

      <ShipmentPickingCompleteDialog
        open={completeOpen}
        customerName={customerName}
        saving={completeSaving}
        onCancel={() => setCompleteOpen(false)}
        onConfirm={(outcome, comment) => void submitPickingComplete(outcome, comment)}
      />

      <ShipmentWriteoffNavigateDialog
        open={writeoffDialogOpen}
        shipmentId={data.id}
        customerName={customerName}
        linkedCount={data.refLinkSummary?.linked ?? 0}
        totalCount={data.refLinkSummary?.total ?? data.items.length}
        onCancel={() => setWriteoffDialogOpen(false)}
        onConfirm={goToWriteoffCart}
      />
      </div>
    </div>
  );
}

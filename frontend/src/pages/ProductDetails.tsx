import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, QrCode, Factory, Activity, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { toast } from 'sonner';
import ProductFormDialog from '../components/products/ProductFormDialog';
import { fetchProduct } from '../lib/api/products';
import { fetchLots } from '../lib/api/lots';
import { fetchMovements } from '../lib/api/movements';
import type { LotListItem, MovementListItem, ProductDetail } from '../types/api';
import { ApiError } from '../lib/api/client';
import { canEditProduct } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';
import { loadSettings } from '../lib/settings/storage';

type LotRow = {
  lotArea: string;
  lot: string;
  mfgDate: string;
  expiryDate: string;
  qty: number;
  status: string;
};

const TABS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'lots', label: 'Партии' },
  { id: 'movements', label: 'Движения' },
  { id: 'expiry', label: 'Сроки' },
  { id: 'writeoff', label: 'Списания' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const [tab, setTab] = useState<TabId>('overview');
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [lotsRaw, setLotsRaw] = useState<LotListItem[]>([]);
  const [lotsData, setLotsData] = useState<LotRow[]>([]);
  const [movementData, setMovementData] = useState<MovementListItem[]>([]);
  const [writeoffData, setWriteoffData] = useState<MovementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadProductCard = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [productRes, lotsRes, movementsRes] = await Promise.all([
        fetchProduct(id),
        fetchLots({ productId: id, fefo: true, pageSize: 100 }),
        fetchMovements({ productId: id, pageSize: 50 }),
      ]);
      setProduct(productRes);
      setLotsRaw(lotsRes.items);
      setLotsData(
        lotsRes.items.map((lot: LotListItem) => ({
          lotArea: lot.location ?? '—',
          lot: lot.lot,
          mfgDate: '—',
          expiryDate: lot.expiryDate ?? 'Н/Д',
          qty: lot.qty,
          status: lot.status,
        })),
      );
      setMovementData(movementsRes.items);
      setWriteoffData(movementsRes.items.filter((m) => m.type === 'РАСХОД'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить карточку');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadProductCard();
  }, [loadProductCard]);

  const blockedCount = lotsRaw.filter((l) => l.status === 'БЛОК').length;
  const quarantineCount = lotsRaw.filter((l) => l.status === 'КАРАНТИН').length;
  const fefoLot = lotsRaw[0];

  const lotsColDef = useMemo<ColDef<LotRow>[]>(
    () => [
      { field: 'lot', headerName: 'LOT / ПАРТИЯ', width: 140, cellClass: 'font-mono text-[11px] font-bold text-slate-700' },
      { field: 'lotArea', headerName: 'ЯЧЕЙКА / ЛОКАЦИЯ', flex: 1, minWidth: 120, cellClass: 'text-xs' },
      {
        field: 'qty',
        headerName: 'ОСТАТОК',
        width: 110,
        type: 'numericColumn',
        cellClass: 'font-mono font-bold text-slate-900',
        valueFormatter: (p) => (p.value as number).toLocaleString('ru-RU'),
      },
      { field: 'expiryDate', headerName: 'ГОДЕН ДО', width: 120, cellClass: 'text-[11px] font-mono' },
      {
        field: 'status',
        headerName: 'СТАТУС',
        width: 100,
        cellRenderer: (params: ICellRendererParams<LotRow>) => {
          const s = params.value as string;
          const color =
            s === 'ОК'
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : s === 'КАРАНТИН' || s === 'БЛОК'
                ? 'text-red-700 bg-red-50 border-red-200'
                : 'text-amber-700 bg-amber-50 border-amber-200';
          return (
            <div className="flex items-center h-full">
              <span className={`px-1.5 py-0.5 border rounded text-[8px] uppercase tracking-wider font-bold ${color}`}>{s}</span>
            </div>
          );
        },
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({ sortable: true, resizable: true, suppressMovable: true }),
    [],
  );

  if (loading || !product) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-500 font-semibold">
        Загрузка карточки товара...
      </div>
    );
  }

  const nearestExpiryDays =
    product.nearestExpiry !== 'Н/Д'
      ? Math.ceil((new Date(product.nearestExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : null;

  const settings = loadSettings();

  return (
    <div className="h-full flex flex-col gap-4 max-w-screen-2xl mx-auto min-h-0">
      <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-slate-300">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/products')}
            className="h-8 w-8 bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-none">{product.name}</h2>
              <span className="px-2 py-0.5 border border-slate-300 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-600 leading-none">
                <span className="text-slate-400 font-sans font-semibold mr-1">REF</span>
                {product.ref}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              <span className="flex items-center gap-1">
                <Factory className="w-3 h-3" /> {product.manufacturer ?? '—'}
              </span>
              <span className="flex items-center gap-1">
                <QrCode className="w-3 h-3" /> {product.barcode ?? '—'}
              </span>
            </div>
          </div>
        </div>
        {canEditProduct(userRole) && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => setEditOpen(true)}
          >
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Редактировать
          </Button>
        )}
      </div>

      <div className="flex gap-1 bg-white border border-slate-300 rounded p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid gap-4 md:grid-cols-4 shrink-0">
            <div className="bg-white border border-slate-300 rounded p-3 shadow-sm">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Суммарный остаток</div>
              <div className="text-2xl font-bold font-mono tracking-tight text-blue-700">
                {product.qty.toLocaleString('ru-RU')} <span className="text-xs text-slate-500 font-sans font-normal ml-1">шт</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">По {product.lots} партиям</div>
            </div>
            <div className="bg-white border border-slate-300 rounded p-3 shadow-sm border-t-2 border-t-amber-400">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ближайший срок</div>
              <div className="text-xl font-bold font-mono tracking-tight text-slate-800">
                {nearestExpiryDays != null ? `${nearestExpiryDays} ДН` : 'Н/Д'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1 font-mono">{product.nearestExpiry}</div>
            </div>
            <div className="bg-white border border-slate-300 rounded p-3 shadow-sm">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">FEFO рекомендация</div>
              <div className="text-sm font-mono font-bold text-emerald-700">
                {fefoLot ? fefoLot.lot : '—'}
              </div>
              {settings.uiShowFefoHints && fefoLot && (
                <div className="text-[10px] text-slate-500 mt-1">Списывать в первую очередь</div>
              )}
            </div>
            <div className="bg-white border border-slate-300 rounded p-3 shadow-sm">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                Ограничения
              </div>
              <div className="text-xs font-bold text-slate-700">
                Карантин: {quarantineCount} · Блок: {blockedCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Статус: {product.status}</div>
            </div>
          </div>
        </>
      )}

      {tab === 'lots' && (
        <div className="flex-1 bg-white border border-slate-300 rounded shadow-sm flex flex-col min-h-[300px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center">
            <Box className="w-4 h-4 mr-2 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Партии (LOT)</h3>
          </div>
          <div className="flex-1 relative min-h-[200px]">
            <div
              className="ag-theme-quartz absolute inset-0"
              style={
                {
                  '--ag-header-background-color': '#f8fafc',
                  '--ag-font-size': '11px',
                } as CSSProperties
              }
            >
              <AgGridReact
                theme="legacy"
                rowData={lotsData}
                columnDefs={lotsColDef}
                defaultColDef={defaultColDef}
                rowHeight={36}
                headerHeight={32}
                onGridReady={(params: GridReadyEvent) => params.api.sizeColumnsToFit()}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'movements' && (
        <div className="bg-white border border-slate-300 rounded shadow-sm p-4">
          <Activity className="w-4 h-4 inline mr-2 text-blue-600" />
          <span className="text-xs font-bold uppercase text-slate-700">Все движения</span>
          <div className="mt-4 space-y-3">
            {movementData.map((mv) => (
              <div key={mv.id} className="flex justify-between border-b border-slate-100 pb-2 text-xs">
                <span className="font-bold">{mv.type}</span>
                <span className="font-mono">{mv.qty}</span>
                <span className="text-slate-400">{mv.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'expiry' && (
        <div className="bg-white border border-slate-300 rounded p-4">
          <div className="space-y-2">
            {lotsRaw
              .filter((l) => l.expiryDate)
              .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))
              .map((l) => {
                const days = l.expiryDate
                  ? Math.ceil((new Date(l.expiryDate).getTime() - Date.now()) / 86400000)
                  : null;
                const color =
                  days != null && days < 0
                    ? 'text-red-700 bg-red-50'
                    : days != null && days < settings.expiryCriticalDays
                      ? 'text-orange-700 bg-orange-50'
                      : days != null && days < settings.expiryWarningDays
                        ? 'text-amber-700 bg-amber-50'
                        : 'text-slate-700';
                return (
                  <div key={l.id} className={`flex justify-between p-2 rounded border ${color}`}>
                    <span className="font-mono font-bold text-xs">{l.lot}</span>
                    <span className="text-xs">{l.expiryDate}</span>
                    <span className="text-xs font-bold">{days} дн.</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {tab === 'writeoff' && (
        <div className="bg-white border border-slate-300 rounded p-4">
          {writeoffData.length === 0 ? (
            <p className="text-xs text-slate-400">Списаний нет</p>
          ) : (
            writeoffData.map((mv) => (
              <div key={mv.id} className="flex justify-between border-b border-slate-100 py-2 text-xs">
                <span className="font-mono">{mv.id}</span>
                <span className="font-bold text-red-600">{mv.qty}</span>
                <span>{mv.lot ?? '—'}</span>
                <span className="text-slate-400">{mv.date}</span>
              </div>
            ))
          )}
        </div>
      )}

      <ProductFormDialog open={editOpen} product={product} onClose={() => setEditOpen(false)} onSaved={loadProductCard} />
    </div>
  );
}

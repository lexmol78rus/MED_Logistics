import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { Boxes, Search, ShieldAlert, Ban, ChevronLeft, ChevronRight, ShieldCheck, Filter, Download } from 'lucide-react';
import FilterDrawer from '../components/filters/FilterDrawer';
import { downloadExport } from '../lib/export/download';
import { canExport } from '../lib/rbac/permissions';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchLots, updateLotStatus } from '../lib/api/lots';
import type { LotListItem } from '../types/api';
import { ApiError } from '../lib/api/client';
import { canManageLotStatus } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';

const STATUS_FILTERS = [
  { value: '', label: 'Все статусы' },
  { value: 'ОК', label: 'ОК' },
  { value: 'ВНИМАНИЕ', label: 'ВНИМАНИЕ' },
  { value: 'КАРАНТИН', label: 'КАРАНТИН' },
  { value: 'БЛОК', label: 'БЛОК' },
];

function expiryCellClass(expiryDate: string | null): string {
  if (!expiryDate) return 'font-mono text-xs text-slate-500';
  const diff = new Date(expiryDate).getTime() - Date.now();
  if (diff < 30 * 24 * 60 * 60 * 1000) return 'font-mono text-xs text-red-600 font-bold bg-red-50';
  if (diff < 90 * 24 * 60 * 60 * 1000) return 'font-mono text-xs text-amber-700 font-bold bg-amber-50';
  return 'font-mono text-xs text-slate-700';
}

export default function Lots() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const showLotActions = canManageLotStatus(userRole);
  const gridRef = useRef<AgGridReact<LotListItem>>(null);
  const [searchParams] = useSearchParams();
  const productIdFilter = searchParams.get('productId') ?? '';
  const urlSearch = searchParams.get('search') ?? '';
  const [searchText, setSearchText] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiryWindow, setExpiryWindow] = useState('');
  const [quarantinedOnly, setQuarantinedOnly] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    status: '',
    expiryWindow: '',
    quarantined: false,
    blocked: false,
  });
  const [fefoEnabled, setFefoEnabled] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [rowData, setRowData] = useState<LotListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLotId, setActionLotId] = useState<string | null>(null);

  useEffect(() => {
    if (urlSearch) setSearchText(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadLots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLots({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        fefo: fefoEnabled,
        productId: productIdFilter || undefined,
        status: appliedFilters.status || undefined,
        expiryWindow: appliedFilters.expiryWindow || undefined,
        quarantined: appliedFilters.quarantined || undefined,
        blocked: appliedFilters.blocked || undefined,
      });
      setRowData(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить партии');
      setRowData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, fefoEnabled, productIdFilter, appliedFilters]);

  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, appliedFilters, fefoEnabled, productIdFilter]);

  const handleStatus = useCallback(async (lot: LotListItem, status: 'QUARANTINE' | 'BLOCKED' | 'OK') => {
    setActionLotId(lot.id);
    try {
      await updateLotStatus(lot.id, { status });
      toast.success(
        status === 'QUARANTINE'
          ? 'Партия отправлена в карантин'
          : status === 'BLOCKED'
            ? 'Партия заблокирована'
            : 'Партия разблокирована',
      );
      await loadLots();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка изменения статуса');
    } finally {
      setActionLotId(null);
    }
  }, [loadLots]);

  const columnDefs = useMemo<ColDef<LotListItem>[]>(() => [
    { field: 'fefoRank', headerName: 'FEFO', width: 70, cellClass: 'font-mono text-xs font-bold text-blue-700 text-center' },
    { field: 'ref', headerName: 'REF', width: 120, cellClass: 'font-mono text-xs font-bold text-slate-600' },
    { field: 'productName', headerName: 'НОМЕНКЛАТУРА', flex: 1, minWidth: 180, cellClass: 'font-medium text-slate-800 text-xs' },
    { field: 'lot', headerName: 'LOT / ПАРТИЯ', width: 130, cellClass: 'font-mono text-xs font-bold' },
    {
      field: 'expiryDate',
      headerName: 'ГОДЕН ДО',
      width: 120,
      valueFormatter: (p) => (p.value as string | null) ?? 'Н/Д',
      cellClass: (params) => expiryCellClass(params.value as string | null),
    },
    {
      field: 'qty',
      headerName: 'ОСТАТОК',
      width: 100,
      type: 'numericColumn',
      cellClass: 'font-mono font-bold',
      valueFormatter: (p) => (p.value as number).toLocaleString('ru-RU'),
    },
    { field: 'location', headerName: 'ЛОКАЦИЯ', width: 120, cellClass: 'text-xs text-slate-600', valueFormatter: (p) => (p.value as string | null) ?? '—' },
    {
      field: 'status',
      headerName: 'СТАТУС',
      width: 110,
      cellRenderer: (params: ICellRendererParams<LotListItem>) => {
        const s = params.value as string;
        let cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s === 'КАРАНТИН') cls = 'bg-amber-50 text-amber-800 border-amber-200';
        if (s === 'БЛОК') cls = 'bg-red-50 text-red-700 border-red-200';
        if (s === 'ВНИМАНИЕ') cls = 'bg-amber-50 text-amber-700 border-amber-200';
        return (
          <span className={`px-1.5 py-0.5 border rounded text-[8px] font-bold uppercase ${cls}`}>{s}</span>
        );
      },
    },
    ...(showLotActions
      ? [{
      headerName: 'ДЕЙСТВИЯ',
      width: 260,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<LotListItem>) => {
        const lot = params.data;
        if (!lot) return null;
        const busy = actionLotId === lot.id;
        const canUnblock = lot.status === 'КАРАНТИН' || lot.status === 'БЛОК';
        return (
          <div className="flex items-center gap-1 h-full">
            {canUnblock ? (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[9px] px-1.5 border-emerald-200 text-emerald-700"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleStatus(lot, 'OK');
                }}
              >
                <ShieldCheck className="w-3 h-3 mr-0.5" />
                Разблок.
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[9px] px-1.5"
                  disabled={busy || lot.status === 'КАРАНТИН'}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleStatus(lot, 'QUARANTINE');
                  }}
                >
                  <ShieldAlert className="w-3 h-3 mr-0.5" />
                  Карантин
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[9px] px-1.5 border-red-200 text-red-700"
                  disabled={busy || lot.status === 'БЛОК'}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleStatus(lot, 'BLOCKED');
                  }}
                >
                  <Ban className="w-3 h-3 mr-0.5" />
                  Блок
                </Button>
              </>
            )}
          </div>
        );
      },
    }]
      : []),
  ], [actionLotId, handleStatus, showLotActions]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: true,
  }), []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const gridThemeStyle = { '--ag-font-size': '12px' } as CSSProperties;

  return (
    <div className="h-full flex flex-col max-w-screen-2xl mx-auto gap-4">
      <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 text-violet-700 rounded">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-800">Управление партиями</h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
              {fefoEnabled ? 'Сортировка FEFO' : 'По дате создания'} · контроль сроков
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Партии = конкретные поставки и производственные LOT</p>
          </div>
        </div>
        {canExport(userRole) && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold bg-slate-50 border-slate-300"
            onClick={() => downloadExport('lots').catch(() => toast.error('Ошибка экспорта'))}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Экспорт CSV
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col bg-white border border-slate-300 rounded shadow-sm overflow-hidden min-h-0">
        <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
          <div className="relative w-80 flex">
            <div className="pl-3 py-1.5 bg-slate-200 border border-slate-300 border-r-0 rounded-l flex items-center text-slate-500">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              placeholder="Поиск по LOT / Партии, REF, наименованию..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-r focus:outline-none focus:border-blue-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="w-3.5 h-3.5 mr-1" />
            Фильтры
          </Button>
          <label className="flex items-center gap-1.5 h-8 px-2 text-xs border border-slate-300 rounded bg-white cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={fefoEnabled}
              onChange={(e) => setFefoEnabled(e.target.checked)}
            />
            <Filter className="w-3 h-3 text-slate-500" />
            FEFO
          </label>
          {productIdFilter && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 border border-violet-200 rounded px-2 py-1">
              Фильтр по товару
            </span>
          )}
        </div>

        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs font-semibold text-slate-500">
              Загрузка...
            </div>
          )}
          <div className="ag-theme-quartz absolute inset-0" style={gridThemeStyle}>
            <AgGridReact
              theme="legacy"
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={44}
              headerHeight={36}
              onGridReady={(e: GridReadyEvent) => e.api.sizeColumnsToFit()}
            />
          </div>
        </div>

        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Показано {rowData.length} из {total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-semibold">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <FilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        activeCount={
          [appliedFilters.status, appliedFilters.expiryWindow, appliedFilters.quarantined, appliedFilters.blocked].filter(Boolean).length
        }
        onApply={() => {
          setAppliedFilters({
            status: statusFilter,
            expiryWindow,
            quarantined: quarantinedOnly,
            blocked: blockedOnly,
          });
          setFiltersOpen(false);
        }}
        onReset={() => {
          setStatusFilter('');
          setExpiryWindow('');
          setQuarantinedOnly(false);
          setBlockedOnly(false);
          setAppliedFilters({ status: '', expiryWindow: '', quarantined: false, blocked: false });
        }}
      >
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Статус</label>
          <select
            className="w-full h-8 mt-1 text-sm border border-slate-300 rounded px-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Срок годности</label>
          <select
            className="w-full h-8 mt-1 text-sm border border-slate-300 rounded px-2"
            value={expiryWindow}
            onChange={(e) => setExpiryWindow(e.target.value)}
          >
            <option value="">Любой</option>
            <option value="expired">Просрочено</option>
            <option value="lt30">Менее 30 дней</option>
            <option value="lt90">30–90 дней</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={quarantinedOnly} onChange={(e) => setQuarantinedOnly(e.target.checked)} />
          Только карантин
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} />
          Только блокировка
        </label>
      </FilterDrawer>
    </div>
  );
}

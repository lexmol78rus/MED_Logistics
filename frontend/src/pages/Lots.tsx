import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  COMPACT_GRID_HEADER_HEIGHT,
  COMPACT_GRID_ROW_HEIGHT,
  centeredColumnDef,
  GRID_FLEX_WIDE,
  badgeColumnDef,
  compactColumnDef,
  compactGridThemeStyle,
  createDefaultColDef,
  flexTextColumnDef,
  listGridClassName,
  primaryTextColumnDef,
  refColumnDef,
  sharedGridOptions,
  stockQtyColumnDef,
} from '../lib/agGrid/gridPreset';
import { Button } from '@/components/ui/button';
import { Boxes, Search, Filter, Download } from 'lucide-react';
import FilterDrawer from '../components/filters/FilterDrawer';
import { downloadExport } from '../lib/export/download';
import { canExport } from '../lib/rbac/permissions';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchLots } from '../lib/api/lots';
import type { LotListItem } from '../types/api';
import { ApiError } from '../lib/api/client';
import { MAX_PAGE_SIZE } from '../lib/pagination';
import { SHOW_WAREHOUSE_LOCATIONS } from '../lib/pilotFeatures';
import { getExpiryThresholds, isExpiryCritical, isExpiryWarning } from '../lib/expiry/thresholds';
import { useUserStore } from '../stores/userStore';

const STATUS_FILTERS = [
  { value: '', label: 'Все статусы' },
  { value: 'ОК', label: 'ОК' },
  { value: 'ВНИМАНИЕ', label: 'ВНИМАНИЕ' },
  { value: 'КАРАНТИН', label: 'КАРАНТИН' },
  { value: 'БЛОК', label: 'БЛОК' },
];

function ProductLinkCell({
  params,
  label,
  onNavigate,
}: {
  params: ICellRendererParams<LotListItem>;
  label: string;
  onNavigate: (productId: string) => void;
}) {
  const row = params.data;
  if (!row?.productId) return label;
  return (
    <button
      type="button"
      className="inline-block max-w-full truncate text-xs font-medium text-blue-700 hover:underline text-left cursor-pointer"
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(row.productId);
      }}
    >
      {label}
    </button>
  );
}

function expiryCellClass(expiryDate: string | null): string {
  if (!expiryDate) return 'font-mono text-xs text-slate-500';
  if (isExpiryCritical(expiryDate)) return 'font-mono text-xs text-red-600 font-bold bg-red-50';
  if (isExpiryWarning(expiryDate)) return 'font-mono text-xs text-amber-700 font-bold bg-amber-50';
  return 'font-mono text-xs text-slate-700';
}

export default function Lots() {
  const expiryThresholds = getExpiryThresholds();
  const navigate = useNavigate();
  const userRole = useUserStore((s) => s.user?.role ?? null);
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
  const [rowData, setRowData] = useState<LotListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
        page: 1,
        pageSize: MAX_PAGE_SIZE,
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
  }, [debouncedSearch, fefoEnabled, productIdFilter, appliedFilters]);

  useEffect(() => {
    void loadLots();
  }, [loadLots]);

  const columnDefs = useMemo<ColDef<LotListItem>[]>(() => [
    centeredColumnDef({
      field: 'fefoRank',
      headerName: 'FEFO',
      flex: 0.4,
      minWidth: 56,
      maxWidth: 72,
      cellClass: 'font-mono text-xs font-bold text-blue-700',
    }),
    refColumnDef({
      field: 'ref',
      headerName: 'REF',
      minWidth: 170,
      cellClass: 'font-mono text-xs font-bold text-slate-600',
    }),
    primaryTextColumnDef({
      field: 'productName',
      headerName: 'НОМЕНКЛАТУРА',
      minWidth: 260,
      cellClass: 'ag-cell-link',
      cellRenderer: (params: ICellRendererParams<LotListItem>) => (
        <ProductLinkCell
          params={params}
          label={String(params.value ?? '')}
          onNavigate={(productId) => navigate(`/products/${productId}`)}
        />
      ),
    }),
    flexTextColumnDef({
      field: 'lot',
      headerName: 'LOT / ПАРТИЯ',
      minWidth: 130,
      cellClass: 'font-mono text-xs font-bold',
    }, GRID_FLEX_WIDE),
    compactColumnDef({
      field: 'expiryDate',
      headerName: 'ГОДЕН ДО',
      minWidth: 120,
      valueFormatter: (p) => (p.value as string | null) ?? 'Н/Д',
      cellClass: (params) => expiryCellClass(params.value as string | null),
    }),
    stockQtyColumnDef('qty'),
    ...(SHOW_WAREHOUSE_LOCATIONS
      ? [flexTextColumnDef({
          field: 'location' as const,
          headerName: 'АДРЕС ЯЧЕЙКИ',
          minWidth: 132,
          cellClass: 'text-xs text-slate-600',
          valueFormatter: (p: { value: unknown }) => (p.value as string | null) ?? '—',
        })]
      : []),
    badgeColumnDef({
      field: 'status',
      headerName: 'СТАТУС',
      minWidth: 120,
      filter: false,
      cellRenderer: (params: ICellRendererParams<LotListItem>) => {
        const s = params.value as string;
        let cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s === 'КАРАНТИН') cls = 'bg-amber-50 text-amber-800 border-amber-200';
        if (s === 'БЛОК') cls = 'bg-red-50 text-red-700 border-red-200';
        if (s === 'ВНИМАНИЕ') cls = 'bg-amber-50 text-amber-700 border-amber-200';
        return (
          <div className="flex items-center h-full w-full min-w-0 overflow-hidden">
            <span className={`shrink-0 px-1.5 py-0.5 border rounded text-[8px] font-bold uppercase whitespace-nowrap ${cls}`}>{s}</span>
          </div>
        );
      },
    }),
  ], [navigate]);

  const defaultColDef = useMemo(() => createDefaultColDef(), []);

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

        <div className="flex-1 w-full min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs font-semibold text-slate-500">
              Загрузка...
            </div>
          )}
          <div className={`${listGridClassName} absolute inset-0`} style={compactGridThemeStyle}>
            <AgGridReact
              {...sharedGridOptions}
              theme="legacy"
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={COMPACT_GRID_ROW_HEIGHT}
              headerHeight={COMPACT_GRID_HEADER_HEIGHT}
            />
          </div>
        </div>

        <div className="shrink-0 px-3 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <span>
            Показано {rowData.length} из {total}
            {total > MAX_PAGE_SIZE ? ` (загружено до ${MAX_PAGE_SIZE})` : ''}
          </span>
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
            <option value="lt30">Менее {expiryThresholds.criticalDays} дней</option>
            <option value="lt90">
              {expiryThresholds.criticalDays}–{expiryThresholds.warningDays} дней
            </option>
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

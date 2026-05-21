import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  COMPACT_GRID_HEADER_HEIGHT,
  COMPACT_GRID_ROW_HEIGHT,
  GRID_NUMERIC_COLUMN_WIDTH,
  compactGridClassName,
  compactGridThemeStyle,
  createDefaultColDef,
  numericColumnDef,
  sharedGridOptions,
} from '../lib/agGrid/gridPreset';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Search, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import FilterDrawer from '../components/filters/FilterDrawer';
import { downloadExport } from '../lib/export/download';
import { canExport } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';
import { toast } from 'sonner';
import { fetchMovements } from '../lib/api/movements';
import { fetchWriteoffDestinations } from '../lib/api/writeoff-destinations';
import type { WriteoffDestinationItem } from '../lib/api/writeoff-destinations';
import type { MovementListItem } from '../types/api';
import { ApiError } from '../lib/api/client';

const MOVEMENT_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'RECEIPT', label: 'ПРИХОД' },
  { value: 'ISSUE', label: 'РАСХОД' },
  { value: 'QUARANTINE', label: 'КАРАНТИН' },
  { value: 'UNBLOCK', label: 'РАЗБЛОКИРОВКА' },
  { value: 'ADJUSTMENT', label: 'КОРРЕКТИРОВКА' },
];

function typeBadgeClass(type: string): string {
  switch (type) {
    case 'ПРИХОД':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'РАСХОД':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'КАРАНТИН':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'РАЗБЛОКИРОВКА':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'КОРРЕКТИРОВКА':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function qtyClass(qty: string): string {
  if (qty.startsWith('+')) return 'font-mono text-xs font-bold text-emerald-600';
  if (qty.startsWith('-')) return 'font-mono text-xs font-bold text-red-600';
  return 'font-mono text-xs font-bold text-slate-600';
}

export default function Movements() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const gridRef = useRef<AgGridReact<MovementListItem>>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedOperator, setAppliedOperator] = useState('');
  const [appliedDestinationId, setAppliedDestinationId] = useState('');
  const [destinations, setDestinations] = useState<WriteoffDestinationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [rowData, setRowData] = useState<MovementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    void fetchWriteoffDestinations({ pageSize: 200 })
      .then((data) => setDestinations(data.items))
      .catch(() => setDestinations([]));
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMovements({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        type: typeFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        operator: appliedOperator || undefined,
        writeOffDestinationId: appliedDestinationId || undefined,
      });
      setRowData(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить движения');
      setRowData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, typeFilter, fromDate, toDate, appliedOperator, appliedDestinationId]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, fromDate, toDate, appliedOperator, appliedDestinationId]);

  const columnDefs = useMemo<ColDef<MovementListItem>[]>(() => [
    { field: 'id', headerName: 'ДОКУМЕНТ', width: 110, cellClass: 'font-mono text-xs font-bold text-blue-700' },
    { field: 'date', headerName: 'ДАТА / ВРЕМЯ', width: 150, cellClass: 'font-mono text-xs text-slate-600' },
    {
      field: 'type',
      headerName: 'ТИП',
      width: 130,
      cellRenderer: (params: ICellRendererParams<MovementListItem>) => {
        const type = params.value as string;
        return (
          <span className={`px-1.5 py-0.5 border rounded text-[8px] font-bold uppercase ${typeBadgeClass(type)}`}>
            {type}
          </span>
        );
      },
    },
    { field: 'ref', headerName: 'REF', width: 110, cellClass: 'font-mono text-xs' },
    { field: 'productName', headerName: 'НОМЕНКЛАТУРА', flex: 1, minWidth: 160, cellClass: 'text-xs font-medium' },
    { field: 'lot', headerName: 'LOT / ПАРТИЯ', width: 120, cellClass: 'font-mono text-xs', valueFormatter: (p) => (p.value as string | null) ?? '—' },
    numericColumnDef({
      field: 'qty',
      headerName: 'КОЛ-ВО',
      width: GRID_NUMERIC_COLUMN_WIDTH,
      valueFormatter: (p) => String(p.value ?? ''),
      cellClass: (params) => `ag-cell-movement-qty ${qtyClass(params.value as string)}`,
    }),
    { field: 'user', headerName: 'ОПЕРАТОР', width: 160, cellClass: 'text-xs text-slate-500' },
  ], []);

  const defaultColDef = useMemo(() => createDefaultColDef(), []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="h-full flex flex-col max-w-screen-2xl mx-auto gap-4">
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded shadow-sm border border-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-700 rounded">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-800">Движение товаров</h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">Журнал приходов, расходов и корректировок</p>
          </div>
        </div>
        {canExport(userRole) && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => downloadExport('movements').catch(() => toast.error('Ошибка экспорта'))}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Экспорт CSV
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col bg-white border border-slate-300 rounded shadow-sm overflow-hidden min-h-0">
        <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
          <div className="relative w-72 flex">
            <div className="pl-3 py-1.5 bg-slate-200 border border-slate-300 border-r-0 rounded-l flex items-center text-slate-500">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              placeholder="Поиск по документу, REF, LOT / Партии..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-r focus:outline-none focus:border-blue-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <select
            className="h-8 text-xs border border-slate-300 rounded px-2 bg-white"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="date"
            className="h-8 text-xs border border-slate-300 rounded px-2"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            title="С даты"
          />
          <input
            type="date"
            className="h-8 text-xs border border-slate-300 rounded px-2"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            title="По дату"
          />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setFiltersOpen(true)}>
            <Filter className="w-3.5 h-3.5 mr-1" />
            Фильтры
            {(appliedOperator || appliedDestinationId) && (
              <span className="ml-1 bg-blue-600 text-white rounded-full px-1 text-[9px]">!</span>
            )}
          </Button>
        </div>

        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          activeCount={(appliedOperator ? 1 : 0) + (appliedDestinationId ? 1 : 0)}
          onApply={() => {
            setAppliedOperator(operatorFilter.trim());
            setAppliedDestinationId(destinationFilter);
            setFiltersOpen(false);
          }}
          onReset={() => {
            setOperatorFilter('');
            setDestinationFilter('');
            setAppliedOperator('');
            setAppliedDestinationId('');
          }}
        >
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Назначение списания</label>
            <select
              className="w-full h-8 mt-1 px-2 text-sm border border-slate-300 rounded bg-white"
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
            >
              <option value="">Все назначения</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{!d.isActive ? ' (архив)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Оператор (email)</label>
            <input
              className="w-full h-8 mt-1 px-2 text-sm border border-slate-300 rounded"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              placeholder="operator@company.ru"
            />
          </div>
        </FilterDrawer>

        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs font-semibold text-slate-500">
              Загрузка...
            </div>
          )}
          <div className={`${compactGridClassName} absolute inset-0`} style={compactGridThemeStyle}>
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

        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>Показано {rowData.length} из {total}</span>
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
    </div>
  );
}

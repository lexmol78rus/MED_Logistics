import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, RowClassParams, RowClickedEvent } from 'ag-grid-community';
import {
  COMPACT_GRID_HEADER_HEIGHT,
  COMPACT_GRID_ROW_HEIGHT,
  compactColumnDef,
  compactGridClassName,
  compactGridThemeStyle,
  centeredColumnDef,
  createDefaultColDef,
  flexTextColumnDef,
  primaryTextColumnDef,
  sharedGridOptions,
} from '../lib/agGrid/gridPreset';
import { Button } from '@/components/ui/button';
import { ClipboardList, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAuditLogs } from '../lib/api/audit';
import { fetchUsers } from '../lib/api/users';
import { fetchProducts } from '../lib/api/products';
import { ApiError } from '../lib/api/client';
import { MAX_PAGE_SIZE } from '../lib/pagination';
import { CATEGORY_FILTERS, matchesCategoryFilter } from '../lib/audit/actionConfig';
import { enrichAuditRow } from '../lib/audit/presentAudit';
import type { AuditCategory, AuditLookups, EnrichedAuditRow } from '../lib/audit/types';
import { AuditActorCell } from '../components/audit/AuditActorCell';
import { AuditEventBadge } from '../components/audit/AuditEventBadge';
import { AuditDetailPanel } from '../components/audit/AuditDetailPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';

function descriptionCellClass(severity: EnrichedAuditRow['severity']): string {
  if (severity === 'danger') return 'text-xs text-red-800 font-medium';
  if (severity === 'warning') return 'text-xs text-amber-900';
  return 'text-xs text-slate-700';
}

function AuditPage() {
  const gridRef = useRef<AgGridReact<EnrichedAuditRow>>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [allRows, setAllRows] = useState<EnrichedAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lookups, setLookups] = useState<AuditLookups>({
    usersById: new Map(),
    productsById: new Map(),
  });
  const [selectedRow, setSelectedRow] = useState<EnrichedAuditRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    void Promise.all([
      fetchUsers({ page: 1, pageSize: 200 }).catch(() => ({ items: [] })),
      fetchProducts({ page: 1, pageSize: MAX_PAGE_SIZE }).catch(() => ({ items: [] })),
    ]).then(([usersRes, productsRes]) => {
      const usersById = new Map<string, { email: string; displayName: string | null }>();
      for (const u of usersRes.items ?? []) {
        if (!u?.id) continue;
        usersById.set(u.id, { email: u.email ?? '', displayName: u.displayName ?? null });
      }
      const productsById = new Map<string, { name: string; sku: string }>();
      for (const p of productsRes.items ?? []) {
        if (!p?.id) continue;
        productsById.set(p.id, { name: p.name ?? '', sku: p.sku ?? '' });
      }
      setLookups({ usersById, productsById });
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs({
        page: 1,
        pageSize: MAX_PAGE_SIZE,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setTotal(data.total ?? 0);
      const items = Array.isArray(data.items) ? data.items : [];
      setAllRows(items.map((item) => enrichAuditRow(item, lookups)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить журнал аудита');
      setAllRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, lookups]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const rows = Array.isArray(allRows) ? allRows : [];
    return rows.filter((row) => {
      if (!row?.raw) return false;
      if (!matchesCategoryFilter(row.raw.action, categoryFilter)) return false;
      if (debouncedSearch && !(row.searchText ?? '').includes(debouncedSearch)) return false;
      return true;
    });
  }, [allRows, categoryFilter, debouncedSearch]);

  useEffect(() => {
    if (selectedRow && !filteredRows.some((r) => r.raw.id === selectedRow.raw.id)) {
      setSelectedRow(null);
    }
  }, [filteredRows, selectedRow]);

  const columnDefs = useMemo<ColDef<EnrichedAuditRow>[]>(
    () => [
      compactColumnDef({
        field: 'dateLabel',
        headerName: 'ДАТА',
        minWidth: 110,
        maxWidth: 150,
        sortable: true,
        comparator: (_a, _b, nodeA, nodeB) =>
          new Date(nodeA.data?.raw.createdAt ?? 0).getTime() -
          new Date(nodeB.data?.raw.createdAt ?? 0).getTime(),
        cellClass: 'font-mono text-xs text-slate-600',
      }),
      centeredColumnDef({
        field: 'category',
        headerName: 'ТИП',
        flex: 0.7,
        minWidth: 100,
        maxWidth: 130,
        filter: false,
        sortable: true,
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        cellRenderer: (params: ICellRendererParams<EnrichedAuditRow>) => (
          <AuditEventBadge category={params.data?.category ?? 'other'} />
        ),
      }),
      flexTextColumnDef({
        field: 'actionLabel',
        headerName: 'СОБЫТИЕ',
        minWidth: 120,
        maxWidth: 180,
        cellClass: 'text-xs font-semibold text-slate-800',
      }),
      primaryTextColumnDef({
        field: 'description',
        headerName: 'ОПИСАНИЕ ДЕЙСТВИЯ',
        minWidth: 260,
        cellClass: (params) =>
          descriptionCellClass((params.data?.severity as EnrichedAuditRow['severity']) ?? 'normal'),
        valueFormatter: (p) => String(p.value ?? 'Нет описания').replace(/\n/g, ' · '),
        tooltipValueGetter: (p) => {
          const text = String(p.data?.description ?? 'Нет описания');
          return text ? text.replace(/\n/g, '\n') : null;
        },
      }),
      flexTextColumnDef({
        field: 'actorName',
        headerName: 'КТО',
        minWidth: 120,
        maxWidth: 200,
        filter: false,
        sortable: true,
        comparator: (_a, _b, nodeA, nodeB) =>
          (nodeA.data?.actorName ?? '').localeCompare(nodeB.data?.actorName ?? '', 'ru'),
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          overflow: 'visible',
          lineHeight: 'normal',
        },
        cellRenderer: (params: ICellRendererParams<EnrichedAuditRow>) => (
          <AuditActorCell
            name={params.data?.actorName ?? 'Система'}
            email={params.data?.actorEmail ?? null}
          />
        ),
        valueFormatter: (p) => {
          const row = p.data;
          if (!row) return '';
          return row.actorEmail ? `${row.actorName} (${row.actorEmail})` : row.actorName;
        },
      }),
    ],
    [],
  );

  const defaultColDef = useMemo(() => createDefaultColDef({ wrapText: false, autoHeight: false }), []);

  const getRowClass = (params: RowClassParams<EnrichedAuditRow>) => {
    const classes: string[] = [];
    if (params.node.rowIndex != null && params.node.rowIndex % 2 === 1) {
      classes.push('audit-row-zebra');
    }
    if (params.data?.raw.id === selectedRow?.raw.id) {
      classes.push('audit-row-selected');
    }
    if (params.data?.severity === 'danger') classes.push('audit-row-danger');
    else if (params.data?.severity === 'warning') classes.push('audit-row-warning');
    return classes.join(' ');
  };

  const onRowClicked = (e: RowClickedEvent<EnrichedAuditRow>) => {
    if (!e.data) return;
    setSelectedRow((prev) => (prev?.raw.id === e.data?.raw.id ? null : e.data));
  };

  const exportCsv = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `audit-${Date.now()}.csv`,
      columnKeys: ['dateLabel', 'categoryLabel', 'actionLabel', 'description', 'actorLabel'],
    });
  };

  return (
    <div className="audit-page p-4 h-full flex flex-col gap-4 min-h-0 overflow-hidden max-w-screen-2xl mx-auto w-full">
      <div className="shrink-0 flex items-center justify-between gap-3 bg-white p-3 rounded shadow-sm border border-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-700 rounded">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-800">Журнал аудита</h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
              Только ADMIN · история действий в системе
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5 mr-1" />
          Экспорт CSV
        </Button>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row min-h-0 gap-0 bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="shrink-0 p-2.5 border-b border-slate-200 bg-slate-50 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-md flex">
                <div className="pl-3 py-1.5 bg-slate-200 border border-slate-300 border-r-0 rounded-l flex items-center text-slate-500">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Пользователь, товар, REF, LOT, комментарий…"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-r focus:outline-none focus:border-blue-500"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <input
                type="date"
                className="h-8 text-xs border border-slate-300 rounded px-2"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="С даты"
              />
              <input
                type="date"
                className="h-8 text-xs border border-slate-300 rounded px-2"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="По дату"
              />
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => void load()}>
                Обновить
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                    categoryFilter === f.id
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs font-semibold text-slate-500">
                Загрузка…
              </div>
            )}
            <div
              className={`${compactGridClassName} audit-grid absolute inset-0 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              style={compactGridThemeStyle}
            >
              <AgGridReact
                {...sharedGridOptions}
                theme="legacy"
                ref={gridRef}
                rowData={filteredRows ?? []}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                rowHeight={COMPACT_GRID_ROW_HEIGHT}
                headerHeight={COMPACT_GRID_HEADER_HEIGHT}
                getRowClass={getRowClass}
                onRowClicked={onRowClicked}
                overlayNoRowsTemplate="<span class='text-xs text-slate-500'>Нет записей по выбранным фильтрам</span>"
              />
            </div>
          </div>

          <div className="shrink-0 px-3 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 flex justify-between">
            <span>
              Показано {filteredRows.length} из {total}
              {total > MAX_PAGE_SIZE ? ` (загружено последние ${MAX_PAGE_SIZE})` : ''}
            </span>
            <span className="text-slate-400">Нажмите на строку для подробностей</span>
          </div>
        </div>

        {selectedRow && (
          <AuditDetailPanel row={selectedRow} lookups={lookups} onClose={() => setSelectedRow(null)} />
        )}
      </div>
    </div>
  );
}

export default function Audit() {
  return (
    <ErrorBoundary title="Журнал аудита — ошибка отображения">
      <AuditPage />
    </ErrorBoundary>
  );
}

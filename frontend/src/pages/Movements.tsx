import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import {
  COMPACT_GRID_HEADER_HEIGHT,
  COMPACT_GRID_ROW_HEIGHT,
  badgeColumnDef,
  compactColumnDef,
  compactGridClassName,
  compactGridThemeStyle,
  centeredColumnDef,
  createDefaultColDef,
  flexTextColumnDef,
  GRID_FLEX_NARROW,
  numericColumnDef,
  primaryTextColumnDef,
  refColumnDef,
  sharedGridOptions,
} from '../lib/agGrid/gridPreset';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Search, Download, Filter } from 'lucide-react';
import { MovementTypeBadge } from '../components/movements/MovementTypeBadge';
import { WriteOffDestinationBadge } from '../components/movements/WriteOffDestinationBadge';
import { MovementExpiryLabel } from '../components/movements/MovementExpiryLabel';
import { resolveMovementExpiryTone } from '../lib/movements/expiryDisplay';
import { MovementGroupMasterCell } from '../components/movements/MovementGroupMasterCell';
import { MovementGroupExpandIcon } from '../components/movements/MovementGroupExpandIcon';
import { MovementGroupDetailRenderer } from '../components/movements/MovementGroupDetailRenderer';
import { MovementRuButton } from '../components/movements/MovementRuButton';
import { MAX_PAGE_SIZE } from '../lib/pagination';
import FilterDrawer from '../components/filters/FilterDrawer';
import { downloadExport } from '../lib/export/download';
import { canEditWriteoffGroup, canExport } from '../lib/rbac/permissions';
import WriteoffGroupEditPanel from '../components/movements/WriteoffGroupEditPanel';
import type { MovementGroupDetailRendererContext } from '../components/movements/MovementGroupDetailRenderer';
import { useUserStore } from '../stores/userStore';
import { toast } from 'sonner';
import { fetchMovements } from '../lib/api/movements';
import { fetchWriteoffDestinations } from '../lib/api/writeoff-destinations';
import {
  buildUsersByEmail,
  fetchAllUsersForLookup,
  formatOperatorField,
  resolveOperatorDisplay,
} from '../lib/users/operatorDisplay';
import type { WriteoffDestinationItem } from '../lib/api/writeoff-destinations';
import type { MovementListItem } from '../types/api';
import { ApiError } from '../lib/api/client';
import {
  buildMovementGridRows,
  collectGroupFieldText,
  isGroupMasterRow,
  resolveGroupDestination,
  type MovementGridRow,
} from '../lib/movements/groupMovements';

const MOVEMENT_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'RECEIPT', label: 'ПРИХОД' },
  { value: 'ISSUE', label: 'РАСХОД' },
  { value: 'QUARANTINE', label: 'КАРАНТИН' },
  { value: 'UNBLOCK', label: 'РАЗБЛОКИРОВКА' },
  { value: 'ADJUSTMENT', label: 'КОРРЕКТИРОВКА' },
];

function movementQtyTone(value: unknown): 'in' | 'out' | 'zero' | 'neutral' {
  const qty = String(value ?? '');
  if (qty === '0') return 'zero';
  if (qty.startsWith('+')) return 'in';
  if (qty.startsWith('-')) return 'out';
  return 'neutral';
}

function movementField(
  row: MovementGridRow | undefined,
  field: keyof MovementListItem,
): string | null {
  if (!row) return null;
  if (row.rowType === 'group-master' && row.groupItems) {
    if (field === 'destination') {
      return resolveGroupDestination(row.groupItems);
    }
    return collectGroupFieldText(row.groupItems, (item) => {
      const value = item[field];
      return typeof value === 'string' ? value : value ?? '';
    });
  }
  const value = row.movement[field];
  return typeof value === 'string' ? value : value ?? null;
}

export default function Movements() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const gridRef = useRef<AgGridReact<MovementGridRow>>(null);
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
  const [items, setItems] = useState<MovementListItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editGroup, setEditGroup] = useState<MovementGridRow | null>(null);
  const [usersByEmail, setUsersByEmail] = useState(
    () => new Map<string, { email: string; displayName: string | null }>(),
  );

  const gridRows = useMemo(
    () => buildMovementGridRows(items, expandedGroups),
    [items, expandedGroups],
  );

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const raf = requestAnimationFrame(() => {
      api.onRowHeightChanged();
    });
    return () => cancelAnimationFrame(raf);
  }, [gridRows, expandedGroups]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    void fetchWriteoffDestinations({ pageSize: 200 })
      .then((data) => setDestinations(data.items))
      .catch(() => setDestinations([]));
  }, []);

  useEffect(() => {
    void fetchAllUsersForLookup()
      .then((users) => setUsersByEmail(buildUsersByEmail(users)))
      .catch(() => setUsersByEmail(new Map()));
  }, []);

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api || usersByEmail.size === 0) return;
    api.refreshCells({ columns: ['movement.user'], force: true });
    requestAnimationFrame(() => {
      api.onRowHeightChanged();
    });
  }, [usersByEmail]);

  const formatOperator = useCallback(
    (email: string | null | undefined) => resolveOperatorDisplay(email, usersByEmail),
    [usersByEmail],
  );

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMovements({
        page: 1,
        pageSize: MAX_PAGE_SIZE,
        search: debouncedSearch || undefined,
        type: typeFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        operator: appliedOperator || undefined,
        writeOffDestinationId: appliedDestinationId || undefined,
      });
      setItems(data.items);
      setExpandedGroups(new Set());
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить движения');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, fromDate, toDate, appliedOperator, appliedDestinationId]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const onRowClicked = useCallback(
    (event: RowClickedEvent<MovementGridRow>) => {
      const row = event.data;
      if (!isGroupMasterRow(row) || !row.groupKey) return;
      toggleGroup(row.groupKey);
    },
    [toggleGroup],
  );

  const columnDefs = useMemo<ColDef<MovementGridRow>[]>(() => [
    compactColumnDef({
      colId: 'expand',
      headerName: '',
      width: 36,
      minWidth: 36,
      maxWidth: 36,
      flex: 0,
      sortable: false,
      filter: false,
      resizable: false,
      cellClass: 'movement-group-expand-cell',
      cellRenderer: (params: ICellRendererParams<MovementGridRow>) => {
        if (!isGroupMasterRow(params.data)) return null;
        const expanded = expandedGroups.has(params.data!.groupKey!);
        return <MovementGroupExpandIcon expanded={expanded} />;
      },
    }),
    compactColumnDef({
      field: 'movement.id',
      headerName: 'ДОКУМЕНТ',
      minWidth: 90,
      maxWidth: 120,
      cellClass: 'font-mono text-xs font-bold text-blue-700',
      valueGetter: (p) => movementField(p.data, 'id'),
      cellRenderer: (params: ICellRendererParams<MovementGridRow>) => {
        if (isGroupMasterRow(params.data) && params.data?.groupItems) {
          const first = params.data.groupItems[0].id;
          const extra = params.data.groupItems.length - 1;
          return (
            <span className="font-mono text-xs font-bold text-blue-700">
              {first}
              {extra > 0 && (
                <span className="ml-1 font-sans font-semibold text-slate-400">+{extra}</span>
              )}
            </span>
          );
        }
        return params.value;
      },
    }),
    compactColumnDef({
      field: 'movement.date',
      headerName: 'ДАТА / ВРЕМЯ',
      minWidth: 120,
      maxWidth: 160,
      cellClass: 'font-mono text-xs text-slate-600',
      valueGetter: (p) => movementField(p.data, 'date'),
    }),
    centeredColumnDef({
      field: 'movement.type',
      headerName: 'ТИП',
      flex: 0.85,
      minWidth: 132,
      maxWidth: 160,
      cellClass: 'movement-type-cell',
      filter: false,
      sortable: true,
      valueGetter: (p) => p.data?.movement.type,
      tooltipValueGetter: () => null,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        paddingLeft: '4px',
        paddingRight: '4px',
      },
      cellRenderer: (params: ICellRendererParams<MovementGridRow>) => (
        <MovementTypeBadge type={String(params.data?.movement.type ?? '')} />
      ),
    }),
    badgeColumnDef({
      field: 'movement.destination',
      headerName: 'НАЗНАЧЕНИЕ СПИСАНИЯ',
      flex: 1.75,
      minWidth: 200,
      cellClass: 'movement-destination-cell',
      valueGetter: (p) => movementField(p.data, 'destination'),
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        paddingLeft: '4px',
        paddingRight: '4px',
      },
      tooltipValueGetter: () => null,
      cellRenderer: (params: ICellRendererParams<MovementGridRow>) => (
        <WriteOffDestinationBadge destination={movementField(params.data, 'destination')} />
      ),
    }),
    refColumnDef({
      field: 'movement.ref',
      headerName: 'REF',
      minWidth: 150,
      cellClass: 'font-mono text-xs',
      valueGetter: (p) => movementField(p.data, 'ref'),
      valueFormatter: (p) => (isGroupMasterRow(p.data) ? '—' : String(p.value ?? '')),
    }),
    flexTextColumnDef({
      field: 'movement.lot',
      headerName: 'LOT / ПАРТИЯ',
      minWidth: 100,
      maxWidth: 140,
      cellClass: 'font-mono text-xs',
      valueGetter: (p) => movementField(p.data, 'lot'),
      valueFormatter: (p) => {
        if (isGroupMasterRow(p.data)) return '—';
        return (p.value as string | null) ?? '—';
      },
    }, GRID_FLEX_NARROW),
    primaryTextColumnDef({
      field: 'movement.productName',
      headerName: 'НОМЕНКЛАТУРА',
      minWidth: 260,
      cellClass: 'text-xs font-medium',
      valueGetter: (p) => movementField(p.data, 'productName'),
      cellRenderer: (params: ICellRendererParams<MovementGridRow>) => {
        if (isGroupMasterRow(params.data) && params.data?.groupItems) {
          return <MovementGroupMasterCell row={params.data} />;
        }
        return params.value;
      },
    }),
    compactColumnDef({
      field: 'movement.expiryDate',
      headerName: 'СРОК ГОДНОСТИ',
      flex: 0.95,
      minWidth: 112,
      maxWidth: 130,
      cellClass: 'movement-expiry-cell',
      valueGetter: (p) => (isGroupMasterRow(p.data) ? null : p.data?.movement.expiryDate ?? null),
      valueFormatter: (p) => {
        if (isGroupMasterRow(p.data)) return '—';
        const v = p.value as string | null;
        return v?.trim() ? v : '—';
      },
      tooltipValueGetter: () => null,
      cellClassRules: {
        'movement-expiry-empty-tone': (p) =>
          !isGroupMasterRow(p.data) && resolveMovementExpiryTone(p.data?.movement.expiryDate) === 'empty',
      },
      cellRenderer: (params: ICellRendererParams<MovementGridRow>) => {
        if (isGroupMasterRow(params.data)) {
          return <span className="movement-expiry-empty text-xs">—</span>;
        }
        return <MovementExpiryLabel expiryDate={params.data?.movement.expiryDate} />;
      },
    }),
    numericColumnDef({
      field: 'movement.qty',
      headerName: 'КОЛ-ВО',
      valueGetter: (p) => movementField(p.data, 'qty'),
      valueFormatter: (p) => {
        if (isGroupMasterRow(p.data) && p.data?.groupItems) {
          return `${p.data.groupItems.length} поз.`;
        }
        return String(p.value ?? '');
      },
      cellClass: 'ag-cell-movement-qty',
      cellClassRules: {
        'movement-qty-in': (p) => !isGroupMasterRow(p.data) && movementQtyTone(p.value) === 'in',
        'movement-qty-out': (p) => !isGroupMasterRow(p.data) && movementQtyTone(p.value) === 'out',
        'movement-qty-zero': (p) => !isGroupMasterRow(p.data) && movementQtyTone(p.value) === 'zero',
        'movement-qty-neutral': (p) =>
          isGroupMasterRow(p.data) || movementQtyTone(p.value) === 'neutral',
        'movement-group-qty-summary': (p) => isGroupMasterRow(p.data),
      },
    }),
    flexTextColumnDef({
      field: 'movement.user',
      headerName: 'ОПЕРАТОР',
      minWidth: 100,
      maxWidth: 180,
      cellClass: 'text-xs text-slate-500',
      valueGetter: (p) => movementField(p.data, 'user'),
      valueFormatter: (p) => formatOperatorField(String(p.value ?? ''), usersByEmail),
    }),
    compactColumnDef({
      colId: 'ru',
      headerName: 'РУ',
      width: 44,
      minWidth: 44,
      maxWidth: 48,
      flex: 0,
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      cellClass: 'movement-ru-cell',
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '2px',
        paddingRight: '2px',
      },
      cellRenderer: (params: ICellRendererParams<MovementGridRow>) => {
        if (isGroupMasterRow(params.data) || params.data?.rowType === 'group-detail') {
          return null;
        }
        return <MovementRuButton productId={params.data?.movement.productId} />;
      },
    }),
  ], [expandedGroups, usersByEmail]);

  const defaultColDef = useMemo(() => createDefaultColDef({ wrapText: false, autoHeight: false }), []);

  const getRowClass = useCallback(
    (params: { data?: MovementGridRow }) => {
      if (params.data?.rowType === 'group-master') {
        const classes = ['movement-group-master-row'];
        if (params.data.groupKey && expandedGroups.has(params.data.groupKey)) {
          classes.push('movement-group-master-expanded');
        }
        return classes.join(' ');
      }
      if (params.data?.rowType === 'group-detail') {
        return 'movement-group-detail-row movement-group-detail-active';
      }
      return undefined;
    },
    [expandedGroups],
  );

  const getRowHeight = useCallback((params: { data?: MovementGridRow }) => {
    if (params.data?.rowType === 'group-detail') {
      return undefined;
    }
    return COMPACT_GRID_ROW_HEIGHT;
  }, []);

  const gridContext = useMemo<MovementGroupDetailRendererContext>(
    () => ({
      canEditWriteoff: canEditWriteoffGroup(userRole),
      onEditGroup: (row) => setEditGroup(row),
      formatOperator,
    }),
    [userRole, formatOperator],
  );

  return (
    <div className="movements-page p-4 h-full flex flex-col gap-4 min-h-0 overflow-hidden max-w-screen-2xl mx-auto w-full">
      <div className="shrink-0 flex items-center justify-between gap-3 bg-white p-3 rounded shadow-sm border border-slate-300">
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

      <div className="flex-1 flex flex-col bg-white border border-slate-300 rounded shadow-sm overflow-hidden min-h-0 min-w-0">
        <div className="shrink-0 p-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
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

        <div className="flex-1 w-full min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs font-semibold text-slate-500">
              Загрузка...
            </div>
          )}
          <div
            className={`${compactGridClassName} movements-grid absolute inset-0 ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            style={compactGridThemeStyle}
          >
            <AgGridReact
              {...sharedGridOptions}
              theme="legacy"
              ref={gridRef}
              rowData={gridRows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={COMPACT_GRID_ROW_HEIGHT}
              getRowHeight={getRowHeight}
              headerHeight={COMPACT_GRID_HEADER_HEIGHT}
              overlayNoRowsTemplate="<span></span>"
              getRowId={(p) => p.data.rowId}
              getRowClass={getRowClass}
              onRowClicked={onRowClicked}
              isFullWidthRow={(p) => p.rowNode.data?.rowType === 'group-detail'}
              fullWidthCellRenderer={MovementGroupDetailRenderer}
              embedFullWidthRows={false}
              context={gridContext}
            />
          </div>
        </div>

        <WriteoffGroupEditPanel
          open={!!editGroup}
          items={editGroup?.groupItems ?? []}
          operationGroupId={editGroup?.groupItems?.[0]?.operationGroupId}
          onClose={() => setEditGroup(null)}
          onSaved={() => void loadMovements()}
        />

        <div className="shrink-0 px-3 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <span>Показано {items.length} из {total}</span>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import {
  COMPACT_GRID_HEADER_HEIGHT,
  COMPACT_GRID_ROW_HEIGHT,
  GRID_FLEX_DEFAULT,
  GRID_FLEX_WIDE,
  badgeColumnDef,
  centeredColumnDef,
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
import { Search, Download, Plus, Filter, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ProductFormDialog from '../components/products/ProductFormDialog';
import FilterDrawer from '../components/filters/FilterDrawer';
import { fetchProducts } from '../lib/api/products';
import { downloadExport } from '../lib/export/download';
import type { ProductListItem } from '../types/api';
import { ApiError } from '../lib/api/client';
import { MAX_PAGE_SIZE } from '../lib/pagination';
import { canCreateProduct, canEditProduct, canExport } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';
import { ProductStatusBadge } from '../components/products/ProductStatusBadge';
import { MovementGroupExpandIcon } from '../components/movements/MovementGroupExpandIcon';
import { ProductGroupMasterCell } from '../components/products/ProductGroupMasterCell';
import { ProductLotGroupDetailRenderer } from '../components/products/ProductLotGroupDetailRenderer';
import {
  buildProductGridRows,
  isProductGroupMasterRow,
  type ProductGridRow,
} from '../lib/products/groupProducts';
import { SHOW_WAREHOUSE_LOCATIONS } from '../lib/pilotFeatures';

function productField(
  row: ProductGridRow | undefined,
  field: keyof ProductListItem,
): string | number | null {
  if (!row) return null;
  if (isProductGroupMasterRow(row) && (field === 'lot' || field === 'nearestExpiry')) {
    return null;
  }
  const value = row.product[field];
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value ?? null;
}

export default function Products() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact<ProductGridRow>>(null);
  const rowNavigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterHasExpiry, setFilterHasExpiry] = useState<boolean | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    manufacturer: '',
    lowStock: false,
    hasExpiry: undefined as boolean | undefined,
    status: '',
  });

  const gridRows = useMemo(
    () => buildProductGridRows(items, expandedGroups),
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

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProducts({
        page: 1,
        pageSize: MAX_PAGE_SIZE,
        search: debouncedSearch || undefined,
        manufacturer: appliedFilters.manufacturer || undefined,
        lowStock: appliedFilters.lowStock || undefined,
        hasExpiry: appliedFilters.hasExpiry,
        status: appliedFilters.status || undefined,
      });
      setItems(data.items);
      setExpandedGroups(new Set());
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Не удалось загрузить товары';
      toast.error(message);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, appliedFilters]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  const openProductCard = useCallback(
    (productId: string) => {
      if (rowNavigateTimer.current) {
        clearTimeout(rowNavigateTimer.current);
        rowNavigateTimer.current = null;
      }
      navigate(`/products/${productId}`);
    },
    [navigate],
  );

  const onRowClicked = useCallback(
    (event: RowClickedEvent<ProductGridRow>) => {
      const row = event.data;
      if (!row) return;

      if (isProductGroupMasterRow(row) && row.groupKey) {
        if (rowNavigateTimer.current) {
          clearTimeout(rowNavigateTimer.current);
          rowNavigateTimer.current = null;
        }
        toggleGroup(row.groupKey);
        return;
      }

      if (row.rowType === 'group-detail') {
        const target = event.event?.target;
        if (
          target instanceof Element &&
          target.closest('.movement-group-detail-card-actionable') &&
          row.product?.id
        ) {
          openProductCard(row.product.id);
        }
        return;
      }

      if (rowNavigateTimer.current) clearTimeout(rowNavigateTimer.current);
      rowNavigateTimer.current = setTimeout(() => {
        openProductCard(row.product.id);
      }, 250);
    },
    [openProductCard, toggleGroup],
  );

  const columnDefs = useMemo<ColDef<ProductGridRow>[]>(() => [
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
      cellRenderer: (params: ICellRendererParams<ProductGridRow>) => {
        if (!isProductGroupMasterRow(params.data)) return null;
        const expanded = expandedGroups.has(params.data!.groupKey!);
        return <MovementGroupExpandIcon expanded={expanded} />;
      },
    }),
    centeredColumnDef(
      badgeColumnDef({
        field: 'product.status',
        headerName: 'СТАТУС',
        minWidth: 88,
        maxWidth: 104,
        flex: 0.5,
        filter: false,
        valueGetter: (p) => p.data?.product.status,
        cellClass: 'ag-cell-status-indicator',
        tooltipValueGetter: () => null,
        cellRenderer: (params: ICellRendererParams<ProductGridRow>) => (
          <ProductStatusBadge status={String(params.data?.product.status ?? '')} />
        ),
      }),
    ),
    ...(SHOW_WAREHOUSE_LOCATIONS
      ? [
          flexTextColumnDef({
            field: 'product.location',
            headerName: 'АДРЕС ЯЧЕЙКИ',
            minWidth: 110,
            maxWidth: 150,
            flex: 0.85,
            valueGetter: (p) => p.data?.product.location,
            valueFormatter: (p) => (p.value as string | null | undefined) ?? '—',
            cellClass: 'font-mono text-xs text-slate-600',
          }),
        ]
      : []),
    refColumnDef({
      field: 'product.ref',
      headerName: 'REF',
      minWidth: 170,
      valueGetter: (p) => p.data?.product.ref,
      cellClass: 'font-mono text-xs font-bold text-slate-600',
    }),
    flexTextColumnDef({
      field: 'product.lot',
      headerName: 'LOT',
      minWidth: 100,
      valueGetter: (p) => productField(p.data, 'lot'),
      cellClass: 'font-mono text-xs font-bold text-slate-600',
      valueFormatter: (p) => {
        if (isProductGroupMasterRow(p.data)) return '—';
        return (p.value as string | null) ?? '';
      },
      cellRenderer: (params: ICellRendererParams<ProductGridRow>) => {
        if (isProductGroupMasterRow(params.data)) {
          return <ProductGroupMasterCell row={params.data} />;
        }
        return params.value;
      },
    }, GRID_FLEX_DEFAULT),
    primaryTextColumnDef({
      field: 'product.name',
      headerName: 'НОМЕНКЛАТУРА',
      minWidth: 260,
      valueGetter: (p) => p.data?.product.name,
      cellClass: 'font-medium text-slate-800',
    }),
    flexTextColumnDef({
      field: 'product.manufacturer',
      headerName: 'ИЗГОТОВИТЕЛЬ',
      minWidth: 160,
      valueGetter: (p) => p.data?.product.manufacturer,
      cellClass: 'text-slate-600 text-xs',
    }, GRID_FLEX_WIDE),
    stockQtyColumnDef('product.qty', {
      valueGetter: (p) => p.data?.product.qty,
      valueFormatter: (p) => {
        if (isProductGroupMasterRow(p.data)) {
          return String(p.data?.product.qty ?? '');
        }
        return String(p.value ?? '');
      },
      cellClassRules: {
        'movement-group-qty-summary': (p) => isProductGroupMasterRow(p.data),
      },
    }),
    compactColumnDef({
      field: 'product.nearestExpiry',
      headerName: 'БЛИЖАЙШИЙ СРОК',
      minWidth: 136,
      maxWidth: 160,
      flex: 0.95,
      valueGetter: (p) => productField(p.data, 'nearestExpiry'),
      cellClass: 'ag-cell-nearest-expiry font-mono text-xs',
      valueFormatter: (p) => {
        if (isProductGroupMasterRow(p.data)) return '—';
        const v = p.value as string | null | undefined;
        if (!v || v === 'Н/Д') return '—';
        return v;
      },
      cellClassRules: {
        'text-slate-400 font-normal': (params) =>
          !isProductGroupMasterRow(params.data) &&
          (params.value === 'Н/Д' || !params.value),
        'text-red-600 font-bold bg-red-50': (params) => {
          if (isProductGroupMasterRow(params.data)) return false;
          if (params.value === 'Н/Д' || !params.value) return false;
          const diff = new Date(params.value as string).getTime() - Date.now();
          return diff < 30 * 24 * 60 * 60 * 1000;
        },
      },
    }),
    flexTextColumnDef({
      field: 'product.barcode',
      headerName: 'ШТРИХКОД',
      minWidth: 110,
      valueGetter: (p) => p.data?.product.barcode,
      cellClass: 'font-mono text-[10px] text-slate-400',
    }, GRID_FLEX_DEFAULT),
  ], [expandedGroups]);

  const defaultColDef = useMemo(() => createDefaultColDef({ wrapText: false, autoHeight: false }), []);

  const getRowClass = useCallback(
    (params: { data?: ProductGridRow }) => {
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

  const getRowHeight = useCallback((params: { data?: ProductGridRow }) => {
    if (params.data?.rowType === 'group-detail') {
      return undefined;
    }
    return COMPACT_GRID_ROW_HEIGHT;
  }, []);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: ProductListItem) => {
    setEditing(product);
    setDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col max-w-screen-2xl mx-auto gap-4">
      <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">Мастер-справочник номенклатуры</h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">ВУ: Активный реестр товаров</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Номенклатура = каталог товаров</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canExport(userRole) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700"
              onClick={() => downloadExport('products').catch(() => toast.error('Ошибка экспорта'))}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Экспорт
            </Button>
          )}
          {canCreateProduct(userRole) && (
            <Button type="button" size="sm" className="h-8 text-xs font-semibold bg-blue-700 hover:bg-blue-800" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Добавить ТМЦ
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white border border-slate-300 rounded shadow-sm overflow-hidden min-h-0">
        <div className="p-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 text-slate-800">
          <div className="relative w-96 flex">
            <div className="pl-3 py-1.5 bg-slate-200 border border-slate-300 border-r-0 rounded-l flex items-center text-slate-500">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              placeholder="Мгновенный поиск по REF, LOT, наименованию..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-r focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold bg-white border-slate-300 text-slate-700"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Фильтры
            {(appliedFilters.manufacturer || appliedFilters.lowStock || appliedFilters.hasExpiry !== undefined || appliedFilters.status) && (
              <span className="ml-1.5 bg-blue-600 text-white rounded-full px-1.5 text-[9px]">!</span>
            )}
          </Button>
        </div>

        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          activeCount={
            [appliedFilters.manufacturer, appliedFilters.status, appliedFilters.lowStock, appliedFilters.hasExpiry !== undefined].filter(Boolean).length
          }
          onApply={() => {
            setAppliedFilters({
              manufacturer: filterManufacturer.trim(),
              lowStock: filterLowStock,
              hasExpiry: filterHasExpiry,
              status: filterStatus,
            });
            setFiltersOpen(false);
          }}
          onReset={() => {
            setFilterManufacturer('');
            setFilterLowStock(false);
            setFilterHasExpiry(undefined);
            setFilterStatus('');
            setAppliedFilters({ manufacturer: '', lowStock: false, hasExpiry: undefined, status: '' });
          }}
        >
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Производитель</label>
            <input
              className="w-full h-8 mt-1 px-2 text-sm border border-slate-300 rounded"
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={filterLowStock} onChange={(e) => setFilterLowStock(e.target.checked)} />
            Низкий остаток
          </label>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Срок годности</label>
            <select
              className="w-full h-8 mt-1 text-sm border border-slate-300 rounded px-2"
              value={filterHasExpiry === undefined ? '' : filterHasExpiry ? 'yes' : 'no'}
              onChange={(e) => {
                const v = e.target.value;
                setFilterHasExpiry(v === '' ? undefined : v === 'yes');
              }}
            >
              <option value="">Любой</option>
              <option value="yes">Есть срок</option>
              <option value="no">Без срока</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Статус</label>
            <select
              className="w-full h-8 mt-1 text-sm border border-slate-300 rounded px-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Все</option>
              <option value="АКТИВЕН">Активен</option>
              <option value="БЛОК">Блок</option>
              <option value="КРИТИЧНО">Критичный срок</option>
            </select>
          </div>
        </FilterDrawer>

        <div className="flex-1 w-full min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs font-semibold text-slate-500">
              Загрузка...
            </div>
          )}
          <div className={`${listGridClassName} products-grid absolute inset-0`} style={compactGridThemeStyle}>
            <AgGridReact
              {...sharedGridOptions}
              theme="legacy"
              ref={gridRef}
              rowData={gridRows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="single"
              onRowClicked={onRowClicked}
              onRowDoubleClicked={(e) => {
                if (!canEditProduct(userRole)) return;
                if (rowNavigateTimer.current) {
                  clearTimeout(rowNavigateTimer.current);
                  rowNavigateTimer.current = null;
                }
                const row = e.data;
                if (!row || row.rowType === 'group-detail') return;
                openEdit(row.product);
              }}
              rowHeight={COMPACT_GRID_ROW_HEIGHT}
              getRowHeight={getRowHeight}
              headerHeight={COMPACT_GRID_HEADER_HEIGHT}
              getRowId={(p) => p.data.rowId}
              getRowClass={getRowClass}
              isFullWidthRow={(p) => p.rowNode.data?.rowType === 'group-detail'}
              fullWidthCellRenderer={ProductLotGroupDetailRenderer}
              embedFullWidthRows={false}
            />
          </div>
        </div>

        <div className="shrink-0 px-3 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <span>
            Показано {items.length} из {total}
            {total > MAX_PAGE_SIZE ? ` (загружено до ${MAX_PAGE_SIZE})` : ''}
          </span>
        </div>
      </div>

      <ProductFormDialog
        open={dialogOpen}
        product={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={loadProducts}
      />
    </div>
  );
}

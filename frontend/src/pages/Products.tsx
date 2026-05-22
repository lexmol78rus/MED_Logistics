import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
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

export default function Products() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact<ProductListItem>>(null);
  const rowNavigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rowData, setRowData] = useState<ProductListItem[]>([]);
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
      setRowData(data.items);
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Не удалось загрузить товары';
      toast.error(message);
      setRowData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, appliedFilters]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const columnDefs = useMemo<ColDef<ProductListItem>[]>(() => [
    centeredColumnDef(
      badgeColumnDef({
        field: 'status',
        headerName: 'СТАТУС',
        minWidth: 88,
        maxWidth: 104,
        flex: 0.5,
        filter: false,
        cellClass: 'ag-cell-status-indicator',
        tooltipValueGetter: () => null,
        cellRenderer: (params) => (
          <ProductStatusBadge status={String(params.value ?? '')} />
        ),
      }),
    ),
    refColumnDef({
      field: 'ref',
      headerName: 'REF',
      minWidth: 170,
      cellClass: 'font-mono text-xs font-bold text-slate-600',
    }),
    flexTextColumnDef({
      field: 'lot',
      headerName: 'LOT',
      minWidth: 100,
      cellClass: 'font-mono text-xs font-bold text-slate-600',
      valueFormatter: (p) => (p.value as string | null) ?? '',
    }, GRID_FLEX_DEFAULT),
    primaryTextColumnDef({
      field: 'name',
      headerName: 'НОМЕНКЛАТУРА',
      minWidth: 260,
      cellClass: 'font-medium text-slate-800',
    }),
    flexTextColumnDef({
      field: 'manufacturer',
      headerName: 'ИЗГОТОВИТЕЛЬ',
      minWidth: 160,
      cellClass: 'text-slate-600 text-xs',
    }, GRID_FLEX_WIDE),
    stockQtyColumnDef('qty'),
    compactColumnDef({
      field: 'nearestExpiry',
      headerName: 'БЛИЖАЙШИЙ СРОК',
      minWidth: 136,
      maxWidth: 160,
      flex: 0.95,
      cellClass: 'ag-cell-nearest-expiry font-mono text-xs',
      valueFormatter: (p) => {
        const v = p.value as string | null | undefined;
        if (!v || v === 'Н/Д') return '—';
        return v;
      },
      cellClassRules: {
        'text-slate-400 font-normal': (params) => params.value === 'Н/Д' || !params.value,
        'text-red-600 font-bold bg-red-50': (params) => {
          if (params.value === 'Н/Д' || !params.value) return false;
          const diff = new Date(params.value as string).getTime() - Date.now();
          return diff < 30 * 24 * 60 * 60 * 1000;
        },
      },
    }),
    flexTextColumnDef({
      field: 'barcode',
      headerName: 'ШТРИХКОД',
      minWidth: 110,
      cellClass: 'font-mono text-[10px] text-slate-400',
    }, GRID_FLEX_DEFAULT),
  ], []);

  const defaultColDef = useMemo(() => createDefaultColDef(), []);

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
          <div className={`${listGridClassName} absolute inset-0`} style={compactGridThemeStyle}>
            <AgGridReact
              {...sharedGridOptions}
              theme="legacy"
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="single"
              onRowClicked={(e) => {
                if (!e.data) return;
                if (rowNavigateTimer.current) clearTimeout(rowNavigateTimer.current);
                rowNavigateTimer.current = setTimeout(() => {
                  navigate(`/products/${e.data!.id}`);
                }, 250);
              }}
              onRowDoubleClicked={(e) => {
                if (!canEditProduct(userRole)) return;
                if (rowNavigateTimer.current) {
                  clearTimeout(rowNavigateTimer.current);
                  rowNavigateTimer.current = null;
                }
                if (e.data) openEdit(e.data);
              }}
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

      <ProductFormDialog
        open={dialogOpen}
        product={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={loadProducts}
      />
    </div>
  );
}

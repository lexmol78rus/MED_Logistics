import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { Search, Download, Plus, Filter, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ProductFormDialog from '../components/products/ProductFormDialog';
import FilterDrawer from '../components/filters/FilterDrawer';
import { fetchProducts } from '../lib/api/products';
import { downloadExport } from '../lib/export/download';
import type { ProductListItem } from '../types/api';
import { ApiError } from '../lib/api/client';
import { canCreateProduct, canEditProduct, canExport } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';

export default function Products() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact<ProductListItem>>(null);
  const rowNavigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
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
        page,
        pageSize,
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
  }, [page, pageSize, debouncedSearch, appliedFilters]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, appliedFilters]);

  const columnDefs = useMemo<ColDef<ProductListItem>[]>(() => [
    {
      field: 'status',
      headerName: 'СТАТУС',
      width: 130,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams<ProductListItem>) => {
        const s = params.value as string;
        let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
        if (s === 'КРИТИЧНО' || s === 'ОТСУТСТВУЕТ') colorClass = 'bg-red-50 text-red-700 border-red-200';
        if (s === 'ВНИМАНИЕ') colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
        if (s === 'АКТИВЕН') colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        return (
          <div className="flex items-center h-full">
            <span className={`px-2 py-0.5 border rounded text-[9px] font-bold tracking-wider ${colorClass}`}>
              {s}
            </span>
          </div>
        );
      },
    },
    { field: 'ref', headerName: 'REF', width: 130, pinned: 'left', cellClass: 'font-mono text-xs font-bold text-slate-600' },
    { field: 'name', headerName: 'НОМЕНКЛАТУРА', flex: 1, minWidth: 200, cellClass: 'font-medium text-slate-800' },
    { field: 'manufacturer', headerName: 'ИЗГОТОВИТЕЛЬ', width: 160, cellClass: 'text-slate-600 text-xs' },
    {
      field: 'qty',
      headerName: 'ОСТАТОК',
      width: 110,
      type: 'numericColumn',
      cellClass: 'font-mono font-bold text-slate-900',
      valueFormatter: (params) => (params.value as number).toLocaleString('ru-RU'),
    },
    { field: 'lots', headerName: 'ПАРТИЙ', width: 90, type: 'numericColumn', cellClass: 'text-slate-500 font-mono text-center' },
    {
      field: 'nearestExpiry',
      headerName: 'БЛИЖАЙШИЙ СРОК',
      width: 140,
      cellClass: 'font-mono text-xs',
      cellClassRules: {
        'text-red-600 font-bold bg-red-50': (params) => {
          if (params.value === 'Н/Д') return false;
          const diff = new Date(params.value as string).getTime() - Date.now();
          return diff < 30 * 24 * 60 * 60 * 1000;
        },
      },
    },
    { field: 'barcode', headerName: 'ШТРИХКОД', width: 130, cellClass: 'font-mono text-[10px] text-slate-400' },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: true,
  }), []);

  const onGridReady = (params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: ProductListItem) => {
    setEditing(product);
    setDialogOpen(true);
  };

  const gridThemeStyle = {
    '--ag-header-background-color': '#f8fafc',
    '--ag-header-foreground-color': '#64748b',
    '--ag-font-size': '12px',
    '--ag-font-family': 'inherit',
    '--ag-borders-color': '#e2e8f0',
    '--ag-row-hover-color': '#f1f5f9',
  } as CSSProperties;

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
              placeholder="Мгновенный поиск по REF, наименованию..."
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
              <option value="ВНИМАНИЕ">Внимание</option>
              <option value="КРИТИЧНО">Критично</option>
              <option value="ОТСУТСТВУЕТ">Отсутствует</option>
            </select>
          </div>
        </FilterDrawer>

        <div className="flex-1 w-full relative">
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
              rowHeight={40}
              headerHeight={36}
              onGridReady={onGridReady}
            />
          </div>
        </div>

        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Показано {rowData.length} из {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-semibold">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
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

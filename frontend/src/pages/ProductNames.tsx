import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ArrowLeft, BookText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ops/ConfirmDialog';
import {
  createProductName,
  deleteProductName,
  fetchProductNames,
  updateProductName,
  type ProductNameCatalogItem,
} from '../lib/api/product-names';
import { ApiError } from '../lib/api/client';
import {
  compactColumnDef,
  createDefaultColDef,
  flexTextColumnDef,
  listGridClassName,
  primaryTextColumnDef,
  sharedGridOptions,
} from '../lib/agGrid/gridPreset';
import { formatAppDateTime } from '../lib/datetime';
import { canManageProductNames } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';

export default function ProductNames() {
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const canManage = canManageProductNames(userRole);
  const gridRef = useRef<AgGridReact<ProductNameCatalogItem>>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rowData, setRowData] = useState<ProductNameCatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductNameCatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductNameCatalogItem | null>(null);
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProductNames({
        page: 1,
        pageSize: 500,
        search: debouncedSearch || undefined,
      });
      setRowData(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить базу наименований');
      setRowData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setName('');
    setManufacturer('');
    setCreateOpen(true);
  };

  const openEdit = (row: ProductNameCatalogItem) => {
    setEditTarget(row);
    setName(row.name);
    setManufacturer(row.manufacturer ?? '');
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Укажите наименование');
      return;
    }
    try {
      await createProductName({
        name: trimmed,
        manufacturer: manufacturer.trim() || undefined,
      });
      toast.success('Наименование добавлено');
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка создания');
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Укажите наименование');
      return;
    }
    try {
      await updateProductName(editTarget.id, {
        name: trimmed,
        manufacturer: manufacturer.trim(),
      });
      toast.success('Наименование обновлено');
      setEditTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProductName(deleteTarget.id);
      toast.success('Наименование удалено');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка удаления');
    }
  };

  const columnDefs = useMemo<ColDef<ProductNameCatalogItem>[]>(() => {
    const cols: ColDef<ProductNameCatalogItem>[] = [
      primaryTextColumnDef({
        field: 'name',
        headerName: 'НАИМЕНОВАНИЕ',
        minWidth: 320,
        cellClass: 'font-medium text-slate-800',
      }),
      flexTextColumnDef({
        field: 'manufacturer',
        headerName: 'ИЗГОТОВИТЕЛЬ',
        minWidth: 180,
        valueFormatter: (p) => (p.value as string | null) ?? '—',
        cellClass: 'text-slate-600 text-xs',
      }),
      compactColumnDef({
        field: 'useCount',
        headerName: 'ИСПОЛЬЗОВАНИЙ',
        minWidth: 110,
        maxWidth: 130,
        cellClass: 'font-mono text-xs text-slate-600',
      }),
      compactColumnDef({
        field: 'lastUsedAt',
        headerName: 'ПОСЛЕДНЕЕ ИСП.',
        minWidth: 140,
        maxWidth: 170,
        valueFormatter: (p) => formatAppDateTime(String(p.value ?? '')),
        cellClass: 'font-mono text-xs text-slate-500',
      }),
    ];

    if (canManage) {
      cols.push(
        compactColumnDef({
          headerName: '',
          flex: 1,
          minWidth: 160,
          maxWidth: 220,
          sortable: false,
          filter: false,
          cellRenderer: (params: ICellRendererParams<ProductNameCatalogItem>) => {
            const row = params.data;
            if (!row) return null;
            return (
              <div className="flex gap-1 h-full items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => openEdit(row)}
                >
                  Изменить
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-red-700"
                  onClick={() => setDeleteTarget(row)}
                >
                  Удалить
                </Button>
              </div>
            );
          },
        }),
      );
    }

    return cols;
  }, [canManage]);

  const defaultColDef = useMemo(() => createDefaultColDef(), []);

  return (
    <div className="h-full flex flex-col max-w-screen-2xl mx-auto gap-4">
      <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-slate-300">
        <div className="flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600"
            title="Назад к номенклатуре"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="p-2 bg-blue-100 text-blue-700 rounded">
            <BookText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">
              База наименований
            </h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
              Справочник названий товаров
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Отдельно от номенклатуры: здесь только наименования, без привязки к партиям и остаткам
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs font-semibold bg-blue-700 hover:bg-blue-800"
            onClick={openCreate}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Добавить наименование
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col bg-white border border-slate-300 rounded shadow-sm overflow-hidden min-h-0">
        <div className="p-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 text-slate-800">
          <div className="relative w-96 flex">
            <div className="pl-3 py-1.5 bg-slate-200 border border-slate-300 border-r-0 rounded-l flex items-center text-slate-500">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              placeholder="Поиск по наименованию или изготовителю..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-r focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-500">
            {rowData.length} из {total}
          </span>
        </div>

        <div className="flex-1 w-full min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 text-xs font-semibold text-slate-500">
              Загрузка...
            </div>
          )}
          <div className={`${listGridClassName} absolute inset-0`}>
            <AgGridReact
              {...sharedGridOptions}
              theme="legacy"
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={36}
              headerHeight={32}
            />
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить наименование</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Наименование</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Изготовитель (необязательно)</Label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => void handleCreate()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить наименование</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Наименование</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Изготовитель</Label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Отмена
            </Button>
            <Button className="bg-blue-700 hover:bg-blue-800" onClick={() => void handleUpdate()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить наименование?"
        message={
          deleteTarget
            ? `«${deleteTarget.name}» будет удалено из базы. Номенклатура на складе не изменится.`
            : ''
        }
        confirmLabel="Удалить"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ArrowLeft, Plus, Search } from 'lucide-react';
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
  createWriteoffDestination,
  deleteWriteoffDestination,
  fetchWriteoffDestinations,
  updateWriteoffDestination,
  type WriteoffDestinationItem,
} from '../lib/api/writeoff-destinations';
import { ApiError } from '../lib/api/client';
import {
  badgeColumnDef,
  compactColumnDef,
  createDefaultColDef,
  listGridClassName,
  primaryTextColumnDef,
  sharedGridOptions,
} from '../lib/agGrid/gridPreset';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function WriteOffDestinations() {
  const gridRef = useRef<AgGridReact<WriteoffDestinationItem>>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rowData, setRowData] = useState<WriteoffDestinationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WriteoffDestinationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WriteoffDestinationItem | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWriteoffDestinations({
        page: 1,
        pageSize: 200,
        search: debouncedSearch || undefined,
      });
      setRowData(data.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить назначения');
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setName('');
    setCreateOpen(true);
  };

  const openEdit = (row: WriteoffDestinationItem) => {
    setEditTarget(row);
    setName(row.name);
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Укажите название');
      return;
    }
    try {
      await createWriteoffDestination({ name: trimmed });
      toast.success('Назначение добавлено');
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
      toast.error('Укажите название');
      return;
    }
    try {
      await updateWriteoffDestination(editTarget.id, { name: trimmed });
      toast.success('Назначение обновлено');
      setEditTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка обновления');
    }
  };

  const handleToggleActive = async (row: WriteoffDestinationItem) => {
    try {
      await updateWriteoffDestination(row.id, { isActive: !row.isActive });
      toast.success(row.isActive ? 'Назначение архивировано' : 'Назначение активировано');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteWriteoffDestination(deleteTarget.id);
      if (result.archived) {
        toast.success('Назначение архивировано (есть история списаний)');
      } else {
        toast.success('Назначение удалено');
      }
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка удаления');
    }
  };

  const columnDefs = useMemo<ColDef<WriteoffDestinationItem>[]>(
    () => [
      primaryTextColumnDef({ field: 'name', headerName: 'НАЗВАНИЕ', minWidth: 260 }),
      badgeColumnDef({
        field: 'isActive',
        headerName: 'СТАТУС',
        minWidth: 120,
        filter: false,
        cellRenderer: (params: ICellRendererParams<WriteoffDestinationItem>) => {
          const active = params.value as boolean;
          return (
            <div className="flex items-center h-full w-full min-w-0 overflow-hidden">
              <span
                className={`shrink-0 px-1.5 py-0.5 border rounded text-[8px] font-bold uppercase whitespace-nowrap ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}
              >
                {active ? 'Активно' : 'Архив'}
              </span>
            </div>
          );
        },
      }),
      compactColumnDef({
        field: 'createdAt',
        headerName: 'ДАТА СОЗДАНИЯ',
        minWidth: 120,
        maxWidth: 170,
        valueFormatter: (p) => formatDateTime(String(p.value ?? '')),
        cellClass: 'font-mono text-xs text-slate-600',
      }),
      compactColumnDef({
        headerName: '',
        flex: 1,
        minWidth: 160,
        maxWidth: 240,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<WriteoffDestinationItem>) => {
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
                className="h-6 text-[10px] px-2"
                onClick={() => void handleToggleActive(row)}
              >
                {row.isActive ? 'Архив' : 'Включить'}
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
    ],
    [],
  );

  const defaultColDef = useMemo(() => createDefaultColDef(), []);

  return (
    <div className="h-full flex flex-col max-w-screen-xl mx-auto gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="p-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600"
            title="Назад к настройкам"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Назначения списания</h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
              Настройки → Справочник
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="h-9 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold">
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </div>

      <div className="flex-1 flex flex-col bg-white border border-slate-300 rounded shadow-sm overflow-hidden min-h-0">
        <div className="p-2.5 border-b border-slate-200 bg-slate-50">
          <div className="relative w-72 flex">
            <div className="pl-3 py-1.5 bg-slate-200 border border-slate-300 border-r-0 rounded-l flex items-center text-slate-500">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              placeholder="Поиск по названию..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-r focus:outline-none focus:border-blue-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 relative min-h-[320px]">
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
            <DialogTitle>Добавить назначение</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleCreate()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить назначение</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Отмена
            </Button>
            <Button onClick={() => void handleUpdate()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить назначение?"
        message={
          deleteTarget
            ? `«${deleteTarget.name}». Если есть история списаний — будет архивировано.`
            : ''
        }
        confirmLabel="Удалить"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

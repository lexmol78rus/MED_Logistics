import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AlertCircle, Clock, ShieldAlert, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { fetchExpiry, fetchExpirySummary, type ExpiryListItem } from '../lib/api/expiry';
import { updateLotStatus } from '../lib/api/lots';
import { downloadExport } from '../lib/export/download';
import { ApiError } from '../lib/api/client';
import { canExport, canManageLotStatus } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';

type FilterKey = '' | 'expired' | 'lt30' | 'lt90';

export default function ExpiryControl() {
  const navigate = useNavigate();
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const showActions = canManageLotStatus(userRole);
  const [filter, setFilter] = useState<FilterKey>('');
  const [manufacturer, setManufacturer] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rowData, setRowData] = useState<ExpiryListItem[]>([]);
  const [summary, setSummary] = useState({ expired: 0, lt30: 0, lt90: 0 });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        fetchExpiry({
          page: 1,
          pageSize: 500,
          filter: filter || 'all',
          manufacturer: manufacturer || undefined,
          status: statusFilter || undefined,
        }),
        fetchExpirySummary(),
      ]);
      setRowData(list.items);
      setSummary(sum);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка загрузки');
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, [filter, manufacturer, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = async (row: ExpiryListItem, status: 'QUARANTINE' | 'BLOCKED') => {
    setActionId(row.id);
    try {
      await updateLotStatus(row.id, { status });
      toast.success(status === 'QUARANTINE' ? 'Партия в карантине' : 'Партия заблокирована');
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка');
    } finally {
      setActionId(null);
    }
  };

  const columnDefs = useMemo<ColDef<ExpiryListItem>[]>(
    () => [
      {
        field: 'status',
        headerName: 'Статус',
        width: 120,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<ExpiryListItem>) => {
          const s = params.value as string;
          if (s === 'Просрочено')
            return (
              <span className="inline-flex items-center mt-2.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                {s}
              </span>
            );
          if (s === 'Критичный')
            return (
              <span className="inline-flex items-center mt-2.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                {s}
              </span>
            );
          return (
            <span className="inline-flex items-center mt-2.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
              {s}
            </span>
          );
        },
      },
      {
        field: 'days',
        headerName: 'Осталось (дней)',
        width: 140,
        type: 'numericColumn',
        cellClassRules: {
          'text-rose-600 font-bold': (p) => (p.value as number) < 0,
          'text-red-600 font-bold': (p) => {
            const v = p.value as number;
            return v >= 0 && v < 30;
          },
          'text-amber-600 font-bold': (p) => {
            const v = p.value as number;
            return v >= 30 && v < 90;
          },
        },
      },
      { field: 'expiry', headerName: 'Срок годности', width: 130, cellClass: 'font-mono text-xs text-slate-700' },
      { field: 'lot', headerName: 'LOT / Партия', width: 140, cellClass: 'font-mono text-xs font-bold' },
      { field: 'ref', headerName: 'REF', width: 110, cellClass: 'font-mono text-xs text-slate-500' },
      { field: 'name', headerName: 'Номенклатура', flex: 1, minWidth: 200, cellClass: 'text-xs text-slate-800 font-medium' },
      { field: 'qty', headerName: 'Остаток', width: 100, type: 'numericColumn', cellClass: 'font-mono text-xs font-bold' },
      {
        headerName: 'Действия',
        width: 200,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams<ExpiryListItem>) => {
          const row = params.data;
          if (!row) return null;
          const busy = actionId === row.id;
          return (
            <div className="flex gap-1 items-center h-full py-1">
              {showActions && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200"
                    onClick={() => void handleStatus(row, 'QUARANTINE')}
                  >
                    Карантин
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-red-100 border border-red-300 rounded hover:bg-red-200"
                    onClick={() => void handleStatus(row, 'BLOCKED')}
                  >
                    Блок
                  </button>
                </>
              )}
              <button
                type="button"
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded"
                onClick={() => navigate(`/products/${row.productId}`)}
              >
                Товар
              </button>
            </div>
          );
        },
      },
    ],
    [actionId, navigate, showActions],
  );

  const defaultColDef = useMemo(
    () => ({ sortable: true, filter: true, resizable: true }),
    [],
  );

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">Контроль сроков годности</h2>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Мониторинг партий, требующих внимания</p>
        </div>
        {canExport(userRole) && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => downloadExport('expiry').catch(() => toast.error('Ошибка экспорта'))}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Экспорт
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-rose-50 border border-rose-200 rounded p-3 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-600" />
          <div className="flex items-center text-[11px] font-bold text-rose-700 uppercase tracking-widest mb-1 ml-1.5">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
            Просрочено
          </div>
          <div className="flex items-baseline gap-2 ml-1.5">
            <span className="text-2xl font-bold font-mono text-rose-700 leading-none">{summary.expired}</span>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-3 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500" />
          <div className="flex items-center text-[11px] font-bold text-red-700 uppercase tracking-widest mb-1 ml-1.5">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            Критично (&lt; 30 дней)
          </div>
          <div className="flex items-baseline gap-2 ml-1.5">
            <span className="text-2xl font-bold font-mono text-red-700 leading-none">{summary.lt30}</span>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded p-3 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-400" />
          <div className="flex items-center text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1 ml-1.5">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Внимание (30-90 дней)
          </div>
          <div className="flex items-baseline gap-2 ml-1.5">
            <span className="text-2xl font-bold font-mono text-amber-700 leading-none">{summary.lt90}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        {[
          { key: '' as FilterKey, label: 'Все риски' },
          { key: 'expired' as FilterKey, label: 'Просрочено' },
          { key: 'lt30' as FilterKey, label: '< 30 дней' },
          { key: 'lt90' as FilterKey, label: '< 90 дней' },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${
              filter === f.key ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-300 text-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          placeholder="Производитель"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          className="h-7 px-2 text-xs border border-slate-300 rounded"
        />
        <input
          type="text"
          placeholder="Статус"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-7 px-2 text-xs border border-slate-300 rounded"
        />
      </div>

      <div className="flex-1 border-slate-200 border rounded shadow-sm flex flex-col bg-white overflow-hidden min-h-0">
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Отчет по партиям риска</h3>
          {loading && <span className="text-[10px] text-slate-400">Загрузка...</span>}
        </div>
        <div className="flex-1 w-full relative">
          <div className="ag-theme-quartz absolute inset-0" style={{ '--ag-font-size': '11px', '--ag-header-height': '32px' } as React.CSSProperties}>
            <AgGridReact
              theme="legacy"
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={36}
              headerHeight={32}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

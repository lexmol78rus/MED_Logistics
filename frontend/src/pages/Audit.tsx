import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAuditLogs, type AuditLogItem } from '../lib/api/audit';
import { ApiError } from '../lib/api/client';

export default function Audit() {
  const gridRef = useRef<AgGridReact<AuditLogItem>>(null);
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [rowData, setRowData] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs({
        page,
        pageSize,
        search: searchText || undefined,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRowData(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить аудит');
      setRowData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchText, actionFilter, entityFilter, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const columnDefs = useMemo<ColDef<AuditLogItem>[]>(
    () => [
      { field: 'createdAt', headerName: 'Дата', width: 180, valueFormatter: (p) => new Date(p.value).toLocaleString('ru-RU') },
      { field: 'action', headerName: 'Действие', flex: 1, minWidth: 160 },
      { field: 'entityType', headerName: 'Сущность', width: 110 },
      { field: 'entityId', headerName: 'ID', width: 140 },
      { field: 'actorId', headerName: 'Пользователь', width: 140 },
    ],
    [],
  );

  const onGridReady = (e: GridReadyEvent) => e.api.sizeColumnsToFit();

  const exportCsv = () => {
    gridRef.current?.api.exportDataAsCsv({ fileName: `audit-${Date.now()}.csv` });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Журнал аудита</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            Только ADMIN · {total} записей
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1" /> Экспорт CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-300 rounded p-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            className="w-full h-8 pl-7 pr-2 text-xs border border-slate-300 rounded"
            placeholder="Поиск..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <input
          className="h-8 px-2 text-xs border border-slate-300 rounded w-36"
          placeholder="Действие"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
        />
        <input
          className="h-8 px-2 text-xs border border-slate-300 rounded w-28"
          placeholder="Сущность"
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="date"
          className="h-8 px-2 text-xs border border-slate-300 rounded"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="date"
          className="h-8 px-2 text-xs border border-slate-300 rounded"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
        />
        <Button type="button" size="sm" onClick={() => void load()}>
          Обновить
        </Button>
      </div>

      <div
        className="ag-theme-alpine flex-1 min-h-[400px] bg-white border border-slate-300 rounded overflow-hidden"
        style={{ height: '100%', width: '100%' } as CSSProperties}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          onGridReady={onGridReady}
          loading={loading}
          domLayout="normal"
          suppressCellFocus
          rowHeight={32}
          headerHeight={32}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>
          Стр. {page} / {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

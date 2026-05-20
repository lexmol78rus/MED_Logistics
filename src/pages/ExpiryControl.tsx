import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react';

export default function ExpiryControl() {
  const rowData = [
    { id: 1, lot: 'ПАР-А482Х', ref: 'REF-1102', name: 'Раствор натрия хлорида 500мл', expiry: '2026-06-01', days: 12, qty: 120, status: 'Критичный' },
    { id: 2, lot: 'ПАР-В991У', ref: 'REF-4421', name: 'Обезболивающее в/в 100мг', expiry: '2026-06-07', days: 18, qty: 45, status: 'Критичный' },
    { id: 3, lot: 'ПАР-С110З', ref: 'REF-6632', name: 'Бинт медицинский 10см', expiry: '2026-06-13', days: 24, qty: 890, status: 'Критичный' },
    { id: 4, lot: 'ПАР-Д992Х', ref: 'REF-8842', name: 'Маска хирургическая L3', expiry: '2026-07-20', days: 61, qty: 5000, status: 'Внимание' },
    { id: 5, lot: 'ПАР-Е114А', ref: 'REF-2234', name: 'Шприц инъекционный 5мл', expiry: '2026-08-15', days: 87, qty: 2000, status: 'Внимание' },
    { id: 6, lot: 'ПАР-Я001Х', ref: 'REF-9931', name: 'Перчатки латексные M', expiry: '2024-04-10', days: -40, qty: 50, status: 'Просрочено' },
  ];

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'status', 
      headerName: 'Статус',
      width: 120,
      pinned: 'left',
      cellRenderer: (params: any) => {
        const s = params.value;
        if (s === 'Просрочено') return <span className="inline-flex items-center mt-2.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">{s}</span>;
        if (s === 'Критичный') return <span className="inline-flex items-center mt-2.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">{s}</span>;
        return <span className="inline-flex items-center mt-2.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">{s}</span>;
      }
    },
    { field: 'days', headerName: 'Осталось (дней)', width: 140, type: 'numericColumn', cellClassRules: {
      'text-rose-600 font-bold': 'x <= 30',
      'text-amber-600 font-bold': 'x > 30 && x <= 90'
    }},
    { field: 'expiry', headerName: 'Срок годности', width: 130, cellClass: 'font-mono text-xs text-slate-700' },
    { field: 'lot', headerName: 'ЛОТ / Партия', width: 140, cellClass: 'font-mono text-xs font-bold' },
    { field: 'ref', headerName: 'АРТ', width: 110, cellClass: 'font-mono text-xs text-slate-500' },
    { field: 'name', headerName: 'Номенклатура', flex: 1, minWidth: 200, cellClass: 'text-xs text-slate-800 font-medium' },
    { field: 'qty', headerName: 'Остаток', width: 100, type: 'numericColumn', cellClass: 'font-mono text-xs font-bold' },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">Контроль сроков годности</h2>
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Мониторинг партий, требующих внимания</p>
      </div>

      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-rose-50 border border-rose-200 rounded p-3 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-600" />
          <div className="flex items-center text-[11px] font-bold text-rose-700 uppercase tracking-widest mb-1 ml-1.5">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
            Просрочено
          </div>
          <div className="flex items-baseline gap-2 ml-1.5">
            <span className="text-2xl font-bold font-mono text-rose-700 leading-none">1</span>
            <span className="text-[10px] font-medium text-rose-600/80 uppercase">к списанию</span>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded p-3 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500" />
          <div className="flex items-center text-[11px] font-bold text-red-700 uppercase tracking-widest mb-1 ml-1.5">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            Критично (&lt; 30 дней)
          </div>
          <div className="flex items-baseline gap-2 ml-1.5">
            <span className="text-2xl font-bold font-mono text-red-700 leading-none">3</span>
            <span className="text-[10px] font-medium text-red-600/80 uppercase">требуют сбыта</span>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-3 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-400" />
          <div className="flex items-center text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1 ml-1.5">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Внимание (30-90 дней)
          </div>
          <div className="flex items-baseline gap-2 ml-1.5">
            <span className="text-2xl font-bold font-mono text-amber-700 leading-none">2</span>
            <span className="text-[10px] font-medium text-amber-600/80 uppercase">план FEFO</span>
          </div>
        </div>
      </div>

      <div className="flex-1 border-slate-200 border rounded shadow-sm flex flex-col bg-white overflow-hidden min-h-0">
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Отчет по партиям риска</h3>
        </div>
        <div className="flex-1 w-full relative">
          <div className="ag-theme-quartz absolute inset-0" style={{'--ag-font-size': '11px', '--ag-header-height': '32px'} as any}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={36}
              headerHeight={32}
              domLayout="normal"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

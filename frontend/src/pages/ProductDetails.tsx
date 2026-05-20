import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, QrCode, Factory, Activity, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = {
    id,
    name: 'Маски хирургические L3',
    ref: 'REF-8842',
    manufacturer: 'МедТех Плюс',
    barcode: '088421000',
    totalQty: 15400,
    status: 'Активен',
    category: 'СИЗ',
    storageCond: 'Хранение: Сухое, до 25C',
  };

  const lotsData = [
    { lotArea: 'Зона A-12', lot: 'ПАР-2023-A', mfgDate: '2023-01-10', expiryDate: '2028-01-10', qty: 5000, status: 'ОК' },
    { lotArea: 'Зона B-04', lot: 'ПАР-2023-B', mfgDate: '2023-05-22', expiryDate: '2028-05-22', qty: 10000, status: 'ОК' },
    { lotArea: 'Зона C-01', lot: 'ПАР-2022-X', mfgDate: '2022-11-05', expiryDate: '2027-11-05', qty: 400, status: 'ВНИМАНИЕ' },
  ];

  const lotsColDef = useMemo<ColDef[]>(() => [
    { field: 'lot', headerName: 'ПАРТИЯ', width: 140, cellClass: 'font-mono text-[11px] font-bold text-slate-700' },
    { field: 'lotArea', headerName: 'ЯЧЕЙКА / ЛОКАЦИЯ', flex: 1, minWidth: 120, cellClass: 'text-xs' },
    { field: 'qty', headerName: 'ОСТАТОК', width: 110, type: 'numericColumn', cellClass: 'font-mono font-bold text-slate-900', valueFormatter: p => p.value.toLocaleString('ru-RU') },
    { field: 'mfgDate', headerName: 'ДАТА ПРОИЗВ.', width: 120, cellClass: 'text-[11px] text-slate-500 font-mono' },
    { 
      field: 'expiryDate', 
      headerName: 'ГОДЕН ДО', 
      width: 120,
      cellClassRules: {
        'text-red-700 font-bold bg-red-50': (params) => {
          const diff = new Date(params.value).getTime() - new Date().getTime();
          return diff < 30 * 24 * 60 * 60 * 1000;
        }
      },
      cellClass: 'text-[11px] font-mono'
    },
    { 
      field: 'status', 
      headerName: 'СТАТУС', 
      width: 100,
      cellRenderer: (params: any) => {
        const s = params.value;
        const color = s === 'ОК' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200';
        return (
          <div className="flex items-center h-full">
            <span className={`px-1.5 py-0.5 border rounded text-[8px] uppercase tracking-wider font-bold ${color}`}>{s}</span>
          </div>
        );
      }
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: true,
  }), []);

  const movementData = [
    { id: 'ПЕР-0921', date: '20.05.2026 07:45', type: 'ПРИХОД', qty: '+5000', user: 'А. Волков' },
    { id: 'ПЕР-0842', date: '18.05.2026 14:20', type: 'РАСХОД', qty: '-2000', user: 'И. Петров' },
    { id: 'ПЕР-0801', date: '15.05.2026 09:10', type: 'ПРИХОД', qty: '+10000', user: 'Е. Смирнова' },
  ];

  return (
    <div className="h-full flex flex-col gap-4 max-w-screen-2xl mx-auto min-h-0">
      <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-slate-300">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/products')} className="h-8 w-8 bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-none">{product.name}</h2>
              <span className="px-2 py-0.5 border border-slate-300 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-600 leading-none">{product.ref}</span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              <span className="flex items-center gap-1"><Factory className="w-3 h-3"/> {product.manufacturer}</span>
              <span className="flex items-center gap-1"><QrCode className="w-3 h-3"/> {product.barcode}</span>
            </div>
          </div>
        </div>
        <div>
          <Button size="sm" variant="outline" className="h-8 text-xs font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
            <Edit className="w-3.5 h-3.5 mr-1.5" />
            Редактировать
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 shrink-0">
        <div className="bg-white border border-slate-300 rounded p-3 shadow-sm flex flex-col justify-between">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Суммарный остаток</div>
          <div className="text-2xl font-bold font-mono tracking-tight text-blue-700">{product.totalQty.toLocaleString('ru-RU')} <span className="text-xs text-slate-500 font-sans font-normal ml-1">шт</span></div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">По 3 активным партиям</div>
        </div>
        <div className="bg-white border border-slate-300 rounded p-3 shadow-sm flex flex-col justify-between border-t-2 border-t-amber-400">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ближайший срок годности</div>
          <div className="text-xl font-bold font-mono tracking-tight text-slate-800">534 ДНЯ</div>
          <div className="text-[10px] text-slate-500 font-medium mt-1 font-mono">05 НОЯ 2027 (ПАР-2022-X)</div>
        </div>
        <div className="bg-white border border-slate-300 rounded p-3 shadow-sm flex flex-col col-span-2">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Логистические параметры</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 flex-1">
            <div className="flex border-b border-dashed border-slate-200 pb-1 items-end justify-between">
              <span className="text-[10px] text-slate-400">Группа ВУ</span>
              <span className="text-xs font-bold text-slate-700">{product.category}</span>
            </div>
            <div className="flex border-b border-dashed border-slate-200 pb-1 items-end justify-between">
              <span className="text-[10px] text-slate-400">Условия</span>
              <span className="text-xs font-bold text-slate-700">{product.storageCond}</span>
            </div>
            <div className="flex border-b border-dashed border-slate-200 pb-1 items-end justify-between">
              <span className="text-[10px] text-slate-400">Статус</span>
              <span className="text-xs font-bold text-emerald-600">{product.status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 flex-1 min-h-0">
        <div className="md:col-span-2 bg-white border border-slate-300 rounded shadow-sm flex flex-col">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center">
            <Box className="w-4 h-4 mr-2 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Разрез по партиям (LOT)</h3>
          </div>
          <div className="flex-1 w-full relative">
            <div className="ag-theme-quartz absolute inset-0" style={{ '--ag-header-background-color': '#f8fafc', '--ag-header-foreground-color': '#64748b', '--ag-font-size': '11px', '--ag-font-family': 'inherit', '--ag-borders-color': '#e2e8f0', '--ag-row-hover-color': '#f1f5f9' } as React.CSSProperties}>
              <AgGridReact
                rowData={lotsData}
                columnDefs={lotsColDef}
                defaultColDef={defaultColDef}
                rowHeight={36}
                headerHeight={32}
                onGridReady={(params: GridReadyEvent) => params.api.sizeColumnsToFit()}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-300 rounded shadow-sm flex flex-col">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">История движения</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="relative border-l border-slate-200 ml-2 space-y-4">
              {movementData.map((mv) => (
                <div key={mv.id} className="relative pl-5">
                  <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                    mv.type === 'ПРИХОД' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{mv.type}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{mv.date}</p>
                      <span className="text-[9px] text-slate-500 mt-1 border border-slate-200 inline-block px-1 rounded bg-slate-50 font-mono font-semibold">
                        {mv.id}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold font-mono tracking-tight ${
                        mv.type === 'ПРИХОД' ? 'text-emerald-600' : 'text-slate-700'
                      }`}>{mv.qty}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{mv.user}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

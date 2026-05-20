import { useMemo, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Plus, Filter, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Products() {
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact>(null);
  const [searchText, setSearchText] = useState('');

  const rowData = [
    { id: 1, status: 'АКТИВЕН', name: 'Маски хирургические L3', ref: 'REF-8842', manufacturer: 'МедТех Плюс', qty: 15400, lots: 4, nearestExpiry: '2027-04-12', barcode: '088421000' },
    { id: 2, status: 'АКТИВЕН', name: 'Раствор натрия хлорида 500мл', ref: 'REF-1102', manufacturer: 'ФармаКорп', qty: 2400, lots: 3, nearestExpiry: '2026-06-01', barcode: '011021000' },
    { id: 3, status: 'ВНИМАНИЕ', name: 'Перчатки латексные M', ref: 'REF-9931', manufacturer: 'ГловМед', qty: 450, lots: 2, nearestExpiry: '2026-06-15', barcode: '099311000' },
    { id: 4, status: 'АКТИВЕН', name: 'Шприцы 5мл Луер-Лок', ref: 'REF-2234', manufacturer: 'МедТех Плюс', qty: 8900, lots: 5, nearestExpiry: '2028-01-20', barcode: '022341000' },
    { id: 5, status: 'КРИТИЧНО', name: 'Бинты марлевые 10см стерильные', ref: 'REF-6632', manufacturer: 'ТекстильМед', qty: 120, lots: 1, nearestExpiry: '2026-05-25', barcode: '066321000' },
    { id: 6, status: 'ОТСУТСТВУЕТ', name: 'Обезболивающее в/в 100мг', ref: 'REF-4421', manufacturer: 'ФармаКорп', qty: 0, lots: 0, nearestExpiry: 'Н/Д', barcode: '044211000' },
  ];

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'status', 
      headerName: 'СТАТУС',
      width: 130,
      pinned: 'left',
      cellRenderer: (params: any) => {
        const s = params.value;
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
      }
    },
    { field: 'ref', headerName: 'АРТИКУЛПРП', width: 130, pinned: 'left', cellClass: 'font-mono text-xs font-bold text-slate-600' },
    { field: 'name', headerName: 'НОМЕНКЛАТУРА', flex: 1, minWidth: 200, cellClass: 'font-medium text-slate-800' },
    { field: 'manufacturer', headerName: 'ИЗГОТОВИТЕЛЬ', width: 160, cellClass: 'text-slate-600 text-xs' },
    { field: 'qty', headerName: 'ОСТАТОК', width: 110, type: 'numericColumn', cellClass: 'font-mono font-bold text-slate-900',
      valueFormatter: (params) => params.value.toLocaleString('ru-RU')
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
          const diff = new Date(params.value).getTime() - new Date().getTime();
          return diff < 30 * 24 * 60 * 60 * 1000; // < 30 days
        }
      }
    },
    { field: 'barcode', headerName: 'ШТРИХКОД', width: 130, cellClass: 'font-mono text-[10px] text-slate-400' },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: true,
  }), []);

  const onFilterTextBoxChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    gridRef.current?.api.setGridOption('quickFilterText', e.target.value);
  };

  const onGridReady = (params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Экспорт
          </Button>
          <Button size="sm" className="h-8 text-xs font-semibold bg-blue-700 hover:bg-blue-800">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Добавить ТМЦ
          </Button>
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
              placeholder="Мгновенный поиск по АРТ, Наименованию..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-r focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchText}
              onChange={onFilterTextBoxChanged}
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-white border-slate-300 text-slate-700">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Фильтры
          </Button>
        </div>
        
        <div className="flex-1 w-full relative">
          <div className="ag-theme-quartz absolute inset-0" style={{ '--ag-header-background-color': '#f8fafc', '--ag-header-foreground-color': '#64748b', '--ag-font-size': '12px', '--ag-font-family': 'inherit', '--ag-borders-color': '#e2e8f0', '--ag-row-hover-color': '#f1f5f9' } as React.CSSProperties}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="single"
              onRowClicked={(e) => navigate(`/products/${e.data.id}`)}
              rowHeight={40}
              headerHeight={36}
              onGridReady={onGridReady}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

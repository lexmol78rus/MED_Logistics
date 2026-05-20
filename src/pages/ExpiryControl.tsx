import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react';

export default function ExpiryControl() {
  const rowData = [
    { id: 1, lot: 'LT-A482X', ref: 'REF-1102', name: 'Saline Solution 500ml', expiry: '2026-06-01', days: 12, qty: 120, status: 'Critical' },
    { id: 2, lot: 'LT-B991Y', ref: 'REF-4421', name: 'Painkiller IV 100mg', expiry: '2026-06-07', days: 18, qty: 45, status: 'Critical' },
    { id: 3, lot: 'LT-C110Z', ref: 'REF-6632', name: 'Bandages 10cm', expiry: '2026-06-13', days: 24, qty: 890, status: 'Critical' },
    { id: 4, lot: 'LT-D992X', ref: 'REF-8842', name: 'Surgical Masks L3', expiry: '2026-07-20', days: 61, qty: 5000, status: 'Warning' },
    { id: 5, lot: 'LT-E114A', ref: 'REF-2234', name: 'Syringes 5ml', expiry: '2026-08-15', days: 87, qty: 2000, status: 'Warning' },
    { id: 6, lot: 'LT-Z001X', ref: 'REF-9931', name: 'Latex Gloves M', expiry: '2026-04-10', days: -40, qty: 50, status: 'Expired' },
  ];

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'status', 
      headerName: 'Status',
      width: 130,
      pinned: 'left',
      cellRenderer: (params: any) => {
        const s = params.value;
        if (s === 'Expired') return <Badge variant="destructive" className="bg-rose-600 uppercase text-[10px] tracking-wider mt-2.5">{s}</Badge>;
        if (s === 'Critical') return <Badge variant="destructive" className="uppercase text-[10px] tracking-wider mt-2.5">{s}</Badge>;
        return <Badge variant="secondary" className="uppercase text-warning text-[10px] tracking-wider mt-2.5">{s}</Badge>;
      }
    },
    { field: 'days', headerName: 'Days Left', width: 120, type: 'numericColumn', cellClassRules: {
      'text-rose-500 font-bold': 'x <= 30',
      'text-amber-500 font-bold': 'x > 30 && x <= 90'
    }},
    { field: 'expiry', headerName: 'Expiry Date', width: 140, cellClass: 'font-mono' },
    { field: 'lot', headerName: 'LOT Number', width: 160, cellClass: 'font-mono font-semibold' },
    { field: 'ref', headerName: 'REF', width: 130, cellClass: 'font-mono text-muted-foreground' },
    { field: 'name', headerName: 'Product Name', flex: 1, minWidth: 200 },
    { field: 'qty', headerName: 'Current Qty', width: 130, type: 'numericColumn', cellClass: 'font-mono font-bold' },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="p-8 pb-12 h-full flex flex-col max-w-screen-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Expiry Control</h2>
        <p className="text-muted-foreground mt-1">Monitor approaching expirations and manage expired quarantine stock.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-rose-500/50 bg-rose-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-500 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Already Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-rose-600">1</div>
            <p className="text-xs text-rose-500/80 mt-1">LOTs requiring disposal</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-white shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Critical (&lt; 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-destructive">3</div>
            <p className="text-xs text-muted-foreground mt-1">Action required immediately</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Warning (30-90 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">2</div>
            <p className="text-xs text-muted-foreground mt-1">Review upcoming FEFO plans</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-white border-slate-200 shadow-sm">
        <div className="p-4 border-b border-border bg-card">
          <h3 className="font-semibold text-base">At-Risk Inventory List</h3>
        </div>
        <div className="flex-1 w-full relative">
          <div className="ag-theme-quartz absolute inset-0">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowHeight={48}
              headerHeight={40}
              domLayout="normal"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

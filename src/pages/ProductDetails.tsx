import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, QrCode, Factory, Timer, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data fetching based on ID
  const product = {
    id,
    name: 'Surgical Masks L3',
    ref: 'REF-8842',
    manufacturer: 'MedTech Inc',
    barcode: '088421000',
    totalQty: 15400,
    status: 'Active',
    category: 'PPE',
    storageCond: 'Room Temp, Dry',
  };

  const lotsData = [
    { lotArea: 'A-12', lot: 'LT-2023-A', mfgDate: '2023-01-10', expiryDate: '2028-01-10', qty: 5000, status: 'Good' },
    { lotArea: 'B-04', lot: 'LT-2023-B', mfgDate: '2023-05-22', expiryDate: '2028-05-22', qty: 10000, status: 'Good' },
    { lotArea: 'C-01', lot: 'LT-2022-X', mfgDate: '2022-11-05', expiryDate: '2027-11-05', qty: 400, status: 'Good' },
  ];

  const lotsColDef = useMemo<ColDef[]>(() => [
    { field: 'lot', headerName: 'LOT Number', width: 180, cellClass: 'font-mono text-xs font-semibold' },
    { field: 'lotArea', headerName: 'Location', width: 130 },
    { field: 'qty', headerName: 'Quantity', width: 120, type: 'numericColumn', cellClass: 'font-mono font-bold' },
    { field: 'mfgDate', headerName: 'Mfg Date', width: 150 },
    { 
      field: 'expiryDate', 
      headerName: 'Expiry Date', 
      width: 150,
      cellClassRules: {
        'text-destructive font-bold': (params) => {
          const diff = new Date(params.value).getTime() - new Date().getTime();
          return diff < 30 * 24 * 60 * 60 * 1000;
        }
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full">
          <Badge variant="outline" className="text-[10px] uppercase font-bold">{params.value}</Badge>
        </div>
      )
    },
  ], []);

  const movementData = [
    { id: 'MV-0921', date: '2026-05-20 07:45', type: 'IN', qty: '+5000', user: 'Admin User' },
    { id: 'MV-0842', date: '2026-05-18 14:20', type: 'OUT', qty: '-2000', user: 'J. Smith' },
    { id: 'MV-0801', date: '2026-05-15 09:10', type: 'IN', qty: '+10000', user: 'M. Johnson' },
  ];

  return (
    <div className="p-8 pb-12 max-w-screen-2xl mx-auto space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-3xl font-bold tracking-tight">{product.name}</h2>
              <Badge variant="secondary" className="font-mono">{product.ref}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm flex items-center space-x-4">
              <span className="flex items-center"><Factory className="w-4 h-4 mr-1"/> {product.manufacturer}</span>
              <span className="flex items-center"><QrCode className="w-4 h-4 mr-1"/> {product.barcode}</span>
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button>Edit Product</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{product.totalQty}</div>
            <p className="text-xs text-muted-foreground mt-1">Across 3 active LOTs</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nearest Expiry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-foreground">534 Days</div>
            <p className="text-xs text-muted-foreground mt-1">Nov 05, 2027 (LT-2022-X)</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Logistics Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mt-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{product.category}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Storage:</span>
                <span className="font-medium">{product.storageCond}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="flex flex-col flex-1 h-[400px] bg-white border-slate-200 shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-lg flex items-center">
                <Box className="w-5 h-5 mr-2 text-primary" />
                Active LOTs Inventory
              </CardTitle>
            </CardHeader>
            <div className="flex-1 w-full relative">
              <div className="ag-theme-quartz absolute inset-0">
                <AgGridReact
                  rowData={lotsData}
                  columnDefs={lotsColDef}
                  rowHeight={48}
                  headerHeight={40}
                  domLayout="normal"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="h-[400px] flex flex-col bg-white border-slate-200 shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-lg flex items-center">
                <Activity className="w-5 h-5 mr-2 text-primary" />
                Recent Movements
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pr-4">
              <div className="relative border-l border-border ml-3 space-y-6 pb-4">
                {movementData.map((mv) => (
                  <div key={mv.id} className="relative pl-6">
                    <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${
                      mv.type === 'IN' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{mv.type} Stock</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{mv.date}</p>
                        <p className="text-xs text-muted-foreground mt-1 border border-border inline-block px-1.5 py-0.5 rounded bg-secondary/50 font-mono">
                          {mv.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold font-mono ${
                          mv.type === 'IN' ? 'text-emerald-500' : ''
                        }`}>{mv.qty}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{mv.user}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

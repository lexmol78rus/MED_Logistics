import { useMemo, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Plus, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function Products() {
  const navigate = useNavigate();
  const gridRef = useRef<AgGridReact>(null);
  const [searchText, setSearchText] = useState('');

  const rowData = [
    { id: 1, status: 'Active', name: 'Surgical Masks L3', ref: 'REF-8842', manufacturer: 'MedTech Inc', qty: 15400, lots: 4, nearestExpiry: '2027-04-12', barcode: '088421000' },
    { id: 2, status: 'Active', name: 'Saline Solution 500ml', ref: 'REF-1102', manufacturer: 'PharmaCorp', qty: 2400, lots: 3, nearestExpiry: '2026-06-01', barcode: '011021000' },
    { id: 3, status: 'Warning', name: 'Latex Gloves M', ref: 'REF-9931', manufacturer: 'GloveMed', qty: 450, lots: 2, nearestExpiry: '2026-06-15', barcode: '099311000' },
    { id: 4, status: 'Active', name: 'Syringes 5ml', ref: 'REF-2234', manufacturer: 'MedTech Inc', qty: 8900, lots: 5, nearestExpiry: '2028-01-20', barcode: '022341000' },
    { id: 5, status: 'Critical', name: 'Bandages 10cm', ref: 'REF-6632', manufacturer: 'WrapIt', qty: 120, lots: 1, nearestExpiry: '2026-05-25', barcode: '066321000' },
    { id: 6, status: 'Out of Stock', name: 'Painkiller IV 100mg', ref: 'REF-4421', manufacturer: 'PharmaCorp', qty: 0, lots: 0, nearestExpiry: 'N/A', barcode: '044211000' },
  ];

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'status', 
      headerName: 'Status',
      width: 120,
      cellRenderer: (params: any) => {
        const status = params.value;
        let variant = 'default';
        if (status === 'Critical' || status === 'Out of Stock') variant = 'destructive';
        if (status === 'Warning') variant = 'secondary'; // Could use a custom yellow badge
        return (
          <div className="flex items-center h-full">
            <Badge variant={variant as any} className="text-[10px] uppercase font-bold tracking-wider">
              {status}
            </Badge>
          </div>
        );
      }
    },
    { field: 'ref', headerName: 'REF', width: 130, pinned: 'left', cellClass: 'font-mono text-xs text-muted-foreground font-semibold' },
    { field: 'name', headerName: 'Product Name', flex: 1, minWidth: 200 },
    { field: 'manufacturer', headerName: 'Manufacturer', width: 160 },
    { field: 'qty', headerName: 'Quantity', width: 120, type: 'numericColumn', cellClass: 'font-mono font-semibold' },
    { field: 'lots', headerName: 'Lots Count', width: 120, type: 'numericColumn' },
    { 
      field: 'nearestExpiry', 
      headerName: 'Nearest Expiry', 
      width: 150,
      cellClassRules: {
        'text-destructive font-bold': (params) => {
          if (params.value === 'N/A') return false;
          const diff = new Date(params.value).getTime() - new Date().getTime();
          return diff < 30 * 24 * 60 * 60 * 1000; // < 30 days
        }
      }
    },
    { field: 'barcode', headerName: 'Barcode', width: 150, cellClass: 'font-mono text-xs' },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const onFilterTextBoxChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    gridRef.current?.api.setGridOption('quickFilterText', e.target.value);
  };

  return (
    <div className="p-8 pb-12 h-full flex flex-col max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Master</h2>
          <p className="text-muted-foreground mt-1">Manage dictionary of medical items and their total stock levels.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-white border-slate-200 shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card text-card-foreground">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search REF, Name, or Barcode..."
              className="pl-9 h-9"
              value={searchText}
              onChange={onFilterTextBoxChanged}
            />
          </div>
          <Button variant="ghost" size="sm" className="h-9">
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </Button>
        </div>
        
        <div className="flex-1 w-full relative">
          <div className="ag-theme-quartz absolute inset-0">
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="single"
              onRowClicked={(e) => navigate(`/products/${e.data.id}`)}
              rowHeight={52}
              headerHeight={48}
              domLayout="normal"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

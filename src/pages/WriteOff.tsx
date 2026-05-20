import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Hash, BoxSelect, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function WriteOff() {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Mock
  const handleSearch = () => {
    setSelectedProduct({
      name: 'Saline Solution 500ml',
      ref: 'REF-1102',
      qtyReq: '',
      lots: [
        { lot: 'LT-2023-A', expiry: '2026-06-01', qty: 400, fefo: true },
        { lot: 'LT-2023-C', expiry: '2027-01-15', qty: 2000, fefo: false },
      ]
    });
  };

  const handleConfirm = () => {
    toast.success('Stock written off successfully (FEFO optimal).');
    setSelectedProduct(null);
    setSearch('');
  };

  return (
    <div className="p-8 pb-12 max-w-4xl mx-auto h-full overflow-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Write-off / Issue</h2>
        <p className="text-muted-foreground mt-2">Deduct stock following FEFO (First Expired, First Out) rules.</p>
      </div>

      <div className="space-y-8">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Product Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter REF or Barcode..."
                  className="pl-10 h-12"
                />
              </div>
              <Button onClick={handleSearch} className="h-12 px-8">Find</Button>
            </div>
          </CardContent>
        </Card>

        {selectedProduct && (
          <Card className="animate-in slide-in-from-bottom-4 fade-in duration-300 border-slate-200 bg-white shadow-md">
            <CardHeader className="bg-secondary/30 pb-4 border-b border-border">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{selectedProduct.name}</CardTitle>
                  <CardDescription className="font-mono mt-1">{selectedProduct.ref}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Available</div>
                  <div className="text-xl font-bold font-mono text-foreground">2,400</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
                <div className="flex items-center text-emerald-500 font-semibold mb-2">
                  <BoxSelect className="w-5 h-5 mr-2" />
                  FEFO Recommendation
                </div>
                <p className="text-sm text-muted-foreground">The system has selected the optimal LOTs to issue based on closest expiry date. Please pick physical stock matching these LOT numbers.</p>
                
                <div className="mt-4 space-y-3">
                  {selectedProduct.lots.map((lot: any, idx: number) => (
                    <div key={idx} className={`p-3 rounded border flex items-center justify-between ${lot.fefo ? 'bg-background border-emerald-500/50 relative overflow-hidden' : 'bg-background/50 border-border opacity-60'}`}>
                      {lot.fefo && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                      <div className="flex items-center space-x-4 ml-2">
                        <div>
                          <p className="font-mono font-bold text-sm">{lot.lot}</p>
                          <p className={`text-xs mt-0.5 ${lot.fefo ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            Exp: {lot.expiry} {lot.fefo && '(Priority)'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center space-x-4">
                         <div className="text-sm text-muted-foreground">Avail: {lot.qty}</div>
                         {lot.fefo && (
                          <div className="w-24">
                            <Input type="number" defaultValue={0} min="0" max={lot.qty} className="h-8 font-mono text-right" />
                          </div>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center bg-secondary/50 p-4 rounded-lg">
                   <div className="font-semibold">Total Write-off Quantity</div>
                   <div className="text-2xl font-bold font-mono">0</div>
                </div>
                
                <div className="bg-amber-500/10 text-amber-500 p-3 rounded flex items-start text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  Ensure physical stock being packed exactly matches the LOT numbers deducted above to prevent inventory skew.
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="bg-secondary/20 border-t border-border pt-6 flex justify-end space-x-4">
              <Button variant="ghost" onClick={() => setSelectedProduct(null)}>Cancel</Button>
              <Button onClick={handleConfirm} className="min-w-[150px]">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Issue Stock
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

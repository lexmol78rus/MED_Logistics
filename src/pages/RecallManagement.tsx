import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, AlertOctagon, Lock, FileWarning, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function RecallManagement() {
  const [searchLot, setSearchLot] = useState('');
  const [lotData, setLotData] = useState<any>(null);

  const handleSearch = () => {
    // Mock
    setLotData({
      lot: 'LT-C110Z',
      ref: 'REF-6632',
      name: 'Bandages 10cm',
      status: 'Active', // Could be Recalled
      qty: 890,
      locations: ['Zone A-12', 'Zone B-04'],
      distributed: 120,
    });
  };

  const handleLock = () => {
    setLotData({ ...lotData, status: 'Locked / Recalled' });
    toast.error('LOT locked. All outbound movements for this LOT are now blocked.', {
      icon: <Lock className="w-5 h-5 text-white" />
    });
  };

  return (
    <div className="p-8 pb-12 max-w-4xl mx-auto h-full overflow-auto">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-rose-500/10 rounded-full mb-4 text-rose-500">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-rose-500">Recall Management</h2>
        <p className="text-muted-foreground mt-2">Instantly lock and quarantine physical stock matching manufacturer recall notices.</p>
      </div>

      <div className="space-y-6">
        <Card className="border-rose-500/20 shadow-md relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 w-1 bg-rose-500 h-full" />
          <CardHeader>
            <CardTitle>Target LOT Traceability</CardTitle>
            <CardDescription>Enter the LOT number provided in the manufacturer's alert.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchLot}
                  onChange={(e) => setSearchLot(e.target.value)}
                  placeholder="Enter Exact LOT Number..."
                  className="pl-10 h-12 font-mono uppercase text-lg"
                />
              </div>
              <Button variant="destructive" onClick={handleSearch} className="h-12 px-8">
                Trace LOT
              </Button>
            </div>
          </CardContent>
        </Card>

        {lotData && (
          <Card className="animate-in slide-in-from-bottom-4 fade-in duration-300 bg-white border-slate-200 shadow-md">
            <CardHeader className="bg-secondary/30 border-b border-border">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    {lotData.name}
                    <Badge variant={lotData.status === 'Active' ? 'default' : 'destructive'} className="ml-3 uppercase tracking-wider text-[10px]">
                      {lotData.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="font-mono mt-1 text-sm">
                    {lotData.ref} â€¢ {lotData.lot}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">In Warehouse</div>
                  <div className="text-2xl font-bold font-mono text-foreground">{lotData.qty} <span className="text-sm font-normal text-muted-foreground">units</span></div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded bg-card/50">
                  <div className="text-sm text-muted-foreground mb-1">Stock Locations</div>
                  <div className="font-mono">{lotData.locations.join(', ')}</div>
                </div>
                <div className="p-4 border rounded bg-card/50">
                  <div className="text-sm text-muted-foreground mb-1">Already Distributed (Risk)</div>
                  <div className="font-mono text-rose-500 font-bold flex items-center">
                    <FileWarning className="w-4 h-4 mr-2" />
                    {lotData.distributed} units
                  </div>
                </div>
              </div>

              {lotData.status === 'Active' && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-lg text-center space-y-4">
                  <Lock className="w-8 h-8 text-rose-500 mx-auto" />
                  <div>
                    <h3 className="font-semibold text-rose-500 text-lg">Immediate System Lock</h3>
                    <p className="text-sm text-rose-500/80 mt-1 max-w-lg mx-auto">
                      Executing this action will immediately halt all pending outbound orders containing this LOT and mark physical bins for quarantine.
                    </p>
                  </div>
                  <Button variant="destructive" size="lg" onClick={handleLock} className="min-w-[200px] font-bold shadow-lg shadow-rose-500/20">
                    <Lock className="w-4 h-4 mr-2" />
                    Enforce Quarantine
                  </Button>
                </div>
              )}

              {lotData.status !== 'Active' && (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-rose-500/50 rounded-lg text-rose-500 bg-rose-500/5">
                  <History className="w-12 h-12 mb-4 opacity-50" />
                  <h3 className="font-bold text-lg">LOT is Currently Quarantined</h3>
                  <p className="text-sm text-center opacity-80 mt-2 max-w-md">System safety locks are already engaged for this LOT. Refer to standard operating procedures for physical disposal.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

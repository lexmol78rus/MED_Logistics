import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScanLine, CheckCircle2, ArrowDownToLine, Keyboard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Receiving() {
  const [barcode, setBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [lot, setLot] = useState('');
  const [expiry, setExpiry] = useState('');
  const [qty, setQty] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus scanner input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;
    
    // Mock dictionary lookup
    if (barcode === '088421000') {
      setScannedProduct({ name: 'Surgical Masks L3', ref: 'REF-8842', manufacturer: 'MedTech Inc' });
      toast.success('Product identified.');
    } else {
      toast.error('Product not found. Please register it first.');
    }
  };

  const handleConfirm = () => {
    if (!lot || !expiry || !qty) {
      toast.error('Please fill all LOT details.');
      return;
    }
    toast.success('Stock received successfully.');
    
    // Reset
    setBarcode('');
    setScannedProduct(null);
    setLot('');
    setExpiry('');
    setQty('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="p-8 h-full max-w-4xl mx-auto flex flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mx-auto mb-4">
          <ArrowDownToLine className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Receiving Workflow</h2>
        <p className="text-muted-foreground mt-2">Scan product barcode to begin inbound process.</p>
      </div>

      <div className="grid gap-8">
        <Card className="border-2 border-blue-500/20 shadow-lg relative overflow-hidden bg-white">
          {/* Subtle animated scanline background for visual flair */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-full w-full pointer-events-none opacity-50" />
          
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <ScanLine className="w-5 h-5 mr-3 text-primary animate-pulse" />
              Scan Barcode (Step 1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="flex space-x-4 relative z-10">
              <div className="flex-1 relative">
                <Keyboard className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Waiting for scanner input..."
                  className="pl-12 h-14 text-lg font-mono font-bold bg-secondary/30 ring-offset-background placeholder:text-muted-foreground/50 border-input"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <Button type="submit" className="h-14 px-8 text-md font-semibold">
                Lookup
              </Button>
            </form>
          </CardContent>
        </Card>

        {scannedProduct && (
          <Card className="border-slate-200 shadow-md animate-in slide-in-from-bottom-4 fade-in duration-300 bg-white">
            <CardHeader className="bg-secondary/30 border-b border-border pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center">
                    <CheckCircle2 className="w-6 h-6 mr-2 text-emerald-500" />
                    {scannedProduct.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm font-mono text-muted-foreground">
                    {scannedProduct.ref} â€¢ {scannedProduct.manufacturer}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="lot">LOT Number</Label>
                  <Input 
                    id="lot" 
                    value={lot} 
                    onChange={(e) => setLot(e.target.value)} 
                    placeholder="e.g. LT-2023-B" 
                    className="h-12 font-mono uppercase" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input 
                    id="expiry" 
                    type="date" 
                    value={expiry} 
                    onChange={(e) => setExpiry(e.target.value)} 
                    className="h-12 font-mono" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Received Qty</Label>
                  <Input 
                    id="qty" 
                    type="number" 
                    min="1"
                    value={qty} 
                    onChange={(e) => setQty(e.target.value)} 
                    placeholder="0" 
                    className="h-12 font-mono text-lg" 
                  />
                </div>
              </div>
              
              <div className="bg-blue-500/10 text-blue-500 p-4 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                <p className="text-sm">Please verify the LOT and Expiry printed on the physical package matches the entered data exactly. FEFO logic relies on this data.</p>
              </div>
            </CardContent>
            <CardFooter className="bg-secondary/20 border-t border-border pt-6 flex justify-end space-x-4">
              <Button variant="ghost" onClick={() => setScannedProduct(null)}>Cancel</Button>
              <Button size="lg" className="min-w-[150px]" onClick={handleConfirm}>Confirm & Receive</Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

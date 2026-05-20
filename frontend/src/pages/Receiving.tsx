import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;
    
    if (barcode === '088421000') {
      setScannedProduct({ name: 'Маски хирургические L3', ref: 'REF-8842', manufacturer: 'МедТех Плюс' });
      toast.success('Товар идентифицирован в базе.');
    } else {
      toast.error('Неизвестный штрихкод. Заведите карточку в справочнике.');
    }
  };

  const handleConfirm = () => {
    if (!lot || !expiry || !qty) {
      toast.error('Заполните обязательные атрибуты партии: ПАРТИЯ, СРОК, КОЛ-ВО.');
      return;
    }
    toast.success('ТМЦ успешно оприходованы на склад.');
    
    setBarcode('');
    setScannedProduct(null);
    setLot('');
    setExpiry('');
    setQty('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="h-full max-w-4xl mx-auto flex flex-col justify-center pb-20">
      <div className="mb-6 flex flex-col items-center">
        <div className="w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded mb-3 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <ArrowDownToLine className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Рабочее место приемки (РМП)</h2>
        <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Отсканируйте код маркировки для старта</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-white border-2 border-blue-200 rounded-md shadow-md relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent pointer-events-none" />
          
          <div className="p-4 border-b border-blue-100 flex items-center bg-blue-50/30">
            <ScanLine className="w-4 h-4 mr-2 text-blue-600 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Шаг 1: Идентификация по штрихкоду</h3>
          </div>
          
          <div className="p-6 relative z-10">
            <form onSubmit={handleScan} className="flex gap-4">
              <div className="flex-1 relative">
                <Keyboard className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Ожидание ввода со сканера..."
                  className="w-full pl-9 h-11 px-3 py-2 border-2 text-sm font-mono font-bold bg-slate-50 border-slate-300 rounded focus:border-blue-500 focus:bg-white focus:outline-none transition-colors placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 text-blue-900"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <Button type="submit" className="h-11 px-8 text-sm font-bold bg-blue-700 hover:bg-blue-800">
                Запросить ВУ
              </Button>
            </form>
          </div>
        </div>

        {scannedProduct && (
          <div className="bg-white border border-slate-300 rounded-md shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300 overflow-hidden">
            <div className="px-5 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
                  {scannedProduct.name}
                </h3>
                <div className="flex items-center mt-1 text-[11px] font-mono font-medium text-slate-600">
                  <span className="font-bold text-slate-800 bg-white border border-slate-200 px-1 py-0.5 rounded">{scannedProduct.ref}</span>
                  <span className="mx-2 text-slate-300 pl-1">|</span>
                  <span className="font-sans uppercase">{scannedProduct.manufacturer}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Номер партии (LOT)</label>
                  <input
                    value={lot} 
                    onChange={(e) => setLot(e.target.value)} 
                    placeholder="ПАР-202X-..." 
                    className="h-10 px-3 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono uppercase text-sm font-bold text-slate-800"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Годен до</label>
                  <input
                    type="date" 
                    value={expiry} 
                    onChange={(e) => setExpiry(e.target.value)} 
                    className="h-10 px-3 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm text-slate-800 uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Кол-во (Осн. ед.)</label>
                  <input
                    type="number" 
                    min="1"
                    value={qty} 
                    onChange={(e) => setQty(e.target.value)} 
                    placeholder="0" 
                    className="h-10 px-3 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-base font-bold text-slate-900"
                  />
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-tight font-medium">Внимание: Убедитесь в точном соответствии номера партии (LOT) и срока годности. Ошибка на этапе приемки нарушит алгоритм FEFO при списании.</p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setScannedProduct(null)} className="h-9 text-xs font-semibold border-slate-300 text-slate-600 bg-white">Сброс</Button>
              <Button className="h-9 min-w-[140px] text-xs font-bold bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirm}>Оприходовать партию</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, BoxSelect, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export default function WriteOff() {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleSearch = () => {
    setSelectedProduct({
      name: 'Раствор натрия хлорида 500мл',
      ref: 'REF-1102',
      qtyReq: '',
      lots: [
        { lot: 'ПАР-2023-A', expiry: '2026-06-01', qty: 400, fefo: true },
        { lot: 'ПАР-2023-C', expiry: '2027-01-15', qty: 2000, fefo: false },
      ]
    });
  };

  const handleConfirm = () => {
    toast.success('Товар успешно списан (FEFO соблюден).');
    setSelectedProduct(null);
    setSearch('');
  };

  return (
    <div className="h-full max-w-4xl mx-auto flex flex-col gap-4 py-8">
      <div className="mb-2">
        <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">Расход / Списание со склада</h2>
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Приоритет: соблюдение правила FEFO</p>
      </div>

      <div className="bg-white border border-slate-300 rounded shadow-sm flex items-center p-2 gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Отсканируйте АРТ или введите штрихкод..."
            className="w-full pl-8 h-9 text-sm border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 px-2 border outline-none font-mono placeholder:font-sans placeholder:text-slate-400 font-bold text-blue-900"
          />
        </div>
        <Button onClick={handleSearch} className="h-9 px-6 bg-slate-800 hover:bg-slate-900 text-xs font-bold">
          Найти
        </Button>
      </div>

      {selectedProduct && (
        <div className="bg-white border border-slate-300 shadow-md rounded overflow-hidden animate-in fade-in duration-300 flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">{selectedProduct.name}</h3>
              <div className="font-mono mt-1 text-xs font-bold text-slate-500 bg-white border border-slate-200 inline-block px-1.5 py-0.5 rounded">{selectedProduct.ref}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Доступный остаток</div>
              <div className="text-xl font-bold font-mono tracking-tight text-blue-700">2,400 <span className="text-[10px] text-slate-500 font-sans font-normal">шт</span></div>
            </div>
          </div>
          
          <div className="p-4 flex flex-col gap-4 bg-white">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-4 relative">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500 rounded-l" />
              <div className="flex items-center text-emerald-700 font-bold text-sm mb-1">
                <BoxSelect className="w-4 h-4 mr-1.5" />
                FEFO Рекомендация Системы
              </div>
              <p className="text-[11px] font-medium text-emerald-800/80 leading-tight max-w-2xl">
                Система автоматически приоритезирует партии с наименьшим сроком годности.
              </p>
              
              <div className="mt-4 flex flex-col gap-2">
                <div className="grid grid-cols-12 text-[9px] font-bold uppercase tracking-wider text-emerald-800/60 pb-1 px-2">
                  <div className="col-span-4">Партия</div>
                  <div className="col-span-3">Срок годности</div>
                  <div className="col-span-2 text-right">Наличие</div>
                  <div className="col-span-3 text-right">Списание</div>
                </div>
                {selectedProduct.lots.map((lot: any, idx: number) => (
                  <div key={idx} className={`grid grid-cols-12 items-center p-2 rounded border ${lot.fefo ? 'bg-white border-emerald-300 shadow-sm' : 'bg-slate-50/50 border-slate-200'}`}>
                    <div className="col-span-4 flex items-center">
                      <span className={`font-mono text-xs font-bold ${lot.fefo ? 'text-slate-900' : 'text-slate-500'}`}>{lot.lot}</span>
                    </div>
                    <div className="col-span-3">
                      <span className={`font-mono text-xs ${lot.fefo ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{lot.expiry}</span>
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs font-medium text-slate-500">
                      {lot.qty}
                    </div>
                    <div className="col-span-3 flex justify-end">
                      <input 
                        type="number" 
                        defaultValue={0} 
                        min="0" 
                        max={lot.qty} 
                        className={`w-20 pl-2 pr-1 h-7 text-xs font-mono font-bold text-right border rounded focus:outline-none focus:border-blue-500 ${lot.fefo ? 'bg-white border-slate-300 shadow-inner' : 'bg-slate-100 border-slate-200 text-slate-400'}`} 
                        disabled={!lot.fefo}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded">
               <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Итого к списанию:</div>
               <div className="text-2xl font-bold font-mono text-slate-900">0</div>
            </div>
          </div>
          
          <div className="bg-slate-100 border-t border-slate-200 p-3 flex justify-between items-center">
            <div className="flex items-start text-amber-700 gap-2 max-w-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-[10px] font-bold uppercase leading-tight">Проверьте физическое совпадение партий</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedProduct(null)} className="h-8 text-xs font-semibold bg-white border-slate-300 text-slate-700 hover:bg-slate-50">Отмена</Button>
              <Button onClick={handleConfirm} className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 min-w-[140px]">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> Списать (FEFO)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

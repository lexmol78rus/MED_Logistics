import { useState } from 'react';
import { Search, AlertOctagon, Lock, FileWarning, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RecallManagement() {
  const [searchLot, setSearchLot] = useState('');
  const [lotData, setLotData] = useState<any>(null);

  const handleSearch = () => {
    setLotData({
      lot: 'ПАР-С110З',
      ref: 'REF-6632',
      name: 'Бинт медицинский 10см',
      status: 'Активно', // Could be Recalled
      qty: 890,
      locations: ['Зона A-12', 'Зона B-04'],
      distributed: 120,
    });
  };

  const handleLock = () => {
    setLotData({ ...lotData, status: 'Заблокировано (Карантин)' });
    toast.error('ПАРТИЯ ЗАБЛОКИРОВАНА. Все отгрузки данной отменены.', {
      icon: <Lock className="w-5 h-5 text-white" />
    });
  };

  return (
    <div className="h-full max-w-4xl mx-auto flex flex-col gap-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center p-2 bg-rose-100 rounded text-rose-600 shrink-0">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight text-rose-700">Отзыв партий (Блокировка)</h2>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Карантин и изоляция по предписанию производителя</p>
        </div>
      </div>

      <div className="bg-white border-l-4 border-l-rose-500 border border-slate-300 rounded shadow-sm flex flex-col p-4 gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Поиск партии</h3>
            <p className="text-[11px] text-slate-500 font-medium">Введите номер партии (ЛОТ) согласно бюллетеню отзыва</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchLot}
              onChange={(e) => setSearchLot(e.target.value)}
              placeholder="Введите точный номер партии..."
              className="w-full pl-8 h-9 text-sm border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-rose-500 px-2 border outline-none font-mono uppercase font-bold text-rose-900 placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
            />
          </div>
          <Button onClick={handleSearch} className="h-9 px-6 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm">
            Отследить ПАРТИЮ
          </Button>
        </div>
      </div>

      {lotData && (
        <div className="bg-white border border-slate-300 shadow-md rounded overflow-hidden animate-in fade-in duration-300 flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{lotData.name}</h3>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${lotData.status === 'Активно' ? 'bg-slate-200 text-slate-700' : 'bg-rose-600 text-white'}`}>
                  {lotData.status}
                </span>
              </div>
              <div className="font-mono mt-1.5 text-xs font-bold text-slate-500 flex gap-2 items-center">
                <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">{lotData.ref}</span>
                <span className="text-slate-700">{lotData.lot}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Остаток на складе</div>
              <div className="text-xl font-bold font-mono tracking-tight text-slate-900">{lotData.qty} <span className="text-[10px] text-slate-500 font-sans font-normal">шт</span></div>
            </div>
          </div>
          
          <div className="p-4 flex flex-col gap-4 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-slate-200 rounded bg-slate-50 shadow-inner">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Места хранения</div>
                <div className="font-mono text-sm font-bold text-slate-800">{lotData.locations.join(', ')}</div>
              </div>
              <div className="p-3 border border-rose-200 rounded bg-rose-50 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500 rounded-l" />
                <div className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-1.5 pl-1.5 flex items-center">
                  Уже отгружено (РИСК!)
                </div>
                <div className="font-mono text-xl font-bold text-rose-700 leading-none pl-1.5">
                  {lotData.distributed} <span className="text-sm font-sans font-normal opacity-80">шт</span>
                </div>
              </div>
            </div>

            {lotData.status === 'Активно' && (
              <div className="bg-rose-50 border border-rose-200 p-6 rounded text-center flex flex-col items-center">
                <Lock className="w-8 h-8 text-rose-600 mb-3" />
                <h3 className="font-bold text-rose-700 text-base mb-1 uppercase tracking-wider">Мгновенная блокировка</h3>
                <p className="text-xs font-semibold text-rose-800/70 max-w-lg mb-6 leading-relaxed">
                  Выполнение этого действия немедленно остановит все текущие исходящие отгрузки с этой партией и пометит все физические ячейки хранения стикером «КАРАНТИН».
                </p>
                <Button onClick={handleLock} className="h-10 px-8 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white min-w-[240px] shadow-md border-b-2 border-rose-800 active:border-b-0 active:mt-[2px]">
                  <Lock className="w-4 h-4 mr-2" /> ЗАБЛОКИРОВАТЬ ПАРТИЮ
                </Button>
              </div>
            )}

            {lotData.status !== 'Активно' && (
              <div className="flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-rose-300 rounded bg-rose-50/50 text-rose-600">
                <History className="w-10 h-10 mb-3 opacity-60" />
                <h3 className="font-bold text-base uppercase tracking-widest">Партия в КАРАНТИНЕ</h3>
                <p className="text-xs font-medium text-center mt-2 max-w-md opacity-80 leading-relaxed uppercase">
                  Системная блокировка АКТИВНА. Обратитесь к регламенту для проведения физической утилизации.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

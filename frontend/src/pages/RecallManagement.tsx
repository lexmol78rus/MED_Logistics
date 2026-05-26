import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, AlertOctagon, Lock, History, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverHint } from '@/components/ui/HoverHint';
import { toast } from 'sonner';
import VoidLotDialog from '../components/lots/VoidLotDialog';
import { LOT_ACTION_HINTS } from '../lib/lots/actionHints';
import { fetchRecallLot, recallUpdateStatus, type RecallLotDetail } from '../lib/api/recall';
import { ApiError } from '../lib/api/client';
import { SHOW_WAREHOUSE_LOCATIONS } from '../lib/pilotFeatures';

export default function RecallManagement() {
  const navigate = useNavigate();
  const [searchLot, setSearchLot] = useState('');
  const [lotData, setLotData] = useState<RecallLotDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchLot.trim()) return;
    setLoading(true);
    try {
      const data = await fetchRecallLot(searchLot.trim());
      setLotData(data);
    } catch (err) {
      setLotData(null);
      toast.error(err instanceof ApiError ? err.message : 'Партия не найдена');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status: 'QUARANTINE' | 'BLOCKED' | 'OK', recall?: boolean) => {
    if (!lotData) return;
    setActing(true);
    try {
      await recallUpdateStatus(lotData.id, status, recall);
      const refreshed = await fetchRecallLot(lotData.lot);
      setLotData(refreshed);
      toast.success('Статус партии обновлён');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка');
    } finally {
      setActing(false);
    }
  };

  const isActive = lotData?.dbStatus === 'OK' || lotData?.dbStatus === 'WARNING';

  const voidButtonClass =
    'bg-white border-2 border-rose-600 text-rose-700 shadow-sm ring-1 ring-rose-100 hover:bg-rose-50 hover:border-rose-700 hover:text-rose-800 disabled:opacity-50';

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
        <div>
          <h3 className="text-sm font-bold text-slate-800">Поиск LOT / Партии</h3>
          <p className="text-[11px] text-slate-500 font-medium">Введите LOT / Партию согласно бюллетеню отзыва</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={searchLot}
              onChange={(e) => setSearchLot(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
              placeholder="Номер партии"
              className="w-full pl-8 h-9 text-sm border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-rose-500 px-2 border outline-none font-mono uppercase font-bold text-rose-900"
            />
          </div>
          <Button
            onClick={() => void handleSearch()}
            disabled={loading}
            className="h-9 px-6 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm"
          >
            {loading ? 'Поиск...' : 'Найти LOT / Партию'}
          </Button>
        </div>
      </div>

      {lotData && (
        <div className="bg-white border border-slate-300 shadow-md rounded overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{lotData.name}</h3>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? 'bg-slate-200 text-slate-700' : 'bg-rose-600 text-white'
                  }`}
                >
                  {lotData.status}
                </span>
              </div>
              <div className="font-mono mt-1.5 text-xs font-bold text-slate-500 flex gap-2 items-center">
                <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                  <span className="text-slate-400 font-sans font-semibold mr-1">REF</span>
                  {lotData.ref}
                </span>
                <span className="text-slate-700">{lotData.lot}</span>
                {lotData.expiry && (
                  <span className="text-slate-500">до {lotData.expiry}</span>
                )}
              </div>
              {lotData.manufacturer && (
                <p className="text-[10px] text-slate-500 mt-1">{lotData.manufacturer}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Остаток на складе</div>
              <div className="text-xl font-bold font-mono tracking-tight text-slate-900">
                {lotData.qty} <span className="text-[10px] text-slate-500 font-sans font-normal">шт</span>
              </div>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-4 bg-white">
            <div className={`grid gap-3 ${SHOW_WAREHOUSE_LOCATIONS ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {SHOW_WAREHOUSE_LOCATIONS && (
                <div className="p-3 border border-slate-200 rounded bg-slate-50 shadow-inner">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Места хранения</div>
                  <div className="font-mono text-sm font-bold text-slate-800">
                    {lotData.locations.length ? lotData.locations.join(', ') : '—'}
                  </div>
                </div>
              )}
              <div className="p-3 border border-rose-200 rounded bg-rose-50 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500 rounded-l" />
                <div className="text-[10px] font-bold text-rose-700 uppercase tracking-widest mb-1.5 pl-1.5">Уже отгружено (РИСК!)</div>
                <div className="font-mono text-xl font-bold text-rose-700 leading-none pl-1.5">
                  {lotData.distributed} <span className="text-sm font-sans font-normal opacity-80">шт</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded p-3">
              <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">История движений</h4>
              <div className="max-h-32 overflow-auto text-xs space-y-1">
                {lotData.movements.map((m) => (
                  <div key={m.reference} className="flex justify-between font-mono border-b border-slate-100 py-1">
                    <span>
                      {m.reference} · {m.type}
                    </span>
                    <span>{m.quantity > 0 ? `-${m.quantity}` : m.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {isActive ? (
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
                <HoverHint tip={LOT_ACTION_HINTS.quarantine} className="inline-flex">
                  <Button
                    disabled={acting}
                    onClick={() => void handleAction('QUARANTINE')}
                    className="h-10 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    Карантин
                  </Button>
                </HoverHint>
                <HoverHint tip={LOT_ACTION_HINTS.block} className="inline-flex">
                  <Button
                    disabled={acting}
                    onClick={() => void handleAction('BLOCKED', true)}
                    className="h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Отзыв (блокировка)
                  </Button>
                </HoverHint>
                <HoverHint
                  tip={
                    lotData.voidable !== false
                      ? LOT_ACTION_HINTS.void
                      : (lotData.voidBlockReason ?? LOT_ACTION_HINTS.void)
                  }
                  className="inline-flex"
                >
                  <Button
                    type="button"
                    variant="outline"
                    disabled={lotData.voidable === false || acting}
                    onClick={() => setVoidOpen(true)}
                    className={`h-10 text-xs font-bold ${voidButtonClass}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2 shrink-0 text-rose-600" />
                    Удалить (ошибочная)
                  </Button>
                </HoverHint>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/products/${lotData.productId}`)}
                  className="h-10 text-xs font-bold border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100"
                >
                  Открыть товар
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 border-2 border-dashed border-rose-300 rounded bg-rose-50/50 text-rose-600 gap-3">
                <History className="w-10 h-10 opacity-60" />
                <h3 className="font-bold text-base uppercase tracking-widest">LOT / Партия изолирована</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    disabled={acting}
                    className="h-9 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold"
                    onClick={() => void handleAction('OK')}
                  >
                    Разблокировать
                  </Button>
                  <HoverHint
                    tip={
                      lotData.voidable !== false
                        ? LOT_ACTION_HINTS.void
                        : (lotData.voidBlockReason ?? LOT_ACTION_HINTS.void)
                    }
                    className="inline-flex"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      disabled={lotData.voidable === false || acting}
                      onClick={() => setVoidOpen(true)}
                      className={`h-9 text-xs font-bold ${voidButtonClass}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2 shrink-0 text-rose-600" />
                      Удалить (ошибочная)
                    </Button>
                  </HoverHint>
                </div>
              </div>
            )}

            {lotData.voidable === false && lotData.voidBlockReason && (
              <p className="text-[11px] text-slate-500 text-center">{lotData.voidBlockReason}</p>
            )}
          </div>
        </div>
      )}

      {lotData && (
        <VoidLotDialog
          open={voidOpen}
          lot={lotData}
          onClose={() => setVoidOpen(false)}
          onSuccess={() => {
            setLotData(null);
            setSearchLot('');
            toast.success('Ошибочная партия удалена');
          }}
        />
      )}
    </div>
  );
}

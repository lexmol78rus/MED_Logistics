import { 
  ArrowRightLeft, 
  PackageSearch, 
  AlertTriangle, 
  Timer, 
  RefreshCcw,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const kpis = [
    { title: 'Стоимость запасов', value: '142.4M ₽', icon: Activity, trend: '+4.2%', trendUp: true },
    { title: 'Позиций на складе', value: '4,821', icon: PackageSearch, trend: '-1.4%', trendUp: false },
    { title: 'Срок годн. < 30 дн', value: '34', icon: Timer, trend: '+12.0%', trendUp: true, warning: true },
    { title: 'Активные отзывы', value: '2', icon: AlertTriangle, trend: 'Критично', trendUp: false, critical: true },
  ];

  const recentMovements = [
    { id: 'ПЕР-0921', type: 'ПРИХОД', ref: 'REF-8842', desc: 'Маски хирургические L3', qty: '+5000', time: '10 мин назад', status: 'выполнено' },
    { id: 'ПЕР-0920', type: 'РАСХОД', ref: 'REF-1102', desc: 'Раствор натрия хлорида 500мл', qty: '-240', time: '45 мин назад', status: 'выполнено' },
    { id: 'ПЕР-0919', type: 'СПИСАНИЕ', ref: 'REF-9931', desc: 'Перчатки латексные M', qty: '-50', time: '2 ч назад', status: 'просрок' },
    { id: 'ПЕР-0918', type: 'ПРИХОД', ref: 'REF-2234', desc: 'Шприцы 5мл', qty: '+1000', time: '3 ч назад', status: 'выполнено' },
    { id: 'ПЕР-0917', type: 'РАСХОД', ref: 'REF-6632', desc: 'Бинты марлевые 10см', qty: '-1200', time: '4 ч назад', status: 'в работе' },
  ];

  const expiringLots = [
    { lot: 'ПАР-A482X', ref: 'REF-1102', name: 'Раствор натрия хлорида 500мл', days: 12, qty: 120 },
    { lot: 'ПАР-B991Y', ref: 'REF-4421', name: 'Обезболивающее в/в 100мг', days: 18, qty: 45 },
    { lot: 'ПАР-C110Z', ref: 'REF-6632', name: 'Бинты марлевые 10см', days: 24, qty: 890 },
    { lot: 'ПАР-X332M', ref: 'REF-9081', name: 'Катетер Фолея 16Fr', days: 28, qty: 1400 },
  ];

  return (
    <div className="h-full flex flex-col gap-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-slate-300">
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">Оперативная сводка</h2>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">ВУ: Актуальные данные склада</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700">
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
            Обновить
          </Button>
          <Button size="sm" className="h-8 text-xs font-semibold bg-blue-700 hover:bg-blue-800">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Отчет смены
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`bg-white p-3 border rounded shadow-sm relative overflow-hidden flex flex-col justify-between ${kpi.critical ? 'border-red-300 bg-red-50/30' : (kpi.warning ? 'border-amber-300 bg-amber-50/30' : 'border-slate-300')}`}>
            {kpi.critical && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />}
            {kpi.warning && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between mb-1 pl-1">
              {kpi.title}
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.critical ? 'text-red-500' : (kpi.warning ? 'text-amber-500' : 'text-slate-400')}`} />
            </div>
            <div className={`text-xl font-bold font-mono tracking-tight pl-1 ${kpi.critical ? 'text-red-700' : (kpi.warning ? 'text-amber-700' : 'text-slate-900')}`}>{kpi.value}</div>
            <div className={`text-[10px] font-semibold mt-1 pl-1 ${kpi.critical ? 'text-red-600' : (kpi.trendUp ? 'text-emerald-600' : 'text-slate-500')}`}>
              {kpi.critical ? (
                'Требуется реакция'
              ) : (
                `${kpi.trend} с прошлого мес.`
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 flex-1 min-h-0">
        <div className="lg:col-span-4 bg-white border border-slate-300 rounded shadow-sm flex flex-col">
          <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Журнал движения ТМЦ</h3>
            <span className="text-[10px] font-bold text-slate-400">ПОСЛЕДНИЕ 50 ОПЕРАЦИЙ</span>
          </div>
          <div className="flex-1 overflow-auto p-0">
            <div className="w-full text-xs">
              <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0">
                 <div className="col-span-2 p-2 px-3">Тип</div>
                 <div class="col-span-2 p-2">Док. №</div>
                 <div class="col-span-2 p-2 text-slate-400">АРТ</div>
                 <div class="col-span-4 p-2">Номенклатура</div>
                 <div class="col-span-2 p-2 text-right pr-4">Кол-во</div>
              </div>
              <div className="divide-y divide-slate-100">
                {recentMovements.map((movement, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-2 p-2 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        movement.type === 'ПРИХОД' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        movement.type === 'РАСХОД' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {movement.type}
                      </span>
                    </div>
                    <div className="col-span-2 p-2 font-mono text-[10px] text-slate-600">{movement.id}</div>
                    <div className="col-span-2 p-2 font-mono text-[10px] text-slate-400">{movement.ref}</div>
                    <div className="col-span-4 p-2 truncate font-medium text-slate-700">{movement.desc}</div>
                    <div className="col-span-2 p-2 text-right pr-4">
                      <span className={`font-mono font-bold ${
                        movement.type === 'ПРИХОД' ? 'text-emerald-600' :
                        movement.type === 'СПИСАНИЕ' ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {movement.qty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white border border-slate-300 rounded shadow-sm flex flex-col border-t-2 border-t-red-500">
           <div className="p-3 border-b border-slate-200 bg-red-50/20 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center">
              <Timer className="w-3.5 h-3.5 mr-1.5" />
              Критичные сроки годности
            </h3>
            <span className="text-[10px] font-bold text-red-400">МЕНЕЕ 30 ДНЕЙ</span>
          </div>
          <div className="flex-1 overflow-auto p-0">
             <div className="divide-y divide-slate-100 text-xs">
              {expiringLots.map((lot, idx) => (
                <div key={idx} className="p-3 hover:bg-slate-50 flex items-center justify-between group cursor-pointer transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate leading-snug">{lot.name}</p>
                    <div className="flex items-center mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{lot.ref}</span>
                      <span className="mx-1.5 text-slate-300">|</span>
                      <span className="font-bold text-slate-600">{lot.lot}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-[11px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded shadow-sm inline-block tracking-wider">
                      {lot.days} ДН
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      ОСТ: <span className="font-bold text-slate-700">{lot.qty}</span> шт
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-2 border-t border-slate-200 bg-slate-50">
            <Button variant="outline" className="w-full h-8 text-[10px] uppercase font-bold tracking-wider text-slate-600 hover:text-slate-900 border-slate-300">
              Показать все ({expiringLots.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

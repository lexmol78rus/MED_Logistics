import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackageSearch,
  Boxes,
  Timer,
  AlertTriangle,
  RefreshCcw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchDashboardSummary, type DashboardSummary } from '../lib/api/dashboard';
import { fetchExpiryAll, type ExpiryListItem } from '../lib/api/expiry';
import {
  CRITICAL_DAYS_BADGE_CLASS,
  ExpiryStatusBadge,
  resolveExpiryStatusVariant,
} from '../components/expiry/ExpiryStatusBadge';
import ShiftReportDialog from '../components/dashboard/ShiftReportDialog';
import { canShiftReport } from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';
import { ApiError } from '../lib/api/client';
import { loadSettings } from '../lib/settings/storage';
import { toast } from 'sonner';
import { TruncatedText } from '../components/ui/TruncatedText';

const CRITICAL_WIDGET_PREVIEW = 5;

export default function Dashboard() {
  const navigate = useNavigate();
  const userRole = useUserStore((s) => s.user?.role ?? null);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [criticalLots, setCriticalLots] = useState<ExpiryListItem[]>([]);
  const [showAllCritical, setShowAllCritical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftReportOpen, setShiftReportOpen] = useState(false);

  const load = useCallback(async (showSuccessToast = false) => {
    setRefreshing(true);
    if (!data) setLoading(true);
    try {
      const [summary, expiry] = await Promise.all([
        fetchDashboardSummary(),
        fetchExpiryAll({ filter: 'critical' }),
      ]);
      setData(summary);
      setCriticalLots(expiry.items);
      setShowAllCritical(false);
      if (showSuccessToast) {
        toast.success('Данные обновлены');
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить сводку');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const settings = loadSettings();
    if (!settings.uiAutoRefreshDashboard) return;
    const interval = window.setInterval(() => {
      void load();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const handleRefresh = () => void load(true);

  const criticalCount = data?.criticalExpiryCount ?? criticalLots.length;

  const visibleCriticalLots = useMemo(() => {
    if (showAllCritical || criticalLots.length <= CRITICAL_WIDGET_PREVIEW) {
      return criticalLots;
    }
    return criticalLots.slice(0, CRITICAL_WIDGET_PREVIEW);
  }, [criticalLots, showAllCritical]);

  const kpis = data
    ? [
        {
          title: 'ПОЗИЦИЙ НА СКЛАДЕ',
          value: String(data.productsCount),
          icon: Boxes,
          warning: false,
          critical: false,
        },
        {
          title: 'АКТИВНЫХ ПАРТИЙ',
          value: String(data.activeLotsCount),
          icon: PackageSearch,
          warning: false,
          critical: false,
        },
        {
          title: 'КРИТИЧНЫЕ СРОКИ',
          value: String(criticalCount),
          icon: Timer,
          warning: criticalCount > 0,
          critical: criticalCount > 0,
        },
        {
          title: 'НИЗКИЙ ОСТАТОК',
          value: String(data.lowStockCount),
          icon: AlertTriangle,
          warning: data.lowStockCount > 0,
          critical: false,
        },
      ]
    : [];

  return (
    <>
    <ShiftReportDialog open={shiftReportOpen} onClose={() => setShiftReportOpen(false)} />
    <div className="h-full flex flex-col gap-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-slate-300">
        <div>
          <h2 className="text-lg font-bold tracking-tight leading-tight text-slate-800">Оперативная сводка</h2>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">ВУ: Актуальные данные склада</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-700"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCcw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          {canShiftReport(userRole) && (
            <Button
              size="sm"
              className="h-8 text-xs font-semibold bg-blue-700 hover:bg-blue-800"
              onClick={() => setShiftReportOpen(true)}
              disabled={refreshing}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Отчет смены
            </Button>
          )}
        </div>
      </div>

      {loading && !data && (
        <p className="text-sm text-slate-500 text-center py-8">Загрузка данных...</p>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi, i) => (
              <div
                key={i}
                className={`bg-white p-3 border rounded shadow-sm relative overflow-hidden flex flex-col justify-between ${
                  kpi.critical ? 'border-red-300 bg-red-50/30' : kpi.warning ? 'border-amber-300 bg-amber-50/30' : 'border-slate-300'
                }`}
              >
                {kpi.critical && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />}
                {kpi.warning && !kpi.critical && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between mb-1 pl-1">
                  {kpi.title}
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.critical ? 'text-red-500' : kpi.warning ? 'text-amber-500' : 'text-slate-400'}`} />
                </div>
                <div className={`text-xl font-bold font-mono tracking-tight pl-1 ${kpi.critical ? 'text-red-700' : kpi.warning ? 'text-amber-700' : 'text-slate-900'}`}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 flex-1 min-h-0">
            <div className="lg:col-span-4 bg-white border border-slate-300 rounded shadow-sm flex flex-col">
              <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Журнал движения ТМЦ</h3>
                <span className="text-[10px] font-bold text-slate-400">ПОСЛЕДНИЕ ОПЕРАЦИИ</span>
              </div>
              <div className="flex-1 overflow-auto p-0">
                <div className="w-full text-xs">
                  <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0">
                    <div className="col-span-2 p-2 px-3">Тип</div>
                    <div className="col-span-2 p-2">Док. №</div>
                    <div className="col-span-2 p-2 text-slate-400">REF</div>
                    <div className="col-span-4 p-2">Номенклатура</div>
                    <div className="col-span-2 p-2 text-right pr-4">Кол-во</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {data.recentMovements.map((movement) => (
                      <div key={movement.id} className="grid grid-cols-12 items-center hover:bg-slate-50 transition-colors">
                        <div className="col-span-2 p-2 px-3">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              movement.type === 'ПРИХОД'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : movement.type === 'РАСХОД'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {movement.type}
                          </span>
                        </div>
                        <div className="col-span-2 p-2 font-mono text-[10px] text-slate-600">{movement.id}</div>
                        <div className="col-span-2 p-2 font-mono text-[10px] text-slate-400">{movement.ref}</div>
                        <div className="col-span-4 p-2 min-w-0">
                          <TruncatedText className="font-medium text-slate-700">{movement.desc}</TruncatedText>
                        </div>
                        <div className="col-span-2 p-2 text-right pr-4">
                          <span
                            className={`font-mono font-bold ${
                              movement.type === 'ПРИХОД' ? 'text-emerald-600' : movement.type.includes('СПИС') ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
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
                  Критические сроки
                </h3>
                <span className="text-[10px] font-bold text-red-400">{criticalCount} поз.</span>
              </div>
              <div className="flex-1 overflow-auto p-0">
                <div className="divide-y divide-slate-100 text-xs">
                  {visibleCriticalLots.map((lot) => {
                    const { variant } = resolveExpiryStatusVariant(lot);
                    const daysLabel =
                      lot.days == null ? '—' : lot.days < 0 ? `${lot.days} ДН` : `${lot.days} ДН`;

                    return (
                      <div
                        key={lot.id}
                        className="p-3 hover:bg-slate-50 flex items-start justify-between gap-3 cursor-pointer"
                        onClick={() => navigate(`/products/${lot.productId}`)}
                      >
                        <div className="min-w-0 flex-1">
                          <TruncatedText as="p" className="font-medium text-slate-800 leading-snug">
                            {lot.name}
                          </TruncatedText>
                          <div className="flex items-center mt-1 text-[10px] text-slate-500 font-mono">
                            <span>{lot.ref}</span>
                            <span className="mx-1.5 text-slate-300">|</span>
                            <span className="font-bold text-slate-600">{lot.lot}</span>
                          </div>
                          <div className="mt-1.5">
                            <ExpiryStatusBadge row={lot} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`text-[11px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm inline-block tracking-wider ${CRITICAL_DAYS_BADGE_CLASS[variant]}`}
                          >
                            {daysLabel}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            ОСТ: <span className="font-bold text-slate-700">{lot.qty}</span> шт
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {criticalLots.length === 0 && (
                    <p className="p-4 text-center text-slate-400">Нет критичных партий</p>
                  )}
                </div>
              </div>
              <div className="p-2 border-t border-slate-200 bg-slate-50 mt-auto flex flex-col gap-2">
                {criticalLots.length > CRITICAL_WIDGET_PREVIEW && !showAllCritical && (
                  <Button
                    variant="outline"
                    className="w-full h-8 text-[10px] uppercase font-bold tracking-wider text-red-700 hover:text-red-900 border-red-200 bg-white"
                    onClick={() => setShowAllCritical(true)}
                  >
                    Показать все ({criticalLots.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full h-8 text-[10px] uppercase font-bold tracking-wider text-slate-600 hover:text-slate-900 border-slate-300"
                  onClick={() => navigate('/expiry-control')}
                >
                  Контроль сроков
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
}

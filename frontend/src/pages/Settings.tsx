import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  CalendarClock,
  ChevronRight,
  History,
  LayoutGrid,
  ScanLine,
  Settings2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { AdminShiftReportCard } from '../components/settings/AdminShiftReportCard';
import { MailSettingsSection } from '../components/settings/MailSettingsSection';
import {
  SettingsNumberField,
  SettingsToggleRow,
} from '../components/settings/SettingsFormPrimitives';
import {
  settingsCardBodyClass,
  settingsCardClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
} from '../components/settings/settingsStyles';
import { fetchSettings, patchSettings } from '../lib/api/settings';
import { ApiError } from '../lib/api/client';
import {
  canAdminShiftReport,
  canEditFefoSettings,
  canManageAccessSettings,
  canManageFullWarehouseSettings,
  canManageWriteoffDestinations,
} from '../lib/rbac/permissions';
import { useUserStore } from '../stores/userStore';
import {
  appBuildCommit,
  appBuildId,
  formatBuildLabel,
} from '../lib/buildInfo';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  pickWarehouseSettings,
  saveSettings,
  type WarehouseSettings,
} from '../lib/settings/storage';

export default function Settings() {
  const role = useUserStore((s) => s.user?.role ?? null);
  const fullAccess = canManageFullWarehouseSettings(role);
  const showAccessSettings = canManageAccessSettings(role);
  const showShiftReports = canAdminShiftReport(role);
  const showWriteoffDestinations = canManageWriteoffDestinations(role);
  const showFefo = canEditFefoSettings(role);

  const [settings, setSettings] = useState<WarehouseSettings>(() => loadSettings());
  const [savedSnapshot, setSavedSnapshot] = useState<WarehouseSettings>(() => loadSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const remote = await fetchSettings();
        const merged = pickWarehouseSettings({ ...DEFAULT_SETTINGS, ...remote });
        setSettings(merged);
        setSavedSnapshot(merged);
        saveSettings(merged);
      } catch {
        const local = pickWarehouseSettings(loadSettings());
        setSettings(local);
        setSavedSnapshot(local);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = <K extends keyof WarehouseSettings>(key: K, value: WarehouseSettings[K]) => {
    setSettings((s) => pickWarehouseSettings({ ...s, [key]: value }));
  };

  const handleSave = async (managerScope = false) => {
    const previous = savedSnapshot;
    setSaving(true);
    const toSave = pickWarehouseSettings(settings as WarehouseSettings & Record<string, unknown>);
    saveSettings(toSave);
    try {
      const saved = await patchSettings(toSave, { managerScope });
      const merged = pickWarehouseSettings({ ...DEFAULT_SETTINGS, ...saved });
      setSettings(merged);
      setSavedSnapshot(merged);
      saveSettings(merged);
      toast.success(managerScope ? 'Настройки FEFO сохранены' : 'Настройки сохранены');
    } catch (err) {
      setSettings(previous);
      saveSettings(previous);
      toast.error(err instanceof ApiError ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(savedSnapshot);
    toast.message('Изменения отменены');
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center text-sm text-slate-500">
        Загрузка настроек…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-1 lg:gap-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <Settings2 className="h-5 w-5 text-slate-600" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Настройки</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              {fullAccess
                ? 'Параметры склада, интерфейса и почтовых уведомлений'
                : 'Отчёты смены, назначения списания и параметры FEFO'}
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          Склад · MED Logistics
        </span>
      </header>

      {showShiftReports && <AdminShiftReportCard />}

      {showAccessSettings && (
      <Card className={settingsCardClass}>
        <CardContent className={`${settingsCardBodyClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex min-w-0 flex-1 gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <Shield className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Права доступа</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Шаблоны прав для ролей и индивидуальные отклонения у пользователей — по разделам,
                без длинного списка галочек.
              </p>
            </div>
          </div>
          <Link to="/settings/access" className="shrink-0 sm:ml-4">
            <Button variant="outline" className="h-9 gap-1.5 border-slate-200 text-sm font-medium">
              Настроить права
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Button>
          </Link>
        </CardContent>
      </Card>
      )}

      {fullAccess && (
      <Card className={settingsCardClass}>
        <CardHeader className={settingsCardHeaderClass}>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold text-slate-900">
              Архив действий пользователей
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Срок хранения записей журнала (вход, настройки, FEFO и др.). Влияет на отчёты смены и
            автоматическую очистку. Сохраняется кнопкой «Сохранить склад» ниже.
          </CardDescription>
        </CardHeader>
        <CardContent className={settingsCardBodyClass}>
          <SettingsNumberField
            label="Хранить историю (дней)"
            value={settings.activityHistoryRetentionDays}
            onChange={(v) => update('activityHistoryRetentionDays', v)}
            id="activity-history-retention-days"
          />
        </CardContent>
      </Card>
      )}

      {showWriteoffDestinations && (
      <Card className={settingsCardClass}>
        <CardContent className={`${settingsCardBodyClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex min-w-0 flex-1 gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <ArrowRightLeft className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Назначения списания</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Справочник направлений: больницы, отделения, утилизация и другие назначения при
                расходе со склада.
              </p>
            </div>
          </div>
          <Link to="/settings/writeoff-destinations" className="shrink-0 sm:ml-4">
            <Button variant="outline" className="h-9 gap-1.5 border-slate-200 text-sm font-medium">
              Открыть справочник
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Button>
          </Link>
        </CardContent>
      </Card>
      )}

      {fullAccess &&
        (import.meta.env.VITE_DISABLE_MAIL_SETTINGS !== 'true' ? (
          <MailSettingsSection />
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Mail settings UI disabled (VITE_DISABLE_MAIL_SETTINGS=true) — trace test mode
          </p>
        ))}

      <div className={`grid gap-6 ${fullAccess ? 'lg:grid-cols-2' : ''}`}>
        {showFefo && (
        <Card className={settingsCardClass}>
          <CardHeader className={settingsCardHeaderClass}>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                FEFO и сроки годности
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Алгоритм отбора партий и пороги предупреждений
            </CardDescription>
          </CardHeader>
          <CardContent className={`${settingsCardBodyClass} space-y-4`}>
            <SettingsToggleRow
              checked={settings.fefoEnabled}
              onChange={(v) => update('fefoEnabled', v)}
              label="FEFO включён"
              description="При списании предлагать партии по сроку годности"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingsNumberField
                label="Порог внимания (дней)"
                value={settings.expiryWarningDays}
                onChange={(v) => update('expiryWarningDays', v)}
                id="expiry-warning-days"
              />
              <SettingsNumberField
                label="Критичный срок (дней)"
                value={settings.expiryCriticalDays}
                onChange={(v) => update('expiryCriticalDays', v)}
                id="expiry-critical-days"
              />
            </div>
          </CardContent>
          {!fullAccess && (
            <CardFooter className={`${settingsCardFooterClass} flex flex-col gap-2 sm:flex-row`}>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                className="h-9 flex-1 border-slate-200"
              >
                Сбросить
              </Button>
              <Button
                onClick={() => void handleSave(true)}
                disabled={saving}
                className="h-9 flex-1 bg-blue-700 text-white hover:bg-blue-800"
              >
                {saving ? 'Сохранение…' : 'Сохранить FEFO'}
              </Button>
            </CardFooter>
          )}
        </Card>
        )}

        {fullAccess && (
        <Card className={settingsCardClass}>
          <CardHeader className={settingsCardHeaderClass}>
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold text-slate-900">Сканер</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Поведение полей ввода штрихкода на терминале и в формах
            </CardDescription>
          </CardHeader>
          <CardContent className={`${settingsCardBodyClass} space-y-3`}>
            <SettingsToggleRow
              checked={settings.scannerSoundEnabled !== false}
              onChange={(v) => update('scannerSoundEnabled', v)}
              label="Звуковая обратная связь"
            />
            <SettingsToggleRow
              checked={settings.scannerAutoFocus}
              onChange={(v) => update('scannerAutoFocus', v)}
              label="Автофокус сканера"
            />
            <SettingsNumberField
              label="Задержка (мс)"
              value={settings.scannerDebounceMs}
              onChange={(v) => update('scannerDebounceMs', v)}
              id="scanner-debounce"
            />
          </CardContent>
        </Card>
        )}
      </div>

      {fullAccess && (
      <Card className={settingsCardClass}>
        <CardHeader className={settingsCardHeaderClass}>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold text-slate-900">Интерфейс</CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Отображение таблиц, анимации и подсказки на панели управления
          </CardDescription>
        </CardHeader>
        <CardContent className={settingsCardBodyClass}>
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingsToggleRow
              checked={settings.uiCompactMode}
              onChange={(v) => update('uiCompactMode', v)}
              label="Компактные таблицы"
            />
            <SettingsToggleRow
              checked={settings.uiAnimations !== false}
              onChange={(v) => update('uiAnimations', v)}
              label="Анимации интерфейса"
            />
            <SettingsToggleRow
              checked={settings.uiAutoRefreshDashboard}
              onChange={(v) => update('uiAutoRefreshDashboard', v)}
              label="Автообновление панели"
            />
            <SettingsToggleRow
              checked={settings.uiShowFefoHints}
              onChange={(v) => update('uiShowFefoHints', v)}
              label="Подсказки FEFO в карточке товара"
            />
          </div>
        </CardContent>
        <CardFooter className={`${settingsCardFooterClass} flex flex-col gap-2 sm:flex-row`}>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="h-9 flex-1 border-slate-200"
          >
            Сбросить
          </Button>
          <Button
            onClick={() => void handleSave(false)}
            disabled={saving}
            className="h-9 flex-1 bg-blue-700 text-white hover:bg-blue-800"
          >
            {saving ? 'Сохранение…' : 'Сохранить склад'}
          </Button>
        </CardFooter>
      </Card>
      )}

      <p className="text-center font-mono text-xs text-slate-400">
        Build: {formatBuildLabel(appBuildId)}
        {appBuildCommit !== 'unknown' ? ` · ${appBuildCommit}` : ''}
      </p>
    </div>
  );
}

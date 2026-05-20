import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { MailSettingsSection } from '../components/settings/MailSettingsSection';
import { fetchSettings, patchSettings } from '../lib/api/settings';
import { ApiError } from '../lib/api/client';
import {
  appBuildCommit,
  appBuildId,
  formatBuildLabel,
} from '../lib/buildInfo';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type WarehouseSettings,
} from '../lib/settings/storage';

export default function Settings() {
  const [settings, setSettings] = useState<WarehouseSettings>(DEFAULT_SETTINGS);
  const [savedSnapshot, setSavedSnapshot] = useState<WarehouseSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const remote = await fetchSettings();
        const merged = { ...DEFAULT_SETTINGS, ...remote };
        setSettings(merged);
        setSavedSnapshot(merged);
        saveSettings(merged);
      } catch {
        const local = loadSettings();
        setSettings(local);
        setSavedSnapshot(local);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = <K extends keyof WarehouseSettings>(key: K, value: WarehouseSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    const previous = savedSnapshot;
    setSaving(true);
    saveSettings(settings);
    try {
      const saved = await patchSettings(settings);
      const merged = { ...DEFAULT_SETTINGS, ...saved };
      setSettings(merged);
      setSavedSnapshot(merged);
      saveSettings(merged);
      toast.success('Настройки сохранены');
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
      <div className="max-w-3xl mx-auto p-4 py-12 text-center text-sm text-slate-500">
        Загрузка настроек…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col gap-6 pb-10">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Настройки</h2>
        <p className="text-sm text-slate-500 mt-1">
          Параметры склада, интерфейса и почтовых уведомлений
        </p>
      </div>

      <MailSettingsSection />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">FEFO и сроки годности</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.fefoEnabled}
              onChange={(e) => update('fefoEnabled', e.target.checked)}
            />
            FEFO включён
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Порог внимания (дней)
              </label>
              <input
                type="number"
                className="w-full h-9 px-2 text-sm border border-slate-300 rounded-lg mt-1"
                value={settings.expiryWarningDays}
                onChange={(e) => update('expiryWarningDays', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">
                Критичный срок (дней)
              </label>
              <input
                type="number"
                className="w-full h-9 px-2 text-sm border border-slate-300 rounded-lg mt-1"
                value={settings.expiryCriticalDays}
                onChange={(e) => update('expiryCriticalDays', Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сканер</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.scannerSoundEnabled !== false}
              onChange={(e) => update('scannerSoundEnabled', e.target.checked)}
            />
            Звуковая обратная связь
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.scannerAutoFocus}
              onChange={(e) => update('scannerAutoFocus', e.target.checked)}
            />
            Автофокус сканера
          </label>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Задержка (мс)</label>
            <input
              type="number"
              className="w-full h-9 px-2 text-sm border border-slate-300 rounded-lg mt-1"
              value={settings.scannerDebounceMs}
              onChange={(e) => update('scannerDebounceMs', Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Интерфейс</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.uiCompactMode}
              onChange={(e) => update('uiCompactMode', e.target.checked)}
            />
            Компактные таблицы
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.uiAnimations !== false}
              onChange={(e) => update('uiAnimations', e.target.checked)}
            />
            Анимации интерфейса
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.uiAutoRefreshDashboard}
              onChange={(e) => update('uiAutoRefreshDashboard', e.target.checked)}
            />
            Автообновление панели управления
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.uiShowFefoHints}
              onChange={(e) => update('uiShowFefoHints', e.target.checked)}
            />
            Подсказки FEFO в карточке товара
          </label>
        </CardContent>
        <CardFooter className="flex gap-2 border-t">
          <Button variant="outline" onClick={handleReset} disabled={saving} className="flex-1">
            Сбросить
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
          >
            {saving ? 'Сохранение…' : 'Сохранить склад'}
          </Button>
        </CardFooter>
      </Card>

      <p className="text-xs text-slate-400 text-center font-mono">
        Build: {formatBuildLabel(appBuildId)}
        {appBuildCommit !== 'unknown' ? ` · ${appBuildCommit}` : ''}
      </p>
    </div>
  );
}

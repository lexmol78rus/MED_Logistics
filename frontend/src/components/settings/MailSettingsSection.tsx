import { FormEvent, useEffect, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ApiError } from '../../lib/api/client';
import {
  fetchMailSettings,
  patchMailSettings,
  testMailSettings,
  type EmailNotificationFlags,
  type MailSettings,
} from '../../lib/api/mailSettings';
import { SettingsToggleRow } from './SettingsFormPrimitives';
import {
  settingsCardBodyClass,
  settingsCardClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
} from './settingsStyles';

const NOTIFICATION_LABELS: {
  key: keyof EmailNotificationFlags;
  label: string;
}[] = [
  { key: 'passwordReset', label: 'Восстановление пароля' },
  { key: 'lowStock', label: 'Низкий остаток' },
  { key: 'expiryCritical', label: 'Критичный срок годности' },
  { key: 'lotBlocked', label: 'Блокировка партии' },
  { key: 'lotRecall', label: 'Отзыв партии' },
  { key: 'authFailed', label: 'Ошибки авторизации' },
  { key: 'system', label: 'Системные уведомления' },
];

const EMPTY_SMTP_FORM = {
  host: 'smtp.yandex.ru',
  port: '465',
  user: '',
  from: '',
  secure: true,
  password: '',
};

const mailInputClass =
  'h-9 border-slate-200 shadow-none hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-blue-500/20';

export function MailSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [mail, setMail] = useState<MailSettings | null>(null);
  const [form, setForm] = useState(EMPTY_SMTP_FORM);
  /** Ephemeral: only for one-off test send, never persisted. */
  const [testEmail, setTestEmail] = useState('');
  const [notifications, setNotifications] = useState<EmailNotificationFlags>({
    passwordReset: true,
    lowStock: false,
    expiryCritical: false,
    lotBlocked: false,
    lotRecall: false,
    authFailed: false,
    system: false,
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMailSettings();
      setMail(data);
      setForm({
        host: data.smtp.host,
        port: String(data.smtp.port),
        user: data.smtp.user,
        from: data.smtp.from,
        secure: data.smtp.secure,
        password: '',
      });
      setNotifications(data.notifications);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Не удалось загрузить настройки почты');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const port = Number.parseInt(form.port, 10);
      if (!Number.isFinite(port) || port < 1) {
        toast.error('Укажите корректный SMTP порт');
        return;
      }
      const saved = await patchMailSettings({
        smtp: {
          host: form.host.trim(),
          port,
          user: form.user.trim(),
          from: form.from.trim(),
          secure: form.secure,
          ...(form.password ? { password: form.password } : {}),
        },
        notifications,
      });
      setMail(saved);
      setForm((f) => ({ ...f, password: '' }));
      toast.success('Настройки почты сохранены');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const to = testEmail.trim();
    if (!to) {
      toast.error('Введите email для отправки тестового письма');
      return;
    }
    setTesting(true);
    try {
      const result = await testMailSettings(to);
      toast.success(result.message || 'Письмо успешно отправлено');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Ошибка SMTP');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className={cn(settingsCardClass, 'min-h-[280px] animate-pulse bg-slate-50/50')} />
          <Card className={cn(settingsCardClass, 'min-h-[280px] animate-pulse bg-slate-50/50')} />
        </div>
      </section>
    );
  }

  const statusLabel = mail?.smtpReady
    ? 'SMTP подключён'
    : mail?.source === 'environment'
      ? 'SMTP из .env (не проверен)'
      : 'SMTP не настроен';

  const statusClass = mail?.smtpReady
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Почта и уведомления</h2>
        </div>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', statusClass)}>
          {statusLabel}
        </span>
        {mail?.source && mail.source !== 'none' ? (
          <span className="text-xs text-slate-500">
            источник: {mail.source === 'database' ? 'база данных' : 'переменные окружения'}
          </span>
        ) : null}
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="grid gap-6 lg:grid-cols-2">
        <Card className={settingsCardClass}>
          <CardHeader className={settingsCardHeaderClass}>
            <CardTitle className="text-sm font-semibold text-slate-900">SMTP</CardTitle>
            <CardDescription className="text-xs">
              Параметры исходящей почты (Yandex и др.)
            </CardDescription>
          </CardHeader>
          <CardContent className={`${settingsCardBodyClass} grid gap-4`}>
            <div className="space-y-1.5">
              <Label htmlFor="smtp-host" className="text-xs font-medium text-slate-600">
                SMTP Host
              </Label>
              <Input
                id="smtp-host"
                className={mailInputClass}
                value={form.host}
                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                placeholder="smtp.yandex.ru"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-port" className="text-xs font-medium text-slate-600">
                  SMTP Port
                </Label>
                <Input
                  id="smtp-port"
                  type="number"
                  className={mailInputClass}
                  value={form.port}
                  onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-user" className="text-xs font-medium text-slate-600">
                  SMTP User
                </Label>
                <Input
                  id="smtp-user"
                  type="email"
                  className={mailInputClass}
                  value={form.user}
                  onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                  placeholder="noreply@medicine-2000.ru"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtp-from" className="text-xs font-medium text-slate-600">
                SMTP From
              </Label>
              <Input
                id="smtp-from"
                className={mailInputClass}
                value={form.from}
                onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                placeholder="noreply@medicine-2000.ru"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtp-password" className="text-xs font-medium text-slate-600">
                SMTP Password
              </Label>
              <Input
                id="smtp-password"
                type="password"
                autoComplete="new-password"
                className={mailInputClass}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={
                  mail?.smtp.passwordConfigured
                    ? '••••••••  (оставьте пустым, чтобы не менять)'
                    : 'Пароль приложения Yandex'
                }
              />
            </div>
            <SettingsToggleRow
              checked={form.secure}
              onChange={(v) => setForm((f) => ({ ...f, secure: v }))}
              label="Secure connection (SSL/TLS)"
              description="Обычно порт 465"
            />
          </CardContent>
          <div className={`${settingsCardFooterClass} space-y-3 border-t`}>
            <p className="text-xs font-medium text-slate-600">Тест SMTP</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="test-email" className="text-xs font-medium text-slate-600">
                  Тестовый email
                </Label>
                <Input
                  id="test-email"
                  type="email"
                  className={mailInputClass}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Введите email для тестового письма"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={testing || saving}
                onClick={() => void handleTest()}
                className="h-9 shrink-0 gap-1.5 border-slate-200"
              >
                <Send className="h-3.5 w-3.5" />
                {testing ? 'Отправка…' : 'Отправить тест'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className={settingsCardClass}>
          <CardHeader className={settingsCardHeaderClass}>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Email уведомления
            </CardTitle>
            <CardDescription className="text-xs">
              Какие события дублировать на почту администраторам
            </CardDescription>
          </CardHeader>
          <CardContent className={`${settingsCardBodyClass} grid gap-2.5 sm:grid-cols-2`}>
            {NOTIFICATION_LABELS.map(({ key, label }) => (
              <SettingsToggleRow
                key={key}
                checked={notifications[key]}
                onChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))}
                label={label}
              />
            ))}
          </CardContent>
          <CardFooter className={settingsCardFooterClass}>
            <Button
              type="submit"
              disabled={saving}
              className="h-9 w-full bg-blue-700 hover:bg-blue-800 sm:w-auto"
            >
              {saving ? 'Сохранение…' : 'Сохранить почту'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </section>
  );
}

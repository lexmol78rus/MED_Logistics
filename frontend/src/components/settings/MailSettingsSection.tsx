import { FormEvent, useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { ApiError } from '../../lib/api/client';
import {
  fetchMailSettings,
  patchMailSettings,
  testMailSettings,
  type EmailNotificationFlags,
  type MailSettings,
} from '../../lib/api/mailSettings';

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

const EMPTY_FORM = {
  host: 'smtp.yandex.ru',
  port: '465',
  user: '',
  from: '',
  secure: true,
  password: '',
  testEmail: 'am@medicine-2000.ru',
};

export function MailSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [mail, setMail] = useState<MailSettings | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
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
        testEmail: form.testEmail,
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
    const to = form.testEmail.trim();
    if (!to) {
      toast.error('Укажите тестовый email');
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
      <Card>
        <CardHeader>
          <CardTitle>Почта и уведомления</CardTitle>
          <CardDescription>Загрузка…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statusLabel = mail?.smtpReady
    ? 'SMTP подключён'
    : mail?.source === 'environment'
      ? 'SMTP из .env (не проверен)'
      : 'SMTP не настроен';

  const statusClass = mail?.smtpReady
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Почта и уведомления
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded border ${statusClass}`}>
          {statusLabel}
        </span>
        {mail?.source && mail.source !== 'none' ? (
          <span className="text-xs text-slate-500">
            источник: {mail.source === 'database' ? 'база данных' : 'переменные окружения'}
          </span>
        ) : null}
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SMTP</CardTitle>
            <CardDescription>Параметры исходящей почты (Yandex и др.)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                value={form.host}
                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                placeholder="smtp.yandex.ru"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input
                id="smtp-port"
                type="number"
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">SMTP User</Label>
              <Input
                id="smtp-user"
                type="email"
                value={form.user}
                onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                placeholder="noreply@medicine-2000.ru"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-from">SMTP From</Label>
              <Input
                id="smtp-from"
                value={form.from}
                onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                placeholder="noreply@medicine-2000.ru"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-password">SMTP Password</Label>
              <Input
                id="smtp-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={
                  mail?.smtp.passwordConfigured
                    ? '••••••••  (оставьте пустым, чтобы не менять)'
                    : 'Пароль приложения Yandex'
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.secure}
                onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))}
              />
              Secure connection (SSL/TLS, порт 465)
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email уведомления</CardTitle>
            <CardDescription>Какие события дублировать на почту администраторам</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {NOTIFICATION_LABELS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifications[key]}
                  onChange={(e) =>
                    setNotifications((n) => ({ ...n, [key]: e.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
          </CardContent>
          <CardFooter className="border-t">
            <Button type="submit" disabled={saving} className="bg-blue-700 hover:bg-blue-800">
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Тест SMTP</CardTitle>
          <CardDescription>Отправка проверочного письма с HTML-шаблоном</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="test-email">Тестовый email</Label>
            <Input
              id="test-email"
              type="email"
              value={form.testEmail}
              onChange={(e) => setForm((f) => ({ ...f, testEmail: e.target.value }))}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={testing || saving}
            onClick={() => void handleTest()}
            className="shrink-0"
          >
            {testing ? 'Отправка…' : 'Отправить тестовое письмо'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

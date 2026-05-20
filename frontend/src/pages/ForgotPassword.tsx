import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset } from '../lib/api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const result = await requestPasswordReset(email);
      setSuccessMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить запрос');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E2E8F0] px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Восстановление пароля</h1>
        <p className="mt-1 text-sm text-slate-600">
          Укажите email учётной записи. Мы отправим ссылку для сброса пароля.
        </p>

        {successMessage ? (
          <div className="mt-6 space-y-4">
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {successMessage}
            </p>
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-blue-700 hover:underline"
            >
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Отправка…' : 'Отправить ссылку'}
            </Button>

            <p className="text-center text-sm">
              <Link to="/login" className="text-blue-700 hover:underline">
                Назад ко входу
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginWithCredentials } from '../lib/api/auth';
import { PASSWORD_MIN_LENGTH } from '../lib/passwordPolicy';
import { isJwtValid } from '../lib/auth/jwt';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useUserStore((state) => state.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/dashboard';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const tokens = await loginWithCredentials(email.trim(), password);
      if (!isJwtValid(tokens.accessToken)) {
        throw new Error('Получен недействительный токен');
      }
      setTokens(tokens.accessToken, tokens.refreshToken);
      if (tokens.user) {
        setUser({
          userId: tokens.user.id,
          email: tokens.user.email,
          role: tokens.user.role,
        });
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить вход');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E2E8F0] px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Вход в систему</h1>
        <p className="mt-1 text-sm text-slate-600">
          Укажите учётные данные для доступа к складской системе.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Пароль</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-blue-700 hover:underline"
              >
                Забыли пароль?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </div>

          {error ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Вход…' : 'Войти'}
          </Button>
        </form>
      </div>
    </div>
  );
}

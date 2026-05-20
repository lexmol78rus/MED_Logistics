import { useEffect, useState } from 'react';
import { fetchMe } from '../../lib/api/users';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';

interface AuthHydrationGateProps {
  children: React.ReactNode;
}

export default function AuthHydrationGate({ children }: AuthHydrationGateProps) {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const hasValidToken = useAuthStore((s) => s.hasValidToken());
  const setUser = useUserStore((s) => s.setUser);
  const clearUser = useUserStore((s) => s.clearUser);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!hasValidToken) {
      clearUser();
      setProfileLoaded(true);
      return;
    }

    void fetchMe()
      .then((res) => {
        setUser({
          userId: res.user.userId,
          email: res.user.email,
          role: res.user.role,
        });
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        clearUser();
      })
      .finally(() => setProfileLoaded(true));
  }, [hydrated, hasValidToken, setUser, clearUser]);

  if (!hydrated || (hasValidToken && !profileLoaded)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F1F5F9] text-sm text-slate-600">
        Загрузка…
      </div>
    );
  }

  return <>{children}</>;
}

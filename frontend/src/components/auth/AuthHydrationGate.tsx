import { useEffect, useState } from 'react';
import { fetchRolePermissionTemplates } from '../../lib/api/role-permissions';
import { fetchSettings } from '../../lib/api/settings';
import { fetchMe } from '../../lib/api/users';
import { DEFAULT_SETTINGS, pickWarehouseSettings, saveSettings } from '../../lib/settings/storage';
import { useAuthStore } from '../../stores/authStore';
import { syncWriteoffDraftOwner } from '../../stores/writeoffDraftStore';
import { useRoleTemplatesStore } from '../../stores/roleTemplatesStore';
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
  const setRoleTemplates = useRoleTemplatesStore((s) => s.setTemplates);
  const clearRoleTemplates = useRoleTemplatesStore((s) => s.clearTemplates);

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
      clearRoleTemplates();
      syncWriteoffDraftOwner(null);
      setProfileLoaded(true);
      return;
    }

    setProfileLoaded(false);

    void fetchMe()
      .then(async (res) => {
        setUser({
          userId: res.user.userId,
          email: res.user.email,
          role: res.user.role,
          permissions: res.user.permissions ?? null,
        });
        syncWriteoffDraftOwner(res.user.userId);
        if (res.roleTemplates) {
          setRoleTemplates(res.roleTemplates);
        } else {
          try {
            const r = await fetchRolePermissionTemplates();
            setRoleTemplates(r.templates);
          } catch {
            clearRoleTemplates();
          }
        }
        void fetchSettings()
          .then((remote) => {
            saveSettings(pickWarehouseSettings({ ...DEFAULT_SETTINGS, ...remote }));
          })
          .catch(() => {
            /* keep local cache */
          });
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        clearUser();
        clearRoleTemplates();
      })
      .finally(() => setProfileLoaded(true));
  }, [hydrated, hasValidToken, setUser, clearUser, setRoleTemplates, clearRoleTemplates]);

  if (!hydrated || (hasValidToken && !profileLoaded)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F1F5F9] text-sm text-slate-600">
        Загрузка…
      </div>
    );
  }

  return <>{children}</>;
}

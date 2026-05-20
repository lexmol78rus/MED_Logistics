import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isJwtValid } from '../lib/auth/jwt';

const AUTH_STORAGE_KEY = 'med-warehouse-auth';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (accessToken: string | null, refreshToken?: string | null) => void;
  clearAuth: () => void;
  hasValidToken: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken: refreshToken !== undefined ? refreshToken : get().refreshToken,
        }),
      clearAuth: () => set({ accessToken: null, refreshToken: null }),
      hasValidToken: () => isJwtValid(get().accessToken),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && !isJwtValid(state.accessToken)) {
          state.clearAuth();
        }
      },
    },
  ),
);

export { AUTH_STORAGE_KEY };

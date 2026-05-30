import { create } from 'zustand';
import type { PermissionOverrides, UserRole } from '../lib/rbac/permissions';

export type CurrentUser = {
  userId: string;
  email: string;
  role: UserRole;
  permissions: PermissionOverrides | null;
};

type UserState = {
  user: CurrentUser | null;
  setUser: (user: CurrentUser | null) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

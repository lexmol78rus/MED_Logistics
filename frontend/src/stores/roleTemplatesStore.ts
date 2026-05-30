import { create } from 'zustand';
import type { PermissionOverrides, UserRole } from '../lib/rbac/permissions';

export type RoleTemplatesMap = Record<UserRole, PermissionOverrides | null>;

type RoleTemplatesState = {
  templates: RoleTemplatesMap | null;
  setTemplates: (templates: RoleTemplatesMap) => void;
  clearTemplates: () => void;
};

export const useRoleTemplatesStore = create<RoleTemplatesState>((set) => ({
  templates: null,
  setTemplates: (templates) => set({ templates }),
  clearTemplates: () => set({ templates: null }),
}));

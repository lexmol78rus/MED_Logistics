import type { PermissionOverrides, UserRole } from '../rbac/permissions';
import { apiFetch } from './client';

export type RoleTemplatesMap = Record<UserRole, PermissionOverrides | null>;

export type RolePermissionsResponse = {
  templates: RoleTemplatesMap;
};

export function fetchRolePermissionTemplates() {
  return apiFetch<RolePermissionsResponse>('/role-permissions');
}

export function updateRolePermissionTemplate(
  role: UserRole,
  permissions: PermissionOverrides | null,
) {
  return apiFetch<RolePermissionsResponse>(`/role-permissions/${role}`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

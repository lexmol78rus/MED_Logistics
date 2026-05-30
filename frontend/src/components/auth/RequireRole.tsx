import { useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canAccessRoute } from '../../lib/rbac/permissions';
import { useRoleTemplatesStore } from '../../stores/roleTemplatesStore';
import { useUserStore } from '../../stores/userStore';

type RequireRoleProps = {
  /** If set, only these paths are checked; otherwise uses current location */
  path?: string;
};

export default function RequireRole({ path }: RequireRoleProps) {
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const roleTemplates = useRoleTemplatesStore((s) => s.templates);
  const checkPath = path ?? location.pathname;

  const allowed = useMemo(
    () => (user ? canAccessRoute(user.role, checkPath) : false),
    [user, roleTemplates, checkPath],
  );

  if (!user) {
    return null;
  }

  if (!allowed) {
    return <Navigate to="/forbidden" replace state={{ from: checkPath }} />;
  }

  return <Outlet />;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canAccessRoute } from '../../lib/rbac/permissions';
import { useUserStore } from '../../stores/userStore';

type RequireRoleProps = {
  /** If set, only these paths are checked; otherwise uses current location */
  path?: string;
};

export default function RequireRole({ path }: RequireRoleProps) {
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const checkPath = path ?? location.pathname;

  if (!user) {
    return null;
  }

  if (!canAccessRoute(user.role, checkPath)) {
    return <Navigate to="/forbidden" replace state={{ from: checkPath }} />;
  }

  return <Outlet />;
}

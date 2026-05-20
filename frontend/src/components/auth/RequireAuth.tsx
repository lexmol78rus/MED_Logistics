import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function RequireAuth() {
  const location = useLocation();
  const hasValidToken = useAuthStore((state) => state.hasValidToken());

  if (!hasValidToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function GuestOnly() {
  const hasValidToken = useAuthStore((state) => state.hasValidToken());

  if (hasValidToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

import { type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

type AllowedRole = 'customer' | 'restaurant' | 'admin';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: AllowedRole[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-[#FFC928] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <RedirectWithToast to="/" message="Acesso não autorizado para este perfil" />;
  }

  return <>{children}</>;
}

function RedirectWithToast({ to, message }: { to: string; message: string }) {
  useEffect(() => { toast.error(message); }, [message]);
  return <Navigate to={to} replace />;
}

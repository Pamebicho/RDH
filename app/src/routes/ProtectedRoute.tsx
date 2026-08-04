import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";

function AuthLoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg text-sm text-ink-muted">
      Cargando sesión…
    </div>
  );
}

/** Exige sesión activa; si no hay, redirige a /login. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

/** Para /login: si ya hay sesión activa, salta directo al registro de horas. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;
  if (session) return <Navigate to="/registro-horas" replace />;

  return <>{children}</>;
}

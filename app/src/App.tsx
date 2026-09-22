import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, GuestRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";

const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("@/pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const ResetPasswordPage = lazy(() =>
  import("@/pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })),
);
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const HoursRegisterPage = lazy(() =>
  import("@/pages/HoursRegisterPage").then((m) => ({ default: m.HoursRegisterPage })),
);
const ApprovalsPage = lazy(() => import("@/pages/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })));
const ReportsPage = lazy(() => import("@/pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const RrhhDistribucionPage = lazy(() =>
  import("@/pages/RrhhDistribucionPage").then((m) => ({ default: m.RrhhDistribucionPage })),
);

function RouteLoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg text-sm text-ink-muted">
      Cargando…
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteLoadingScreen />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/crear-cuenta"
          element={
            <GuestRoute>
              <SignupPage />
            </GuestRoute>
          }
        />
        <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
        <Route
          path="/inicio"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registro-horas"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["TRABAJADOR", "ADMINISTRADOR", "SUPER_ADMIN"]}>
                <HoursRegisterPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/aprobaciones"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMINISTRADOR", "SUPER_ADMIN"]}>
                <ApprovalsPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["LECTOR", "SUPER_ADMIN"]}>
                <ReportsPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/administracion"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["SUPER_ADMIN"]}>
                <AdminPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rrhh-distribucion-cc"
          element={
            <ProtectedRoute>
              <RoleRoute roles={["SUPER_ADMIN"]}>
                <RrhhDistribucionPage />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { HoursRegisterPage } from "@/pages/HoursRegisterPage";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { AdminPage } from "@/pages/AdminPage";
import { RrhhDistribucionPage } from "@/pages/RrhhDistribucionPage";
import { ProtectedRoute, GuestRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";

export function App() {
  return (
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
  );
}

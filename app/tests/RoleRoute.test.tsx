import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoleRoute } from "@/routes/RoleRoute";
import { useWorkforce } from "@/features/workforce/useWorkforce";

vi.mock("@/features/workforce/useWorkforce", () => ({ useWorkforce: vi.fn() }));

const mockUseWorkforce = vi.mocked(useWorkforce);

describe("RoleRoute", () => {
  it("muestra un estado de carga mientras isLoading es true", () => {
    mockUseWorkforce.mockReturnValue({
      trabajador: null,
      roles: [],
      hasRole: () => false,
      isLoading: true,
    });

    render(
      <RoleRoute roles={["SUPER_ADMIN"]}>
        <div>Contenido protegido</div>
      </RoleRoute>,
    );

    expect(screen.getByText(/cargando permisos/i)).toBeInTheDocument();
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("renderiza los hijos cuando el trabajador tiene alguno de los roles permitidos", () => {
    mockUseWorkforce.mockReturnValue({
      trabajador: null,
      roles: ["ADMINISTRADOR"],
      hasRole: (codigo) => codigo === "ADMINISTRADOR",
      isLoading: false,
    });

    render(
      <RoleRoute roles={["ADMINISTRADOR", "SUPER_ADMIN"]}>
        <div>Contenido protegido</div>
      </RoleRoute>,
    );

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });

  it("muestra la pantalla de sin acceso cuando el trabajador no tiene ninguno de los roles permitidos", () => {
    mockUseWorkforce.mockReturnValue({
      trabajador: null,
      roles: ["TRABAJADOR"],
      hasRole: () => false,
      isLoading: false,
    });

    render(
      <RoleRoute roles={["SUPER_ADMIN"]}>
        <div>Contenido protegido</div>
      </RoleRoute>,
    );

    expect(screen.getByText(/no tienes acceso a esta sección/i)).toBeInTheDocument();
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });
});

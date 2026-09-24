import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function ComponenteQueFalla(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React (y nuestro componentDidCatch) logean el error atrapado; se silencia solo en este test.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza a los hijos normalmente cuando no hay error", () => {
    render(
      <ErrorBoundary>
        <div>Contenido normal</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Contenido normal")).toBeInTheDocument();
  });

  it("muestra un mensaje de fallback cuando un hijo lanza un error", () => {
    render(
      <ErrorBoundary>
        <ComponenteQueFalla />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/ocurrió un error inesperado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recargar página/i })).toBeInTheDocument();
  });
});

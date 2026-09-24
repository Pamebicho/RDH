import { Component, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Última defensa ante un error de render no controlado: sin esto, un componente que lanza una
 * excepción deja al usuario con una pantalla en blanco. Se loguea en consola para poder
 * diagnosticar el problema si el usuario lo reporta (no se envía a ningún servicio externo).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error("Error no controlado en la aplicación:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-bg px-4 text-center">
          <div>
            <TriangleAlert className="mx-auto mb-4 h-12 w-12 text-danger" aria-hidden />
            <h1 className="text-xl font-bold text-ink">Ocurrió un error inesperado</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              Intenta recargar la página. Si el problema persiste, contacta a un administrador.
            </p>
            <Button type="button" className="mt-6" onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

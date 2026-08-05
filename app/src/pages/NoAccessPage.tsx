import { ShieldAlert } from "lucide-react";

export function NoAccessPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-danger" aria-hidden />
        <h1 className="text-xl font-bold text-ink">No tienes acceso a esta sección</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Tu rol actual no permite ver esta pantalla. Si crees que es un error, contacta a un
          administrador.
        </p>
      </div>
    </div>
  );
}

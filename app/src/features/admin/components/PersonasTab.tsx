import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  useAsignarRol,
  useRevocarRol,
  useRolesCatalogo,
  useTrabajadorRoles,
  useTrabajadoresAdmin,
} from "../hooks";

export function PersonasTab() {
  const trabajadoresQuery = useTrabajadoresAdmin();
  const rolesQuery = useRolesCatalogo();
  const [trabajadorId, setTrabajadorId] = useState<string | null>(null);
  const [rolAAsignar, setRolAAsignar] = useState("");

  const rolesDelTrabajadorQuery = useTrabajadorRoles(trabajadorId);
  const asignarRol = useAsignarRol(trabajadorId);
  const revocarRol = useRevocarRol(trabajadorId);

  const rolPorId = new Map((rolesQuery.data ?? []).map((rol) => [rol.id, rol]));
  const rolesActivos = new Set((rolesDelTrabajadorQuery.data ?? []).map((tr) => tr.rol_id));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        {trabajadoresQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
        ) : (
          <ul className="max-h-[520px] divide-y divide-[#e5eaf1] overflow-auto">
            {(trabajadoresQuery.data ?? []).map((trabajador) => (
              <li key={trabajador.id}>
                <button
                  type="button"
                  onClick={() => setTrabajadorId(trabajador.id)}
                  className={`block w-full px-4 py-3 text-left text-sm hover:bg-[#f8fbff] ${
                    trabajadorId === trabajador.id ? "bg-[#f1f7ff]" : ""
                  }`}
                >
                  <span className="block font-medium text-ink">
                    {[trabajador.nombres, trabajador.apellidos].filter(Boolean).join(" ") || "(sin nombre)"}
                  </span>
                  <span className="block text-xs text-ink-muted">{trabajador.correo_corporativo}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-[#dfe5ee] bg-white p-4 shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
        {!trabajadorId ? (
          <p className="text-sm text-ink-muted">Selecciona un trabajador para gestionar sus roles.</p>
        ) : (
          <>
            <h3 className="mb-3 text-sm font-bold text-ink">Roles asignados</h3>
            <ul className="mb-4 space-y-1.5 text-sm">
              {[...rolesActivos].map((rolId) => (
                <li key={rolId} className="flex items-center justify-between gap-3">
                  <span>{rolPorId.get(rolId)?.nombre ?? rolId}</span>
                  <button
                    type="button"
                    onClick={() => revocarRol.mutate(rolId)}
                    className="text-xs text-danger hover:underline"
                  >
                    Revocar
                  </button>
                </li>
              ))}
              {!rolesActivos.size ? <li className="text-ink-muted">Sin roles asignados.</li> : null}
            </ul>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="nuevo-rol-select" className="mb-1 block text-xs font-medium text-[#51617a]">
                  Nuevo rol
                </label>
                <select
                  id="nuevo-rol-select"
                  value={rolAAsignar}
                  onChange={(event) => setRolAAsignar(event.target.value)}
                  className="form-input"
                >
                  <option value="">Selecciona un rol…</option>
                  {(rolesQuery.data ?? [])
                    .filter((rol) => !rolesActivos.has(rol.id))
                    .map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <Button
                type="button"
                onClick={() => rolAAsignar && asignarRol.mutate(rolAAsignar)}
                isLoading={asignarRol.isPending}
                className="min-h-[42px]"
              >
                Asignar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

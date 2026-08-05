import { useEffect, useState } from "react";
import { useJornadaDias, useJornadas, useUpsertJornadaDia } from "../hooks";

const DIAS = [
  { numero: 1, nombre: "Lunes" },
  { numero: 2, nombre: "Martes" },
  { numero: 3, nombre: "Miércoles" },
  { numero: 4, nombre: "Jueves" },
  { numero: 5, nombre: "Viernes" },
  { numero: 6, nombre: "Sábado" },
  { numero: 7, nombre: "Domingo" },
];

export function JornadasTab() {
  const jornadasQuery = useJornadas();
  const [jornadaId, setJornadaId] = useState<string | null>(null);

  useEffect(() => {
    if (!jornadaId && jornadasQuery.data?.length) {
      setJornadaId(jornadasQuery.data[0].id);
    }
  }, [jornadaId, jornadasQuery.data]);

  const diasQuery = useJornadaDias(jornadaId);
  const upsertDia = useUpsertJornadaDia(jornadaId);

  const horasPorDia = new Map((diasQuery.data ?? []).map((dia) => [dia.dia_semana, dia.horas_esperadas]));

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      <div className="border-b border-[#e5eaf1] p-4">
        <label htmlFor="jornada-select" className="mb-1 block text-xs font-medium text-[#51617a]">
          Jornada
        </label>
        <select
          id="jornada-select"
          value={jornadaId ?? ""}
          onChange={(event) => setJornadaId(event.target.value)}
          className="form-input max-w-sm"
        >
          {(jornadasQuery.data ?? []).map((jornada) => (
            <option key={jornada.id} value={jornada.id}>
              {jornada.nombre} ({jornada.codigo})
            </option>
          ))}
        </select>
      </div>

      {diasQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-ink-muted">Cargando…</div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fbfcfe] text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Día</th>
              <th className="px-4 py-3 font-semibold">Horas esperadas</th>
            </tr>
          </thead>
          <tbody>
            {DIAS.map((dia) => (
              <tr key={dia.numero} className="border-t border-[#e5eaf1]">
                <td className="px-4 py-3 font-medium text-ink">{dia.nombre}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    defaultValue={horasPorDia.get(dia.numero) ?? 0}
                    onBlur={(event) => {
                      if (!jornadaId) return;
                      upsertDia.mutate({
                        jornada_id: jornadaId,
                        dia_semana: dia.numero,
                        horas_esperadas: Number(event.target.value || 0),
                      });
                    }}
                    className="form-input w-28"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { cn } from "@/utils/cn";
import type { ColumnaRegistro, DayInfo, HoursByDateAndColumn } from "../domain";
import { MAX_DAILY_HOURS, formatHours } from "../domain";

interface WeekTableProps {
  days: DayInfo[];
  columns: ColumnaRegistro[];
  hours: HoursByDateAndColumn;
  activeDate: string | null;
  isSubmitted: boolean;
  getDayTotal: (date: string) => number;
  getColumnTotal: (columnId: string) => number;
  registeredHours: number;
  onSetHour: (date: string, columnId: string, value: number) => void;
  onSetActiveDate: (date: string) => void;
}

// Nota: cada celda agrega su propia clase z-[n] (nunca dos a la vez) para evitar que
// Tailwind aplique un z-index impredecible cuando dos utilidades z-* conviven en un mismo elemento.
const stickyHeadCell = "sticky top-0 bg-[#fbfcfe] shadow-[inset_0_-1px_0_#dfe5ee]";
const stickyFirstCol = "sticky left-0 min-w-[82px] w-[82px] bg-[#fbfcfe] text-center";

// Solo se permite cargar horas con las flechitas del campo numérico (o las flechas del
// teclado), no escribiendo directamente: se bloquea cualquier tecla que no sea de
// navegación/incremento, y también pegar texto.
const TECLAS_PERMITIDAS = new Set([
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "Escape",
  "Enter",
]);

function bloquearEscritura(event: React.KeyboardEvent<HTMLInputElement>) {
  if (!TECLAS_PERMITIDAS.has(event.key)) {
    event.preventDefault();
  }
}

export function WeekTable({
  days,
  columns,
  hours,
  activeDate,
  isSubmitted,
  getDayTotal,
  getColumnTotal,
  registeredHours,
  onSetHour,
  onSetActiveDate,
}: WeekTableProps) {
  if (!columns.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#dfe5ee] bg-white p-6 text-center text-sm text-ink-muted">
        Selecciona al menos un proyecto para poder cargar horas esta semana.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm text-[#10203c] [font-variant-numeric:tabular-nums]">
          <thead>
            <tr>
              <th scope="col" className={cn(stickyHeadCell, stickyFirstCol, "z-[6] px-3 py-2.5 font-bold")}>
                Día
              </th>
              {columns.map((columna) => (
                <th
                  key={columna.id}
                  scope="col"
                  className={cn(stickyHeadCell, "z-[4] min-w-[120px] px-3 py-2.5 text-center align-middle font-semibold")}
                >
                  <span className="block text-[#11294f]">{columna.codigo}</span>
                  <span className="mt-0.5 block text-[0.7rem] font-medium leading-tight text-[#53637b]">
                    {columna.etiqueta}
                  </span>
                </th>
              ))}
              <th scope="col" className={cn(stickyHeadCell, "z-[4] min-w-[92px] px-3 py-2.5 text-center font-semibold")}>
                Total diario
              </th>
            </tr>
          </thead>

          <tbody>
            {days.map((day) => {
              const dayTotal = getDayTotal(day.date);
              const isActive = activeDate === day.date;
              const inputsDisabled = isSubmitted;

              return (
                <tr
                  key={day.date}
                  className={cn(
                    "border-b border-[#e1e7ef]",
                    (day.weekend || day.feriado) && "bg-[#fcfcfd]",
                    isActive && "bg-[#f1f7ff]",
                    !day.weekend && !day.feriado && !isActive && "hover:bg-[#f8fbff]",
                  )}
                >
                  <th
                    scope="row"
                    title={day.feriado ? "Feriado" : undefined}
                    className={cn(
                      stickyFirstCol,
                      "z-[3] px-3 py-2.5 font-normal",
                      (day.weekend || day.feriado) && "text-[#d32f2f]",
                      day.feriado && "font-semibold",
                    )}
                  >
                    {day.label}
                  </th>

                  {columns.map((columna) => (
                    <td key={columna.id} className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={MAX_DAILY_HOURS}
                        step={0.5}
                        value={hours[day.date]?.[columna.id] ?? 0}
                        disabled={inputsDisabled}
                        onFocus={() => onSetActiveDate(day.date)}
                        onChange={(event) => onSetHour(day.date, columna.id, Number(event.target.value || 0))}
                        onKeyDown={bloquearEscritura}
                        onPaste={(event) => event.preventDefault()}
                        aria-label={`Horas del ${day.label} en ${columna.codigo} ${columna.etiqueta}`}
                        className="form-input min-w-[92px] py-1.5 text-center"
                      />
                    </td>
                  ))}

                  <td
                    className={cn(
                      "min-w-[92px] px-3 py-2.5 text-center font-bold",
                      dayTotal > MAX_DAILY_HOURS && "bg-[#fff1f1] text-danger",
                    )}
                  >
                    {formatHours(dayTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className="sticky bottom-0 left-0 z-[5] bg-[#f9fbfe] px-3 py-2.5 text-center font-bold text-[#14233e] shadow-[inset_0_1px_0_#dfe5ee]">
                TOTAL
              </th>
              {columns.map((columna) => (
                <td
                  key={columna.id}
                  className="sticky bottom-0 z-[2] bg-[#f9fbfe] px-3 py-2.5 text-center text-sm font-bold text-[#0752bc] shadow-[inset_0_1px_0_#dfe5ee]"
                >
                  {formatHours(getColumnTotal(columna.id))}
                </td>
              ))}
              <td className="sticky bottom-0 z-[2] bg-[#f9fbfe] px-3 py-2.5 text-center text-sm font-bold text-[#0752bc] shadow-[inset_0_1px_0_#dfe5ee]">
                {formatHours(registeredHours)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

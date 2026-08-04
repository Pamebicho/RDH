import { cn } from "@/utils/cn";
import type { CostCenter, DayInfo, HoursByDateAndCenter, ObservationsByDate } from "../domain";
import { MAX_DAILY_HOURS, formatHours } from "../domain";

interface HoursTableProps {
  days: DayInfo[];
  centers: CostCenter[];
  hours: HoursByDateAndCenter;
  observations: ObservationsByDate;
  activeDate: string | null;
  isSubmitted: boolean;
  getDayTotal: (date: string) => number;
  getColumnTotal: (centerId: string) => number;
  registeredHours: number;
  onSetHour: (date: string, centerId: string, value: number) => void;
  onSetObservation: (date: string, value: string) => void;
  onSetActiveDate: (date: string) => void;
}

// Nota: cada celda agrega su propia clase z-[n] (nunca dos a la vez) para evitar que
// Tailwind aplique un z-index impredecible cuando dos utilidades z-* conviven en un mismo elemento.
const stickyHeadCell = "sticky top-0 bg-[#fbfcfe] shadow-[inset_0_-1px_0_#dfe5ee]";
const stickyFirstCol = "sticky left-0 min-w-[82px] w-[82px] bg-[#fbfcfe] text-center";

export function HoursTable({
  days,
  centers,
  hours,
  observations,
  activeDate,
  isSubmitted,
  getDayTotal,
  getColumnTotal,
  registeredHours,
  onSetHour,
  onSetObservation,
  onSetActiveDate,
}: HoursTableProps) {
  return (
    <section
      aria-labelledby="hours-table-title"
      className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#e5eaf1] p-4 lg:hidden">
        <div>
          <h2 id="hours-table-title" className="text-base font-bold">
            Detalle mensual
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">Desplázate horizontalmente para ver todos los centros.</p>
        </div>
      </div>

      <div className="max-h-[610px] overflow-auto">
        <table className="w-full min-w-[1160px] border-collapse text-sm text-[#10203c] [font-variant-numeric:tabular-nums]">
          <thead>
            <tr>
              <th scope="col" className={cn(stickyHeadCell, stickyFirstCol, "z-[6] px-3 py-2.5 font-bold")}>
                Día
              </th>
              {centers.map((center) => (
                <th key={center.id} scope="col" className={cn(stickyHeadCell, "z-[4] min-w-[135px] px-3 py-2.5 text-center align-middle font-semibold")}>
                  <span className="block text-[#11294f]">{center.id}</span>
                  <span className="mt-0.5 block text-[0.7rem] font-medium leading-tight text-[#53637b]">
                    {center.name}
                  </span>
                </th>
              ))}
              <th scope="col" className={cn(stickyHeadCell, "z-[4] min-w-[92px] px-3 py-2.5 text-center font-semibold")}>
                Total diario
                <span className="mt-0.5 block text-[0.7rem] font-medium text-[#53637b]">Horas</span>
              </th>
              <th scope="col" className={cn(stickyHeadCell, "z-[4] min-w-[250px] px-3 py-2.5 text-left font-semibold")}>
                Observaciones
                <span className="mt-0.5 block text-[0.7rem] font-medium text-[#53637b]">Opcional</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {days.map((day) => {
              const dayTotal = getDayTotal(day.date);
              const isActive = activeDate === day.date;
              const inputsDisabled = isSubmitted || day.weekend;

              return (
                <tr
                  key={day.date}
                  className={cn(
                    "border-b border-[#e1e7ef]",
                    day.weekend && "bg-[#fcfcfd]",
                    isActive && "bg-[#f1f7ff]",
                    !day.weekend && !isActive && "hover:bg-[#f8fbff]",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(stickyFirstCol, "z-[3] px-3 py-2.5 font-normal", day.weekend && "text-[#d32f2f]")}
                  >
                    {day.label}
                  </th>

                  {centers.map((center) => (
                    <td key={center.id} className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={MAX_DAILY_HOURS}
                        step={0.5}
                        value={hours[day.date]?.[center.id] ?? 0}
                        disabled={inputsDisabled}
                        onFocus={() => onSetActiveDate(day.date)}
                        onChange={(event) => onSetHour(day.date, center.id, Number(event.target.value || 0))}
                        aria-label={`Horas del ${day.label} en ${center.id} ${center.name}`}
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

                  <td className="min-w-[250px] px-3 py-2.5">
                    <input
                      type="text"
                      maxLength={180}
                      value={observations[day.date] ?? ""}
                      disabled={inputsDisabled}
                      onFocus={() => onSetActiveDate(day.date)}
                      onChange={(event) => onSetObservation(day.date, event.target.value)}
                      placeholder="Agregar observación"
                      aria-label={`Observación del ${day.label}`}
                      className="form-input min-w-[225px] py-1.5"
                    />
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
              {centers.map((center) => (
                <td
                  key={center.id}
                  className="sticky bottom-0 z-[2] bg-[#f9fbfe] px-3 py-2.5 text-center text-sm font-bold text-[#0752bc] shadow-[inset_0_1px_0_#dfe5ee]"
                >
                  {formatHours(getColumnTotal(center.id))}
                </td>
              ))}
              <td className="sticky bottom-0 z-[2] bg-[#f9fbfe] px-3 py-2.5 text-center text-sm font-bold text-[#0752bc] shadow-[inset_0_1px_0_#dfe5ee]">
                {formatHours(registeredHours)}
              </td>
              <td className="sticky bottom-0 z-[2] bg-[#f9fbfe] px-3 py-2.5 shadow-[inset_0_1px_0_#dfe5ee]">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

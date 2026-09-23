import { useEffect, useState } from "react";
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

// Nota: cada celda agrega su propia clase de z-index (nunca dos a la vez) para evitar que
// Tailwind aplique un z-index impredecible cuando dos utilidades z-* conviven en un mismo elemento.
const stickyHeadCell = "sticky top-0 bg-[#fbfcfe] border-b border-[#dfe5ee]";
const stickyFirstCol = "sticky left-0 min-w-[82px] w-[82px] bg-[#fbfcfe] text-center";

// No se permite escribir letras ni símbolos: solo dígitos, coma/punto decimal y teclas de
// edición/navegación. No se permite pegar texto (para no saltarse la validación de formato).
function bloquearEscritura(event: React.KeyboardEvent<HTMLInputElement>) {
  const key = event.key;
  const isNumber = /^\d$/.test(key);
  const isDecimal = key === "." || key === ",";
  const isControl = ["Backspace", "Delete", "Tab", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key);
  const isModifier = event.ctrlKey || event.metaKey;

  if (!isNumber && !isDecimal && !isControl && !isModifier) {
    event.preventDefault();
  }
}

// Mientras se escribe se acepta hasta 2 dígitos enteros y un solo dígito decimal
// (con coma o punto): "", "1", "1,", "1,5", "24".
const PATRON_HORAS_PARCIAL = /^\d{0,2}([.,]\d{0,1})?$/;

function parseHoursInput(value: string): number {
  if (!value) return 0;
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return 0;
  return Math.min(Math.max(0, parsed), MAX_DAILY_HOURS);
}

/** Formatea con coma decimal para mostrar, o "" si el valor es 0 (celda vacía). */
function formatHoursForDisplay(value: number): string {
  return value === 0 ? "" : formatHours(value);
}

interface HourInputProps {
  value: number;
  disabled: boolean;
  ariaLabel: string;
  onFocusInput: () => void;
  onChangeValue: (value: number) => void;
}

/**
 * Input controlado con estado de texto propio: mientras el usuario escribe (p. ej. "1,")
 * se muestra tal cual, sin redondear a número en cada tecla (eso borraría la coma recién
 * tecleada). Solo se normaliza el texto mostrado al perder el foco.
 */
function HourInput({ value, disabled, ariaLabel, onFocusInput, onChangeValue }: HourInputProps) {
  const [texto, setTexto] = useState(() => formatHoursForDisplay(value));
  const [enFoco, setEnFoco] = useState(false);

  useEffect(() => {
    if (!enFoco) setTexto(formatHoursForDisplay(value));
  }, [value, enFoco]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={texto}
      disabled={disabled}
      onFocus={() => {
        setEnFoco(true);
        onFocusInput();
      }}
      onBlur={() => {
        setEnFoco(false);
        setTexto(formatHoursForDisplay(value));
      }}
      onChange={(event) => {
        const raw = event.target.value;
        if (!PATRON_HORAS_PARCIAL.test(raw)) return;
        setTexto(raw);
        onChangeValue(parseHoursInput(raw));
      }}
      onKeyDown={bloquearEscritura}
      onPaste={(event) => event.preventDefault()}
      placeholder="0"
      aria-label={ariaLabel}
      className="form-input min-w-[92px] py-1.5 text-center"
    />
  );
}

function getDiaSemanIso(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const jsWeekday = date.getDay();
  return jsWeekday === 0 ? 7 : jsWeekday;
}

function getExpectedHours(day: DayInfo): number | null {
  if (day.weekend || day.feriado) return null;
  const diaIso = getDiaSemanIso(day.date);
  return diaIso === 5 ? 6 : 8.5;
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
      <div className="m-4 rounded-xl border border-dashed border-[#dfe5ee] bg-white p-6 text-center text-sm text-ink-muted">
        Selecciona al menos un proyecto para poder cargar horas esta semana.
      </div>
    );
  }

  return (
    <div className="max-h-[68vh] overflow-auto rounded-xl">
      <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm text-[#10203c] [font-variant-numeric:tabular-nums]">
          <thead>
            <tr>
              <th scope="col" className={cn(stickyHeadCell, stickyFirstCol, "z-[6] rounded-tl-xl px-3 py-2.5 font-bold")}>
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
              <th scope="col" className={cn(stickyHeadCell, "z-[4] min-w-[92px] rounded-tr-xl px-3 py-2.5 text-center font-semibold")}>
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
                      "z-[3] border-b border-[#e1e7ef] px-3 py-2.5 font-normal",
                      (day.weekend || day.feriado) && "text-[#d32f2f]",
                      day.feriado && "font-semibold",
                    )}
                  >
                    {day.label}
                  </th>

                  {columns.map((columna) => (
                    <td key={columna.id} className="border-b border-[#e1e7ef] px-3 py-2.5">
                      <HourInput
                        value={hours[day.date]?.[columna.id] ?? 0}
                        disabled={inputsDisabled}
                        ariaLabel={`Horas del ${day.label} en ${columna.codigo} ${columna.etiqueta}`}
                        onFocusInput={() => onSetActiveDate(day.date)}
                        onChangeValue={(value) => onSetHour(day.date, columna.id, value)}
                      />
                    </td>
                  ))}

                  <td
                    className={(() => {
                      const expectedHours = getExpectedHours(day);
                      const isExceeded = expectedHours !== null && dayTotal > expectedHours;
                      const isOverLimit = dayTotal > MAX_DAILY_HOURS;
                      return cn(
                        "border-b border-[#e1e7ef] min-w-[92px] px-3 py-2.5 text-center font-bold",
                        isOverLimit && "bg-[#fff1f1] text-danger",
                        isExceeded && !isOverLimit && "bg-[#fff8e1] text-[#7a6000]",
                      );
                    })()}
                  >
                    {formatHours(dayTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className="sticky bottom-0 left-0 z-[5] rounded-bl-xl border-t border-[#dfe5ee] bg-[#f9fbfe] px-3 py-2.5 text-center font-bold text-[#14233e]">
                TOTAL
              </th>
              {columns.map((columna) => (
                <td
                  key={columna.id}
                  className="sticky bottom-0 z-[2] border-t border-[#dfe5ee] bg-[#f9fbfe] px-3 py-2.5 text-center text-sm font-bold text-[#0752bc]"
                >
                  {formatHours(getColumnTotal(columna.id))}
                </td>
              ))}
              <td className="sticky bottom-0 z-[2] rounded-br-xl border-t border-[#dfe5ee] bg-[#f9fbfe] px-3 py-2.5 text-center text-sm font-bold text-[#0752bc]">
                {formatHours(registeredHours)}
              </td>
            </tr>
          </tfoot>
        </table>
    </div>
  );
}

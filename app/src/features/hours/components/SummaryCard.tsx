import { Clock, History, Hourglass, Info, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateCl } from "@/utils/date";
import { formatHours, formatPercent } from "../domain";

interface SummaryCardProps {
  expectedHours: number;
  registeredHours: number;
  remainingHours: number;
  progress: number;
  deadline?: string;
  isSubmitted: boolean;
  dirty: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  onSave: () => void;
  onSubmit: () => void;
}

export function SummaryCard({
  expectedHours,
  registeredHours,
  remainingHours,
  progress,
  deadline,
  isSubmitted,
  dirty,
  isSaving,
  isSubmitting,
  onSave,
  onSubmit,
}: SummaryCardProps) {
  return (
    <section
      aria-label="Resumen del período"
      className="mt-4 overflow-hidden rounded-xl border border-[#dfe5ee] bg-white shadow-[0_0.25rem_1rem_rgba(27,51,87,0.035)]"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(160px,1fr))_minmax(225px,1.15fr)]">
        <article className="flex items-center justify-between gap-3 border-b border-[#e3e8f0] p-5 sm:border-r xl:border-b-0">
          <div>
            <span className="block text-xs text-[#344861]">Horas esperadas del período</span>
            <strong className="mt-1.5 block text-3xl leading-none text-[#0d1d3a]">
              {formatHours(expectedHours)}
            </strong>
            <small className="mt-1.5 block text-sm text-[#243955]">horas</small>
          </div>
          <span className="grid h-[47px] w-[47px] shrink-0 place-items-center rounded-full bg-[#eaf3ff] text-[#0764e1]">
            <Clock className="h-5 w-5" aria-hidden />
          </span>
        </article>

        <article className="flex items-center justify-between gap-3 border-b border-[#e3e8f0] p-5 xl:border-r xl:border-b-0">
          <div>
            <span className="block text-xs text-[#344861]">Horas registradas</span>
            <strong className="mt-1.5 block text-3xl leading-none text-success">
              {formatHours(registeredHours)}
            </strong>
            <small className="mt-1.5 block text-sm text-[#243955]">horas</small>
          </div>
          <span className="grid h-[47px] w-[47px] shrink-0 place-items-center rounded-full bg-[#e8f8ef] text-[#0b9e57]">
            <History className="h-5 w-5" aria-hidden />
          </span>
        </article>

        <article className="flex items-center justify-between gap-3 border-b border-[#e3e8f0] p-5 sm:border-r xl:border-b-0">
          <div>
            <span className="block text-xs text-[#344861]">Horas restantes</span>
            <strong className="mt-1.5 block text-3xl leading-none text-[#b45300]">
              {formatHours(remainingHours)}
            </strong>
            <small className="mt-1.5 block text-sm text-[#243955]">horas</small>
          </div>
          <span className="grid h-[47px] w-[47px] shrink-0 place-items-center rounded-full bg-[#fff0df] text-[#df6b00]">
            <Hourglass className="h-5 w-5" aria-hidden />
          </span>
        </article>

        <article className="flex items-center border-b border-[#e3e8f0] p-5 xl:border-r xl:border-b-0">
          <div className="w-full">
            <span className="block text-xs text-[#344861]">% de avance</span>
            <strong className="mt-1.5 block text-3xl leading-none text-[#0d1d3a]">
              {formatPercent(progress)}
            </strong>
            <div
              role="progressbar"
              aria-label="Avance del período"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mt-3 h-[9px] overflow-hidden rounded-full bg-[#e6ebf3]"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0969ee] to-[#0753c0] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </article>

        <div className="flex flex-col justify-center gap-2.5 p-5">
          <Button type="button" onClick={onSave} isLoading={isSaving} disabled={isSubmitted} className="w-full">
            <Save className="h-4 w-4" aria-hidden />
            Guardar cambios
          </Button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitted || isSubmitting}
            className="btn-outline w-full"
          >
            <Send className="h-4 w-4" aria-hidden />
            Enviar para aprobación
          </button>
        </div>
      </div>

      <div className="flex min-h-[52px] items-center gap-2.5 border-t border-[#e3e8f0] px-5 py-3 text-sm text-[#4a5d77]">
        <Info className="h-[1.15rem] w-[1.15rem] shrink-0 text-[#0764e1]" aria-hidden />
        <span>
          {isSubmitted
            ? "Este período fue enviado y ya no puede editarse."
            : `Recuerda enviar tu registro para aprobación${deadline ? ` antes del ${formatDateCl(deadline)}` : ""}.`}
          {dirty && !isSubmitted ? " Tienes cambios sin guardar." : ""}
        </span>
      </div>
    </section>
  );
}

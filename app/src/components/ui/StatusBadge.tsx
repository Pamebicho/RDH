import type { PlanillaEstado } from "@/types/database.types";

const STYLES: Record<PlanillaEstado, string> = {
  BORRADOR: "text-[#51617a] bg-[#eef1f5]",
  ENVIADA: "text-[#0750a9] bg-[#eaf3ff]",
  DEVUELTA: "text-[#a54e00] bg-[#fff0dc]",
  APROBADA: "text-[#0b9e57] bg-[#e8f8ef]",
  REABIERTA: "text-[#70549e] bg-[#f3edfc]",
  BLOQUEADA: "text-[#3a3a3a] bg-[#e4e4e4]",
};

const LABELS: Record<PlanillaEstado, string> = {
  BORRADOR: "En borrador",
  ENVIADA: "Enviada",
  DEVUELTA: "Devuelta",
  APROBADA: "Aprobada",
  REABIERTA: "Reabierta",
  BLOQUEADA: "Bloqueada",
};

export function StatusBadge({ status }: { status: PlanillaEstado }) {
  return (
    <span
      className={`inline-flex min-h-[30px] w-fit items-center justify-center rounded-control px-3 text-xs font-semibold ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}

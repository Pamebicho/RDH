import type { PeriodStatus } from "@/types/database.types";

const STYLES: Record<PeriodStatus, string> = {
  editing: "text-[#a54e00] bg-[#fff0dc]",
  submitted: "text-[#0750a9] bg-[#eaf3ff]",
};

const LABELS: Record<PeriodStatus, string> = {
  editing: "En edición",
  submitted: "Enviado",
};

export function StatusBadge({ status }: { status: PeriodStatus }) {
  return (
    <span
      className={`mt-1.5 inline-flex min-h-[34px] w-fit items-center justify-center rounded-control px-4 text-sm font-semibold ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}

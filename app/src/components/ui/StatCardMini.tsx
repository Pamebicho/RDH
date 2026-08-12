import type { LucideIcon } from "lucide-react";

interface StatCardMiniProps {
  icon: LucideIcon;
  label: string;
  value: string;
  isLoading: boolean;
}

export function StatCardMini({ icon: Icon, label, value, isLoading }: StatCardMiniProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[#e5eaf1] bg-[#fbfcfe] px-3.5 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-krontec-blue shadow-sm">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <span className="block text-lg font-bold leading-tight text-[#0d1e3b]">{isLoading ? "…" : value}</span>
        <span className="block truncate text-xs text-ink-muted">{label}</span>
      </div>
    </div>
  );
}

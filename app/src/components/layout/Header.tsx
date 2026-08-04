import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, LogOut, Menu, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/features/auth/useAuth";
import { getInitials } from "@/utils/initials";

export function Header({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const { session } = useAuth();
  const navigate = useNavigate();

  const fullName = (session?.user.user_metadata?.full_name as string | undefined) ?? session?.user.email ?? "";
  const email = session?.user.email ?? "";

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-[1020] flex min-h-[66px] items-center gap-3 border-b border-border/80 bg-white/95 px-4 backdrop-blur lg:min-h-[72px] lg:px-8">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Abrir menú"
        className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-white text-krontec-blue lg:hidden"
      >
        <Menu className="h-6 w-6" aria-hidden />
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => toast("No tienes notificaciones nuevas.")}
        aria-label="Notificaciones"
        className="relative grid h-11 w-11 place-items-center rounded-full text-[#11284d] transition-colors hover:bg-[#f0f5fc] hover:text-krontec-blue"
      >
        <Bell className="h-5 w-5" aria-hidden />
        <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-[#0b63d9] px-1 text-[0.65rem] font-bold text-white">
          0
        </span>
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-[#f5f7fb]">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border-[3px] border-[#e6edf8] bg-gradient-to-br from-krontec-purple to-krontec-blue text-xs font-bold text-white">
              {getInitials(fullName || "?")}
            </span>
            <span className="hidden min-w-[170px] flex-col leading-tight sm:flex">
              <strong className="text-sm">{fullName || "Usuario"}</strong>
              <small className="mt-0.5 text-xs font-normal text-ink-muted">{email}</small>
            </span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-[1030] min-w-[220px] rounded-xl border border-border bg-white p-1.5 shadow-[0_1rem_3rem_rgba(15,31,59,0.18)]"
          >
            <DropdownMenu.Item
              onSelect={() => toast("La sección de perfil se construirá en la siguiente etapa.")}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink outline-none hover:bg-bg"
            >
              <User className="h-4 w-4" aria-hidden />
              Mi perfil
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              onSelect={handleLogout}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-danger outline-none hover:bg-danger-soft"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Cerrar sesión
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}

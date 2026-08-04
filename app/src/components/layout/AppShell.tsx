import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import logoKrontec from "@/assets/logo-krontec.png";
import { Header } from "./Header";
import { SidebarNav } from "./SidebarNav";

export function AppShell({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f6f8fc]">
      <aside
        aria-label="Navegación principal"
        className="fixed inset-y-0 left-0 z-[1030] hidden w-[252px] flex-col bg-[radial-gradient(circle_at_20%_5%,rgba(106,182,239,0.14),transparent_28%),linear-gradient(180deg,#062f61_0%,#05284f_52%,#041f3e_100%)] px-3 pb-5 pt-7 shadow-[0.75rem_0_2.5rem_rgba(13,42,82,0.08)] lg:flex"
      >
        <div className="px-3.5 pb-7 pt-1.5">
          <img src={logoKrontec} alt="Krontec" className="h-[54px] w-[190px] object-contain object-left brightness-0 invert" />
          <p className="mt-4 text-sm leading-relaxed text-white/90">Sistema de Registro de Horas</p>
        </div>

        <SidebarNav />
      </aside>

      <div className="w-full min-w-0 lg:ml-[252px] lg:w-[calc(100%-252px)]">
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1640px] px-3 py-5 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>

      <Dialog.Root open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[1040] bg-[#0b1a33]/55 lg:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-[1050] flex w-[min(320px,88vw)] flex-col bg-gradient-to-b from-[#062f61] to-[#041f3e] px-4 pb-5 pt-5 lg:hidden"
          >
            <div className="mb-5 flex items-center justify-between">
              <img src={logoKrontec} alt="Krontec" className="h-[50px] w-[184px] object-contain object-left brightness-0 invert" />
              <Dialog.Close
                aria-label="Cerrar"
                className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <Dialog.Title className="mb-5 ml-1 text-sm text-white/80">
              Sistema de Registro de Horas
            </Dialog.Title>
            <SidebarNav onNavigate={() => setIsMobileMenuOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"] as const;

/**
 * Cierra la sesión automáticamente tras 30 minutos sin actividad del usuario (mouse, teclado,
 * scroll o touch), para no dejar la plataforma abierta indefinidamente en un equipo desatendido.
 * Solo corre mientras haya sesión activa; el cambio a session=null lo recoge AuthProvider y
 * ProtectedRoute redirige a /login como con cualquier cierre de sesión normal.
 */
export function useInactivityLogout(isActive: boolean) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActive) return;

    function cerrarPorInactividad() {
      toast.info("Tu sesión se cerró por inactividad.");
      void supabase.auth.signOut();
    }

    function resetTimer() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(cerrarPorInactividad, INACTIVITY_TIMEOUT_MS);
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isActive]);
}

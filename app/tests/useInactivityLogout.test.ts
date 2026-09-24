import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInactivityLogout } from "@/features/auth/useInactivityLogout";

const signOut = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { signOut: () => signOut() } },
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn() },
}));

const TREINTA_MINUTOS_MS = 30 * 60 * 1000;

describe("useInactivityLogout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    signOut.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no hace nada si isActive es false", () => {
    renderHook(() => useInactivityLogout(false));
    vi.advanceTimersByTime(TREINTA_MINUTOS_MS + 1000);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("cierra la sesión tras 30 minutos sin actividad", () => {
    renderHook(() => useInactivityLogout(true));
    vi.advanceTimersByTime(TREINTA_MINUTOS_MS);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("no cierra la sesión antes de los 30 minutos", () => {
    renderHook(() => useInactivityLogout(true));
    vi.advanceTimersByTime(TREINTA_MINUTOS_MS - 1000);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("un evento de actividad reinicia el conteo", () => {
    renderHook(() => useInactivityLogout(true));

    vi.advanceTimersByTime(TREINTA_MINUTOS_MS - 1000);
    window.dispatchEvent(new Event("mousedown"));
    vi.advanceTimersByTime(TREINTA_MINUTOS_MS - 1000);
    expect(signOut).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

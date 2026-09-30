import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { periodoYaComenzo } from "@/utils/date";
import type { Periodo } from "@/types/database.types";

function periodo(fechaInicio: string): Periodo {
  return { fecha_inicio: fechaInicio } as Periodo;
}

describe("periodoYaComenzo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("es true para un período que ya comenzó", () => {
    vi.setSystemTime(new Date(2026, 8, 30)); // 30 de septiembre de 2026
    expect(periodoYaComenzo(periodo("2026-08-25"))).toBe(true);
  });

  it("es true el mismo día en que comienza el período", () => {
    vi.setSystemTime(new Date(2026, 8, 25)); // 25 de septiembre de 2026
    expect(periodoYaComenzo(periodo("2026-09-25"))).toBe(true);
  });

  it("es false para un período que todavía no comienza", () => {
    vi.setSystemTime(new Date(2026, 8, 24)); // 24 de septiembre de 2026, un día antes
    expect(periodoYaComenzo(periodo("2026-09-25"))).toBe(false);
  });
});

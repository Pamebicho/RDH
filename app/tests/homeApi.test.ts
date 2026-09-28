import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "./supabaseMock";

const mock: { instance: ReturnType<typeof createSupabaseMock> } = vi.hoisted(() => ({ instance: null as never }));

vi.mock("@/lib/supabaseClient", () => ({
  get supabase() {
    return mock.instance;
  },
}));

import { fetchPlanillasEnCursoCount } from "@/features/home/api";

beforeEach(() => {
  mock.instance = createSupabaseMock();
});

describe("fetchPlanillasEnCursoCount", () => {
  it("cuenta trabajador+período distintos en estado BORRADOR/DEVUELTA", async () => {
    const filas = [
      { trabajador_id: "trab-1", periodo_id: "periodo-1" },
      { trabajador_id: "trab-1", periodo_id: "periodo-1" }, // misma persona, otra semana: no duplica
      { trabajador_id: "trab-2", periodo_id: "periodo-1" },
    ];
    mock.instance = createSupabaseMock({ dataByTable: { planillas_semanales: filas } });

    const total = await fetchPlanillasEnCursoCount();

    expect(total).toBe(2);

    const inCall = mock.instance.calls.find((c) => c.table === "planillas_semanales" && c.op === "in");
    expect(inCall?.args).toEqual(["estado", ["BORRADOR", "DEVUELTA"]]);
  });

  it("devuelve 0 cuando no hay planillas en progreso", async () => {
    const total = await fetchPlanillasEnCursoCount();
    expect(total).toBe(0);
  });

  it("propaga el error si Supabase lo rechaza", async () => {
    mock.instance = createSupabaseMock({ errorsByTable: { planillas_semanales: { message: "denegado" } } });
    await expect(fetchPlanillasEnCursoCount()).rejects.toEqual({ message: "denegado" });
  });
});

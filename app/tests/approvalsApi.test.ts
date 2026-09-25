import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "./supabaseMock";

const mock: { instance: ReturnType<typeof createSupabaseMock> } = vi.hoisted(() => ({ instance: null as never }));

vi.mock("@/lib/supabaseClient", () => ({
  get supabase() {
    return mock.instance;
  },
}));

import { aprobarPlanilla, devolverPlanilla, fetchPlanillasEnCurso } from "@/features/approvals/api";

beforeEach(() => {
  mock.instance = createSupabaseMock();
});

describe("fetchPlanillasEnCurso", () => {
  it("filtra por estado BORRADOR/DEVUELTA ordenando por última actualización", async () => {
    const filas = [{ id: "planilla-1", estado: "BORRADOR" }];
    mock.instance = createSupabaseMock({ dataByTable: { planillas_semanales: filas } });

    const resultado = await fetchPlanillasEnCurso();

    expect(resultado).toEqual(filas);

    const inCall = mock.instance.calls.find((c) => c.table === "planillas_semanales" && c.op === "in");
    expect(inCall?.args).toEqual(["estado", ["BORRADOR", "DEVUELTA"]]);

    const orderCall = mock.instance.calls.find((c) => c.table === "planillas_semanales" && c.op === "order");
    expect(orderCall?.args).toEqual(["actualizado_en", { ascending: false }]);
  });

  it("propaga el error si Supabase lo rechaza", async () => {
    mock.instance = createSupabaseMock({ errorsByTable: { planillas_semanales: { message: "denegado" } } });
    await expect(fetchPlanillasEnCurso()).rejects.toEqual({ message: "denegado" });
  });
});

describe("aprobarPlanilla", () => {
  it("actualiza la planilla a APROBADA y registra la aprobación", async () => {
    await aprobarPlanilla("planilla-1", "admin-1");

    const updateCall = mock.instance.calls.find((c) => c.table === "planillas_semanales" && c.op === "update");
    expect((updateCall?.args[0] as Record<string, unknown>).estado).toBe("APROBADA");

    const insertCall = mock.instance.calls.find((c) => c.table === "aprobaciones_planilla" && c.op === "insert");
    expect(insertCall?.args[0]).toMatchObject({
      planilla_semanal_id: "planilla-1",
      administrador_id: "admin-1",
      accion: "APROBADA",
    });
  });

  it("no registra la aprobación si falla la actualización de la planilla", async () => {
    mock.instance = createSupabaseMock({ errorsByTable: { planillas_semanales: { message: "denegado" } } });

    await expect(aprobarPlanilla("planilla-1", "admin-1")).rejects.toEqual({ message: "denegado" });

    const insertCall = mock.instance.calls.find((c) => c.table === "aprobaciones_planilla" && c.op === "insert");
    expect(insertCall).toBeUndefined();
  });
});

describe("devolverPlanilla", () => {
  it("actualiza la planilla a DEVUELTA y registra el comentario", async () => {
    await devolverPlanilla("planilla-1", "admin-1", "Faltan horas del viernes");

    const updateCall = mock.instance.calls.find((c) => c.table === "planillas_semanales" && c.op === "update");
    expect((updateCall?.args[0] as Record<string, unknown>).estado).toBe("DEVUELTA");

    const insertCall = mock.instance.calls.find((c) => c.table === "aprobaciones_planilla" && c.op === "insert");
    expect(insertCall?.args[0]).toMatchObject({
      planilla_semanal_id: "planilla-1",
      administrador_id: "admin-1",
      accion: "DEVUELTA",
      comentario: "Faltan horas del viernes",
    });
  });
});

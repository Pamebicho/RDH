import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "./supabaseMock";

const mock: { instance: ReturnType<typeof createSupabaseMock> } = vi.hoisted(() => ({ instance: null as never }));

vi.mock("@/lib/supabaseClient", () => ({
  get supabase() {
    return mock.instance;
  },
}));

import { submitPlanilla, upsertRegistros, type RegistroUpsert } from "@/features/hours/api";

beforeEach(() => {
  mock.instance = createSupabaseMock();
});

describe("upsertRegistros", () => {
  it("usa upsert por lote para las filas con proyecto_id", async () => {
    const rows: RegistroUpsert[] = [
      {
        planilla_semanal_id: "planilla-1",
        trabajador_id: "trab-1",
        fecha: "2026-08-10",
        proyecto_id: "proyecto-1",
        tipo_registro_id: "tipo-ord",
        horas: 8,
      },
    ];

    await upsertRegistros(rows);

    const upsertCall = mock.instance.calls.find((c) => c.op === "upsert");
    expect(upsertCall).toBeDefined();
    expect(upsertCall?.args[0]).toEqual(rows);
    expect(upsertCall?.args[1]).toEqual({ onConflict: "trabajador_id,fecha,tipo_registro_id,proyecto_id" });
  });

  it("borra e inserta (no hace upsert) para filas sin proyecto_id con horas > 0", async () => {
    const rows: RegistroUpsert[] = [
      {
        planilla_semanal_id: "planilla-1",
        trabajador_id: "trab-1",
        fecha: "2026-08-10",
        proyecto_id: null,
        tipo_registro_id: "tipo-vac",
        horas: 8,
      },
    ];

    await upsertRegistros(rows);

    const ops = mock.instance.calls.map((c) => c.op);
    expect(ops).toContain("delete");
    expect(ops).toContain("insert");
    expect(ops).not.toContain("upsert");

    const insertCall = mock.instance.calls.find((c) => c.op === "insert");
    expect(insertCall?.args[0]).toEqual(rows[0]);
  });

  it("solo borra (no inserta) cuando horas <= 0 y no hay proyecto_id", async () => {
    const rows: RegistroUpsert[] = [
      {
        planilla_semanal_id: "planilla-1",
        trabajador_id: "trab-1",
        fecha: "2026-08-10",
        proyecto_id: null,
        tipo_registro_id: "tipo-vac",
        horas: 0,
      },
    ];

    await upsertRegistros(rows);

    const ops = mock.instance.calls.map((c) => c.op);
    expect(ops).toContain("delete");
    expect(ops).not.toContain("insert");
  });

  it("propaga el error si el delete de una fila sin proyecto falla", async () => {
    mock.instance = createSupabaseMock({ errorsByTable: { registros_horas: { message: "boom" } } });

    const rows: RegistroUpsert[] = [
      {
        planilla_semanal_id: "planilla-1",
        trabajador_id: "trab-1",
        fecha: "2026-08-10",
        proyecto_id: null,
        tipo_registro_id: "tipo-vac",
        horas: 8,
      },
    ];

    await expect(upsertRegistros(rows)).rejects.toEqual({ message: "boom" });
  });
});

describe("submitPlanilla", () => {
  it("marca la planilla como ENVIADA con los totales entregados", async () => {
    await submitPlanilla("planilla-1", { ordinarias: 40, extraordinarias: 2, ausencias: 0 });

    const updateCall = mock.instance.calls.find((c) => c.op === "update");
    expect(updateCall).toBeDefined();
    const payload = updateCall?.args[0] as Record<string, unknown>;
    expect(payload.estado).toBe("ENVIADA");
    expect(payload.total_ordinarias).toBe(40);
    expect(payload.total_extraordinarias).toBe(2);
    expect(payload.total_ausencias).toBe(0);

    const eqCall = mock.instance.calls.find((c) => c.op === "eq");
    expect(eqCall?.args).toEqual(["id", "planilla-1"]);
  });

  it("propaga el error si Supabase rechaza la actualización", async () => {
    mock.instance = createSupabaseMock({ errorsByTable: { planillas_semanales: { message: "no autorizado" } } });

    await expect(
      submitPlanilla("planilla-1", { ordinarias: 40, extraordinarias: 0, ausencias: 0 }),
    ).rejects.toEqual({ message: "no autorizado" });
  });
});

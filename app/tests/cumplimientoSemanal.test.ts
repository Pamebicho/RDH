import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "./supabaseMock";

// hooks.ts importa (transitivamente) el cliente real de Supabase a nivel de módulo, que falla
// sin credenciales; calcularCumplimientoSemanal es pura y no lo necesita, pero igual hay que
// mockearlo para poder importar el archivo en el test.
vi.mock("@/lib/supabaseClient", () => ({ supabase: createSupabaseMock() }));

import { calcularCumplimientoSemanal } from "@/features/approvals/hooks";
import type { PlanillaSemanal, Semana, Trabajador } from "@/types/database.types";

function trabajador(id: string, nombres: string, apellidos: string): Trabajador {
  return { id, nombres, apellidos, correo_corporativo: `${id}@krontec.cl` } as Trabajador;
}

function semana(id: string, numero: number, inicio: string, fin: string): Semana {
  return { id, numero_semana: numero, fecha_inicio: inicio, fecha_fin: fin } as Semana;
}

function planilla(trabajadorId: string, semanaId: string, horas: number): PlanillaSemanal {
  return {
    trabajador_id: trabajadorId,
    semana_id: semanaId,
    total_ordinarias: horas,
    total_extraordinarias: 0,
    total_ausencias: 0,
  } as PlanillaSemanal;
}

const semana1 = semana("semana-1", 1, "2026-09-25", "2026-10-01");
const semana2 = semana("semana-2", 2, "2026-10-02", "2026-10-08");

describe("calcularCumplimientoSemanal", () => {
  it("no incluye a un trabajador sin ninguna planilla (sin registrar ninguna semana)", () => {
    const trabajadorSinNada = trabajador("t1", "Ana", "Soto");
    const resultado = calcularCumplimientoSemanal([trabajadorSinNada], [semana1, semana2], []);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].semanasSinRegistrar).toBe(2);
    expect(resultado[0].semanas.every((s) => !s.registro)).toBe(true);
  });

  it("una planilla con horas en 0 cuenta igual como 'sin registrar' esa semana", () => {
    const t = trabajador("t1", "Ana", "Soto");
    const resultado = calcularCumplimientoSemanal([t], [semana1], [planilla("t1", "semana-1", 0)]);

    expect(resultado[0].semanas[0].registro).toBe(false);
  });

  it("excluye a un trabajador que registró horas todas las semanas (ya está al día)", () => {
    const t = trabajador("t1", "Ana", "Soto");
    const planillas = [planilla("t1", "semana-1", 8), planilla("t1", "semana-2", 8)];
    const resultado = calcularCumplimientoSemanal([t], [semana1, semana2], planillas);

    expect(resultado).toHaveLength(0);
  });

  it("marca correctamente una semana sí y otra no para el mismo trabajador", () => {
    const t = trabajador("t1", "Ana", "Soto");
    const resultado = calcularCumplimientoSemanal([t], [semana1, semana2], [planilla("t1", "semana-1", 8)]);

    expect(resultado[0].semanas[0].registro).toBe(true);
    expect(resultado[0].semanas[1].registro).toBe(false);
    expect(resultado[0].semanasSinRegistrar).toBe(1);
  });

  it("ordena por más semanas sin registrar primero, y por apellido ante empate", () => {
    const zarate = trabajador("t1", "Pedro", "Zárate"); // 2 semanas sin registrar
    const alvarez = trabajador("t2", "Marta", "Álvarez"); // 1 semana sin registrar
    const barrios = trabajador("t3", "Luis", "Barrios"); // 1 semana sin registrar (empate con Álvarez)

    const resultado = calcularCumplimientoSemanal(
      [barrios, zarate, alvarez],
      [semana1, semana2],
      [planilla("t2", "semana-1", 8), planilla("t3", "semana-1", 8)],
    );

    expect(resultado.map((r) => r.trabajadorId)).toEqual(["t1", "t2", "t3"]);
  });

  it("devuelve lista vacía si no hay semanas ya iniciadas", () => {
    const t = trabajador("t1", "Ana", "Soto");
    expect(calcularCumplimientoSemanal([t], [], [])).toEqual([]);
  });
});

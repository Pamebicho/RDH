import { describe, expect, it } from "vitest";
import { toTitleCase } from "@/utils/text";

describe("toTitleCase", () => {
  it("capitaliza cada palabra a partir de mayúsculas", () => {
    expect(toTitleCase("PAMELA GUTIERREZ MORALES")).toBe("Pamela Gutierrez Morales");
  });

  it("capitaliza cada palabra a partir de minúsculas", () => {
    expect(toTitleCase("pamela gutierrez morales")).toBe("Pamela Gutierrez Morales");
  });

  it("respeta tildes y ñ", () => {
    expect(toTitleCase("josé muñoz núñez")).toBe("José Muñoz Núñez");
  });

  it("capitaliza después de un guión (nombres compuestos)", () => {
    expect(toTitleCase("maría-josé pérez")).toBe("María-José Pérez");
  });

  it("colapsa espacios repetidos y recorta los extremos", () => {
    expect(toTitleCase("  ana   maría  ")).toBe("Ana María");
  });
});

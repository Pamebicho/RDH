import { describe, expect, it } from "vitest";
import { loginSchema } from "@/features/auth/authValidation";

describe("loginSchema", () => {
  it("acepta un correo @krontec.cl y una contraseña válida", () => {
    const result = loginSchema.safeParse({
      email: "usuario@krontec.cl",
      password: "123456",
      remember: false,
    });

    expect(result.success).toBe(true);
  });

  it("rechaza correos fuera del dominio corporativo", () => {
    const result = loginSchema.safeParse({
      email: "usuario@gmail.com",
      password: "123456",
      remember: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("@krontec.cl");
    }
  });

  it("rechaza contraseñas de menos de 6 caracteres", () => {
    const result = loginSchema.safeParse({
      email: "usuario@krontec.cl",
      password: "123",
      remember: false,
    });

    expect(result.success).toBe(false);
  });
});

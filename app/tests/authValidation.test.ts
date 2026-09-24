import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "@/features/auth/authValidation";

const signupBase = {
  nombres: "Ana",
  apellidos: "Pérez",
  rut: "12.345.678-9",
  cargoId: "",
  jefatura: "",
  email: "usuario@krontec.cl",
  confirmPassword: "Password1",
};

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

describe("signupSchema (política de contraseña fuerte)", () => {
  it("acepta una contraseña con mayúscula, minúscula, número y 8+ caracteres", () => {
    const result = signupSchema.safeParse({ ...signupBase, password: "Password1" });
    expect(result.success).toBe(true);
  });

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    const result = signupSchema.safeParse({ ...signupBase, password: "Pass1", confirmPassword: "Pass1" });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseñas sin mayúscula", () => {
    const result = signupSchema.safeParse({ ...signupBase, password: "password1", confirmPassword: "password1" });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseñas sin número", () => {
    const result = signupSchema.safeParse({ ...signupBase, password: "Password", confirmPassword: "Password" });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseñas sin minúscula", () => {
    const result = signupSchema.safeParse({ ...signupBase, password: "PASSWORD1", confirmPassword: "PASSWORD1" });
    expect(result.success).toBe(false);
  });
});

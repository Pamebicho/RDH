import { z } from "zod";
import { CORPORATE_DOMAIN } from "@/config/env";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Debes ingresar tu correo corporativo.")
    .email("El correo ingresado no tiene un formato válido.")
    .refine((value) => value.toLowerCase().endsWith(`@${CORPORATE_DOMAIN}`), {
      message: `Debes utilizar un correo @${CORPORATE_DOMAIN}.`,
    }),
  password: z
    .string()
    .min(1, "Debes ingresar tu contraseña.")
    .min(6, "La contraseña debe tener al menos 6 caracteres."),
  remember: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Debes ingresar tu nueva contraseña.")
      .min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirmPassword: z.string().min(1, "Debes confirmar tu nueva contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const signupSchema = z
  .object({
    nombres: z.string().trim().min(1, "Debes ingresar tu nombre."),
    apellidos: z.string().trim().min(1, "Debes ingresar tu apellido."),
    email: z
      .string()
      .trim()
      .min(1, "Debes ingresar tu correo corporativo.")
      .email("El correo ingresado no tiene un formato válido.")
      .refine((value) => value.toLowerCase().endsWith(`@${CORPORATE_DOMAIN}`), {
        message: `Debes utilizar un correo @${CORPORATE_DOMAIN}.`,
      }),
    password: z
      .string()
      .min(1, "Debes ingresar una contraseña.")
      .min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirmPassword: z.string().min(1, "Debes confirmar tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

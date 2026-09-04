import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { useAuth } from "./useAuth";
import { resetPasswordSchema, type ResetPasswordFormValues } from "./authValidation";

type StatusTone = "success" | "danger" | "info";

interface StatusMessage {
  tone: StatusTone;
  text: string;
}

const STATUS_STYLES: Record<StatusTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-krontec-blue/25 bg-krontec-blue/5 text-krontec-blue",
};

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setStatus(null);

    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setStatus({ tone: "danger", text: "No fue posible actualizar tu contraseña. Intenta nuevamente." });
      return;
    }

    setStatus({ tone: "success", text: "Contraseña actualizada. Redirigiendo al inicio de sesión…" });
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (isLoading) {
    return (
      <article className="w-full max-w-md rounded-card border border-krontec-gray/60 bg-white/97 p-5 text-center shadow-card sm:p-7">
        <p className="text-sm text-ink-muted">Verificando enlace…</p>
      </article>
    );
  }

  if (!session) {
    return (
      <article className="w-full max-w-md rounded-card border border-krontec-gray/60 bg-white/97 p-5 text-center shadow-card sm:p-7">
        <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Enlace no válido
        </h2>
        <p className="mx-auto mb-6 max-w-[22rem] text-sm leading-relaxed text-ink-muted">
          Este enlace de recuperación no es válido o ya expiró. Solicita uno nuevo desde la
          pantalla de inicio de sesión.
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/login", { replace: true })}>
          Volver al inicio de sesión
        </Button>
      </article>
    );
  }

  return (
    <article className="w-full max-w-md rounded-card border border-krontec-gray/60 bg-white/97 p-5 shadow-card sm:p-7">
      <header className="mb-5 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-krontec-sky/20 to-krontec-violet/15 text-krontec-blue">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Nueva contraseña
        </h2>
        <p className="mx-auto max-w-[22rem] text-sm leading-relaxed text-ink-muted">
          Elige una nueva contraseña para tu cuenta.
        </p>
      </header>

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
            Nueva contraseña
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ingresa tu nueva contraseña"
              className="form-input pl-10 pr-11"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="password-error"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-krontec-blue"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p id="password-error" className="field-error" aria-live="polite">
            {errors.password?.message}
          </p>
        </div>

        <div className="mb-5">
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-semibold text-ink">
            Confirmar contraseña
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repite tu nueva contraseña"
              className="form-input pl-10"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby="confirmPassword-error"
              {...register("confirmPassword")}
            />
          </div>
          <p id="confirmPassword-error" className="field-error" aria-live="polite">
            {errors.confirmPassword?.message}
          </p>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Actualizar contraseña
        </Button>

        {status ? (
          <div
            role="alert"
            aria-live="polite"
            className={`mt-5 rounded-control border px-4 py-3 text-sm ${STATUS_STYLES[status.tone]}`}
          >
            {status.text}
          </div>
        ) : null}
      </form>
    </article>
  );
}

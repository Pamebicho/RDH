import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { CORPORATE_DOMAIN } from "@/config/env";
import { signupSchema, type SignupFormValues } from "./authValidation";

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

export function SignupForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { nombres: "", apellidos: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setStatus(null);

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { nombres: values.nombres, apellidos: values.apellidos } },
    });

    if (error) {
      setStatus({ tone: "danger", text: "No fue posible crear tu cuenta. Verifica tus datos e intenta nuevamente." });
      return;
    }

    navigate("/registro-horas", { replace: true });
  };

  return (
    <article className="w-full max-w-md rounded-card border border-krontec-gray/60 bg-white/97 p-5 shadow-card sm:p-7">
      <header className="mb-5 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-krontec-sky/20 to-krontec-violet/15 text-krontec-blue">
          <UserPlus className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Crear cuenta
        </h2>
        <p className="mx-auto max-w-[22rem] text-sm leading-relaxed text-ink-muted">
          Regístrate con tu correo @{CORPORATE_DOMAIN} para acceder al sistema.
        </p>
      </header>

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nombres" className="mb-1.5 block text-sm font-semibold text-ink">
              Nombres
            </label>
            <input
              id="nombres"
              autoComplete="given-name"
              placeholder="Tu nombre"
              className="form-input"
              aria-invalid={Boolean(errors.nombres)}
              aria-describedby="nombres-error"
              {...register("nombres")}
            />
            <p id="nombres-error" className="field-error" aria-live="polite">
              {errors.nombres?.message}
            </p>
          </div>

          <div>
            <label htmlFor="apellidos" className="mb-1.5 block text-sm font-semibold text-ink">
              Apellidos
            </label>
            <input
              id="apellidos"
              autoComplete="family-name"
              placeholder="Tu apellido"
              className="form-input"
              aria-invalid={Boolean(errors.apellidos)}
              aria-describedby="apellidos-error"
              {...register("apellidos")}
            />
            <p id="apellidos-error" className="field-error" aria-live="polite">
              {errors.apellidos?.message}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
            Correo corporativo
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder={`usuario@${CORPORATE_DOMAIN}`}
              className="form-input pl-10"
              aria-invalid={Boolean(errors.email)}
              aria-describedby="email-error"
              {...register("email")}
            />
          </div>
          <p id="email-error" className="field-error" aria-live="polite">
            {errors.email?.message}
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
            Contraseña
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
              placeholder="Crea una contraseña"
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
              placeholder="Repite tu contraseña"
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
          Crear cuenta
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

        <p className="mt-4 text-center text-sm text-ink-muted">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-krontec-blue hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </article>
  );
}

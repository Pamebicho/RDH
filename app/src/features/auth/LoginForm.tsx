import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Clock, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { loginSchema, type LoginFormValues } from "./authValidation";

const REMEMBERED_EMAIL_KEY = "krontec.rememberedEmail";

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

export function LoginForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "",
      password: "",
      remember: Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)),
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setStatus(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setStatus({ tone: "danger", text: "No fue posible iniciar sesión. Verifica tus credenciales." });
      return;
    }

    if (values.remember) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, values.email.toLowerCase());
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    setStatus({ tone: "success", text: "Inicio de sesión correcto. Redirigiendo al registro de horas…" });
    navigate("/registro-horas", { replace: true });
  };

  const handleForgotPassword = async () => {
    setStatus(null);
    const isEmailValid = await trigger("email");

    if (!isEmailValid) {
      return;
    }

    const email = getValues("email");
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setStatus({ tone: "danger", text: "No fue posible enviar el correo de recuperación." });
      return;
    }

    setStatus({
      tone: "info",
      text: "Te enviamos un correo con instrucciones para restablecer tu contraseña.",
    });
  };

  return (
    <article className="w-full max-w-[40rem] rounded-card border border-krontec-gray/60 bg-white/97 p-10 shadow-card sm:p-12">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-gradient-to-br from-krontec-sky/20 to-krontec-violet/15 text-krontec-blue">
          <Clock className="h-9 w-9" aria-hidden />
        </div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Bienvenido
        </h2>
        <p className="mx-auto max-w-[24.5rem] text-base leading-relaxed text-ink-muted">
          Ingresa para acceder al sistema de registro de horas.
        </p>
      </header>

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-5">
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
              placeholder="usuario@krontec.cl"
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

        <div className="mb-5">
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
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
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

        <div className="mb-6 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-krontec-blue focus:ring-krontec-blue"
              {...register("remember")}
            />
            Recordarme
          </label>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm font-medium text-krontec-blue hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Iniciar sesión
        </Button>

        <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-5 text-[#7b8799]">
          <span className="h-px bg-[#dfe3ea]" />
          <small className="text-sm">o</small>
          <span className="h-px bg-[#dfe3ea]" />
        </div>

        <button
          type="button"
          onClick={() =>
            setStatus({
              tone: "info",
              text: "El acceso con Microsoft quedará conectado en una próxima etapa (Azure AD).",
            })
          }
          className="btn-outline w-full"
        >
          Iniciar sesión con Microsoft
        </button>

        {status ? (
          <div
            role="alert"
            aria-live="polite"
            className={`mt-6 rounded-control border px-4 py-3 text-sm ${STATUS_STYLES[status.tone]}`}
          >
            {status.text}
          </div>
        ) : null}
      </form>
    </article>
  );
}

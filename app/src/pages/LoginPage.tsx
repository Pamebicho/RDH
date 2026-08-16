import { LoginForm } from "@/features/auth/LoginForm";
import logoKrontec from "@/assets/logo-krontec.png";
import logoKrontecBlanco from "@/assets/logo-oficial-blanco.png";

export function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(470px,46%)_1fr]">
      <section
        aria-labelledby="system-title"
        className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-[#062f61] via-[#0b3f7a] to-[#041f3e] px-14 pb-16 pt-14 text-white [clip-path:polygon(0_0,89%_0,100%_50%,89%_100%,0_100%)] lg:flex"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_5%,rgba(106,182,239,0.18),transparent_28%)]"
        />

        <img src={logoKrontecBlanco} alt="Krontec" className="relative z-10 w-[min(20vw,19.4rem)]" />

        <div className="relative z-10 max-w-[31rem] pb-6">
          <p className="mb-1 text-2xl lg:text-[2.1rem]">Sistema de</p>
          <h1
            id="system-title"
            className="text-5xl font-extrabold leading-[1.06] tracking-tight lg:text-[3.8rem]"
          >
            Registro de Horas
          </h1>
          <span className="my-6 block h-[0.3rem] w-14 rounded-full bg-gradient-to-r from-krontec-sky to-krontec-violet" />
          <p className="max-w-[27rem] text-lg leading-relaxed text-white/90">
            Registra y gestiona tus horas trabajadas de forma simple, rápida y segura.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(106,182,239,0.08),transparent_26rem)] px-4 py-6 sm:px-10 sm:py-8">
        <div className="mb-5 flex items-center lg:hidden">
          <img src={logoKrontec} alt="Krontec" className="h-auto w-40" />
        </div>

        <LoginForm />

        <footer className="mt-6 text-center text-sm text-[#6c7789]">
          © {new Date().getFullYear()} Krontec SpA. Todos los derechos reservados.
        </footer>
      </section>
    </main>
  );
}

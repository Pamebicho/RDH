import { LoginForm } from "@/features/auth/LoginForm";
import { AuthLayout } from "@/features/auth/AuthLayout";

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}

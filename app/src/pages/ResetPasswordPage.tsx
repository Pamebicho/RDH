import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";
import { AuthLayout } from "@/features/auth/AuthLayout";

export function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}

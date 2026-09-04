import { SignupForm } from "@/features/auth/SignupForm";
import { AuthLayout } from "@/features/auth/AuthLayout";

export function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}

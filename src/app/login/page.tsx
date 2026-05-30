import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-canvas to-brand-primary-soft px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}

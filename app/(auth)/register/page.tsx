import { AuthForm } from "../../../components/auth/AuthForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <AuthForm mode="register" />
    </main>
  );
}

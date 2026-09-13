import { AuthForm } from "../../../components/auth/AuthForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <AuthForm mode="login" />
    </main>
  );
}

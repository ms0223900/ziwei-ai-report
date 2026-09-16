"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  mapAuthClientStartError,
  mapLoginAuthError,
  mapRegisterAuthError,
  validateAuthFields,
} from "../../lib/auth/credentials";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

export type AuthFormMode = "login" | "register";

export type AuthFormProps = {
  mode: AuthFormMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = mode === "register" ? "註冊" : "登入";
  const submitLabel = mode === "register" ? "建立帳號" : "登入";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }

    const parsed = validateAuthFields({ email, password });
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
        });
        if (signUpError) {
          setError(mapRegisterAuthError(signUpError.message));
          return;
        }
        if (!data.session) {
          router.push("/login");
          router.refresh();
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.email,
          password: parsed.password,
        });
        if (signInError) {
          setError(mapLoginAuthError());
          return;
        }
      }
      router.push("/");
      router.refresh();
    } catch (error) {
      setError(mapAuthClientStartError(mode, error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="w-full max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-8 md:max-w-[576px] md:px-8 md:py-10">
      <header className="mb-6">
        <h1 className="font-serif text-display text-ink">{title}</h1>
        <p className="mt-3 text-body text-ink-soft">
          {mode === "register"
            ? "用電子信箱建立可辨識的身分。不蒐集性別或出生地。"
            : "登入後重整仍會認得你。"}
        </p>
      </header>
      <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-label font-medium text-ink" htmlFor={emailId}>
            電子信箱
          </label>
          <input
            autoComplete="email"
            className="min-h-11 rounded-control border border-line bg-sheet px-3 py-2 text-body text-ink"
            disabled={busy}
            id={emailId}
            name="email"
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            type="email"
            value={email}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-label font-medium text-ink" htmlFor={passwordId}>
            密碼
          </label>
          <input
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="min-h-11 rounded-control border border-line bg-sheet px-3 py-2 text-body text-ink"
            disabled={busy}
            id={passwordId}
            name="password"
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            type="password"
            value={password}
          />
        </div>
        {error ? (
          <p className="text-label text-warn" id={errorId} role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="min-h-11 w-full rounded-control bg-seal px-5 py-3 text-button text-sheet transition-colors duration-[var(--primitive-duration-hover)] hover:bg-seal-deep disabled:pointer-events-none disabled:opacity-[0.45]"
          disabled={busy}
          type="submit"
        >
          {submitLabel}
        </button>
      </form>
    </article>
  );
}

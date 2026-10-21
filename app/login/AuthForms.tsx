"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/Logo";
import { Divider, OrnateCard } from "@/components/Ornament";
import { track } from "@/lib/busy";
import { login, register, useCurrentUser } from "@/lib/user";
import { BusyLabel } from "@/components/ui";

export function AuthForms() {
  const router = useRouter();
  const user = useCurrentUser();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Уже вошёл — сразу на главную (как checkExistingAuth в старом сайте)
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    const result = await track(async () =>
      mode === "login"
        ? await login(get("email"), String(f.get("password") ?? ""))
        : await register({
            username: get("username"),
            email: get("email"),
            password: String(f.get("password") ?? ""),
            confirmPassword: String(f.get("confirmPassword") ?? ""),
          }),
    );
    setBusy(false);
    if (result.ok) router.replace("/dashboard");
    else setError(result.error);
  }

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError("");
  };

  return (
    <OrnateCard className="w-full max-w-md">
      <div className="text-center">
        <Logo className="text-4xl" wordClassName="text-primary dark:text-white" />
        <p className="mt-1 text-muted">Қазақ мақал-мәтелдерін үйрену платформасы</p>
      </div>
      <Divider />

      <form key={mode} onSubmit={onSubmit} noValidate className="space-y-4">
        <h1 className="text-center font-serif text-2xl font-bold text-heading">{mode === "login" ? "Кіру" : "Тіркелу"}</h1>

        {mode === "register" && <Field name="username" label="Пайдаланушы аты" autoComplete="nickname" />}
        <Field name="email" label="Электронды пошта" type="email" autoComplete="email" />
        <Field
          name="password"
          label="Құпия сөз"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <Field name="confirmPassword" label="Құпия сөзді растау" type="password" autoComplete="new-password" />
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-700/40 bg-red-700/10 px-4 py-2 text-sm text-red-800 dark:text-red-200">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <BusyLabel>Күте тұрыңыз...</BusyLabel> : mode === "login" ? "Кіру" : "Тіркелу"}
        </button>

        <p className="text-center text-sm">
          {mode === "login" ? "Тіркелмедіңіз бе? " : "Тіркелдіңіз бе? "}
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
            className="font-semibold text-primary underline underline-offset-4 dark:text-gold"
          >
            {mode === "login" ? "Тіркелу" : "Кіру"}
          </button>
        </p>
      </form>
    </OrnateCard>
  );
}

function Field({ name, label, type = "text", autoComplete }: { name: string; label: string; type?: string; autoComplete?: string }) {
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && shown ? "text" : type}
          required
          autoComplete={autoComplete}
          className={`field ${isPassword ? "pr-12" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Құпия сөзді жасыру" : "Құпия сөзді көрсету"}
            aria-pressed={shown}
            title={shown ? "Жасыру" : "Көрсету"}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted transition hover:text-primary dark:hover:text-gold"
          >
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.7 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

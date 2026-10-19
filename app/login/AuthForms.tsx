"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Divider, OrnateCard } from "@/components/Ornament";
import { login, register, useCurrentUser } from "@/lib/user";

export function AuthForms() {
  const router = useRouter();
  const user = useCurrentUser();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");

  // Уже вошёл — сразу на главную (как checkExistingAuth в старом сайте)
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const result =
      mode === "login"
        ? login(get("username"), String(f.get("password") ?? ""))
        : register({
            username: get("username"),
            email: get("email"),
            password: String(f.get("password") ?? ""),
            confirmPassword: String(f.get("confirmPassword") ?? ""),
          });
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
        <p className="font-serif text-3xl font-bold text-heading">
          <span aria-hidden="true" className="text-gold">❖ </span>MarjanSóz
        </p>
        <p className="mt-1 text-muted">Қазақ мақал-мәтелдерін үйрену платформасы</p>
      </div>
      <Divider />

      <form key={mode} onSubmit={onSubmit} noValidate className="space-y-4">
        <h1 className="text-center font-serif text-2xl font-bold text-heading">{mode === "login" ? "Кіру" : "Тіркелу"}</h1>

        <Field name="username" label="Пайдаланушы аты" autoComplete="username" />
        {mode === "register" && <Field name="email" label="Электронды пошта" type="email" autoComplete="email" />}
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

        <button type="submit" className="btn-primary w-full">
          {mode === "login" ? "Кіру" : "Тіркелу"}
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
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input id={name} name={name} type={type} required autoComplete={autoComplete} className="field" />
    </div>
  );
}

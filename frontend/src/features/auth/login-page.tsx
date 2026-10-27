import { ArrowLeft, ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { api, errorMessage } from "@/lib/api";
import { useAuth, type User } from "./auth-context";

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (!resendAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  if (user) return <Navigate to="/profile" replace />;

  async function requestCode() {
    setPending(true); setError(null); setNotice(null);
    try {
      await api("/auth/request-code", { method: "POST", body: { email: email.trim() } });
      setStep("code"); setCode(""); setNow(Date.now()); setResendAt(Date.now() + 60_000); setNotice("Код действует 10 минут. Если письма нет во входящих, проверьте папку «Спам».");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "email") { await requestCode(); return; }
    setPending(true); setError(null); setNotice(null);
    try {
      const result = await api<{ user: User }>("/auth/verify-code", { method: "POST", body: { email: email.trim(), code } });
      signIn(result.user); void navigate("/profile", { replace: true });
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  return (
    <main id="main" className="mx-auto grid min-h-[70svh] w-full max-w-6xl items-center gap-12 px-5 py-12 sm:px-10 lg:grid-cols-2 lg:gap-20">
      <div>
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ваш личный LifeCycle</p>
        <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Освободите голову.<br /><span className="text-muted-foreground">Найдите свой ритм.</span></h1>
        <p className="mt-6 max-w-md text-base leading-8 text-muted-foreground">Одно пространство для ваших планов. Начните с себя — войдите и заполните личный профиль.</p>
      </div>
      <Card className="w-full max-w-lg justify-self-center lg:justify-self-end">
        <CardHeader className="p-7 pb-4 sm:p-9 sm:pb-5">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Mail className="size-6" aria-hidden="true" /></div>
          <CardTitle className="text-2xl">{step === "email" ? "Войти или создать аккаунт" : "Проверьте вашу почту"}</CardTitle>
          <CardDescription>{step === "email" ? "Отправим одноразовый код на ваш email. Пароль не нужен." : <>Введите код из письма, отправленного на <span className="break-all text-foreground">{email.trim()}</span>.</>}</CardDescription>
        </CardHeader>
        <CardContent className="p-7 pt-2 sm:p-9 sm:pt-2">
          <form onSubmit={(event) => void submit(event)} className="space-y-5">
            {step === "email" ? <FormField id="login-email" label="Электронная почта"><Input id="login-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} autoFocus /></FormField> : <FormField id="login-code" label="Код подтверждения"><Input id="login-code" name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} minLength={6} className="font-mono text-xl tracking-[0.5em]" placeholder="000000" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} disabled={pending} autoFocus /></FormField>}
            {error && <p className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm leading-6 text-destructive" role="alert">{error}</p>}
            {notice && <p className="text-sm leading-6 text-muted-foreground" role="status">{notice}</p>}
            <Button className="w-full" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}{pending ? "Подождите…" : step === "email" ? "Получить код" : "Продолжить"}</Button>
            {step === "code" && <div className="flex flex-wrap justify-between gap-3 text-sm"><button type="button" className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring" disabled={pending} onClick={() => { setStep("email"); setCode(""); setError(null); setNotice(null); }}><ArrowLeft className="size-3" aria-hidden="true" />Другой email</button><button type="button" className="text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" disabled={pending || remaining > 0} onClick={() => void requestCode()}>{remaining > 0 ? `Повторить через ${remaining} с` : "Отправить ещё раз"}</button></div>}
          </form>
          <p className="mt-7 border-t border-border pt-5 text-xs leading-6 text-muted-foreground">Сессия действует 30 дней. На общем устройстве выходите из аккаунта после работы.</p>
        </CardContent>
      </Card>
    </main>
  );
}

import { Check, CircleAlert, Database, HardDrive, LoaderCircle, RefreshCw, Server, ShieldCheck, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchReadiness, HealthRequestError, type Readiness } from "./api";

const services = [
  { key: "postgres", name: "PostgreSQL", description: "Основное хранилище данных", icon: Database },
  { key: "redis", name: "Redis", description: "Быстрый доступ и координация", icon: Zap },
  { key: "garage", name: "Garage", description: "Хранилище изображений S3", icon: HardDrive },
] as const;

type HealthState =
  | { kind: "loading" }
  | { kind: "loaded"; readiness: Readiness; checkedAt: Date }
  | { kind: "error"; message: string };

export function HealthPage() {
  const [state, setState] = useState<HealthState>({ kind: "loading" });
  const controller = useRef<AbortController | null>(null);
  const load = useCallback((request: AbortController) => {
    void fetchReadiness(request.signal)
      .then((readiness) => {
        if (!request.signal.aborted) setState({ kind: "loaded", readiness, checkedAt: new Date() });
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted) {
          setState({ kind: "error", message: error instanceof HealthRequestError ? error.message : error instanceof Error && error.name === "TimeoutError" ? "Сервер не ответил вовремя. Повторите проверку." : "Сервер недоступен. Проверьте подключение и повторите попытку." });
        }
      });
  }, []);

  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    void load(request);
    return () => request.abort();
  }, [load]);

  function check() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState({ kind: "loading" });
    void load(request);
  }

  const loading = state.kind === "loading";
  const ready = state.kind === "loaded" && state.readiness.status === "ready";
  const HeadingIcon = loading ? LoaderCircle : ready ? ShieldCheck : CircleAlert;
  const heading = loading ? "Проверяем подключение" : ready ? "Всё готово к работе" : "Подключение требует внимания";

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-10 sm:py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Рабочее пространство</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Начинается с основы.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">LifeCycle связывает ваши планы в единый ритм. Здесь можно проверить подключение приложения.</p>
        </div>
        <Button variant="outline" onClick={() => void check()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
          {loading ? "Проверяем…" : "Проверить снова"}
        </Button>
      </div>

      <section aria-labelledby="connection-title" aria-busy={loading}>
        <Card className="overflow-hidden">
          <CardHeader className="gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:gap-5 sm:p-8">
            <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${ready ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
              <HeadingIcon className={loading ? "size-7 animate-spin" : "size-7"} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
              <CardTitle id="connection-title" className="text-xl">{heading}</CardTitle>
              <CardDescription className="mt-2">
                {state.kind === "error" ? state.message : loading ? "Получаем актуальный ответ от сервера." : ready ? "Сервер и все хранилища отвечают на запросы." : "Сервер отвечает, но часть хранилищ сейчас недоступна."}
              </CardDescription>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium">
              <span className={`size-1.5 rounded-full ${ready ? "bg-primary" : "bg-muted-foreground"}`} />
              {loading ? "Проверка" : ready ? "Подключено" : "Недоступно"}
            </span>
          </CardHeader>
          <CardContent className="grid gap-px bg-border p-0 md:grid-cols-3">
            {services.map(({ key, name, description, icon: Icon }) => {
              const status = state.kind === "loaded" ? state.readiness.checks[key] : null;
              return (
                <div key={key} className="flex flex-col bg-card p-6 sm:p-8">
                  <Icon className="mb-8 size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                  <h3 className="font-semibold">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                  <div className={`mt-6 flex items-center gap-2 text-sm ${status === "ok" ? "text-primary" : "text-muted-foreground"}`}>
                    {status === "ok" ? <Check className="size-4" aria-hidden="true" /> : status === "unavailable" ? <CircleAlert className="size-4" aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-muted-foreground" />}
                    {status === "ok" ? "Доступно" : status === "unavailable" ? "Недоступно" : loading ? "Ожидание ответа" : "Не удалось проверить"}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs leading-6 text-muted-foreground">
        <span className="flex items-center gap-2"><Server className="size-4" aria-hidden="true" /> Данные получены с сервера LifeCycle</span>
        {state.kind === "loaded" && <span>Проверено: <time dateTime={state.checkedAt.toISOString()}>{state.checkedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></span>}
      </div>
    </main>
  );
}

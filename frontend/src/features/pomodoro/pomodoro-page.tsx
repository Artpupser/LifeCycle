import { CircleCheck, Coffee, Pause, Play, RefreshCw, TimerReset, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FormField } from "@/components/form-field";
import { LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { Task } from "@/features/planning/types";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { ApiError, api, errorMessage } from "@/lib/api";

type Session = { id: string; task_id: string | null; phase: "work" | "break"; status: "running" | "paused" | "completed" | "cancelled"; duration_seconds: number; elapsed_seconds: number };
type Snapshot = { session: Session | null; receivedAt: number };

export function PomodoroPage() {
  const { settings } = usePreferences();
  const [params] = useSearchParams();
  const [taskId, setTaskId] = useState(params.get("task") ?? params.get("task_id") ?? "");
  const tasks = useResource<Task[]>("/tasks");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const mutation = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (mutation.current) return;
    const version = ++requestVersion.current;
    try {
      const session = await api<Session | null>("/pomodoro");
      if (mounted.current && version === requestVersion.current) { setSnapshot({ session, receivedAt: Date.now() }); setError(null); }
    } catch (failure) { if (mounted.current && version === requestVersion.current) setError(errorMessage(failure)); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const initial = window.setTimeout(() => void refresh(), 0);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const sync = window.setInterval(() => void refresh(), 15000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => { mounted.current = false; window.clearTimeout(initial); window.clearInterval(tick); window.clearInterval(sync); window.removeEventListener("focus", focus); };
  }, [refresh]);
  async function change(action: string, phase?: Session["phase"]) {
    mutation.current = true; ++requestVersion.current; setBusy(true); setError(null); setMessage(null);
    try {
      const session = await api<Session>(phase ? "/pomodoro" : `/pomodoro/${snapshot?.session?.id}/${action}`, { method: "POST", ...(phase ? { body: { phase, task_id: taskId || null } } : {}) });
      if (mounted.current) {
        setSnapshot({ session: ["completed", "cancelled"].includes(session.status) ? null : session, receivedAt: Date.now() });
        setNow(Date.now());
        if (session.status === "completed") setMessage("Интервал завершён. Результат сохранён.");
        if (session.status === "cancelled") setMessage("Таймер остановлен.");
      }
    } catch (failure) { if (mounted.current) setError(failure instanceof ApiError && failure.status === 409 ? "Состояние таймера изменилось или время ещё не истекло. Обновите таймер." : errorMessage(failure)); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  }
  const session = snapshot?.session;
  const active = session?.status === "running" || session?.status === "paused";
  const elapsed = session ? Math.min(session.duration_seconds, session.elapsed_seconds + (session.status === "running" ? Math.max(0, Math.floor((now - snapshot!.receivedAt) / 1000)) : 0)) : 0;
  const remaining = session ? session.duration_seconds - elapsed : settings.pomodoro_work_minutes * 60;
  const taskList = tasks.resource.status === "ready" ? tasks.resource.data : [];
  const linkedTask = taskList.find((task) => task.id === session?.task_id);
  return <main id="main" className="mx-auto max-w-3xl space-y-7 px-5 py-10 sm:px-10"><header><p className="mb-2 text-sm text-primary">Время сосредоточиться</p><h1 className="text-3xl font-semibold">Pomodoro</h1><p className="mt-3 text-sm text-muted-foreground">Работа {settings.pomodoro_work_minutes} мин. · Перерыв {settings.pomodoro_break_minutes} мин. <Link to="/settings" className="text-primary underline underline-offset-4">Настроить</Link></p></header>{!snapshot && !error ? <LoadingState /> : <section className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10"><div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">{session?.phase === "break" ? <Coffee className="size-5" aria-hidden="true" /> : <TimerReset className="size-5" aria-hidden="true" />}{session?.phase === "break" ? "Перерыв" : "Фокус"}{session?.status === "paused" && " · Пауза"}</div><p className="text-7xl font-semibold tabular-nums tracking-tight" role="timer" aria-label="Оставшееся время">{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</p>{linkedTask && <p className="mt-4 break-words text-sm text-muted-foreground">Задача: {linkedTask.title}</p>}{session?.task_id && !linkedTask && <p className="mt-4 text-sm text-muted-foreground">Таймер связан с сохранённой задачей.</p>}{!active && <div className="mx-auto mt-8 max-w-md text-left"><FormField id="pomodoro-task" label="Задача для фокуса"><Select id="pomodoro-task" disabled={busy} value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">Без задачи</option>{taskList.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}{taskId && !taskList.some((task) => task.id === taskId) && <option value={taskId}>Выбранная задача</option>}</Select></FormField>{tasks.resource.status === "error" && <p className="mt-2 text-xs text-destructive">Список задач недоступен. <button className="underline" onClick={tasks.retry}>Повторить</button></p>}</div>}<div className="mt-8 flex flex-wrap justify-center gap-3">{active ? <>{remaining === 0 ? <Button disabled={busy} onClick={() => void change("finish")}><CircleCheck aria-hidden="true" />Завершить интервал</Button> : <Button disabled={busy} onClick={() => void change(session.status === "running" ? "pause" : "resume")}>{session.status === "running" ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{session.status === "running" ? "Пауза" : "Продолжить"}</Button>}<Button variant="outline" disabled={busy} onClick={() => void change("cancel")}><X aria-hidden="true" />Остановить</Button></> : <><Button disabled={busy || !snapshot} onClick={() => void change("", "work")}><Play aria-hidden="true" />Начать фокус</Button><Button variant="outline" disabled={busy || !snapshot} onClick={() => void change("", "break")}><Coffee aria-hidden="true" />Начать перерыв</Button></>}<Button variant="outline" disabled={busy} onClick={() => void refresh()} aria-label="Обновить таймер"><RefreshCw aria-hidden="true" /></Button></div>{remaining === 0 && active && <p className="mt-5 text-sm text-primary" role="status">Время истекло. Завершите интервал, чтобы сохранить результат.</p>}<p className="mt-6 text-xs leading-5 text-muted-foreground">Таймер сохраняется на сервере и восстанавливается после перезагрузки. Завершение интервала не меняет статус задачи.</p></section>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}</main>;
}

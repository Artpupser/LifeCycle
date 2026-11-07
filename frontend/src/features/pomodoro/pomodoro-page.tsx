import {ChoiceField} from "@/components/ui/choice-picker";
import {refreshHistory} from "@/systems/history/use-history";
import { t, useLanguage } from "@/systems/i18n/locale";
import { notify, notifyDesktop, notificationPermission, enableNotifications } from "@/lib/feedback";
import { durationClock } from "@/lib/dates";
import { CircleCheck, Coffee, Pause, Play, RefreshCw, TimerReset, X } from "@/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FormField } from "@/components/form-field";
import { LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";

import type { Task } from "@/features/planning/types";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { ApiError, api, errorMessage } from "@/lib/api";

import { PomodoroPrograms } from "./programs";
import { PomodoroHistory } from "./history";
import { kindLabels, durationLabel, type Session, type PomodoroConfig } from "./types";
type Snapshot = { session: Session | null; receivedAt: number };

export function PomodoroPage() {
  useLanguage();
  const { settings } = usePreferences();
  const [params] = useSearchParams();
  const [taskId, setTaskId] = useState(params.get("task") ?? params.get("task_id") ?? "");
  const tasks = useResource<Task[]>("/tasks");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [notifications, setNotifications] = useState(() => notificationPermission());
  const previous = useRef<Session | null | undefined>(undefined);
  const requestVersion = useRef(0);
  const mutation = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (mutation.current) return;
    const version = ++requestVersion.current;
    try {
      const session = await api<Session | null>("/pomodoro");
      if (mounted.current && version === requestVersion.current) {
        const old = previous.current;
        if (old?.program && old.id !== session?.id) {
          const message = session?.program ? t("Новый этап: {v0}.", {v0: kindLabels[session.interval_kind ?? "w"]}) : t("Алгоритм завершён. История сохранена.");
          notifyDesktop("LifeCycle · Pomodoro", message); refreshHistory({kind:"pomodoro"}); setHistoryVersion(v => v + 1);
        }
        previous.current = session; setSnapshot({ session, receivedAt: Date.now() }); setError(null);
      }
    } catch (failure) { if (mounted.current && version === requestVersion.current) setError(errorMessage(failure)); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const initial = window.setTimeout(() => void refresh(), 0);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const sync = window.setInterval(() => void refresh(), 2000);
    const focus = () => void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", focus); document.addEventListener("visibilitychange", visible);
    return () => { mounted.current = false; window.clearTimeout(initial); window.clearInterval(tick); window.clearInterval(sync); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  async function change(action: string, phase?: Session["phase"], config?: PomodoroConfig) {
    if (mutation.current) return;
    mutation.current = true; ++requestVersion.current; setBusy(true); setError(null);
    try {
      const session = await api<Session>(config ? "/pomodoro/program" : phase ? "/pomodoro" : `/pomodoro/${snapshot?.session?.id}/${action}`, { method: "POST", body: config ? { config_id: config.id, revision: config.revision, task_id: taskId || null } : phase ? { phase, task_id: taskId || null } : { ...(snapshot?.session?.program ? { revision: snapshot.session.program.revision } : {}) } });
      if (mounted.current) {
        previous.current = ["completed", "cancelled"].includes(session.status) ? null : session; refreshHistory({kind:"pomodoro"}); setHistoryVersion(v => v + 1);
        setSnapshot({ session: ["completed", "cancelled"].includes(session.status) ? null : session, receivedAt: Date.now() });
        setNow(Date.now());
        if (session.status === "completed") notify(t("Интервал завершён. Результат сохранён."));
        if (session.status === "cancelled") notify(t("Таймер остановлен."));
      }
    } catch (failure) { if (mounted.current) setError(failure instanceof ApiError && failure.status === 409 && failure.code !== "pomodoro_history_pending" ? t("Состояние таймера изменилось или время ещё не истекло. Обновите таймер.") : errorMessage(failure)); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  }
  const session = snapshot?.session;
  const active = session?.status === "running" || session?.status === "paused";
  const elapsed = session ? Math.min(session.duration_seconds, session.elapsed_seconds + (session.status === "running" ? Math.max(0, Math.floor((now - snapshot!.receivedAt) / 1000)) : 0)) : 0;
  const remaining = session ? session.duration_seconds - elapsed : settings.pomodoro_work_minutes * 60;
  const taskList = tasks.resource.status === "ready" ? tasks.resource.data : [];
  const linkedTask = taskList.find((task) => task.id === session?.task_id);
  return <main id="main" className="mx-auto max-w-3xl space-y-7 px-5 py-10 sm:px-10"><header><p className="mb-2 text-sm text-primary">{t("Время сосредоточиться")}</p><h1 className="text-3xl font-semibold">Pomodoro</h1><p className="mt-3 text-sm text-muted-foreground">{t("Работа ")}{settings.pomodoro_work_minutes} {t(" мин. · Перерыв ")}{settings.pomodoro_break_minutes} {t(" мин. ")}<Link to="/settings" className="text-primary underline underline-offset-4">{t("Настроить")}</Link></p></header>{!snapshot && !error ? <LoadingState /> : <section className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10"><div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">{session?.phase === "break" ? <Coffee className="size-5" aria-hidden="true" /> : <TimerReset className="size-5" aria-hidden="true" />}{session?.interval_kind ? kindLabels[session.interval_kind] : session?.phase === "break" ? t("Перерыв") : t("Фокус")}{session?.status === "paused" && t(" · Пауза")}</div>{session?.program && <div className="mb-5 space-y-1 text-sm"><p className="break-words font-medium">{session.program.name}</p><p className="text-muted-foreground">{t("Этап ")}{session.program.interval_index % session.program.sequence_length + 1} / {session.program.sequence_length} {t(" · Цикл ")}{session.program.cycle}</p><p>{t("Далее: ")}{session.program.next_kind ? `${kindLabels[session.program.next_kind]} ${durationLabel(session.program.next_duration_seconds!)}` : t("Завершение алгоритма")}</p>{session.program.history_pending > 0 && <p>{t("Восстанавливается история: ")}{session.program.history_pending} {t(" интервалов.")}</p>}</div>}<p className="text-7xl font-semibold tabular-nums tracking-tight" role="timer" aria-label={t("Оставшееся время")}>{durationClock(remaining)}</p>{linkedTask && <p className="mt-4 break-words text-sm text-muted-foreground">{t("Задача: ")}{linkedTask.title}</p>}{session?.task_id && !linkedTask && <p className="mt-4 text-sm text-muted-foreground">{t("Таймер связан с сохранённой задачей.")}</p>}{!active && <div className="mx-auto mt-8 max-w-md text-left"><FormField id="pomodoro-task" label={t("Задача для фокуса")}><ChoiceField id="pomodoro-task" disabled={busy} value={taskId} change={(next) => setTaskId(next)}><option value="">{t("Без задачи")}</option>{taskList.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}{taskId && !taskList.some((task) => task.id === taskId) && <option value={taskId}>{t("Выбранная задача")}</option>}</ChoiceField></FormField>{tasks.resource.status === "error" && <p className="mt-2 text-xs text-destructive">{t("Список задач недоступен. ")}<button className="underline" onClick={tasks.retry}>{t("Повторить")}</button></p>}</div>}<div className="mt-8 flex flex-wrap justify-center gap-3">{active ? <>{remaining === 0 && !session.program ? <Button disabled={busy} onClick={() => void change("finish")}><CircleCheck aria-hidden="true" />{t("Завершить интервал")}</Button> : <Button disabled={busy} onClick={() => void change(session.status === "running" ? "pause" : "resume")}>{session.status === "running" ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{session.status === "running" ? t("Пауза") : t("Продолжить")}</Button>}{session.program && <Button variant="outline" disabled={busy} onClick={() => void change("reset")}><TimerReset aria-hidden="true" />{t("Сбросить")}</Button>}<Button variant="outline" disabled={busy} onClick={() => void change("cancel")}><X aria-hidden="true" />{t("Остановить")}</Button></> : <><Button disabled={busy || !snapshot} onClick={() => void change("", "work")}><Play aria-hidden="true" />{t("Начать фокус")}</Button><Button variant="outline" disabled={busy || !snapshot} onClick={() => void change("", "break")}><Coffee aria-hidden="true" />{t("Начать перерыв")}</Button></>}<Button variant="outline" disabled={busy} onClick={() => void refresh()} aria-label={t("Обновить таймер")}><RefreshCw aria-hidden="true" /></Button></div>{remaining === 0 && active && !session?.program && <p className="mt-5 text-sm text-primary" role="status">{t("Время истекло. Завершите интервал, чтобы сохранить результат.")}</p>}<p className="mt-6 text-xs leading-5 text-muted-foreground">{t("Таймер сохраняется на сервере и восстанавливается после перезагрузки. Завершение интервала не меняет статус задачи.")}</p></section>}<div className="space-y-3"><p className="text-xs text-muted-foreground">{t("Алгоритмы переключают этапы по серверному времени, включая время вне вкладки. Уведомления доступны при открытом приложении; фоновую доставку определяет браузер и ОС.")}</p>{notifications !== "unavailable" && notifications !== "granted" && <Button variant="outline" onClick={() => void enableNotifications().then(setNotifications).catch(() => setError(t("Браузер не разрешил уведомления.")))}>{t("Включить уведомления этапов")}</Button>}</div><PomodoroPrograms active={Boolean(active)} busy={busy || !snapshot} start={config => void change("", undefined, config)} workMinutes={settings.pomodoro_work_minutes} breakMinutes={settings.pomodoro_break_minutes} /><PomodoroHistory key={historyVersion} timezone={settings.timezone} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</main>;
}

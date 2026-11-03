import { ExternalLink } from "@/systems/links/external-link";
import { t, useLanguage } from "@/systems/i18n/locale";
import { UserImage } from "@/systems/media/user-image";
import { confirmAction } from "@/lib/feedback";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { FormField } from "@/components/form-field";
import { Markdown, MarkdownEditor } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { habitChanged } from "@/features/habits/types";
import { useAction } from "@/hooks/use-action";
import { api, errorMessage } from "@/lib/api";
import { formatTime, sessionLabels, type WorkoutSession } from "./types";

function SessionPanel({ session, receivedAt, update, refresh }: { session: WorkoutSession; receivedAt: number; update: (value: WorkoutSession) => void; refresh: () => void }) {
  useLanguage();
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState(session.note);
  const [uploading, setUploading] = useState(false);
  const [actualDraft, setActualDraft] = useState<{ index: number; value: number } | null>(null);
  const actual = actualDraft?.index === session.step_index ? actualDraft.value : null;
  const action = useAction();
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, []);
  const active = session.status === "running" || session.status === "paused";
  const step = session.snapshot.steps[session.step_index];
  const elapsed = session.elapsed_seconds + (session.status === "running" ? Math.max(0, Math.floor((now - receivedAt) / 1000)) : 0);
  const remaining = Math.max(0, (step?.duration_seconds ?? 0) - elapsed);
  async function command(name: string) {
    if (name === "cancel" && !await confirmAction(t("Остановить тренировку? Выполненные шаги сохранятся."))) return;
    await action.run(async () => {
      const result = await api<WorkoutSession>(`/workout-sessions/${session.id}/${name}`, { method: "POST", body: { revision: session.revision, ...(actual !== null && name === "next" ? { actual_repetitions: actual } : {}), ...(name === "note" ? { note } : {}) } });
      update(result); setActualDraft(null); habitChanged();
    });
  }
  return <div className="space-y-6"><header className="space-y-3"><h1 className="break-words text-3xl font-semibold">{session.snapshot.plan.title}</h1><p className="text-sm text-muted-foreground">{session.snapshot.date} · {t(sessionLabels[session.status])} {t(" · шаг ")}{Math.min(session.step_index + 1, session.snapshot.steps.length)}/{session.snapshot.steps.length}</p><Markdown value={session.snapshot.plan.description} /></header>
    {active && step && <section className="space-y-5 rounded-2xl border border-primary bg-card p-5" aria-label={t("Текущий шаг тренировки")}><p className="text-sm text-primary">{step.round_title} {t(" · повтор круга ")}{step.cycle}</p><h2 className="break-words text-2xl font-semibold">{step.title}</h2>{step.intensity && <p className="text-sm">{t("Интенсивность: ")}{step.intensity}</p>}{step.repetitions > 0 && <p className="text-xl font-medium">{step.repetitions} {t(" повторений")}{step.duration_seconds > 0 ? t(" × {v0} сек", {v0: step.seconds_per_repetition}) : ""}</p>}<div role="timer" aria-label={step.duration_seconds ? t("Оставшееся время") : t("Время упражнения")} className="font-mono text-5xl font-semibold tabular-nums">{formatTime(step.duration_seconds ? remaining : elapsed)}</div>{step.duration_seconds > 0 && remaining === 0 && <p role="status" className="text-primary">{t("Время шага истекло. Подтвердите выполнение.")}</p>}{step.exercise && <><Markdown value={step.exercise.description} />{step.exercise.images.filter((id) => !step.exercise!.description.includes(`/api/media/${id}`)).map((id, index) => <UserImage key={id} src={`/api/media/${id}`} alt={t("Техника: {v0}, {v1}", {v0: step.title, v1: index + 1})} className="max-h-80 max-w-full rounded-xl object-contain" />)}<div className="flex flex-wrap gap-3">{step.exercise.sources.map((source, index) => <ExternalLink key={index} href={source} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">{t("Источник ")}{index + 1}</ExternalLink>)}</div></>}{step.repetitions > 0 && <FormField id="workout-actual" label={t("Фактические повторения")}><Input id="workout-actual" type="number" min={0} max={10000} required value={actual ?? step.repetitions} onChange={(event) => setActualDraft({ index: session.step_index, value: event.target.valueAsNumber })} /></FormField>}<div className="flex flex-wrap gap-2"><Button disabled={action.busy || uploading || session.status !== "running" || remaining > 0 || actual !== null && (!Number.isInteger(actual) || actual < 0 || actual > 10000)} onClick={() => void command("next")}>{session.step_index + 1 === session.snapshot.steps.length ? t("Завершить тренировку") : step.exercise ? t("Упражнение выполнено") : t("Завершить отдых")}</Button><Button variant="outline" disabled={action.busy || uploading} onClick={() => void command(session.status === "running" ? "pause" : "resume")}>{session.status === "running" ? t("Пауза") : t("Продолжить")}</Button><Button variant="outline" disabled={action.busy || uploading} onClick={() => void command("skip")}>{t("Пропустить шаг")}</Button><Button variant="outline" disabled={action.busy || uploading} onClick={() => void command("cancel")}>{t("Остановить тренировку")}</Button></div><p className="text-xs leading-6 text-muted-foreground">{t("Таймер проверяется сервером. После истечения подтвердите шаг. В режиме «повторения × время» таймер равен повторениям × секундам на повторение. Пропуск упражнения или число повторений ниже цели сохраняют частичный результат без автоматического выполнения привычки.")}</p></section>}
    {!active && <section className="rounded-xl border border-border p-4"><h2 className="text-xl font-semibold">{t(sessionLabels[session.status])}</h2>{session.habit_id && <p className="mt-2 text-sm">{session.habit_completed ? t("Привычка выполнена в Today и календаре.") : t("Привычка не изменена: частичный результат, отмена, ручная отметка, удаление или изменение связи. Проверьте её результат в Today.")}</p>}<Button asChild variant="outline" className="mt-3"><Link to="/today">{t("Открыть Today")}</Link></Button></section>}
    {action.error && <div role="alert" className="space-y-2"><p className="text-destructive">{action.error}</p><Button variant="outline" onClick={refresh}>{t("Обновить состояние")}</Button></div>}<section className="space-y-3"><FormField id="workout-note" label={t("Заметка о тренировке")}><MarkdownEditor id="workout-note" value={note} onChange={setNote} onUploading={setUploading} /></FormField><Button variant="outline" disabled={action.busy || uploading} onClick={() => void command("note")}>{t("Сохранить заметку тренировки")}</Button></section>
    <section className="space-y-3" aria-label={t("Результаты шагов")}><h2 className="text-2xl font-semibold">{t("Сохранённые шаги")}</h2>{!session.results.length && <p className="text-sm text-muted-foreground">{t("Подтверждённых шагов пока нет.")}</p>}{session.results.map((result) => { const saved = session.snapshot.steps[result.step_index]!; return <article key={result.step_index} className="space-y-2 rounded-xl border border-border p-4"><h3 className="break-words font-semibold">{result.step_index + 1}. {saved.title}</h3><p className="text-sm text-muted-foreground">{saved.round_title} {t(" · повтор ")}{saved.cycle} · {result.status === "completed" ? t("Выполнено") : t("Пропущено")} · {formatTime(result.elapsed_seconds)}{saved.repetitions ? t(" · {v0}/{v1} повторений", {v0: result.actual_repetitions, v1: saved.repetitions}) : ""}</p>{saved.exercise && <details><summary className="cursor-pointer text-sm text-primary">{t("Техника и план на момент запуска")}</summary><Markdown value={saved.exercise.description} />{saved.intensity && <p className="text-sm">{t("Интенсивность: ")}{saved.intensity}</p>}</details>}</article>; })}</section>
  </div>;
}
export function WorkoutSessionPage() {
  useLanguage();
  const { id = "" } = useParams();
  const [result, setResult] = useState<{ id: string; session: WorkoutSession; at: number } | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const refresh = useCallback(() => { void api<WorkoutSession>(`/workout-sessions/${id}`).then((session) => { setResult((previous) => previous?.id === id && previous.session.revision > session.revision ? previous : { id, session, at: Date.now() }); setError(null); }).catch((failure: unknown) => setError({ id, message: errorMessage(failure) })); }, [id]);
  useEffect(() => { const controller = new AbortController(); void api<WorkoutSession>(`/workout-sessions/${id}`, { signal: controller.signal }).then((session) => { if (!controller.signal.aborted) setResult((previous) => previous?.id === id && previous.session.revision > session.revision ? previous : { id, session, at: Date.now() }); }).catch((failure: unknown) => { if (!controller.signal.aborted) setError({ id, message: errorMessage(failure) }); }); window.addEventListener("focus", refresh); const timer = window.setInterval(refresh, 15000); return () => { controller.abort(); window.removeEventListener("focus", refresh); window.clearInterval(timer); }; }, [id, refresh]);
  return <main id="main" className="mx-auto max-w-3xl space-y-6 px-5 py-10 sm:px-10"><Link to="/workouts" className="text-sm text-primary underline">{t("Все тренировки и история")}</Link>{error?.id === id && <ErrorState message={error.message} retry={refresh} />}{result?.id === id ? <SessionPanel key={id} session={result.session} receivedAt={result.at} update={(session) => { setResult((previous) => previous?.id === id && previous.session.revision > session.revision ? previous : { id, session, at: Date.now() }); setError(null); }} refresh={refresh} /> : !error && <LoadingState />}</main>;
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { FormField } from "@/components/form-field";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { ApiError, api, apiErrorMessage, errorMessage } from "@/lib/api";
import { dayDifference, localDate, shiftDate } from "@/lib/dates";
import { providerName, promptTemplates, type AiConfig, type Chat, type ChatDraft, type Preview, type Turn } from "./types";

function RequestView({ request, provider }: { request: unknown; provider: string }) {
  return <details className="min-w-0 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm text-primary">Точный запрос {providerName(provider)}</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs leading-5">{JSON.stringify(request, null, 2)}</pre></details>;
}
function Message({ turn, revision, onCancel }: { turn: Turn; revision: number; onCancel: () => void }) {
  const question = turn.data.request.input.at(-1)?.content ?? "";
  return <article className="min-w-0 space-y-4 rounded-2xl border border-border p-4 sm:p-5">
    <div><p className="mb-2 text-xs font-medium text-muted-foreground">Вы · {new Date(turn.created_at).toLocaleString("ru-RU")}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{question}</p></div>
    <div className="space-y-3 border-t border-border pt-4"><p className="text-xs font-medium text-primary">{providerName(turn.provider)} · {turn.model}</p>{turn.status === "pending" ? <div className="space-y-3"><p role="status" className="text-sm">Модель готовит ответ. Можно вернуться к чату позже.</p><Button variant="outline" size="sm" onClick={onCancel}>Остановить ответ</Button></div> : turn.status === "completed" && turn.data.answer ? <Markdown value={turn.data.answer} allowImages={false} /> : <p className="text-sm text-destructive">{apiErrorMessage(502, turn.error_code ?? "ai_interrupted")}</p>}
      {turn.data.usage?.total_tokens != null && <p className="text-xs text-muted-foreground">Токены: вход {turn.data.usage.input_tokens ?? "—"}, выход {turn.data.usage.output_tokens ?? "—"}, всего {turn.data.usage.total_tokens}.</p>}
      {turn.config_revision !== revision && <p className="text-xs text-muted-foreground">Эта пара исключена из новых запросов: настройки доступа изменились.</p>}
      <RequestView request={turn.data.request} provider={turn.provider} />
    </div>
  </article>;
}

export function ChatPanel({ chat, config, dirty, draft, onDraft }: { chat: Chat; config: AiConfig; dirty: boolean; draft?: ChatDraft; onDraft: (id: string, draft: ChatDraft | null) => void }) {
  const { settings } = usePreferences();
  const today = localDate(settings.timezone);
  const [from, setFrom] = useState(() => draft?.from ?? shiftDate(today, -29));
  const [to, setTo] = useState(() => draft?.to ?? today);
  const [message, setMessage] = useState(() => draft?.message ?? "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const [ambiguous, setAmbiguous] = useState(false);
  const attempt = useRef<{ request_id: string; preview_id: string } | null>(null);
  const mounted = useRef(true);
  const history = useResource<{ chat: Chat; messages: Turn[] }>(`/ai/chats/${chat.id}`);
  const refresh = history.retry;
  useEffect(() => { onDraft(chat.id, { message, from, to }); }, [chat.id, message, from, to, onDraft]);
  const pending = history.resource.status === "ready" && history.resource.data.messages.some((turn) => turn.status === "pending");
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!pending && !preview) return;
    const timer = window.setInterval(() => { if (pending) refresh(); setNow(Date.now()); }, 1500);
    return () => window.clearInterval(timer);
  }, [pending, preview, refresh]);
  useEffect(() => { const focus = () => refresh(); window.addEventListener("focus", focus); return () => window.removeEventListener("focus", focus); }, [refresh]);
  function invalidate() { setPreview(null); attempt.current = null; setAmbiguous(false); }
  async function prepare(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); invalidate();
    try {
      const result = await api<Preview>(`/ai/chats/${chat.id}/preview`, { method: "POST", body: { revision: config.revision, from, to, message } });
      if (mounted.current) { setNow(Date.now()); setPreview(result); }
    } catch (failure) { if (mounted.current) setError(errorMessage(failure)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function send() {
    if (!preview) return;
    setBusy(true); setError(null);
    attempt.current ??= { request_id: crypto.randomUUID(), preview_id: preview.id };
    try {
      await api<Turn>(`/ai/chats/${chat.id}/messages`, { method: "POST", body: attempt.current });
      if (mounted.current) { invalidate(); setMessage(""); refresh(); }
    } catch (failure) {
      if (mounted.current) { setError(errorMessage(failure)); setAmbiguous(!(failure instanceof ApiError) || failure.status >= 500 || failure.status === 408); refresh(); }
    } finally { if (mounted.current) setBusy(false); }
  }
  async function cancel(turn: Turn) {
    setError(null);
    try { await api(`/ai/chats/${chat.id}/messages/${turn.id}`, { method: "DELETE" }); refresh(); }
    catch (failure) { setError(errorMessage(failure)); }
  }
  const rangeValid = from && to && dayDifference(from, to) >= 0 && dayDifference(from, to) < 366;
  const expired = preview && Date.parse(preview.expires_at) <= now;
  const unavailable = dirty || busy || pending;
  return <section aria-label="Переписка с AI" className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Переписка</h2><Button size="sm" variant="outline" onClick={refresh}>Обновить переписку</Button></div>
    {history.resource.status === "loading" ? <LoadingState /> : history.resource.status === "error" ? <ErrorState message={history.resource.message} retry={refresh} /> : history.resource.data.messages.length ? <div className="space-y-4">{history.resource.data.messages.map((turn) => <Message key={turn.id} turn={turn} revision={config.revision} onCancel={() => void cancel(turn)} />)}</div> : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Задайте вопрос о своём ритме или планах. Перед отправкой вы увидите все данные для модели.</p>}
    <form onSubmit={(event) => void prepare(event)} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2"><FormField id="ai-from" label="Контекст с"><Input id="ai-from" required type="date" min="1900-01-01" max="9998-12-31" disabled={busy} value={from} onChange={(event) => { setFrom(event.target.value); invalidate(); }} /></FormField><FormField id="ai-to" label="Контекст по"><Input id="ai-to" required type="date" min={from} max="9998-12-31" disabled={busy} value={to} onChange={(event) => { setTo(event.target.value); invalidate(); }} /></FormField></div>
      <p className="text-xs text-muted-foreground">1–366 дат включительно · {settings.timezone}. Для заметок берутся последние изменения, для профиля — текущие значения.</p>
      <FormField id="ai-template" label="Шаблон вопроса"><Select id="ai-template" disabled={busy} value="" onChange={(event) => { const template = promptTemplates.find(([label]) => label === event.target.value); if (template) { setMessage(template[1]); invalidate(); } }}><option value="" disabled>Выберите тему</option>{promptTemplates.map(([label]) => <option key={label} value={label}>{label}</option>)}</Select></FormField>
      <FormField id="ai-question" label="Ваше сообщение"><Textarea id="ai-question" required maxLength={8000} disabled={busy} value={message} onChange={(event) => { setMessage(event.target.value); invalidate(); }} placeholder="Что помогло мне соблюдать привычки за этот месяц?" /></FormField>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={unavailable || !rangeValid || !message.trim() || history.resource.status !== "ready"}>Подготовить предпросмотр</Button><Button variant="outline" disabled={busy} onClick={() => { setMessage("Проанализируй мои результаты за выбранный период. Объясни ограничения данных и предложи три небольших шага на следующую неделю."); invalidate(); }}>Вопрос об итогах</Button></div>
      {dirty && <p role="status" className="text-sm text-muted-foreground">Чтобы отправить сообщение, сохраните изменения подключения и разрешений кнопкой «Сохранить настройки AI» выше. Черновик можно вводить уже сейчас.</p>}
      {!config.enabled && <p className="text-sm text-muted-foreground">Предпросмотр доступен без подключения. Для отправки подключите выбранный сервис и разрешите сообщения.</p>}
      {!rangeValid && <p className="text-sm text-destructive">Выберите от 1 до 366 дат.</p>}
    </form>
    {preview && <section aria-label="Предпросмотр отправки" className="space-y-4 rounded-2xl border border-primary/40 p-5"><h3 className="font-semibold">Проверьте данные перед отправкой</h3><p className="text-sm leading-6 text-muted-foreground">Модель: {preview.request.model}. Включено прошлых пар: {preview.history_turns}. Запрос уйдёт только после нажатия кнопки ниже; даты, лимиты выборки и все тексты раскрываются в точном запросе.</p><RequestView request={preview.request} provider={config.provider} /><p className="text-xs text-muted-foreground">Предпросмотр действует пять минут. Ответ AI может содержать ошибки. Он не меняет задачи, заметки и расписания. <Link to="/analytics" className="text-primary underline">Проверить исходную аналитику</Link></p>{expired && <p role="status" className="text-sm text-destructive">Срок предпросмотра истёк. Подготовьте новый.</p>}{ambiguous && <p className="text-sm text-muted-foreground">Подтверждение не получено. Повторная проверка использует тот же идентификатор и не запускает второй запрос.</p>}<div className="flex flex-wrap gap-2"><Button disabled={unavailable || !config.enabled || (config.auth_mode === "login" ? !config.active_account_id : !config.key_present) || (!!expired && !ambiguous)} onClick={() => void send()}>{ambiguous ? "Проверить отправку" : `Отправить в ${providerName(config.provider)}`}</Button><Button variant="outline" disabled={busy} onClick={invalidate}>Отменить</Button></div></section>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}

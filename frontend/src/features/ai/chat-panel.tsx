import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Eye, ChevronDown, Copy, Check } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Markdown } from "@/components/markdown";
import { ErrorState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { ApiError, api, apiErrorMessage, errorMessage } from "@/lib/api";
import { dateTimeLabel, dayDifference, localDate, shiftDate } from "@/lib/dates";
import { ActionReview } from "./action-journal";
import { parseActions, refreshActions } from "./actions";
import { providerName, promptTemplates, type ActionItem, type AiConfig, type Chat, type ChatDraft, type Preview, type Turn } from "./types";

function Message({ turn, config, onCancel }: { turn: Turn; config: AiConfig; onCancel: () => void }) {
  const { settings } = usePreferences();
  const [proposal, setProposal] = useState<ActionItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generated = turn.status === "completed" && turn.data.answer ? parseActions(turn.data.answer) : null;
  const answer = generated ? turn.data.answer!.replace(/```lifecycle-actions\s*\n[\s\S]*?```/g, "").trim() || "Предложение готово. Проверьте его перед сохранением." : turn.data.answer;
  async function review() {
    if (!generated) return;
    setBusy(true); setError(null);
    try { setProposal(await api<ActionItem>("/ai/actions", { method: "POST", body: { ...generated, revision: config.revision, source_turn_id: turn.id } })); refreshActions(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(answer ?? ""); setCopied(true); }
    catch { setError("Не удалось скопировать. Выделите текст ответа вручную."); }
  }
  return <article className="min-w-0 space-y-5" aria-label="Сообщение и ответ AI"><div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-3"><p className="mb-1 text-xs text-muted-foreground">Вы · {dateTimeLabel(turn.created_at, settings.timezone, settings.time_format)}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{turn.data.request.input.at(-1)?.content ?? ""}</p></div><div className="space-y-3 px-1"><p className="text-xs font-medium text-primary">{providerName(turn.provider)} · {turn.model}</p>{turn.status === "pending" ? <div className="flex flex-wrap items-center gap-3"><p role="status" className="animate-pulse text-sm text-muted-foreground">Готовлю ответ…</p><Button size="sm" variant="ghost" onClick={onCancel}>Остановить ответ</Button></div> : turn.status === "completed" && answer ? <><Markdown value={answer} allowImages={false} /><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => void copy()}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Скопировано" : "Копировать ответ"}</Button>{generated && <Button size="sm" variant="outline" disabled={busy || turn.config_revision !== config.revision || !config.permissions.changes} onClick={() => void review()}>Проверить изменения из ответа</Button>}</div></> : <p role="alert" className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{apiErrorMessage(502, turn.error_code ?? "ai_interrupted")}</p>}{turn.config_revision !== config.revision && <p className="text-xs text-muted-foreground">Эта переписка сохранена для вас и исключена из новых запросов после изменения доступа.</p>}<details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Детали запроса</summary><p className="mt-2">{turn.data.usage?.total_tokens != null ? `${turn.data.usage.total_tokens} токенов` : "Использование токенов не сообщено"}</p><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(turn.data.request, null, 2)}</pre></details>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{proposal && <ActionReview initial={proposal} config={config} close={() => setProposal(null)} />}</div></article>;
}

type Attempt = { chat: Chat; request_id: string; preview_id: string };
export function ChatPanel({ chat, config, dirty, draft, onDraft, onCreated, onSettings, onConfigChanged }: { chat: Chat | null; config: AiConfig; dirty: boolean; draft?: ChatDraft; onDraft: (id: string, draft: ChatDraft | null) => void; onCreated: (chat: Chat, draft: ChatDraft) => void; onSettings: () => void; onConfigChanged: () => void }) {
  const { settings } = usePreferences();
  const today = localDate(settings.timezone);
  const [from, setFrom] = useState(() => draft?.from ?? shiftDate(today, -29));
  const [to, setTo] = useState(() => draft?.to ?? today);
  const [message, setMessage] = useState(() => draft?.message ?? "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const attempt = useRef<Attempt | null>(null);
  const candidate = useRef<Chat | null>(chat);
  const mounted = useRef(true);
  const scrolling = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const history = useResource<{ chat: Chat; messages: Turn[] }>(chat ? `/ai/chats/${chat.id}` : null);
  const refresh = history.refresh;
  const messages = chat && history.resource.status === "ready" ? history.resource.data.messages : [];
  const pending = messages.some((turn) => turn.status === "pending");
  const last = messages.at(-1);
  const stamp = `${last?.id}:${last?.status}:${last?.data.answer?.length}`;
  useEffect(() => { onDraft(chat?.id ?? "new", { message, from, to }); }, [chat?.id, message, from, to, onDraft]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!pending) return; const timer = window.setInterval(refresh, 1000); return () => window.clearInterval(timer); }, [pending, refresh]);
  useEffect(() => { if (atBottom.current) scrolling.current?.scrollTo({ top: scrolling.current.scrollHeight, behavior: "smooth" }); }, [stamp]);
  // A changed access revision never reuses a cached preview. The server also enforces it.
  const currentPreview = preview?.config_revision === config.revision ? preview : null;
  function invalidate() { setPreview(null); if (!ambiguous) attempt.current = null; }
  async function target() { candidate.current ??= await api<Chat>("/ai/chats", { method: "POST" }); return candidate.current; }
  async function prepare(show = false) {
    const c = await target();
    const value = await api<Preview>(`/ai/chats/${c.id}/preview`, { method: "POST", body: { revision: config.revision, from, to, message } });
    if (mounted.current && show) setPreview(value);
    return { chat: c, preview: value };
  }
  async function showData() {
    setBusy(true); setError(null);
    try { await prepare(true); }
    catch (failure) { if (mounted.current) setError(errorMessage(failure)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (busy || pending || dirty || !message.trim()) return;
    setBusy(true); setError(null); atBottom.current = true;
    try {
      if (!attempt.current) {
        const c = currentPreview && Date.parse(currentPreview.expires_at) > Date.now() ? { chat: await target(), preview: currentPreview } : await prepare();
        attempt.current = { chat: c.chat, request_id: crypto.randomUUID(), preview_id: c.preview.id };
      }
      const current = attempt.current;
      await api<Turn>(`/ai/chats/${current.chat.id}/messages`, { method: "POST", body: { request_id: current.request_id, preview_id: current.preview_id } });
      if (mounted.current) {
        attempt.current = null; setAmbiguous(false); setPreview(null); setMessage("");
        if (!chat) onCreated(current.chat, { message: "", from, to }); else refresh();
      }
    } catch (failure) {
      if (mounted.current) {
        setError(errorMessage(failure));
        const uncertain = !!attempt.current && (!(failure instanceof ApiError) || failure.status >= 500 || failure.status === 408);
        setAmbiguous(uncertain);
        if (!uncertain) attempt.current = null;
        if (failure instanceof ApiError && failure.code === "ai_stale") onConfigChanged();
        refresh();
      }
    } finally { if (mounted.current) setBusy(false); }
  }
  async function cancel(turn: Turn) {
    try { await api(`/ai/chats/${chat!.id}/messages/${turn.id}`, { method: "DELETE" }); refresh(); }
    catch (failure) { setError(errorMessage(failure)); }
  }
  const rangeValid = !!from && !!to && dayDifference(from, to) >= 0 && dayDifference(from, to) < 366;
  const connected = config.enabled && (config.auth_mode === "login" ? !!config.active_account_id : config.key_present);
  return <section aria-label="Переписка с AI" className="min-w-0"><h2 className="sr-only">Переписка</h2>
    <div ref={scrolling} className="max-h-[60dvh] min-h-52 space-y-8 overflow-y-auto px-4 py-5 sm:px-6" onScroll={() => { const el = scrolling.current; if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
      {chat && history.resource.status === "error" ? <ErrorState message={history.resource.message} retry={history.retry} /> : messages.length ? messages.map((turn) => <Message key={turn.id} turn={turn} config={config} onCancel={() => void cancel(turn)} />) : <div className="space-y-4 py-5 text-center"><h3 className="text-xl font-semibold">Чем займёмся сегодня?</h3><p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground">Могу помочь с тренировкой, планом дня или вашими заметками. Для доступа к заметке, упражнению или тренировке отметьте «AI Доступ» в её разделе. Цели, оборудование и ограничения можно заполнить в разделе «Тренировки».</p></div>}
    </div>
    <form onSubmit={(event) => void submit(event)} className="space-y-3 border-t border-border bg-background/80 px-4 py-4 sm:px-6"><div aria-label="Готовые запросы" className="space-y-2"><p className="text-xs text-muted-foreground">Готовые запросы · добавьте к сообщению</p><div className="flex flex-wrap gap-2">{promptTemplates.map(([label, value]) => <Button key={label} size="sm" variant="outline" disabled={busy || ambiguous} onClick={() => { setMessage((current) => current.trim() ? `${current.trimEnd()}\n\n${value}` : value); invalidate(); document.getElementById("ai-question")?.focus(); }}>{label}</Button>)}</div></div><details className="text-xs text-muted-foreground"><summary className="flex cursor-pointer items-center gap-1"><ChevronDown className="size-3" aria-hidden="true" />Контекст: {from} — {to}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><FormField id="ai-from" label="Контекст с"><Input id="ai-from" type="date" required min="1900-01-01" max="9998-12-31" disabled={busy} value={from} onChange={(event) => { setFrom(event.target.value); invalidate(); }} /></FormField><FormField id="ai-to" label="Контекст по"><Input id="ai-to" type="date" required min={from} max="9998-12-31" disabled={busy} value={to} onChange={(event) => { setTo(event.target.value); invalidate(); }} /></FormField></div><p className="mt-2">До 366 дат · {settings.timezone}. Отмеченные заметки берутся по последнему изменению.</p></details>
      <label htmlFor="ai-question" className="sr-only">Ваше сообщение</label><Textarea id="ai-question" required maxLength={8000} disabled={busy || ambiguous} value={message} onChange={(event) => { setMessage(event.target.value); invalidate(); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (connected && rangeValid) void submit(); } }} placeholder="Напишите сообщение…" className="min-h-24 resize-y border-0 bg-muted/30 focus-visible:ring-1" />
      <div className="flex flex-wrap items-center justify-between gap-2"><Button size="sm" variant="ghost" disabled={busy || pending || dirty || !rangeValid || !message.trim()} onClick={() => void showData()}><Eye className="size-4" aria-hidden="true" />Данные для отправки</Button><Button type="submit" disabled={busy || pending || dirty || !connected || !rangeValid || !message.trim()}><Send className="size-4" aria-hidden="true" />{busy ? "Отправка…" : ambiguous ? "Проверить отправку" : "Отправить"}</Button></div>
      <p className="text-xs text-muted-foreground">Enter — отправить · Shift+Enter — новая строка. Изменения в приложении сохраняются после отдельного подтверждения.</p>
      {dirty && <p role="status" className="text-sm text-muted-foreground">Сохраните изменения в настройках AI. Черновик сообщения останется здесь.</p>}{!connected && <Button size="sm" variant="outline" onClick={onSettings}>Настроить подключение AI</Button>}{!rangeValid && <p className="text-sm text-destructive">Выберите от 1 до 366 дат.</p>}{ambiguous && <p role="status" className="text-sm text-muted-foreground">Подтверждение не получено. «Проверить отправку» использует тот же запрос и не запускает второй ответ.</p>}
      {currentPreview && <details open role="region" aria-label="Предпросмотр отправки" className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm">Данные, которые получит {providerName(config.provider)}</summary><p className="mt-2 text-xs text-muted-foreground">Модель {currentPreview.request.model} · прошлых пар {currentPreview.history_turns}. При отправке используется этот запрос; срок — 5 минут.</p><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(currentPreview.request, null, 2)}</pre></details>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </section>;
}

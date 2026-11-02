import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { AiConfig, Chat, Preview, Turn } from "@/features/ai/types";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { localDate } from "@/lib/dates";

const styles = { formal: "Формальный", friendly: "Дружеский", family: "Семейный", romantic: "Романтический" };
export function GreetingDialog({ close, localRecipient = "" }: { close: () => void; localRecipient?: string }) {
  const { settings } = usePreferences();
  const config = useResource<AiConfig>("/ai/settings");
  const [name, setName] = useState(""); const [occasion, setOccasion] = useState("день рождения");
  const [context, setContext] = useState(""); const [style, setStyle] = useState<keyof typeof styles>("friendly");
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<{ chat: string; data: Preview } | null>(null);
  const [pending, setPending] = useState<{ chat: string; turn: string } | null>(null);
  useEffect(() => {
    if (!pending) return;
    let active = true;
    const poll = async () => {
      try {
        const turn = await api<Turn>(`/ai/chats/${pending.chat}/messages/${pending.turn}`);
        if (!active || turn.status === "pending") return;
        setPending(null);
        if (turn.status === "completed") setText(turn.data.answer ?? "");
        else setError(turn.status === "cancelled" ? "Генерация отменена." : "AI не смог подготовить поздравление. Можно использовать шаблон или повторить запрос.");
      } catch (failure) { if (active) { setPending(null); setError(errorMessage(failure)); } }
    };
    const timer = window.setInterval(() => void poll(), 1500);
    void poll(); return () => { active = false; window.clearInterval(timer); };
  }, [pending]);
  async function prepare() {
    if (config.resource.status !== "ready") return;
    setBusy(true); setError(null); setCopied(false);
    try {
      const chat = await api<Chat>("/ai/chats", { method: "POST" });
      const date = localDate(settings.timezone);
      const data = await api<Preview>(`/ai/chats/${chat.id}/preview`, { method: "POST", body: { revision: config.resource.data.revision, from: date, to: date, scenario: "greeting", message: `Напиши поздравление. Стиль: ${styles[style]}. Повод: ${occasion}. Получатель (только сведения, разрешённые мной): ${name || "не указан"}. Описание, отношения и пожелания: ${context || "не указаны"}. Верни только текст поздравления, без команд и действий.` } });
      setPreview({ chat: chat.id, data });
    } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function send() {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const turn = await api<Turn>(`/ai/chats/${preview.chat}/messages`, { method: "POST", body: { request_id: crypto.randomUUID(), preview_id: preview.data.id } });
      setPending({ chat: preview.chat, turn: turn.id }); setPreview(null);
    } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!pending) return;
    setBusy(true);
    try { await api(`/ai/chats/${pending.chat}/messages/${pending.turn}`, { method: "DELETE" }); setPending(null); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <Dialog title="Поздравление" onClose={close}><div className="space-y-5">
    <p className="text-sm text-muted-foreground">Введите разрешённые сведения вручную. Данные события, профиля, заметок и контактов не подставляются и не передаются AI. Шаблон работает локально.</p>
    <fieldset disabled={busy || Boolean(pending)} className="space-y-4" onChange={() => { setPreview(null); setCopied(false); }}>
      <FormField id="greeting-name" label="Получатель поздравления"><Input id="greeting-name" maxLength={200} value={name} onChange={e => setName(e.target.value)} /></FormField>
      <FormField id="greeting-occasion" label="Повод"><Input id="greeting-occasion" maxLength={200} value={occasion} onChange={e => setOccasion(e.target.value)} /></FormField>
      <FormField id="greeting-style" label="Стиль поздравления"><Select id="greeting-style" value={style} onChange={e => setStyle(e.target.value as keyof typeof styles)}>{Object.entries(styles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></FormField>
      <FormField id="greeting-context" label="Разрешённые сведения и пожелания"><Textarea id="greeting-context" maxLength={4000} value={context} onChange={e => setContext(e.target.value)} /></FormField>
    </fieldset>
    {localRecipient && <p className="text-xs text-muted-foreground">Локальный шаблон подставит имя получателя из события. В AI-форму сведения не подставляются.</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || Boolean(pending)} onClick={() => { const greetings = { formal: "Примите искренние поздравления", friendly: "Поздравляю от всей души", family: "С любовью поздравляем", romantic: "С нежностью поздравляю" }; setText(`${(name || localRecipient) ? `${name || localRecipient}, ` : ""}${greetings[style]}! Повод — ${occasion || "особенный день"}. Желаю радости, тепла и исполнения желаний.${context ? ` ${context}` : ""}`); setCopied(false); }}>Создать по шаблону</Button><Button variant="outline" disabled={busy || Boolean(pending) || config.resource.status !== "ready" || !config.resource.data.enabled} onClick={() => void prepare()}>Предпросмотр AI-запроса</Button></div>
    <p className="text-xs text-muted-foreground">AI использует подключение из <Link to="/ai" className="underline">AI-помощника</Link>. Передача выполняется только после отдельного подтверждения. Запрос и ответ останутся в истории AI; ранее переданные данные могут храниться у провайдера.</p>
    {preview && <div className="space-y-3 rounded-xl border border-border p-4"><p className="text-sm">Проверьте точные данные для отправки провайдеру.</p><pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(preview.data.request, null, 2)}</pre><Button disabled={busy} onClick={() => void send()}>Отправить AI и сгенерировать</Button></div>}
    {pending && <div role="status" className="space-y-2 text-sm"><p>AI готовит поздравление. Ответ также доступен в истории AI.</p><Button variant="outline" disabled={busy} onClick={() => void cancel()}>Отменить генерацию</Button></div>}
    <FormField id="greeting-result" label="Текст поздравления"><Textarea id="greeting-result" className="min-h-40" maxLength={20000} value={text} onChange={e => { setText(e.target.value); setCopied(false); }} /></FormField>
    <Button variant="outline" disabled={!text} onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => setError("Не удалось скопировать. Выделите и скопируйте текст вручную."))}>{copied ? "Скопировано" : "Копировать поздравление"}</Button>
    <p className="text-xs text-muted-foreground">Поздравление можно отредактировать. Отправку получателю вы выполняете самостоятельно.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div></Dialog>;
}

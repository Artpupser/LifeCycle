import { t, useLanguage } from "@/systems/i18n/locale";
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

const styles = { get formal() { return t("Формальный"); }, get friendly() { return t("Дружеский"); }, get family() { return t("Семейный"); }, get romantic() { return t("Романтический"); } };
export function GreetingDialog({ close, localRecipient = "" }: { close: () => void; localRecipient?: string }) {
  useLanguage();
  const { settings } = usePreferences();
  const config = useResource<AiConfig>("/ai/settings");
  const [name, setName] = useState(""); const [occasion, setOccasion] = useState(t("день рождения"));
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
        else setError(turn.status === "cancelled" ? t("Генерация отменена.") : t("AI не смог подготовить поздравление. Можно использовать шаблон или повторить запрос."));
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
      const data = await api<Preview>(`/ai/chats/${chat.id}/preview`, { method: "POST", body: { revision: config.resource.data.revision, from: date, to: date, scenario: "greeting", message: t("Напиши поздравление. Стиль: {v0}. Повод: {v1}. Получатель (только сведения, разрешённые мной): {v2}. Описание, отношения и пожелания: {v3}. Верни только текст поздравления, без команд и действий.", {v0: styles[style], v1: occasion, v2: name || t("не указан"), v3: context || t("не указаны")}) } });
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
  return <Dialog title={t("Поздравление")} onClose={close}><div className="space-y-5">
    <p className="text-sm text-muted-foreground">{t("Введите разрешённые сведения вручную. Данные события, профиля, заметок и контактов не подставляются и не передаются AI. Шаблон работает локально.")}</p>
    <fieldset disabled={busy || Boolean(pending)} className="space-y-4" onChange={() => { setPreview(null); setCopied(false); }}>
      <FormField id="greeting-name" label={t("Получатель поздравления")}><Input id="greeting-name" maxLength={200} value={name} onChange={e => setName(e.target.value)} /></FormField>
      <FormField id="greeting-occasion" label={t("Повод")}><Input id="greeting-occasion" maxLength={200} value={occasion} onChange={e => setOccasion(e.target.value)} /></FormField>
      <FormField id="greeting-style" label={t("Стиль поздравления")}><Select id="greeting-style" value={style} onChange={e => setStyle(e.target.value as keyof typeof styles)}>{Object.entries(styles).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</Select></FormField>
      <FormField id="greeting-context" label={t("Разрешённые сведения и пожелания")}><Textarea id="greeting-context" maxLength={4000} value={context} onChange={e => setContext(e.target.value)} /></FormField>
    </fieldset>
    {localRecipient && <p className="text-xs text-muted-foreground">{t("Локальный шаблон подставит имя получателя из события. В AI-форму сведения не подставляются.")}</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || Boolean(pending)} onClick={() => { const greetings = { formal: t("Примите искренние поздравления"), friendly: t("Поздравляю от всей души"), family: t("С любовью поздравляем"), romantic: t("С нежностью поздравляю") }; setText(t("{v0}{v1}! Повод — {v2}. Желаю радости, тепла и исполнения желаний.{v3}", {v0: (name || localRecipient) ? `${name || localRecipient}, ` : "", v1: greetings[style], v2: occasion || t("особенный день"), v3: context ? ` ${context}` : ""})); setCopied(false); }}>{t("Создать по шаблону")}</Button><Button variant="outline" disabled={busy || Boolean(pending) || config.resource.status !== "ready" || !config.resource.data.enabled} onClick={() => void prepare()}>{t("Предпросмотр AI-запроса")}</Button></div>
    <p className="text-xs text-muted-foreground">{t("AI использует подключение из ")}<Link to="/ai" className="underline">{t("AI-помощника")}</Link>{t(". Передача выполняется только после отдельного подтверждения. Запрос и ответ останутся в истории AI; ранее переданные данные могут храниться у провайдера.")}</p>
    {preview && <div className="space-y-3 rounded-xl border border-border p-4"><p className="text-sm">{t("Проверьте точные данные для отправки провайдеру.")}</p><pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(preview.data.request, null, 2)}</pre><Button disabled={busy} onClick={() => void send()}>{t("Отправить AI и сгенерировать")}</Button></div>}
    {pending && <div role="status" className="space-y-2 text-sm"><p>{t("AI готовит поздравление. Ответ также доступен в истории AI.")}</p><Button variant="outline" disabled={busy} onClick={() => void cancel()}>{t("Отменить генерацию")}</Button></div>}
    <FormField id="greeting-result" label={t("Текст поздравления")}><Textarea id="greeting-result" className="min-h-40" maxLength={20000} value={text} onChange={e => { setText(e.target.value); setCopied(false); }} /></FormField>
    <Button variant="outline" disabled={!text} onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => setError(t("Не удалось скопировать. Выделите и скопируйте текст вручную.")))}>{copied ? t("Скопировано") : t("Копировать поздравление")}</Button>
    <p className="text-xs text-muted-foreground">{t("Поздравление можно отредактировать. Отправку получателю вы выполняете самостоятельно.")}</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div></Dialog>;
}

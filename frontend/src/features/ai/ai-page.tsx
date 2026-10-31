import { useCallback, useState } from "react";
import { useSearchParams } from "react-router";
import { MessageCircle, Plus, Settings2, Trash2 } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { dateTimeLabel } from "@/lib/dates";
import { useResource } from "@/hooks/use-resource";
import { api, apiErrorMessage, errorMessage } from "@/lib/api";
import { ConfigForm } from "./config-form";
import { ActionJournal } from "./action-journal";
import { ChatPanel } from "./chat-panel";
import { providerName, type AiConfig, type Chat, type ChatDraft } from "./types";

function Workspace({ config, onSaved, drafts, onDraft }: { config: AiConfig; onSaved: () => void; drafts: Record<string, ChatDraft>; onDraft: (id: string, draft: ChatDraft | null) => void }) {
  const { settings } = usePreferences();
  const [dirtyRevision, setDirtyRevision] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [created, setCreated] = useState<Chat | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chats = useResource<Chat[]>("/ai/chats");
  const items = chats.resource.status === "ready" ? chats.resource.data : [];
  const chat = selected === "new" ? null : items.find((c) => c.id === selected) ?? (created?.id === selected ? created : items[0]) ?? null;
  function acceptCreated(c: Chat, draft: ChatDraft) {
    setCreated(c); setSelected(c.id); onDraft(c.id, draft); onDraft("new", null); chats.refresh();
  }
  async function remove() {
    if (!chat) return;
    setBusy(true); setError(null);
    try { await api(`/ai/chats/${chat.id}`, { method: "DELETE" }); setDeleting(false); onDraft(chat.id, null); setSelected("new"); setCreated(null); chats.refresh(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground"><span className={`mr-2 inline-block size-2 rounded-full ${config.enabled ? "bg-primary" : "bg-muted-foreground"}`} />{providerName(config.provider)} · {config.model} · {config.enabled ? "подключён" : "отправка выключена"}</p><Button size="sm" variant="outline" onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen}><Settings2 className="size-4" aria-hidden="true" />{settingsOpen ? "Закрыть настройки AI" : "Настройки AI"}</Button></div>
    {settingsOpen && <ConfigForm key={config.revision} config={config} onDirty={() => setDirtyRevision(config.revision)} onSaved={() => { setDirtyRevision(null); onSaved(); }} />}
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-label="Диалог с AI">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3"><div className="min-w-0 flex-1"><label className="sr-only" htmlFor="ai-chat">Сохранённые чаты</label><Select id="ai-chat" value={chat?.id ?? "new"} disabled={busy} onChange={(event) => setSelected(event.target.value)}><option value="new">Новый диалог</option>{items.map((c, i) => <option key={c.id} value={c.id}>Диалог {items.length - i} · {dateTimeLabel(c.created_at, settings.timezone, settings.time_format)}</option>)}{created && !items.some((c) => c.id === created.id) && <option value={created.id}>Новый диалог</option>}</Select></div><Button size="sm" variant="outline" disabled={busy} onClick={() => setSelected("new")}><Plus className="size-4" aria-hidden="true" />Новый чат</Button>{chat && <Button size="icon" variant="ghost" disabled={busy} aria-label="Удалить чат" onClick={() => setDeleting(true)}><Trash2 className="size-4" aria-hidden="true" /></Button>}</div>
      {chats.resource.status === "error" ? <ErrorState message={chats.resource.message} retry={chats.retry} /> : chats.resource.status === "loading" ? <LoadingState /> : <ChatPanel key={chat?.id ?? "new"} chat={chat} config={config} dirty={dirtyRevision === config.revision} draft={drafts[chat?.id ?? "new"]} onDraft={onDraft} onCreated={acceptCreated} onSettings={() => setSettingsOpen(true)} onConfigChanged={onSaved} />}
    </section>
    <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">История изменений AI</summary><div className="pt-4"><ActionJournal config={config} /></div></details>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {deleting && chat && <Dialog title="Удалить чат?" onClose={() => setDeleting(false)}><div className="space-y-4"><p className="text-sm leading-6">Переписка этого чата будет удалена из LifeCycle. Ожидающий ответ остановится. Сохранённые задачи, заметки и тренировки останутся.</p><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void remove()}>Удалить навсегда</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(false)}>Отмена</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></Dialog>}
  </div>;
}

export function AiPage() {
  const [drafts, setDrafts] = useState<Record<string, ChatDraft>>({});
  const saveDraft = useCallback((id: string, draft: ChatDraft | null) => setDrafts((current) => {
    const next = { ...current }; if (draft) next[id] = draft; else delete next[id]; return next;
  }), []);
  const [search] = useSearchParams();
  const loginError = search.get("login_error");
  const config = useResource<AiConfig>("/ai/settings");
  return <main id="main" className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-8"><header><h1 className="flex items-center gap-2 text-2xl font-semibold"><MessageCircle className="size-6 text-primary" aria-hidden="true" />AI-помощник</h1><p className="mt-2 text-sm text-muted-foreground">Спросите, спланируйте, обсудите. Вы выбираете доступные AI данные в своих разделах.</p></header>{loginError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(409, loginError)}</p>}{search.get("login") === "connected" && <p role="status" className="text-sm text-primary">ChatGPT подключён. Выберите модель и разрешите отправку в настройках AI.</p>}{config.resource.status === "loading" ? <LoadingState /> : config.resource.status === "error" ? <ErrorState message={config.resource.message} retry={config.retry} /> : <Workspace config={config.resource.data} onSaved={config.refresh} drafts={drafts} onDraft={saveDraft} />}</main>;
}

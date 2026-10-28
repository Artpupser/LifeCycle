import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { ConfigForm } from "./config-form";
import { ChatPanel } from "./chat-panel";
import type { AiConfig, Chat } from "./types";

function Workspace({ config, onSaved }: { config: AiConfig; onSaved: () => void }) {
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chats = useResource<Chat[]>("/ai/chats");
  const chatList = chats.resource.status === "ready" ? chats.resource.data : [];
  const chat = chatList.find((c) => c.id === selected) ?? chatList[0];
  async function create() {
    setBusy(true); setError(null);
    try { const c = await api<Chat>("/ai/chats", { method: "POST" }); setSelected(c.id); chats.retry(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!chat) return;
    setBusy(true); setError(null);
    try { await api(`/ai/chats/${chat.id}`, { method: "DELETE" }); setDeleting(false); setSelected(null); chats.retry(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-7"><div className="flex justify-end"><Button size="sm" variant="outline" onClick={onSaved}>Обновить настройки AI</Button></div><ConfigForm config={config} onDirty={() => setDirty(true)} onSaved={onSaved} /><section className="space-y-4"><div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1 space-y-2"><label className="text-sm font-medium" htmlFor="ai-chat">Сохранённые чаты</label><Select id="ai-chat" value={chat?.id ?? ""} disabled={busy} onChange={(event) => setSelected(event.target.value)}><option value="" disabled>Выберите или создайте чат</option>{chatList.map((c, i) => <option key={c.id} value={c.id}>Чат {chatList.length - i} · {new Date(c.created_at).toLocaleString("ru-RU")}</option>)}</Select></div><Button disabled={busy} onClick={() => void create()}>Новый чат</Button>{chat && <Button variant="outline" disabled={busy} onClick={() => setDeleting(true)}>Удалить чат</Button>}</div>{chats.resource.status === "loading" ? <LoadingState /> : chats.resource.status === "error" ? <ErrorState message={chats.resource.message} retry={chats.retry} /> : chat ? <ChatPanel key={`${chat.id}-${config.revision}`} chat={chat} config={config} dirty={dirty} /> : <p className="text-sm text-muted-foreground">Создайте первый чат. Разрешения можно настроить заранее.</p>}</section>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{deleting && chat && <Dialog title="Удалить чат?" onClose={() => setDeleting(false)}><div className="space-y-4"><p className="text-sm leading-6">Вся переписка и сохранённые запросы этого чата будут безвозвратно удалены из LifeCycle. Ожидающий ответ остановится. Это не удаляет данные, уже полученные OpenAI.</p><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void remove()}>Удалить навсегда</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(false)}>Отмена</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></Dialog>}</div>;
}

export function AiPage() {
  const [hidden, setHidden] = useState(false);
  const config = useResource<AiConfig>("/ai/settings");
  const refresh = config.retry;
  return <main id="main" className="mx-auto max-w-5xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-sm text-primary"><MessageCircle className="size-4" aria-hidden="true" />Осмысленный взгляд на ваш ритм</p><h1 className="text-3xl font-semibold">AI-помощник</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Обсуждайте планы и результаты на основе данных, которые вы разрешили передать. Решение об отправке остаётся за вами.</p></div><Button variant="outline" onClick={() => setHidden(!hidden)}>{hidden ? "Показать AI" : "Скрыть AI"}</Button></header>{hidden ? <p className="rounded-xl border border-border p-6 text-muted-foreground">Чат и настройки скрыты с экрана.</p> : config.resource.status === "loading" ? <LoadingState /> : config.resource.status === "error" ? <ErrorState message={config.resource.message} retry={refresh} /> : <Workspace key={config.resource.data.revision} config={config.resource.data} onSaved={refresh} />}</main>;
}

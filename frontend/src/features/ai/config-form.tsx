import { useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { noPermissions, scopes, type AiConfig } from "./types";

export function ConfigForm({ config, onSaved, onDirty }: { config: AiConfig; onSaved: () => void; onDirty: () => void }) {
  const [draft, setDraft] = useState(config);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(event?: FormEvent, action?: "remove" | "revoke") {
    event?.preventDefault(); setBusy(true); setError(null);
    const body = { revision: config.revision, model: action ? config.model : draft.model, enabled: action === "remove" ? false : action ? config.enabled : draft.enabled, permissions: action === "revoke" ? noPermissions : action ? config.permissions : draft.permissions, ...(action === "remove" ? { remove_key: true } : !action && key ? { api_key: key } : {}) };
    try { await api("/ai/settings", { method: "PUT", body }); setKey(""); onSaved(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <section aria-label="Подключение и разрешения AI" className="space-y-5 rounded-2xl border border-border bg-card p-5">
    <div><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-primary" aria-hidden="true" />Подключение и разрешения</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Запросы уходят в OpenAI и оплачиваются вашим API-аккаунтом. Подписка ChatGPT не заменяет API-ключ. Разрешения действуют отдельно от локальной аналитики.</p></div>
    <form onSubmit={(event) => void save(event)} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><FormField id="ai-key" label="API-ключ OpenAI" hint={config.key_present ? "Ключ сохранён зашифрованным. Оставьте поле пустым, чтобы сохранить его." : "Ключ хранится зашифрованным на сервере и не возвращается браузеру."}><Input id="ai-key" type="password" autoComplete="off" spellCheck={false} maxLength={512} value={key} placeholder={config.key_present ? "Сохранённый ключ скрыт" : "sk-…"} onChange={(event) => { setKey(event.target.value); onDirty(); }} /></FormField>
        <FormField id="ai-model" label="Модель OpenAI" hint="ID доступной вам текстовой модели с поддержкой Responses API."><Input id="ai-model" required maxLength={100} pattern="[a-zA-Z0-9_.:\-]+" list="ai-models" value={draft.model} onChange={(event) => { setDraft({ ...draft, model: event.target.value }); onDirty(); }} /><datalist id="ai-models"><option value="gpt-4.1-mini" /><option value="gpt-4.1" /></datalist></FormField></div>
        <label className="flex items-start gap-3 text-sm"><input className="mt-0.5 size-4 accent-primary" type="checkbox" checked={draft.enabled} onChange={(event) => { setDraft({ ...draft, enabled: event.target.checked }); onDirty(); }} />Разрешить отправку сообщений в OpenAI</label>
        <div className="space-y-4"><h3 className="font-medium">Доступ к данным LifeCycle</h3><p className="text-xs leading-5 text-muted-foreground">Все категории выключены по умолчанию. Ваш вопрос и до 10 предыдущих успешных пар текущей версии разрешений передаются всегда. Без категорий чат получает только переписку и выбранные даты/часовой пояс.</p>{scopes.map(([scope, label, hint]) => <label key={scope} className="flex items-start gap-3 text-sm"><input className="mt-1 size-4 shrink-0 accent-primary" type="checkbox" checked={draft.permissions[scope]} onChange={(event) => { setDraft({ ...draft, permissions: { ...draft.permissions, [scope]: event.target.checked } }); onDirty(); }} /><span><span className="font-medium">{label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{hint}</span></span></label>)}</div>
        <p className="text-xs leading-5 text-muted-foreground">Изменение настроек отменяет ожидающие ответы и исключает прежнюю переписку из новых запросов. История остаётся у вас. Уже переданные OpenAI данные отозвать нельзя. Используется store: false; правила хранения провайдера всё равно применяются.</p>
        <div className="flex flex-wrap gap-2"><Button type="submit">{busy ? "Сохранение…" : "Сохранить настройки AI"}</Button><Button variant="outline" onClick={() => void save(undefined, "revoke")}>Отозвать доступ к данным</Button>{config.key_present && <Button variant="outline" onClick={() => void save(undefined, "remove")}>Удалить API-ключ</Button>}</div>
      </fieldset>
    </form>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}

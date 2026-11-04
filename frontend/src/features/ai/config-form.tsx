import { t, useLanguage } from "@/systems/i18n/locale";
import { useState, type FormEvent } from "react";
import { ShieldCheck } from "@/components/icons";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { LoginAccounts } from "./login-accounts";
import { confirmAction } from "@/lib/feedback";
import { noPermissions, scopes, providerName, type AiConfig } from "./types";

export function ConfigForm({ config, onSaved, onDirty }: { config: AiConfig; onSaved: () => void; onDirty: () => void }) {
  useLanguage();
  const [draft, setDraft] = useState(config);
  const [key, setKey] = useState("");
  const [models,setModels]=useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(event?: FormEvent, action?: "remove" | "revoke") {
    event?.preventDefault(); setBusy(true); setError(null);
    const body = { ollama_url:action?config.ollama_url:draft.ollama_url, provider: action ? config.provider : draft.provider, auth_mode: action ? config.auth_mode : draft.auth_mode, revision: config.revision, model: action ? config.model : draft.model, enabled: action === "remove" ? false : action ? config.enabled : draft.enabled, permissions: action === "revoke" ? noPermissions : action ? config.permissions : draft.permissions, ...(action === "remove" ? { remove_key: true } : !action && key ? { api_key: key } : {}) };
    try { await api("/ai/settings", { method: "PUT", body }); setKey(""); onSaved(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function removeConnection(provider:"openai"|"openrouter") {
    if(!await confirmAction({title:t("Удалить ключ {v0}?",{v0:providerName(provider)}),message:t("Ключ будет удалён из LifeCycle. Для удалённого отзыва удалите его также в кабинете провайдера. Ваши данные и чаты сохранятся."),confirmLabel:t("Подтвердить удаление ключа"),destructive:true}))return;
    setBusy(true);setError(null);
    try {await api(`/ai/connections/${provider}`,{method:"DELETE",body:{revision:config.revision}});setKey("");onSaved();}
    catch(failure){setError(errorMessage(failure));}finally{setBusy(false);}
  }
  return <section aria-label={t("Подключение и разрешения AI")} className="space-y-5 rounded-2xl border border-border bg-card p-5">
    <div><h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-primary" aria-hidden="true" />{t("Подключение и разрешения")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Выберите подключение: тариф ChatGPT через вход, OpenAI API или OpenRouter API. Стоимость и лимиты определяет выбранный сервис. Разрешения действуют отдельно от локальной аналитики.")}</p></div>
    <form onSubmit={(event) => void save(event)} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><FormField id="ai-provider" label={t("Провайдер AI")}><Select id="ai-provider" value={draft.provider} onChange={(event) => { const provider = event.target.value as AiConfig["provider"]; setDraft({ ...draft, provider, auth_mode: "api_key", enabled: false, model: provider === "ollama" ? "qwen3:8b" : provider === "openrouter" ? "openai/gpt-4.1-mini" : "gpt-4.1-mini" }); setKey(""); onDirty(); }}><option value="openai">OpenAI</option><option value="openrouter">OpenRouter</option><option value="ollama">Ollama</option></Select></FormField>
        {draft.provider === "openai" && <FormField id="ai-auth" label={t("Способ подключения")}><Select id="ai-auth" value={draft.auth_mode} onChange={(event) => { setDraft({ ...draft, auth_mode: event.target.value as AiConfig["auth_mode"], enabled: false }); setKey(""); onDirty(); }}><option value="api_key">{t("API-ключ")}</option><option value="login">{t("Вход через ChatGPT")}</option></Select></FormField>}</div>
        {draft.provider === "openrouter" && <p className="text-sm leading-6 text-muted-foreground">{t("Контекст получает OpenRouter и выбранный им поставщик модели. В запросах включены запрет сбора данных и Zero Data Retention; при отсутствии подходящего поставщика запрос завершится ошибкой. Бесплатность модели не гарантируется.")}</p>}

        {draft.provider==="ollama"&&<div className="space-y-3 rounded-xl border border-border p-4"><FormField id="ollama-url" label={t("Адрес Ollama")} hint={t("Адрес должен быть доступен серверу LifeCycle. Для контейнера используйте адрес хоста или имя сервиса Ollama.")}><Input id="ollama-url" type="url" value={draft.ollama_url??"http://127.0.0.1:11434"} onChange={event=>{setDraft({...draft,ollama_url:event.target.value});onDirty();}}/></FormField><Button variant="outline" disabled={busy||draft.ollama_url!==config.ollama_url} onClick={()=>void api<{models:string[]}>("/ai/ollama/models").then(result=>setModels(result.models)).catch(error=>setError(errorMessage(error)))}>{t("Загрузить локальные модели")}</Button><p className="text-xs text-muted-foreground">{t("Сначала сохраните адрес. Ключ не нужен; используются локально установленные модели.")}</p></div>}<div className="grid gap-4 sm:grid-cols-2">{draft.provider!=="ollama"&&draft.auth_mode === "api_key" && <FormField id="ai-key" label={t("API-ключ {v0}", {v0: providerName(draft.provider)})} hint={draft.provider === config.provider && config.key_present ? t("Ключ сохранён зашифрованным. Оставьте поле пустым, чтобы сохранить его.") : t("Ключ хранится зашифрованным на сервере и не возвращается браузеру.")}><Input id="ai-key" type="password" autoComplete="off" spellCheck={false} maxLength={512} value={key} placeholder={draft.provider === config.provider && config.key_present ? t("Сохранённый ключ скрыт") : "sk-…"} onChange={(event) => { setKey(event.target.value); onDirty(); }} /></FormField>}
        <FormField id="ai-model" label={t("Модель {v0}", {v0: providerName(draft.provider)})} hint={draft.auth_mode === "login" ? t("Подключите аккаунт и выберите модель из его списка выше.") : t("ID доступной вам текстовой модели с поддержкой Responses API.")}><Input id="ai-model" required maxLength={100} pattern="[a-zA-Z0-9_./:\-]+" list="ai-models" value={draft.model} onChange={(event) => { setDraft({ ...draft, model: event.target.value }); onDirty(); }} /><datalist id="ai-models">{(draft.provider==="ollama"?models:["gpt-4.1-mini","gpt-4.1"]).map(model=><option key={model} value={model}/>)}</datalist></FormField></div>
        <label className="flex items-start gap-3 text-sm"><input className="mt-0.5 size-4 accent-primary" type="checkbox" checked={draft.enabled} onChange={(event) => { setDraft({ ...draft, enabled: event.target.checked }); onDirty(); }} />{t("Разрешить отправку сообщений в ")}{providerName(draft.provider)}</label>
        <div className="space-y-4"><h3 className="font-medium">{t("Доступ к данным LifeCycle")}</h3><p className="text-xs leading-5 text-muted-foreground">{t("Все категории выключены по умолчанию. Ваш вопрос и до 10 предыдущих успешных пар текущей версии разрешений передаются всегда. Для заметок, упражнений и планов тренировок отметьте «AI Доступ» в соответствующем разделе. Без категорий чат получает только переписку и выбранные даты.")}</p>{scopes.map(([scope, label, hint]) => <label key={scope} className="flex items-start gap-3 text-sm"><input className="mt-1 size-4 shrink-0 accent-primary" type="checkbox" checked={draft.permissions[scope]} onChange={(event) => { setDraft({ ...draft, permissions: { ...draft.permissions, [scope]: event.target.checked } }); onDirty(); }} /><span><span className="font-medium">{t(label)}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{t(hint)}</span></span></label>)}</div>
        <p className="text-xs leading-5 text-muted-foreground">{t("Изменение настроек отменяет ожидающие ответы и исключает прежнюю переписку из новых запросов. История остаётся у вас. Уже переданные внешнему сервису данные отозвать нельзя. Используется store: false; правила хранения провайдера всё равно применяются.")}</p>
        <div className="flex flex-wrap gap-2"><Button type="submit">{busy ? t("Сохранение…") : t("Сохранить настройки AI")}</Button><Button variant="outline" onClick={() => void save(undefined, "revoke")}>{t("Отозвать доступ к данным")}</Button>{config.provider!=="ollama"&&config.auth_mode === "api_key" && config.key_present && <Button variant="outline" onClick={() => void removeConnection(config.provider as "openai"|"openrouter")}>{t("Удалить API-ключ")}</Button>}</div>
      </fieldset>
    </form>
    <div className="space-y-3 border-t border-border pt-4"><h3 className="font-medium">{t("Сохранённые подключения")}</h3>{(["openai", "openrouter"] as const).map((provider) => <div key={provider} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{providerName(provider)} API · {config[provider === "openai" ? "openai_key_present" : "openrouter_key_present"] ? t("ключ сохранён") : t("не подключён")}{config.provider === provider && config.auth_mode === "api_key" ? config.enabled ? t(" · отправка включена") : t(" · отправка выключена") : ""}</span>{config[provider === "openai" ? "openai_key_present" : "openrouter_key_present"] && <Button size="sm" variant="outline" disabled={busy} onClick={() => void removeConnection(provider)}>{t("Удалить ключ ")}{providerName(provider)}</Button>}</div>)}</div>
    <LoginAccounts config={config} onSaved={onSaved} onApply={() => void save()} onModel={(model) => { setDraft((current) => ({ ...current, model })); onDirty(); }} />

    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}

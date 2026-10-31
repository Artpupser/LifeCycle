import { useState } from "react";
import { useSearchParams } from "react-router";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import type { AiAccount, AiConfig } from "./types";

export function LoginAccounts({ config, onSaved, onModel, onApply }: { config: AiConfig; onSaved: () => void; onModel: (model: string) => void; onApply: () => void }) {
  const accounts = useResource<AiAccount[]>("/ai/accounts");
  const [forgetting, setForgetting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useSearchParams();
  const items = accounts.resource.status === "ready" ? accounts.resource.data : [];
  async function login(account_id?: string) {
    setBusy(true); setError(null);
    try {
      const result = await api<{ url: string }>("/ai/login/start", { method: "POST", body: { revision: config.revision, account_id } });
      window.location.assign(result.url);
    } catch (failure) { setError(errorMessage(failure)); setBusy(false); }
  }
  async function select(id: string) {
    setBusy(true); setError(null);
    try { await api(`/ai/accounts/${id}`, { method: "POST", body: { revision: config.revision } }); onSaved(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function disconnect(id: string, forget = false) {
    setBusy(true); setError(null);
    try {
      const result = await api<{ remote_revoked: boolean }>(`/ai/accounts/${id}`, { method: "DELETE", body: { revision: config.revision, forget } });
      setModels([]); setForgetting(null); accounts.retry();
      setSearch({ login: "disconnected", remote_revoked: String(result.remote_revoked), forgotten: String(forget) }); onSaved();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function loadModels() {
    setBusy(true); setError(null);
    try {
      const available = await api<{ id: string; name: string }[]>("/ai/models");
      setModels(available);
      if (available.length && !available.some((model) => model.id === config.model)) onModel(available[0].id);
    }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 rounded-xl border border-border p-4">
    {search.get("login") === "disconnected" && <p role="status" className="text-sm">{search.get("forgotten") === "true" ? "Привязка ChatGPT удалена из LifeCycle." : "ChatGPT отключён в LifeCycle."}{search.get("remote_revoked") === "false" ? " Удалённый отзыв не подтверждён. Отключите приложение также в настройках доступа ChatGPT." : " Удалённый доступ отозван или сохранённых токенов уже не было."}</p>}
    <p className="text-sm leading-6 text-muted-foreground">Вход через официальный ChatGPT OAuth. Нужен подходящий тариф и отдельное разрешение использовать его лимиты. Вход не даёт доступа к истории ChatGPT. После подключения выберите доступную модель и разрешите сообщения.</p>
    {!config.login_available && <p role="status" className="text-sm">Открытый вход доступен при локальном запуске через HTTP на localhost или 127.0.0.1. Callback приходит на 127.0.0.1 того же компьютера. Для удалённого сервера используйте API-ключ.</p>}
    <Button disabled={busy || !config.login_available} onClick={() => void login()}>Continue with ChatGPT</Button>
    {items.map((account) => <div key={account.id} className="space-y-2 border-t border-border pt-3">
      <p className="break-words text-sm">{account.email ? `${account.email} · ${account.label}` : account.label}{account.id === config.active_account_id ? " · выбран" : ""}{!account.connected ? " · отключён" : ""}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy || !config.login_available} onClick={() => void login(account.id)}>Войти снова</Button>
        {account.connected && account.id !== config.active_account_id && <Button size="sm" variant="outline" disabled={busy} onClick={() => void select(account.id)}>Выбрать аккаунт</Button>}
        {account.connected && <Button size="sm" variant="outline" disabled={busy} onClick={() => void disconnect(account.id)}>Отключить ChatGPT</Button>}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setForgetting(account.id)}>Удалить привязку ChatGPT</Button>
      </div>
    </div>)}
    {accounts.resource.status === "error" && <p role="alert" className="text-sm text-destructive">{accounts.resource.message}</p>}
    {config.active_account_id && <div className="space-y-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void loadModels()}>Загрузить модели ChatGPT</Button>{models.length > 0 && <Select aria-label="Доступные модели ChatGPT" defaultValue="" onChange={(event) => onModel(event.target.value)}><option value="" disabled>Выберите модель аккаунта</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}{models.length > 0 && <div className="space-y-2"><p className="text-sm text-muted-foreground">Сохраните выбранную модель перед отправкой сообщения.</p><Button size="sm" disabled={busy} onClick={onApply}>Сохранить выбранную модель</Button></div>}</div>}
    <a className="block text-sm text-primary underline" href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Лимиты и доступ приложений в ChatGPT</a>
    {forgetting && <Dialog title="Удалить привязку ChatGPT?" onClose={() => setForgetting(null)}><p className="mb-4 text-sm leading-6">Аккаунт, токены и данные подключения будут удалены из LifeCycle. Будет выполнена попытка отзыва доступа у провайдера. Ваш аккаунт LifeCycle, чаты и тренировки сохранятся. Для повторного подключения используйте Continue with ChatGPT.</p><Button disabled={busy} onClick={() => void disconnect(forgetting, true)}>Удалить привязку навсегда</Button></Dialog>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

import {useEffect,useState,type ReactNode} from "react";
import {Link,useSearchParams} from "react-router";
import {FormField} from "@/components/form-field";
import {ErrorState,LoadingState} from "@/components/resource-state";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {SaveForm,SaveButton} from "@/components/ui/save";
import {useResource} from "@/hooks/use-resource";
import {errorMessage} from "@/lib/api";
import {dateTimeLabel} from "@/lib/dates";
import {notify} from "@/lib/feedback";
import {usePreferences} from "@/features/settings/preferences-context";
import {ObjectActions} from "@/systems/actions/action-menu";
import {AppIcon} from "@/systems/icons/app-icon";
import {t,useLanguage} from "@/systems/i18n/locale";
import {ExternalLink} from "@/systems/links/external-link";
import {connectIntegration,disconnectIntegration,saveIntegrationKey,syncIntegration,startEpicLogin,finishEpicLogin} from "./service";
import type {Integration,CodeLogin} from "./types";
function useIntegrationAction(refresh:()=>void){
 const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 async function run(action:()=>Promise<unknown>){if(busy)return;setBusy(true);setError(null);try{await action();}catch(failure){setError(errorMessage(failure));}finally{setBusy(false);refresh();}}
 return {busy,error,run};
}
type Action=ReturnType<typeof useIntegrationAction>;
function IntegrationCard({provider,action,children,disconnect}:{provider:Integration;action:Action;children:ReactNode;disconnect:()=>void}){
 useLanguage();const {settings}=usePreferences();const {busy,error,run}=action;
 return <article className="min-w-0 space-y-4 rounded-2xl border border-border bg-background p-5" aria-label={provider.name}>
  <header className="flex items-start gap-3"><AppIcon icon={provider.icon} className="size-7 text-primary"/><div className="min-w-0"><h3 className="font-semibold">{provider.name}</h3><p className="mt-1 text-sm text-muted-foreground">{t(provider.connected?"Аккаунт подключён":"Аккаунт не подключён")}</p>{provider.display_name&&<p className="mt-1 break-words text-sm">{provider.display_name}</p>}</div>{provider.revision>0&&<ObjectActions actions={[{id:"disconnect",label:t("Отключить интеграцию"),icon:"tabler:unlink",danger:true,disabled:busy,run:()=>void run(async()=>{if(await disconnectIntegration(provider))disconnect();})},...(provider.id==="steam"&&provider.configured?[{id:"remove-key",label:t("Удалить API-ключ"),disabled:busy,run:()=>void run(()=>saveIntegrationKey(provider,"",true))}]:[])]}/>}</header>
  {children}
  {provider.connected&&provider.capabilities.includes("library")&&<Button className="h-auto min-h-11 max-w-full whitespace-normal" variant="outline" disabled={busy||!provider.configured||provider.syncing} onClick={()=>void run(async()=>{const result=await syncIntegration(provider);notify(t(result?.pending?"Синхронизация началась. Сохранённая библиотека остаётся доступной; результат появится автоматически.":"Библиотека обновлена."));})}>{t(provider.syncing?"Синхронизация выполняется…":"Синхронизировать библиотеку")}</Button>}
  {provider.last_synced_at&&<p className="text-xs text-muted-foreground">{t("Последняя синхронизация: {date}",{date:dateTimeLabel(provider.last_synced_at,settings.timezone,settings.time_format)})}</p>}
  {provider.last_error&&<p role="status" className="text-sm text-muted-foreground">{t(provider.last_error==="integration_library_private"?"Steam не открыл библиотеку. Проверьте приватность данных об играх; сохранённая копия остаётся доступной.":provider.last_error==="integration_key_required"?"Для синхронизации нужен Steam Web API key.":provider.last_error==="integration_login_required"?"Сессия Epic Games истекла или отозвана. Выполните вход заново.":"Площадка временно недоступна или отклонила вход. Сохранённые данные остаются доступными.")}</p>}
  {provider.last_error&&provider.retry_at&&<p className="text-xs text-muted-foreground">{t("Следующий запрос к площадке — после {date}. Настройки других интеграций остаются доступны.",{date:dateTimeLabel(provider.retry_at,settings.timezone,settings.time_format)})}</p>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 </article>;
}
function SteamIntegration({provider,refresh}:{provider:Integration;refresh:()=>void}){
 useLanguage();const action=useIntegrationAction(refresh),{busy,run}=action;const [key,setKey]=useState("");
 return <IntegrationCard provider={provider} action={action} disconnect={()=>setKey("")}>
  <p className="text-sm leading-6 text-muted-foreground">{t("Вход выполняется на сайте Steam. Для библиотеки и игрового времени сохраните Web API key и откройте доступ к данным об играх в настройках Steam.")}</p>
  {provider.account_id&&<ExternalLink href={`https://steamcommunity.com/profiles/${provider.account_id}/`} className="break-all text-sm text-primary underline">{provider.account_id}</ExternalLink>}
  <Button className="h-auto min-h-11 max-w-full whitespace-normal" disabled={busy} variant={provider.connected?"outline":"default"} onClick={()=>void run(()=>connectIntegration(provider))}>{t(provider.connected?"Переподключить {name}":"Подключить {name}",{name:provider.name})}</Button>
  <SaveForm className="space-y-3" onSubmit={event=>{event.preventDefault();void run(async()=>{await saveIntegrationKey(provider,key);setKey("");notify(t("Ключ интеграции сохранён."));});}}><fieldset disabled={busy} className="min-w-0 space-y-3"><FormField id="integration-steam-key" label={t("Steam Web API key")} hint={t("Ключ хранится зашифрованно и не возвращается в браузер.")}><Input id="integration-steam-key" type="password" autoComplete="new-password" required pattern="[a-fA-F0-9]{32}" maxLength={32} value={key} onChange={event=>setKey(event.target.value)} placeholder={provider.configured?t("Ключ сохранён"):""}/></FormField><ExternalLink href="https://steamcommunity.com/dev/apikey" className="text-sm text-primary underline">{t("Получить ключ Steam")}</ExternalLink><SaveButton type="submit" disabled={busy||!/^[a-fA-F0-9]{32}$/.test(key.trim())}>{t("Сохранить ключ интеграции")}</SaveButton></fieldset></SaveForm>
 </IntegrationCard>;
}
function EpicIntegration({provider,refresh}:{provider:Integration;refresh:()=>void}){
 useLanguage();const action=useIntegrationAction(refresh),{busy,run}=action;const [attempt,setAttempt]=useState<CodeLogin|null>(null),[code,setCode]=useState("");
 const clear=()=>{setAttempt(null);setCode("");};
 return <IntegrationCard provider={provider} action={action} disconnect={clear}>
  <p className="text-sm leading-6 text-muted-foreground">{t("Войдите на сайте Epic Games и вставьте одноразовый код. Client ID и Client Secret не нужны. Используется неофициальный API лаунчера; при его изменении может потребоваться повторный вход.")}</p>
  <p className="text-xs leading-5 text-muted-foreground">{t("Код подтверждает аккаунт. Первая синхронизация запускается отдельно кнопкой; ввод кода сам её не запускает. Сессия хранится зашифрованно, пароль остаётся на сайте Epic.")}</p>
  <Button className="h-auto min-h-11 max-w-full whitespace-normal" disabled={busy||provider.syncing} variant={provider.connected?"outline":"default"} onClick={()=>void run(async()=>{setAttempt(await startEpicLogin(provider));setCode("");})}>{t(provider.connected?"Переподключить {name}":"Подключить {name}",{name:provider.name})}</Button>
  {attempt&&<SaveForm className="space-y-3" onSubmit={event=>{event.preventDefault();void run(async()=>{await finishEpicLogin(attempt,code);clear();notify(t("Epic Games подключён. Нажмите «Синхронизировать библиотеку», чтобы загрузить игры."));});}}><fieldset disabled={busy} className="min-w-0 space-y-3"><ExternalLink href={attempt.url} className="inline-flex min-h-11 items-center text-sm text-primary underline">{t("Открыть вход Epic Games")}</ExternalLink><FormField id="integration-epic-code" label={t("Одноразовый код Epic Games")} hint={t("Вставьте authorizationCode или JSON со страницы Epic. Код действует недолго и используется один раз.")}><Input id="integration-epic-code" type="password" autoComplete="off" required maxLength={4096} value={code} onChange={event=>setCode(event.target.value)}/></FormField><SaveButton type="submit" disabled={busy||!code.trim()}>{t("Подтвердить код Epic Games")}</SaveButton></fieldset></SaveForm>}
 </IntegrationCard>;
}
export function IntegrationsPanel(){
 useLanguage();const source=useResource<Integration[]>("/integrations",{refreshIntervalMs:15_000,refreshWhile:items=>items.some(item=>item.syncing)});const [params,setParams]=useSearchParams();const integration=params.get("integration"),result=["steam","epic"].includes(integration??"")?params.get("result"):null;
 useEffect(()=>{if(!result)return;notify(t(integration==="epic"?"Начните новый вход Epic Games через одноразовый код.":result==="connected"?"Steam подключён. Сохраните ключ и синхронизируйте библиотеку.":"Не удалось подтвердить аккаунт Steam. Попробуйте подключение снова."),result==="connected"?"success":"error");setParams(previous=>{const next=new URLSearchParams(previous);next.delete("integration");next.delete("result");return next;},{replace:true});},[result,integration,setParams]);
 return <section id="integrations" className="mt-8 min-w-0 space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-6" aria-label={t("Интеграции")}><header><h2 className="flex items-center gap-2 text-xl font-semibold"><AppIcon icon="tabler:plug-connected"/>{t("Интеграции")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Подключённые сервисы вашего профиля. Каждая интеграция использует свои разрешения; отключение удаляет её сохранённые данные.")}</p></header>
  {source.resource.status==="loading"?<LoadingState/>:source.resource.status==="error"?<ErrorState message={source.resource.message} retry={source.retry} retryAt={source.retryAt}/>:source.resource.data.map(provider=>provider.id==="epic"?<EpicIntegration key={provider.id} provider={provider} refresh={source.retry}/>:provider.kind==="gaming"?<SteamIntegration key={provider.id} provider={provider} refresh={source.retry}/>:<div key={provider.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><span className="flex items-center gap-2 text-sm font-medium"><AppIcon icon={provider.icon}/>{provider.name}</span><Button size="sm" className="h-auto min-h-9 max-w-full whitespace-normal" variant="outline" asChild><Link to={provider.settings_path}>{t("Открыть настройки интеграции")}</Link></Button></div>)}
 </section>;
}

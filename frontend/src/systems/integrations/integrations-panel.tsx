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
import {connectIntegration,disconnectIntegration,saveIntegrationKey,syncIntegration,startSessionLogin,finishSessionLogin} from "./service";
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
  {provider.connected&&provider.capabilities.includes("library")&&<Button className="h-auto min-h-11 max-w-full whitespace-normal" variant="outline" disabled={busy||!provider.configured||provider.syncing||provider.authorizing} onClick={()=>void run(async()=>{const result=await syncIntegration(provider);notify(t(result?.pending?"Синхронизация началась. Сохранённая библиотека остаётся доступной; результат появится автоматически.":"Библиотека обновлена."));})}>{t(provider.syncing?"Синхронизация выполняется…":"Синхронизировать библиотеку")}</Button>}
  {provider.authorizing&&<p role="status" className="text-sm text-fg-muted">{t("Подключение подтверждается. Результат появится автоматически.")}</p>}
  {provider.last_synced_at&&<p className="text-xs text-muted-foreground">{t("Последняя синхронизация: {date}",{date:dateTimeLabel(provider.last_synced_at,settings.timezone,settings.time_format)})}</p>}
  {provider.last_error&&<p role="status" className="text-sm text-muted-foreground">{t(provider.last_error==="integration_library_private"||provider.last_error==="integration_access_denied"?"Площадка {name} не разрешила загрузить данные. Проверьте доступ и настройки приватности; сохранённая копия остаётся доступной.":provider.last_error==="integration_key_required"?"Для синхронизации нужен Steam Web API key.":provider.last_error==="integration_login_required"||provider.last_error==="integration_session_required"?"Сессия {name} истекла или отозвана. Выполните вход заново.":"Площадка временно недоступна или отклонила вход. Сохранённые данные остаются доступными.",{name:provider.name})}</p>}
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
function SessionIntegration({provider,refresh}:{provider:Integration;refresh:()=>void}){
 useLanguage();const action=useIntegrationAction(refresh),{busy,run}=action;const [attempt,setAttempt]=useState<CodeLogin|null>(null),[code,setCode]=useState("");
 const clear=()=>{setAttempt(null);setCode("");};
 const epic=provider.id==="epic",playstation=provider.id==="playstation";
 const fieldLabel=epic?t("Одноразовый код Epic Games"):playstation?t("NPSSO PlayStation"):t("Адрес завершения входа Microsoft");
 return <IntegrationCard provider={provider} action={action} disconnect={clear}>
  <p className="text-sm leading-6 text-fg-muted">{t(epic?"Войдите на сайте Epic Games и вставьте одноразовый код. Client ID и Client Secret не нужны. Используется неофициальный API лаунчера; при его изменении может потребоваться повторный вход.":playstation?"Войдите на сайте PlayStation, затем откройте страницу сессии Sony в том же браузере и вставьте NPSSO. Пароль остаётся на сайте Sony.":"Войдите в Microsoft, затем скопируйте полный адрес страницы завершения входа и вставьте его ниже. Пароль остаётся на сайте Microsoft.")}</p>
  <p className="text-caption text-fg-muted">{t(epic?"Код подтверждает аккаунт. Первая синхронизация запускается отдельно кнопкой; ввод кода сам её не запускает. Сессия хранится зашифрованно, пароль остаётся на сайте Epic.":playstation?"NPSSO используется только для обмена на токены и не сохраняется. Токены хранятся зашифрованно и обновляются автоматически; после отзыва нужен повторный вход.":"Microsoft-сессия хранится зашифрованно. Если площадка не выдала токен продления, после истечения сессии понадобится повторный вход.")}</p>
  {!epic&&<p className="text-caption text-fg-muted">{t(playstation?"Импортируются приобретённые игры PS4/PS5 и история запусков с доступным игровым временем. Игры из одной истории не считаются подтверждённой покупкой.":"Импортируется история игр Xbox. Она не подтверждает покупки и может не включать незапущенные игры; игровое время недоступно.")}</p>}
  <Button disabled={busy||provider.syncing||provider.authorizing} variant={provider.connected?"outline":"default"} onClick={()=>void run(async()=>{setAttempt(await startSessionLogin(provider));setCode("");})}>{t(provider.connected?"Переподключить {name}":"Подключить {name}",{name:provider.name})}</Button>
  {attempt&&<SaveForm className="space-y-3" onSubmit={event=>{event.preventDefault();void run(async()=>{const result=await finishSessionLogin(provider,attempt,code);clear();notify(t(result.pending?"Подключение подтверждается. Результат появится автоматически.":epic?"Epic Games подключён. Нажмите «Синхронизировать библиотеку», чтобы загрузить игры.":"{name} подключён. Нажмите «Синхронизировать библиотеку», чтобы загрузить игры.",{name:provider.name}));});}}><fieldset disabled={busy||provider.authorizing} className="min-w-0 space-y-3">
   <ExternalLink href={attempt.url} className="inline-flex min-h-11 items-center text-sm text-accent underline">{epic?t("Открыть вход Epic Games"):t("Открыть вход {name}",{name:provider.name})}</ExternalLink>
   {playstation&&<ExternalLink href="https://ca.account.sony.com/api/v1/ssocookie" className="flex min-h-11 items-center text-sm text-accent underline">{t("Открыть страницу сессии Sony")}</ExternalLink>}
   <FormField id={`integration-${provider.id}-code`} label={fieldLabel} hint={t(epic?"Вставьте authorizationCode или JSON со страницы Epic. Код действует недолго и используется один раз.":playstation?"Вставьте значение npsso или весь JSON со страницы Sony. Это секрет входа: передавайте его только своему приложению LifeCycle.":"Нужен полный адрес login.live.com/oauth20_desktop.srf после входа, включая часть после #. Используйте ссылку из текущей попытки.")}><Input id={`integration-${provider.id}-code`} type="password" autoComplete="off" required maxLength={epic||playstation?4096:16384} value={code} onChange={event=>setCode(event.target.value)}/></FormField>
   <SaveButton type="submit" disabled={busy||provider.authorizing||!code.trim()}>{epic?t("Подтвердить код Epic Games"):t("Подтвердить сессию {name}",{name:provider.name})}</SaveButton>
  </fieldset></SaveForm>}
 </IntegrationCard>;
}
function BattleNetIntegration({provider,refresh}:{provider:Integration;refresh:()=>void}){
 useLanguage();const action=useIntegrationAction(refresh),{busy,run}=action;const [clientId,setClientId]=useState(provider.client_id??""),[secret,setSecret]=useState("");
 return <IntegrationCard provider={provider} action={action} disconnect={()=>{setClientId("");setSecret("");}}>
  <p className="text-sm leading-6 text-muted-foreground">{t("Официальный вход Battle.net подтверждает аккаунт и BattleTag. Импорт библиотеки и игрового времени недоступен через этот API.")}</p>
  <SaveForm className="space-y-3" onSubmit={event=>{event.preventDefault();void run(async()=>{await saveIntegrationKey(provider,secret,false,clientId);setSecret("");notify(t("Ключ интеграции сохранён."));});}}><fieldset disabled={busy} className="min-w-0 space-y-3">
  <FormField id="battle-client" label={t("Client ID Battle.net")}><Input id="battle-client" required minLength={8} maxLength={128} autoComplete="off" value={clientId} onChange={event=>setClientId(event.target.value)}/></FormField>
  <FormField id="battle-secret" label={t("Client Secret Battle.net")} hint={t("Ключ хранится зашифрованно и не возвращается в браузер.")}><Input id="battle-secret" required type="password" minLength={8} maxLength={512} autoComplete="new-password" value={secret} onChange={event=>setSecret(event.target.value)}/></FormField>
  <ExternalLink href="https://develop.battle.net/access/" className="inline-flex min-h-11 items-center text-sm text-primary underline">{t("Создать OAuth-клиент Battle.net")}</ExternalLink>
  <p className="break-all text-caption text-fg-muted">{t("Redirect URI: {url}",{url:new URL("/api/integrations/battlenet/callback",window.location.origin).href})}</p>
  <SaveButton type="submit" disabled={busy||!clientId.trim()||!secret.trim()}>{t("Сохранить ключ интеграции")}</SaveButton>
  </fieldset></SaveForm>
  <Button disabled={busy||!provider.configured} variant={provider.connected?"outline":"default"} onClick={()=>void run(()=>connectIntegration(provider))}>{t(provider.connected?"Переподключить {name}":"Подключить {name}",{name:provider.name})}</Button>
 </IntegrationCard>;
}
export function IntegrationsPanel(){
 useLanguage();const source=useResource<Integration[]>("/integrations",{refreshIntervalMs:15_000,refreshWhile:items=>items.some(item=>item.syncing||item.authorizing)});const [params,setParams]=useSearchParams();const integration=params.get("integration"),result=["steam","epic","battlenet"].includes(integration??"")?params.get("result"):null;
 useEffect(()=>{if(!result)return;notify(t(integration==="battlenet"?(result==="connected"?"Battle.net подключён.":"Не удалось подтвердить аккаунт Battle.net. Начните вход заново."):integration==="epic"?"Начните новый вход Epic Games через одноразовый код.":result==="connected"?"Steam подключён. Сохраните ключ и синхронизируйте библиотеку.":"Не удалось подтвердить аккаунт Steam. Попробуйте подключение снова."),result==="connected"?"success":"error");setParams(previous=>{const next=new URLSearchParams(previous);next.delete("integration");next.delete("result");return next;},{replace:true});},[result,integration,setParams]);
 return <section id="integrations" className="mt-8 min-w-0 space-y-5 rounded-card border border-line bg-surface p-4 sm:p-6" aria-label={t("Интеграции")}><header><h2 className="flex items-center gap-2 text-xl font-semibold"><AppIcon icon="tabler:plug-connected"/>{t("Интеграции")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Подключённые сервисы вашего профиля. Каждая интеграция использует свои разрешения; отключение удаляет её сохранённые данные.")}</p></header>
  {source.resource.status==="loading"?<LoadingState/>:source.resource.status==="error"?<ErrorState message={source.resource.message} retry={source.retry} retryAt={source.retryAt}/>:<div className="grid min-w-0 gap-4 lg:grid-cols-2">{source.resource.data.map(provider=>provider.id==="battlenet"?<BattleNetIntegration key={`${provider.id}:${provider.instance_id??"new"}`} provider={provider} refresh={source.retry}/>:["epic","xbox","playstation"].includes(provider.id)?<SessionIntegration key={provider.id} provider={provider} refresh={source.retry}/>:provider.kind==="gaming"?<SteamIntegration key={provider.id} provider={provider} refresh={source.retry}/>:<div key={provider.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><span className="flex items-center gap-2 text-sm font-medium"><AppIcon icon={provider.icon}/>{provider.name}</span><Button size="sm" className="h-auto min-h-9 max-w-full whitespace-normal" variant="outline" asChild><Link to={provider.settings_path}>{t("Открыть настройки интеграции")}</Link></Button></div>)}</div>}

 </section>;
}

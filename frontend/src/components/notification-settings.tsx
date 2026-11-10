import {useEffect,useState} from "react";
import {useResource} from "@/hooks/use-resource";
import {errorMessage} from "@/lib/api";
import {disablePush,enableNotifications,notificationPermission,notificationRegistration,pushSubscriptionStatus,notifyDesktop} from "@/lib/feedback";
import {t,useLanguage} from "@/systems/i18n/locale";
import {AppIcon} from "@/systems/icons/app-icon";
import {Button} from "./ui/button";
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from "./ui/card";
export function NotificationSettings(){
 useLanguage();
 const config=useResource<{public_key:string|null;subscriptions:string[]}>("/notifications/push");
 const [permission,setPermission]=useState(notificationPermission),[subscribed,setSubscribed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 useEffect(()=>{let active=true;if(config.resource.status==="ready")void pushSubscriptionStatus(config.resource.data.subscriptions??[]).then(value=>{if(active)setSubscribed(value);}).catch(()=>{});return()=>{active=false;};},[config.resource]);
 async function change(enable:boolean){setBusy(true);setError(null);try{
  if(enable){const next=await enableNotifications();setPermission(next);if(next==="granted")setSubscribed(Boolean(await (await notificationRegistration())?.pushManager?.getSubscription()));}
  else{await disablePush();setSubscribed(false);}
 }catch(failure){setError(errorMessage(failure));}finally{setBusy(false);config.retry();}}
 const ready=config.resource.status==="ready"&&Boolean(config.resource.data.public_key);
 return <Card><CardHeader><CardTitle className="flex items-center gap-2"><AppIcon icon="tabler:bell"/>{t("Push-уведомления")}</CardTitle><CardDescription>{t("Включите уведомления на каждом устройстве. Непрочитанные сообщения сохраняются в аккаунте.")}</CardDescription></CardHeader><CardContent className="space-y-4">
 <p role="status" className="text-sm text-muted-foreground">{t(permission==="unavailable"?"Этот браузер не поддерживает уведомления. На iPhone или iPad откройте приложение с экрана «Домой».":permission==="denied"?"Уведомления запрещены в настройках браузера. Разрешите их для этого сайта.":subscribed?"Уведомления на этом устройстве включены.":"Уведомления на этом устройстве выключены.")}</p>
 {!ready&&config.resource.status==="ready"&&<p className="text-sm text-muted-foreground">{t("Фоновая доставка ещё не настроена на сервере. Сообщения в приложении доступны.")}</p>}
 {config.resource.status==="error"&&<Button variant="outline" onClick={config.retry}>{t("Повторить")}</Button>}
 <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy||permission==="unavailable"||permission==="denied"||!ready} onClick={()=>void change(!subscribed)}>{t(subscribed?"Выключить на этом устройстве":"Включить на этом устройстве")}</Button>{permission==="granted"&&<Button variant="ghost" onClick={()=>notifyDesktop(t("Проверка уведомлений"),t("Уведомления LifeCycle работают."),{href:"/settings"})}>{t("Проверить уведомление")}</Button>}</div>
 <p className="text-caption text-fg-muted">{t("На заблокированном экране отображается только сообщение о новых уведомлениях. Содержимое доступно после входа.")}</p>
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 </CardContent></Card>;
}

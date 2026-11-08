import {api,ApiError} from "@/lib/api";
import {confirmAction} from "@/lib/feedback";
import {t} from "@/systems/i18n/locale";
import {safeExternalUrl} from "@/systems/links/links";
import {integrationProviders,type Integration,type CodeLogin,type SyncResult} from "./types";
function authorizationUrl(provider:Integration,value:string){
 const safe=safeExternalUrl(value);const url=safe?new URL(safe):null;
 const registration=integrationProviders.find(item=>item.id===provider.id);
 if(!url||!registration?.authorization_origin||url.origin!==registration.authorization_origin||url.pathname!==registration.authorization_path)throw new Error("Invalid integration redirect");
 return url.href;
}
export async function connectIntegration(provider:Integration){const result=await api<{url:string}>(`/integrations/${encodeURIComponent(provider.id)}/connect`,{method:"POST"});window.location.assign(authorizationUrl(provider,result.url));}
export async function startEpicLogin(provider:Integration):Promise<CodeLogin>{const result=await api<CodeLogin>("/integrations/epic/connect",{method:"POST"});if(!/^[a-f0-9]{64}$/i.test(result.state))throw new Error("Invalid integration state");return {...result,url:authorizationUrl(provider,result.url)};}
export function finishEpicLogin(attempt:CodeLogin,code:string){return api<Integration[]>("/integrations/epic/authorize",{method:"POST",body:{state:attempt.state,code:code.trim()}});}
export async function disconnectIntegration(provider:Integration){
 if(!await confirmAction({message:t("Отключить {name}? Сохранённые ключи и копия библиотеки будут удалены.",{name:provider.name}),destructive:true}))return false;
 await api(`/integrations/${encodeURIComponent(provider.id)}`,{method:"DELETE",body:{instance_id:provider.instance_id,revision:provider.revision}});return true;
}
export function saveIntegrationKey(provider:Integration,key:string,remove=false,clientId?:string){return api<Integration[]>(`/integrations/${encodeURIComponent(provider.id)}`,{method:"PUT",body:{instance_id:provider.instance_id,revision:provider.revision,...(remove?{remove_key:true}:{api_key:key.trim(),...(clientId?{client_id:clientId.trim()}:{})})}});}
export function syncIntegration(provider:Integration){return api<SyncResult|undefined>(`/integrations/${encodeURIComponent(provider.id)}/sync`,{method:"POST"});}
export async function syncGamingIntegrations(providers:Integration[]){
 const failures:string[]=[],pending:string[]=[];
 for(const provider of providers.filter(item=>item.kind==="gaming"&&item.capabilities.includes("library")&&item.connected&&item.configured)){
  try{const result=await syncIntegration(provider);if(result?.pending)pending.push(provider.name);}catch(error){if(!(error instanceof ApiError&&error.status===429))failures.push(provider.name);}
 }
 return {failures,pending};
}

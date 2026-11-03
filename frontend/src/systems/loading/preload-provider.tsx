import {useEffect,type ReactNode} from "react";
import {preloadPage} from "./routes";
import {prefetchResource} from "@/hooks/use-resource";
import {useAuth} from "@/features/auth/auth-context";
const resources:Record<string,string[]>={"/contacts":["/contacts"],"/notes":["/notes","/notes/folders"],"/countdowns":["/countdowns"],"/settings":["/settings"],"/tasks":["/tasks","/boards","/task-tags"],"/profile":["/profile"],"/workouts":["/workouts","/exercises"]};
export function PreloadProvider({children}:{children:ReactNode}){
 const {user}=useAuth();
 useEffect(()=>{const preload=(event:Event)=>{if(!(event.target instanceof Element))return;const link=event.target.closest<HTMLAnchorElement>('a[href^="/"]');if(!link)return;const path=link.pathname;void preloadPage(path).catch(()=>{});if(user)for(const resource of resources[path]??[])void prefetchResource(resource);};document.addEventListener("pointerover",preload,{passive:true});document.addEventListener("focusin",preload);return()=>{document.removeEventListener("pointerover",preload);document.removeEventListener("focusin",preload);};},[user]);
 return children;
}
